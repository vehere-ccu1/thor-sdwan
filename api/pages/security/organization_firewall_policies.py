"""
API module corresponding to gui/src/pages/security/OrganizationFirewallPolicies.jsx.
Business logic: list firewall rules by organization.
"""
from fastapi import APIRouter

from config import CLICKHOUSE_DATABASE
from db import execute
from models import row_to_dict

router = APIRouter()


@router.get("/firewall-rules")
def list_firewall_rules(organization_id: str | None = None):
    """List firewall rules. Used by Organization Firewall Policies page."""
    cols = ["id", "organization_id", "direction", "name", "destination", "source", "action", "description", "enabled", "sort_order", "created_at", "updated_at"]
    q = f"SELECT {','.join(cols)} FROM {CLICKHOUSE_DATABASE}.firewall_rules FINAL"
    params = {}
    if organization_id:
        q += " WHERE organization_id = %(organization_id)s"
        params["organization_id"] = organization_id
    q += " ORDER BY organization_id, direction, sort_order"
    rows = execute(q, params)
    return [row_to_dict(cols, r) for r in rows]
