"""
API module corresponding to gui/src/pages/inventory/Tunnels.jsx.
Business logic: list VPN tunnels by organization.
"""
from fastapi import APIRouter

from config import CLICKHOUSE_DATABASE
from db import execute
from models import row_to_dict

router = APIRouter()


@router.get("/vpn-tunnels")
def list_vpn_tunnels(organization_id: str | None = None):
    """List VPN tunnels. Used by Tunnels page. Optional filter by organization_id."""
    cols = ["id", "organization_id", "device_a_id", "device_b_id", "interface_a", "interface_b", "path_label", "encrypt", "status", "created_at", "updated_at"]
    q = f"SELECT {','.join(cols)} FROM {CLICKHOUSE_DATABASE}.vpn_tunnels FINAL"
    params = {}
    if organization_id:
        q += " WHERE organization_id = %(organization_id)s"
        params["organization_id"] = organization_id
    q += " ORDER BY organization_id, path_label"
    rows = execute(q, params)
    return [row_to_dict(cols, r) for r in rows]
