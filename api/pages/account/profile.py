"""
API module corresponding to gui/src/pages/account/Profile.jsx.
Business logic: account CRUD (list, create, update, delete).
"""
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Request

from config import CLICKHOUSE_DATABASE
from db import execute, execute_many, get_client
from models import AccountCreate, AccountUpdate, row_to_dict

router = APIRouter()


@router.get("/accounts")
def list_accounts(request: Request):
    cols = [
        "id",
        "name",
        "billing_email",
        "country",
        "notifications",
        "created_at",
        "updated_at",
        "owner_name",
        "owner_job_title",
    ]
    x_user_id = (request.headers.get("X-User-Id") or "").strip()
    base_select = f"""
        SELECT a.id,
               a.name,
               a.billing_email,
               a.country,
               a.notifications,
               a.created_at,
               a.updated_at,
               u.name AS owner_name,
               u.job_title AS owner_job_title
        FROM {CLICKHOUSE_DATABASE}.accounts FINAL a
        LEFT JOIN {CLICKHOUSE_DATABASE}.users FINAL u
               ON a.master_owner_user_id = u.id
    """
    if not x_user_id:
        rows = execute(base_select + " ORDER BY a.created_at DESC")
        return [row_to_dict(cols, r) for r in rows]
    requester = execute(
        f"SELECT account_id FROM {CLICKHOUSE_DATABASE}.users FINAL WHERE id = %(id)s LIMIT 1",
        {"id": x_user_id},
    )
    if not requester:
        return []
    account_id = str(requester[0][0]) if requester[0][0] else None
    if not account_id:
        return []
    q = base_select + " WHERE a.id = %(account_id)s ORDER BY a.created_at DESC"
    rows = execute(q, {"account_id": account_id})
    return [row_to_dict(cols, r) for r in rows]


@router.post("/accounts")
def create_account(body: AccountCreate):
    uid = uuid4()
    q = f"""INSERT INTO {CLICKHOUSE_DATABASE}.accounts (id, name, billing_email, country, notifications) VALUES"""
    execute_many(q, [(uid, body.name or "", body.billing_email, body.country or "", 1 if body.notifications else 0)])
    return {
        "id": str(uid),
        "name": body.name,
        "billing_email": body.billing_email,
        "country": body.country or "",
        "notifications": bool(body.notifications),
    }


@router.put("/accounts/{account_id}")
def update_account(account_id: str, body: AccountUpdate):
    existing = execute(
        f"SELECT id, name, billing_email, country, notifications, master_owner_user_id FROM {CLICKHOUSE_DATABASE}.accounts FINAL WHERE id = %(id)s",
        {"id": account_id},
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Account not found")
    row = existing[0]
    name = body.name if body.name is not None else (row[1] or "")
    billing_email = body.billing_email if body.billing_email is not None else (row[2] or "")
    country = body.country if body.country is not None else (row[3] or "")
    notifications = (1 if body.notifications else 0) if body.notifications is not None else (row[4] or 0)
    master_owner_user_id = row[5]

    # Update account row
    q = f"""INSERT INTO {CLICKHOUSE_DATABASE}.accounts (id, name, billing_email, country, notifications) VALUES"""
    execute_many(q, [(UUID(account_id), name, billing_email, country, notifications)])

    # Optionally update master owner user name / job title
    owner_name = body.owner_name
    owner_job_title = body.owner_job_title
    if master_owner_user_id and (owner_name is not None or owner_job_title is not None):
        user_row = execute(
            f"SELECT email, name, job_title, account_id, entity_id, role_id, is_owner, enabled, created_by_user_id, master_owner_user_id, organizations, organization_group_ids FROM {CLICKHOUSE_DATABASE}.users FINAL WHERE id = %(id)s LIMIT 1",
            {"id": str(master_owner_user_id)},
        )
        if user_row:
            ur = user_row[0]
            new_name = owner_name if owner_name is not None else (ur[1] or "")
            new_job_title = owner_job_title if owner_job_title is not None else (ur[2] or "")
            q_user = f"""INSERT INTO {CLICKHOUSE_DATABASE}.users (id, account_id, email, name, password_hash, role_id, is_owner, enabled, created_by_user_id, master_owner_user_id, organizations, organization_group_ids, job_title) VALUES"""
            execute_many(
                q_user,
                [
                    (
                        UUID(str(master_owner_user_id)),
                        ur[3],
                        ur[0],
                        new_name,
                        "",
                        ur[5],
                        ur[6],
                        ur[7],
                        ur[8],
                        ur[9],
                        list(ur[10]) if ur[10] is not None else [],
                        list(ur[11]) if ur[11] is not None else [],
                        new_job_title,
                    )
                ],
            )

    return {
        "id": account_id,
        "name": name,
        "billing_email": billing_email,
        "country": country,
        "notifications": bool(notifications),
        "owner_name": owner_name,
        "owner_job_title": owner_job_title,
    }


@router.delete("/accounts/{account_id}")
def delete_account(request: Request, account_id: str):
    """Delete account and cascade: organization_tokens, organizations (sites), groups (site-groups), user_permissions, users, then account. Allows master-owner to delete their own account (will require logout on client)."""
    existing = execute(
        f"SELECT 1 FROM {CLICKHOUSE_DATABASE}.accounts FINAL WHERE id = %(id)s LIMIT 1",
        {"id": account_id},
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Account not found")
    client = get_client()
    params = {"id": account_id, "account_id": account_id}

    # 1. Organization tokens (for all orgs in this account)
    org_rows = execute(
        f"SELECT id FROM {CLICKHOUSE_DATABASE}.organizations FINAL WHERE account_id = %(account_id)s",
        params,
    )
    org_ids = [str(r[0]) for r in org_rows] if org_rows else []
    if org_ids:
        client.execute(
            f"ALTER TABLE {CLICKHOUSE_DATABASE}.organization_tokens DELETE WHERE organization_id IN %(org_ids)s",
            {"org_ids": tuple(org_ids)},
        )

    # 2. Organizations (sites / master-organization)
    client.execute(
        f"ALTER TABLE {CLICKHOUSE_DATABASE}.organizations DELETE WHERE account_id = %(account_id)s",
        params,
    )

    # 3. Groups (site-groups)
    client.execute(
        f"ALTER TABLE {CLICKHOUSE_DATABASE}.groups DELETE WHERE account_id = %(account_id)s",
        params,
    )

    # 4. User permissions for users in this account
    user_rows = execute(
        f"SELECT id FROM {CLICKHOUSE_DATABASE}.users FINAL WHERE account_id = %(account_id)s",
        params,
    )
    user_ids = [str(r[0]) for r in user_rows] if user_rows else []
    if user_ids:
        client.execute(
            f"ALTER TABLE {CLICKHOUSE_DATABASE}.user_permissions DELETE WHERE user_id IN %(user_ids)s",
            {"user_ids": tuple(user_ids)},
        )

    # 5. Users
    client.execute(
        f"ALTER TABLE {CLICKHOUSE_DATABASE}.users DELETE WHERE account_id = %(id)s",
        params,
    )

    # 6. Account
    client.execute(
        f"ALTER TABLE {CLICKHOUSE_DATABASE}.accounts DELETE WHERE id = %(id)s",
        params,
    )
    return {"deleted": account_id}
