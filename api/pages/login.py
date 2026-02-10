"""
API module corresponding to gui/src/pages/Login.jsx.
Business logic for login: validate email + password against users table.
"""
import hashlib

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import CLICKHOUSE_DATABASE
from db import execute

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


def _password_sha256_hex(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


@router.post("/login")
def login(body: LoginRequest):
    """
    Validate credentials. Returns user info if valid else 401.
    GUI uses sessionStorage for session; this endpoint only validates.
    """
    email = (body.email or "").strip().lower()
    password = body.password or ""
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required.")
    password_hash = _password_sha256_hex(password)
    q = f"""SELECT id, email, name, account_id, is_owner, enabled, password_hash
FROM {CLICKHOUSE_DATABASE}.users FINAL
WHERE email = %(email)s
LIMIT 1"""
    rows = execute(q, {"email": email})
    if not rows:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    row = rows[0]
    if row[6] != password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if row[5] == 0:
        raise HTTPException(status_code=403, detail="Account is disabled.")
    account_id = str(row[3]) if row[3] else None
    master_organization_name = ""
    if account_id:
        acc = execute(
            f"SELECT master_organization_name FROM {CLICKHOUSE_DATABASE}.accounts FINAL WHERE id = %(id)s LIMIT 1",
            {"id": account_id},
        )
        if acc and len(acc[0]) and acc[0][0]:
            master_organization_name = acc[0][0]
    return {
        "ok": True,
        "user_id": str(row[0]),
        "email": row[1],
        "name": row[2],
        "account_id": account_id,
        "is_owner": bool(row[4]),
        "master_organization_name": master_organization_name,
    }
