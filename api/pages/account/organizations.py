"""
API module corresponding to gui/src/pages/account/Organizations.jsx.
Business logic: groups and organizations CRUD.
Role-based: owner sees all; non-owner sees only organizations/groups assigned via user_permissions.
"""
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Request

from config import CLICKHOUSE_DATABASE
from db import execute, execute_many, get_client
from models import (
    GroupCreate,
    GroupUpdate,
    OrganizationCreate,
    OrganizationUpdate,
    row_to_dict,
)

router = APIRouter()

GROUP_COLS = ["id", "account_id", "name", "created_at", "updated_at", "master_owner_user_id", "created_by_user_id", "parent_group_id"]
# View columns (organizations_with_account): includes group_name_resolved
ORG_COLS = ["id", "account_id", "group_id", "name", "group_name", "tunnel_key_exchange", "is_default", "created_at", "updated_at", "master_owner_user_id", "created_by_user_id", "account_billing_email", "group_name_resolved"]


def _requester_owner_and_permitted_entities(request: Request, permission_to: str):
    """Return (is_owner, account_id, permitted_entity_ids). permitted_entity_ids is set of entity_id assigned to user."""
    x_user_id = (request.headers.get("X-User-Id") or "").strip()
    if not x_user_id:
        return False, None, set()
    rows = execute(
        f"SELECT account_id, is_owner FROM {CLICKHOUSE_DATABASE}.users FINAL WHERE id = %(id)s LIMIT 1",
        {"id": x_user_id},
    )
    if not rows:
        return False, None, set()
    account_id = str(rows[0][0]) if rows[0][0] else None
    is_owner = bool(rows[0][1])
    perms = execute(
        f"SELECT entity_id FROM {CLICKHOUSE_DATABASE}.user_permissions_final WHERE user_id = %(user_id)s AND permission_to = %(pt)s",
        {"user_id": x_user_id, "pt": permission_to},
    )
    permitted = {str(r[0]) for r in perms} if perms else set()
    return is_owner, account_id, permitted


# ---------- Groups ----------
@router.get("/groups")
def list_groups(request: Request, account_id: str | None = None):
    x_user_id = (request.headers.get("X-User-Id") or "").strip()
    q = f"SELECT {','.join(GROUP_COLS)} FROM {CLICKHOUSE_DATABASE}.groups FINAL"
    params = {}
    if account_id:
        q += " WHERE account_id = %(account_id)s"
        params["account_id"] = account_id
    rows = execute(q, params)
    result = [row_to_dict(GROUP_COLS, r) for r in rows]
    if not x_user_id:
        return result
    is_owner, _req_account_id, permitted = _requester_owner_and_permitted_entities(request, "group")
    if is_owner:
        return result
    return [r for r in result if r["id"] in permitted]


@router.post("/groups")
def create_group(request: Request, body: GroupCreate):
    uid = uuid4()
    x_user_id = (request.headers.get("X-User-Id") or "").strip()
    _nil = UUID("00000000-0000-0000-0000-000000000000")
    created_by = UUID(x_user_id) if x_user_id else _nil
    acc = execute(
        f"SELECT master_owner_user_id FROM {CLICKHOUSE_DATABASE}.accounts FINAL WHERE id = %(id)s LIMIT 1",
        {"id": body.account_id},
    )
    raw_master = acc[0][0] if acc and acc[0][0] else None
    master_owner = (raw_master if isinstance(raw_master, UUID) else UUID(str(raw_master))) if raw_master else created_by
    parent_gid = UUID(body.parent_group_id) if body.parent_group_id else _nil
    q = f"""INSERT INTO {CLICKHOUSE_DATABASE}.groups (id, account_id, name, master_owner_user_id, created_by_user_id, parent_group_id) VALUES"""
    execute_many(q, [(uid, UUID(body.account_id), body.name, master_owner, created_by, parent_gid)])
    return {"id": str(uid), "account_id": body.account_id, "name": body.name}


