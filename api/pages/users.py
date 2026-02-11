"""
API module corresponding to gui/src/pages/Users.jsx.
Business logic: users and user permissions CRUD.
Role-based visibility: owner sees all users in account; non-owner sees only users they created.
"""
from datetime import datetime, timezone, timedelta
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Request

from config import CLICKHOUSE_DATABASE
from db import execute, execute_many, get_client
from models import PermissionCreate, PermissionUpdate, UserCreate, UserUpdate, row_to_dict

router = APIRouter()

# Fallback role UUIDs (match db/05_seed_admin.sql) when lookup by name returns nothing
ROLE_IDS_BY_NAME = {
    "owner": UUID("22222222-2222-2222-2222-222222222222"),
    "manager": UUID("44444444-4444-4444-4444-444444444444"),
    "viewer": UUID("55555555-5555-5555-5555-555555555555"),
}

USER_COLS = [
    "id",
    "email",
    "name",
    "job_title",
    "account_id",
    "entity_id",
    "is_owner",
    "enabled",
    "created_at",
    "updated_at",
    "role_name",
    "permissions",
    "account_billing_email",
    "master_owner_user_id",
    "created_by_user_id",
    "organizations",
    "organization_group_ids",
]


def _requester_context(request: Request):
    """Return (account_id, is_owner) for X-User-Id header, or (None, False) if missing."""
    x_user_id = (request.headers.get("X-User-Id") or "").strip()
    if not x_user_id:
        return None, False
    rows = execute(
        f"SELECT account_id, is_owner FROM {CLICKHOUSE_DATABASE}.users FINAL WHERE id = %(id)s LIMIT 1",
        {"id": x_user_id},
    )
    if not rows:
        return None, False
    return str(rows[0][0]) if rows[0][0] else None, bool(rows[0][1])


def _list_users_via_view(account_id: str | None = None):
    """List users from view (no role filter). Used when X-User-Id absent or when role-based query fails."""
    q = f"SELECT {','.join(USER_COLS)} FROM {CLICKHOUSE_DATABASE}.users_with_roles"
    params = {}
    if account_id:
        q += " WHERE account_id = %(account_id)s"
        params["account_id"] = account_id
    q += " ORDER BY email"
    rows = execute(q, params)
    return [row_to_dict(USER_COLS, r) for r in rows]


@router.get("/users")
def list_users(request: Request, account_id: str | None = None):
    x_user_id = (request.headers.get("X-User-Id") or "").strip()
    if not x_user_id:
        return _list_users_via_view(account_id)
    req_account_id, req_is_owner = _requester_context(request)
    # Owner sees all users in their account; non-owner sees only users they created (created_by_user_id).
    # Fall back to view if column or query fails (e.g. schema not yet migrated).
    try:
        q = f"""
        SELECT u.id,
               u.email,
               u.name,
               u.job_title,
               u.account_id,
               u.entity_id,
               u.is_owner,
               u.enabled,
               u.created_at,
               u.updated_at,
               r.name AS role_name,
               r.permissions,
               a.billing_email AS account_billing_email,
               u.master_owner_user_id,
               u.created_by_user_id,
               u.organizations,
               u.organization_group_ids
        FROM {CLICKHOUSE_DATABASE}.users FINAL u
        LEFT JOIN (SELECT * FROM {CLICKHOUSE_DATABASE}.roles FINAL) r ON u.role_id = r.id
        LEFT JOIN (SELECT * FROM {CLICKHOUSE_DATABASE}.accounts FINAL) a ON u.account_id = a.id
        WHERE ((u.account_id = %(req_account_id)s AND %(req_is_owner)s = 1) OR (u.created_by_user_id = %(x_user_id)s))
        """
        params = {"req_account_id": req_account_id or "", "req_is_owner": 1 if req_is_owner else 0, "x_user_id": x_user_id}
        if account_id:
            q += " AND u.account_id = %(account_id)s"
            params["account_id"] = account_id
        q += " ORDER BY u.email"
        rows = execute(q, params)
        return [row_to_dict(USER_COLS, r) for r in rows]
    except Exception:
        return _list_users_via_view(account_id)


