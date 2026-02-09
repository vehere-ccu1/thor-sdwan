"""
API module corresponding to gui/src/pages/Users.jsx.
Business logic: users and user permissions CRUD.
"""
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException

from config import CLICKHOUSE_DATABASE
from db import execute, execute_many
from models import PermissionCreate, PermissionUpdate, UserCreate, UserUpdate, row_to_dict

router = APIRouter()


@router.get("/users")
def list_users(account_id: str | None = None):
    cols = ["id", "email", "name", "account_id", "entity_id", "is_owner", "enabled", "created_at", "updated_at", "role_name", "permissions", "account_billing_email"]
    q = f"SELECT {','.join(cols)} FROM {CLICKHOUSE_DATABASE}.users_with_roles"
    params = {}
    if account_id:
        q += " WHERE account_id = %(account_id)s"
        params["account_id"] = account_id
    q += " ORDER BY email"
    rows = execute(q, params)
    return [row_to_dict(cols, r) for r in rows]


@router.post("/users")
def create_user(body: UserCreate):
    uid = uuid4()
    role_id = UUID(body.role_id) if body.role_id else None
    q = f"""INSERT INTO {CLICKHOUSE_DATABASE}.users (id, account_id, email, name, password_hash, role_id, is_owner, enabled) VALUES"""
    execute_many(q, [(uid, UUID(body.account_id), body.email, body.name or "", body.password_hash or "", role_id, 1 if body.is_owner else 0, 1 if body.enabled else 0)])
    return {"id": str(uid), "account_id": body.account_id, "email": body.email, "name": body.name, "is_owner": body.is_owner, "enabled": body.enabled}


@router.put("/users/{user_id}")
def update_user(user_id: str, body: UserUpdate):
    existing = execute(
        f"SELECT account_id, email, name, role_id, is_owner, enabled FROM {CLICKHOUSE_DATABASE}.users FINAL WHERE id = %(id)s",
        {"id": user_id},
    )
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    r = existing[0]
    name = body.name if body.name is not None else (r[2] or "")
    role_id = UUID(body.role_id) if body.role_id is not None else r[3]
    is_owner = (1 if body.is_owner else 0) if body.is_owner is not None else (r[4] or 0)
    enabled = (1 if body.enabled else 0) if body.enabled is not None else (r[5] or 1)
    q = f"""INSERT INTO {CLICKHOUSE_DATABASE}.users (id, account_id, email, name, password_hash, role_id, is_owner, enabled) VALUES"""
    execute_many(q, [(UUID(user_id), r[0], r[1], name, "", role_id, is_owner, enabled)])
    return {"id": user_id, "email": r[1], "name": name, "is_owner": bool(is_owner), "enabled": bool(enabled)}


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
