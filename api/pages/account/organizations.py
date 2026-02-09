"""
API module corresponding to gui/src/pages/account/Organizations.jsx.
Business logic: groups and organizations CRUD.
"""
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException

from config import CLICKHOUSE_DATABASE
from db import execute, execute_many
from models import (
    GroupCreate,
    GroupUpdate,
    OrganizationCreate,
    OrganizationUpdate,
    row_to_dict,
)

router = APIRouter()


# ---------- Groups ----------
@router.get("/groups")
def list_groups(account_id: str | None = None):
    cols = ["id", "account_id", "name", "created_at", "updated_at"]
    q = f"SELECT {','.join(cols)} FROM {CLICKHOUSE_DATABASE}.groups FINAL"
    params = {}
    if account_id:
        q += " WHERE account_id = %(account_id)s"
        params["account_id"] = account_id
    q += " ORDER BY name"
    rows = execute(q, params)
    return [row_to_dict(cols, r) for r in rows]


@router.post("/groups")
def create_group(body: GroupCreate):
    uid = uuid4()
    q = f"""INSERT INTO {CLICKHOUSE_DATABASE}.groups (id, account_id, name) VALUES"""
    execute_many(q, [(uid, UUID(body.account_id), body.name)])
    return {"id": str(uid), "account_id": body.account_id, "name": body.name}


@router.put("/groups/{group_id}")
def update_group(group_id: str, body: GroupUpdate):
    if body.name is None:
        raise HTTPException(status_code=400, detail="name required")
    existing = execute(
        f"SELECT account_id FROM {CLICKHOUSE_DATABASE}.groups FINAL WHERE id = %(id)s",
        {"id": group_id},
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Group not found")
    q = f"""INSERT INTO {CLICKHOUSE_DATABASE}.groups (id, account_id, name) VALUES"""
    execute_many(q, [(UUID(group_id), existing[0][0], body.name)])
    return {"id": group_id, "name": body.name}


# ---------- Organizations ----------
@router.get("/organizations")
def list_organizations(account_id: str | None = None):
    cols = ["id", "account_id", "group_id", "name", "group_name", "tunnel_key_exchange", "is_default", "created_at", "updated_at"]
    q = f"SELECT {','.join(cols)} FROM {CLICKHOUSE_DATABASE}.organizations FINAL"
    params = {}
    if account_id:
        q += " WHERE account_id = %(account_id)s"
        params["account_id"] = account_id
    q += " ORDER BY name"
    rows = execute(q, params)
    return [row_to_dict(cols, r) for r in rows]


@router.post("/organizations")
def create_organization(body: OrganizationCreate):
    uid = uuid4()
    gid = UUID(body.group_id) if body.group_id else UUID("00000000-0000-0000-0000-000000000000")
    q = f"""INSERT INTO {CLICKHOUSE_DATABASE}.organizations (id, account_id, group_id, name, group_name, tunnel_key_exchange, is_default) VALUES"""
    execute_many(q, [(uid, UUID(body.account_id), gid, body.name, body.group_name or "", body.tunnel_key_exchange, 1 if body.is_default else 0)])
    return {"id": str(uid), "account_id": body.account_id, "name": body.name, "group_id": body.group_id, "is_default": body.is_default}


@router.put("/organizations/{org_id}")
def update_organization(org_id: str, body: OrganizationUpdate):
    existing = execute(
        f"SELECT account_id, group_id, name, group_name, tunnel_key_exchange, is_default FROM {CLICKHOUSE_DATABASE}.organizations FINAL WHERE id = %(id)s",
        {"id": org_id},
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Organization not found")
    r = existing[0]
    gid = UUID(body.group_id) if body.group_id is not None else r[1]
    name = body.name if body.name is not None else (r[2] or "")
    group_name = body.group_name if body.group_name is not None else (r[3] or "")
    tke = body.tunnel_key_exchange if body.tunnel_key_exchange is not None else (r[4] or "ikev2")
    is_default = (1 if body.is_default else 0) if body.is_default is not None else (r[5] or 0)
    q = f"""INSERT INTO {CLICKHOUSE_DATABASE}.organizations (id, account_id, group_id, name, group_name, tunnel_key_exchange, is_default) VALUES"""
    execute_many(q, [(UUID(org_id), r[0], gid, name, group_name, tke, is_default)])
    return {"id": org_id, "name": name, "is_default": bool(is_default)}