@router.post("/users")
def create_user(request: Request, body: UserCreate):
    email = (body.email or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    job_title = (body.job_title or "").strip()
    if not job_title:
        raise HTTPException(status_code=400, detail="Job title is required")
    exists = execute(
        f"SELECT 1 FROM {CLICKHOUSE_DATABASE}.users FINAL WHERE email = %(email)s LIMIT 1",
        {"email": email},
    )
    if exists:
        raise HTTPException(status_code=409, detail="A user with this email already exists.")
    uid = uuid4()
    _nil_uuid = UUID("00000000-0000-0000-0000-000000000000")
    if body.role_id:
        role_id = UUID(body.role_id)
    elif body.role and (body.role or "").strip():
        role_name = (body.role or "").strip().lower()
        role_row = execute(
            f"SELECT id FROM {CLICKHOUSE_DATABASE}.roles FINAL WHERE lower(name) = lower(%(name)s) LIMIT 1",
            {"name": role_name},
        )
        role_id = UUID(role_row[0][0]) if role_row else ROLE_IDS_BY_NAME.get(role_name, _nil_uuid)
    else:
        role_id = _nil_uuid
    created_by = (request.headers.get("X-User-Id") or "").strip() or None
    created_by_uuid = UUID(created_by) if created_by else UUID("00000000-0000-0000-0000-000000000000")
    # Master owner: from account (first owner who signed up); fallback to created_by or zero
    acct = execute(
        f"SELECT master_owner_user_id FROM {CLICKHOUSE_DATABASE}.accounts FINAL WHERE id = %(id)s LIMIT 1",
        {"id": body.account_id},
    )
    master_owner_uuid = (
        UUID(str(acct[0][0])) if acct and acct[0][0] else (created_by_uuid if created_by_uuid != UUID("00000000-0000-0000-0000-000000000000") else UUID("00000000-0000-0000-0000-000000000000"))
    )
    org_list = list(body.organizations) if body.organizations else []
    group_list = list(body.organization_group_ids) if body.organization_group_ids else []
    q = f"""INSERT INTO {CLICKHOUSE_DATABASE}.users (id, account_id, email, name, password_hash, role_id, is_owner, enabled, created_by_user_id, master_owner_user_id, organizations, organization_group_ids, job_title) VALUES"""
    execute_many(
        q,
        [
            (
                uid,
                UUID(body.account_id),
                email,
                body.name or "",
                body.password_hash or "",
                role_id,
                1 if body.is_owner else 0,
                1 if body.enabled else 0,
                created_by_uuid,
                master_owner_uuid,
                org_list,
                group_list,
                job_title,
            )
        ],
    )
    return {
        "id": str(uid),
        "account_id": body.account_id,
        "email": email,
        "name": body.name,
        "job_title": body.job_title,
        "is_owner": body.is_owner,
        "enabled": body.enabled,
    }


@router.delete("/users/{user_id}")
def delete_user(request: Request, user_id: str):
    """Delete user. Owner can delete any non-owner in account; non-owner can delete only users they created."""
    existing = execute(
        f"SELECT is_owner, account_id, created_by_user_id FROM {CLICKHOUSE_DATABASE}.users FINAL WHERE id = %(id)s LIMIT 1",
        {"id": user_id},
    )
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    target_is_owner, target_account_id, target_created_by = existing[0][0], existing[0][1], existing[0][2]
    if target_is_owner == 1:
        raise HTTPException(status_code=403, detail="Owner user cannot be deleted.")
    x_user_id = (request.headers.get("X-User-Id") or "").strip()
    if x_user_id:
        req_account_id, req_is_owner = _requester_context(request)
        created_by_ok = target_created_by and str(target_created_by) == x_user_id
        owner_ok = req_is_owner and target_account_id and req_account_id and str(target_account_id) == req_account_id
        if not (owner_ok or created_by_ok):
            raise HTTPException(status_code=403, detail="You can only delete users you created, or be the account owner.")
    client = get_client()
    client.execute(
        f"ALTER TABLE {CLICKHOUSE_DATABASE}.user_permissions DELETE WHERE user_id = %(id)s",
        {"id": user_id},
    )
    client.execute(
        f"ALTER TABLE {CLICKHOUSE_DATABASE}.users DELETE WHERE id = %(id)s",
        {"id": user_id},
    )
    return {"deleted": user_id}


@router.put("/users/{user_id}")
def update_user(request: Request, user_id: str, body: UserUpdate):
    existing = execute(
        f"SELECT account_id, email, name, job_title, role_id, is_owner, enabled, created_by_user_id, master_owner_user_id, organizations, organization_group_ids FROM {CLICKHOUSE_DATABASE}.users FINAL WHERE id = %(id)s LIMIT 1",
        {"id": user_id},
    )
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    r = existing[0]
    x_user_id = (request.headers.get("X-User-Id") or "").strip()
    if x_user_id and user_id == x_user_id and body.enabled is False:
        raise HTTPException(status_code=403, detail="You cannot disable yourself.")
    _nil_uuid = UUID("00000000-0000-0000-0000-000000000000")
    name = body.name if body.name is not None else (r[2] or "")
    job_title = body.job_title if body.job_title is not None else (r[3] or "")
    if body.role_id is not None:
        role_id = UUID(body.role_id)
    elif body.role is not None:
        role_name = (body.role or "").strip().lower()
        if role_name:
            role_row = execute(
                f"SELECT id FROM {CLICKHOUSE_DATABASE}.roles FINAL WHERE lower(name) = lower(%(name)s) LIMIT 1",
                {"name": role_name},
            )
            if role_row:
                role_id = UUID(role_row[0][0])
            else:
                role_id = ROLE_IDS_BY_NAME.get(role_name, r[4] if r[4] is not None else _nil_uuid)
        else:
            role_id = r[4] if r[4] is not None else _nil_uuid
    else:
        role_id = r[4] if r[4] is not None else _nil_uuid
    is_owner = (1 if body.is_owner else 0) if body.is_owner is not None else (r[5] or 0)
    enabled = (1 if body.enabled else 0) if body.enabled is not None else (r[6] or 1)
    created_by = r[7] if len(r) > 7 and r[7] else _nil_uuid
    master_owner = r[8] if len(r) > 8 and r[8] else _nil_uuid
    organizations = list(body.organizations) if body.organizations is not None else (list(r[9]) if len(r) > 9 and r[9] is not None else [])
    org_groups = list(body.organization_group_ids) if body.organization_group_ids is not None else (list(r[10]) if len(r) > 10 and r[10] is not None else [])
    # INSERT new version; set updated_at explicitly so this row wins when ReplacingMergeTree(updated_at) merges.
    updated_at = datetime.now(timezone.utc) + timedelta(seconds=1)
    q = f"""INSERT INTO {CLICKHOUSE_DATABASE}.users (id, account_id, email, name, password_hash, role_id, is_owner, enabled, created_by_user_id, master_owner_user_id, organizations, organization_group_ids, job_title, updated_at) VALUES"""
    execute_many(q, [(UUID(user_id), r[0], r[1], name, "", role_id, is_owner, enabled, created_by, master_owner, organizations, org_groups, job_title, updated_at)])
    return {
        "id": user_id,
        "email": r[1],
        "name": name,
        "job_title": job_title,
        "is_owner": bool(is_owner),
        "enabled": bool(enabled),
    }


@router.get("/users/{user_id}/debug")
def debug_user_rows(user_id: str):
    """
    Inspect raw table data for a user (to debug role/updated_at).
    Returns: all rows without FINAL (duplicates), one row with FINAL, and role names.
    """
    # All rows for this id (no FINAL) – see duplicates and each row's role_id, updated_at
    raw_rows = execute(
        f"SELECT id, email, name, role_id, is_owner, enabled, created_at, updated_at, job_title "
        f"FROM {CLICKHOUSE_DATABASE}.users WHERE id = %(id)s ORDER BY updated_at DESC",
        {"id": user_id},
    )
    # Single row as the app sees it (FINAL)
    final_row = execute(
        f"SELECT id, email, name, role_id, is_owner, enabled, created_at, updated_at, job_title "
        f"FROM {CLICKHOUSE_DATABASE}.users FINAL WHERE id = %(id)s LIMIT 1",
        {"id": user_id},
    )
    # Role names for reference
    roles = execute(
        f"SELECT id, name FROM {CLICKHOUSE_DATABASE}.roles FINAL ORDER BY name",
    )
    return {
        "user_id": user_id,
        "raw_rows_count": len(raw_rows),
        "raw_rows": [
            {
                "email": r[1],
                "name": r[2],
                "role_id": str(r[3]) if r[3] else None,
                "is_owner": bool(r[4]) if r[4] is not None else False,
                "enabled": bool(r[5]) if r[5] is not None else False,
                "created_at": str(r[6]) if r[6] else None,
                "updated_at": str(r[7]) if r[7] else None,
                "job_title": r[8] or "",
            }
            for r in raw_rows
        ],
        "final_row": (
            {
                "email": final_row[0][1],
                "name": final_row[0][2],
                "role_id": str(final_row[0][3]) if final_row[0][3] else None,
                "updated_at": str(final_row[0][7]) if final_row[0][7] else None,
            }
            if final_row
            else None
        ),
        "roles": [{"id": str(r[0]), "name": r[1]} for r in roles] if roles else [],
    }


@router.get("/users/{user_id}/permissions")
def list_user_permissions(user_id: str):
    cols = ["id", "user_id", "permission_to", "entity_id", "entity_name", "role", "created_at", "updated_at"]
    q = f"SELECT {','.join(cols)} FROM {CLICKHOUSE_DATABASE}.user_permissions_final WHERE user_id = %(user_id)s"
    rows = execute(q, {"user_id": user_id})
    return [row_to_dict(cols, r) for r in rows]


@router.post("/users/{user_id}/permissions")
def create_permission(user_id: str, body: PermissionCreate):
    uid = uuid4()
    q = f"""INSERT INTO {CLICKHOUSE_DATABASE}.user_permissions (id, user_id, permission_to, entity_id, entity_name, role, deleted) VALUES"""
    execute_many(q, [(uid, UUID(user_id), body.permission_to.lower(), body.entity_id, body.entity_name or "", body.role.lower(), 0)])
    return {"id": str(uid), "user_id": user_id, "permission_to": body.permission_to, "entity_id": body.entity_id, "entity_name": body.entity_name, "role": body.role}


@router.put("/permissions/{perm_id}")
def update_permission(perm_id: str, body: PermissionUpdate):
    existing = execute(
        f"SELECT user_id, permission_to, entity_id, entity_name, role FROM {CLICKHOUSE_DATABASE}.user_permissions FINAL WHERE id = %(id)s AND deleted = 0",
        {"id": perm_id},
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Permission not found")
    r = existing[0]
    entity_name = body.entity_name if body.entity_name is not None else (r[3] or "")
    role = (body.role or "").lower() if body.role is not None else (r[4] or "viewer")
    q = f"""INSERT INTO {CLICKHOUSE_DATABASE}.user_permissions (id, user_id, permission_to, entity_id, entity_name, role, deleted) VALUES"""
    execute_many(q, [(UUID(perm_id), r[0], r[1], r[2], entity_name, role, 0)])
    return {"id": perm_id, "entity_name": entity_name, "role": role}


@router.delete("/permissions/{perm_id}")
def delete_permission(perm_id: str):
    existing = execute(
        f"SELECT user_id, permission_to, entity_id, entity_name, role FROM {CLICKHOUSE_DATABASE}.user_permissions FINAL WHERE id = %(id)s AND deleted = 0",
        {"id": perm_id},
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Permission not found")
    r = existing[0]
    q = f"""INSERT INTO {CLICKHOUSE_DATABASE}.user_permissions (id, user_id, permission_to, entity_id, entity_name, role, deleted) VALUES"""
    execute_many(q, [(UUID(perm_id), r[0], r[1], r[2], r[3] or "", r[4] or "viewer", 1)])
    return {"deleted": perm_id}
