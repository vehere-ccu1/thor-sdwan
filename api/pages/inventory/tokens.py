"""
API module corresponding to gui/src/pages/inventory/Tokens.jsx.
Business logic: organization tokens (list, create, revoke).
"""
import base64
import json
import zlib
from secrets import token_hex
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException

from config import CLICKHOUSE_DATABASE, CMS_API_HOST, CMS_API_PORT
from db import execute, execute_many
from models import TokenCreate, row_to_dict

router = APIRouter()


@router.get("/tokens")
def list_tokens(organization_id: str | None = None):
    cols = ["id", "organization_id", "organization_name", "label", "created_at", "updated_at"]
    q = f"""SELECT t.id, t.organization_id, o.name AS organization_name, t.label, t.created_at, t.updated_at
FROM {CLICKHOUSE_DATABASE}.organization_tokens t
LEFT JOIN {CLICKHOUSE_DATABASE}.sites o ON t.organization_id = o.id
FINAL
WHERE t.revoked = 0"""
    params = {}
    if organization_id:
        q += " AND t.organization_id = %(organization_id)s"
        params["organization_id"] = organization_id
    q += " ORDER BY t.created_at DESC"
    rows = execute(q, params)
    return [row_to_dict(cols, r) for r in rows]


@router.post("/tokens")
def create_token(body: TokenCreate):
    org_id = UUID(body.organization_id)
    existing = execute(
        f"SELECT name FROM {CLICKHOUSE_DATABASE}.sites FINAL WHERE id = %(id)s",
        {"id": str(org_id)},
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Organization not found")
    org_name = existing[0][0] or ""
    token_secret = token_hex(32)
    uid = uuid4()
    payload = {
        "api_host": CMS_API_HOST,
        "api_port": CMS_API_PORT,
        "encryption_key_info": "",
        "organization_name": org_name,
        "token_secret": token_secret,
    }
    compressed = zlib.compress(json.dumps(payload).encode("utf-8"))
    token_base64 = base64.b64encode(compressed).decode("ascii")
    q = f"""INSERT INTO {CLICKHOUSE_DATABASE}.organization_tokens (id, organization_id, token_secret, label, revoked) VALUES"""
    execute_many(q, [(uid, org_id, token_secret, body.label or "", 0)])
    return {
        "id": str(uid),
        "organization_id": body.organization_id,
        "organization_name": org_name,
        "label": body.label,
        "token_base64": token_base64,
        "created_at": None,
    }


@router.delete("/tokens/{token_id}")
def revoke_token(token_id: str):
    existing = execute(
        f"SELECT id, organization_id, token_secret, label FROM {CLICKHOUSE_DATABASE}.organization_tokens FINAL WHERE id = %(id)s AND revoked = 0",
        {"id": token_id},
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Token not found")
    r = existing[0]
    q = f"""INSERT INTO {CLICKHOUSE_DATABASE}.organization_tokens (id, organization_id, token_secret, label, revoked) VALUES"""
    execute_many(q, [(UUID(token_id), r[1], r[2], r[3] or "", 1)])
    return {"revoked": token_id}
