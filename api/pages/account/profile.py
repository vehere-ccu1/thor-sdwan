"""
API module corresponding to gui/src/pages/account/Profile.jsx.
Business logic: account CRUD (list, create, update, delete).
"""
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException

from config import CLICKHOUSE_DATABASE
from db import execute, execute_many
from models import AccountCreate, AccountUpdate, row_to_dict

router = APIRouter()


@router.get("/accounts")
def list_accounts():
    cols = ["id", "name", "billing_email", "created_at", "updated_at"]
    q = f"SELECT {','.join(cols)} FROM {CLICKHOUSE_DATABASE}.accounts FINAL ORDER BY created_at DESC"
    rows = execute(q)
    return [row_to_dict(cols, r) for r in rows]


@router.post("/accounts")
def create_account(body: AccountCreate):
    uid = uuid4()
    q = f"""INSERT INTO {CLICKHOUSE_DATABASE}.accounts (id, name, billing_email) VALUES"""
    execute_many(q, [(uid, body.name or "", body.billing_email)])
    return {"id": str(uid), "name": body.name, "billing_email": body.billing_email}


@router.put("/accounts/{account_id}")
def update_account(account_id: str, body: AccountUpdate):
    existing = execute(
        f"SELECT id, name, billing_email FROM {CLICKHOUSE_DATABASE}.accounts FINAL WHERE id = %(id)s",
        {"id": account_id},
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Account not found")
    row = existing[0]
    name = body.name if body.name is not None else (row[1] or "")
    billing_email = body.billing_email if body.billing_email is not None else (row[2] or "")
    q = f"""INSERT INTO {CLICKHOUSE_DATABASE}.accounts (id, name, billing_email) VALUES"""
    execute_many(q, [(UUID(account_id), name, billing_email)])
    return {"id": account_id, "name": name, "billing_email": billing_email}


@router.delete("/accounts/{account_id}")
def delete_account(account_id: str):
    return {"deleted": account_id}