@router.put("/groups/{group_id}")
def update_group(group_id: str, body: GroupUpdate):
    if body.name is None:
        raise HTTPException(status_code=400, detail="name required")
    existing = execute(
        f"SELECT account_id, master_owner_user_id, created_by_user_id, parent_group_id FROM {CLICKHOUSE_DATABASE}.groups FINAL WHERE id = %(id)s",
        {"id": group_id},
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Group not found")
    r = existing[0]
    _nil = UUID("00000000-0000-0000-0000-000000000000")
    master_owner = r[1] if len(r) > 1 and r[1] else _nil
    created_by = r[2] if len(r) > 2 and r[2] else _nil
    parent_gid = UUID(body.parent_group_id) if body.parent_group_id is not None else (r[3] if len(r) > 3 and r[3] else _nil)
    q = f"""INSERT INTO {CLICKHOUSE_DATABASE}.groups (id, account_id, name, master_owner_user_id, created_by_user_id, parent_group_id) VALUES"""
    execute_many(q, [(UUID(group_id), r[0], body.name, master_owner, created_by, parent_gid)])
    return {"id": group_id, "name": body.name}


@router.delete("/groups/{group_id}")
def delete_group(request: Request, group_id: str):
    existing = execute(
        f"SELECT account_id FROM {CLICKHOUSE_DATABASE}.groups FINAL WHERE id = %(id)s LIMIT 1",
        {"id": group_id},
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Group not found")
    is_owner, req_account_id, permitted = _requester_owner_and_permitted_entities(request, "group")
    if not is_owner and group_id not in permitted:
        raise HTTPException(status_code=403, detail="You can only delete groups assigned to you.")
    if is_owner and req_account_id and str(existing[0][0]) != req_account_id:
        raise HTTPException(status_code=403, detail="You can only delete groups in your account.")
    client = get_client()
    client.execute(f"ALTER TABLE {CLICKHOUSE_DATABASE}.groups DELETE WHERE id = %(id)s", {"id": group_id})
    return {"deleted": group_id}


# ---------- Organizations ----------
@router.get("/organizations")
def list_organizations(request: Request, account_id: str | None = None):
    x_user_id = (request.headers.get("X-User-Id") or "").strip()
    q = f"SELECT {','.join(ORG_COLS)} FROM {CLICKHOUSE_DATABASE}.organizations_with_account"
    params = {}
    if account_id:
        q += " WHERE account_id = %(account_id)s"
        params["account_id"] = account_id
    rows = execute(q, params)
    result = [row_to_dict(ORG_COLS, r) for r in rows]
    if not x_user_id:
        return result
    is_owner, _req_account_id, permitted = _requester_owner_and_permitted_entities(request, "organization")
    if is_owner:
        return result
    return [r for r in result if r["id"] in permitted]


@router.post("/organizations")
def create_organization(request: Request, body: OrganizationCreate):
    uid = uuid4()
    gid = UUID(body.group_id) if body.group_id else UUID("00000000-0000-0000-0000-000000000000")
    x_user_id = (request.headers.get("X-User-Id") or "").strip()
    _nil = UUID("00000000-0000-0000-0000-000000000000")
    created_by = UUID(x_user_id) if x_user_id else _nil
    # Master-owner from account
    acc = execute(
        f"SELECT master_owner_user_id FROM {CLICKHOUSE_DATABASE}.accounts FINAL WHERE id = %(id)s LIMIT 1",
        {"id": body.account_id},
    )
    raw_master = acc[0][0] if acc and acc[0][0] else None
    master_owner = (raw_master if isinstance(raw_master, UUID) else UUID(str(raw_master))) if raw_master else created_by
    q = f"""INSERT INTO {CLICKHOUSE_DATABASE}.organizations (id, account_id, group_id, name, group_name, tunnel_key_exchange, is_default, master_owner_user_id, created_by_user_id) VALUES"""
    execute_many(q, [(uid, UUID(body.account_id), gid, body.name, body.group_name or "", body.tunnel_key_exchange, 1 if body.is_default else 0, master_owner, created_by)])
    return {"id": str(uid), "account_id": body.account_id, "name": body.name, "group_id": body.group_id, "is_default": body.is_default}


@router.put("/organizations/{org_id}")
def update_organization(org_id: str, body: OrganizationUpdate):
    existing = execute(
        f"SELECT account_id, group_id, name, group_name, tunnel_key_exchange, is_default, master_owner_user_id, created_by_user_id FROM {CLICKHOUSE_DATABASE}.organizations FINAL WHERE id = toUUID(%(id)s)",
        {"id": org_id},
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Organization not found")
    r = existing[0]
    _nil = UUID("00000000-0000-0000-0000-000000000000")
    gid = UUID(body.group_id) if body.group_id is not None else r[1]
    name = body.name if body.name is not None else (r[2] or "")
    group_name = body.group_name if body.group_name is not None else (r[3] or "")
    tke = body.tunnel_key_exchange if body.tunnel_key_exchange is not None else (r[4] or "ikev2")
    is_default = (1 if body.is_default else 0) if body.is_default is not None else (r[5] or 0)
    master_owner = r[6] if len(r) > 6 and r[6] else _nil
    created_by = r[7] if len(r) > 7 and r[7] else _nil
    q = f"""INSERT INTO {CLICKHOUSE_DATABASE}.organizations (id, account_id, group_id, name, group_name, tunnel_key_exchange, is_default, master_owner_user_id, created_by_user_id) VALUES"""
    execute_many(q, [(UUID(org_id), r[0], gid, name, group_name, tke, is_default, master_owner, created_by)])
    return {"id": org_id, "name": name, "is_default": bool(is_default)}


@router.delete("/organizations/{org_id}")
def delete_organization(request: Request, org_id: str):
    try:
        org_uuid = UUID(org_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid organization id")
    existing = execute(
        f"SELECT account_id FROM {CLICKHOUSE_DATABASE}.organizations FINAL WHERE id = toUUID(%(id)s) LIMIT 1",
        {"id": org_id},
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Organization not found")
    is_owner, req_account_id, permitted = _requester_owner_and_permitted_entities(request, "organization")
    if not is_owner and org_id not in permitted:
        raise HTTPException(status_code=403, detail="You can only delete organizations assigned to you.")
    if is_owner and req_account_id and str(existing[0][0]) != req_account_id:
        raise HTTPException(status_code=403, detail="You can only delete organizations in your account.")
    client = get_client()
    client.execute(
        f"ALTER TABLE {CLICKHOUSE_DATABASE}.organizations DELETE WHERE id = toUUID(%(id)s)",
        {"id": org_id},
    )
    return {"deleted": org_id}
