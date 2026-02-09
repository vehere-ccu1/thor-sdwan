"""
API module for Audit Trail (gui Audit Trail page).
Append-only; no delete. Role-based: Owner=all, Manager=assigned orgs/account, Viewer=self only.
Deletion is by TTL only (audit_log_retention_in_days in config).
"""
from uuid import UUID

from fastapi import APIRouter, HTTPException

from config import CLICKHOUSE_DATABASE
from db import execute
from models import row_to_dict

router = APIRouter()

# No DELETE endpoint: records are removed only by ClickHouse TTL (retention).


def _get_user_context(user_id: str) -> tuple[bool, UUID | None, list[str]]:
    """Return (is_owner, account_id, list of permitted organization_ids for manager)."""
    q = f"""SELECT account_id, is_owner FROM {CLICKHOUSE_DATABASE}.users FINAL WHERE id = %(id)s LIMIT 1"""
    rows = execute(q, {"id": user_id})
    if not rows:
        raise HTTPException(status_code=404, detail="User not found")
    account_id = rows[0][0]
    is_owner = rows[0][1] == 1
    org_ids = []
    if not is_owner and account_id:
        perm_q = f"""SELECT permission_to, entity_id FROM {CLICKHOUSE_DATABASE}.user_permissions_final WHERE user_id = %(user_id)s AND role IN ('owner', 'manager')"""
        perms = execute(perm_q, {"user_id": user_id})
        for p in perms or []:
            if p[0] == "organization" and p[1]:
                org_ids.append(str(p[1]))
    return is_owner, account_id, org_ids


@router.get("/audit-trail")
def list_audit_trail(
    user_id: str,
    date_from: str | None = None,
    date_to: str | None = None,
    action: str | None = None,
    resource: str | None = None,
    group_by: str | None = None,
):
    """
    List audit logs with role-based visibility.
    Owner: all. Manager: assigned account + organizations. Viewer: own logs only.
    Records are never deletable by API; only TTL (retention) applies.
    """
    is_owner, account_id, permitted_org_ids = _get_user_context(user_id)
    cols = ["id", "ts", "user_id", "user_email", "action", "resource", "resource_id", "details", "ip", "user_agent", "account_id", "organization_id"]
    q = f"""SELECT id, ts, user_id, user_email, action, resource, resource_id, details, ip, user_agent, account_id, organization_id FROM {CLICKHOUSE_DATABASE}.audit_trail"""
    params = {}
    conditions = []
    if is_owner:
        pass
    else:
        if permitted_org_ids:
            conditions.append("(user_id = %(viewer_user_id)s OR account_id = %(viewer_account_id)s OR organization_id IN %(permitted_org_ids)s)")
            params["viewer_user_id"] = user_id
            params["viewer_account_id"] = str(account_id) if account_id else ""
            params["permitted_org_ids"] = list(permitted_org_ids)
        else:
            conditions.append("user_id = %(viewer_user_id)s")
            params["viewer_user_id"] = user_id
    if date_from:
        conditions.append("ts >= %(date_from)s")
        params["date_from"] = date_from
    if date_to:
        conditions.append("ts <= %(date_to)s")
        params["date_to"] = date_to
    if action:
        conditions.append("action = %(action)s")
        params["action"] = action
    if resource:
        conditions.append("resource = %(resource)s")
        params["resource"] = resource
    if conditions:
        q += " WHERE " + " AND ".join(conditions)
    q += " ORDER BY ts DESC LIMIT 1000"
    rows = execute(q, params)
    result = [row_to_dict(cols, r) for r in rows]
    if group_by and result:
        key = group_by if group_by in ("action", "resource", "user_id", "user_email") else "action"
        seen = {}
        for r in result:
            k = r.get(key) or ""
            seen[k] = seen.get(k, 0) + 1
        return {"rows": result, "grouped": [{"key": k, "count": v} for k, v in seen.items()]}
    return {"rows": result, "grouped": []}
