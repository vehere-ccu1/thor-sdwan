# API modules corresponding to gui/src/pages/inventory/devices/
"""
Devices list (gui/src/pages/inventory/Devices.jsx). Business logic: list devices by organization.
"""
from fastapi import APIRouter

from config import CLICKHOUSE_DATABASE
from db import execute
from models import row_to_dict

router = APIRouter()


@router.get("/devices")
def list_devices(organization_id: str | None = None):
    """List devices. Used by Devices page. Optional filter by organization_id."""
    cols = ["id", "organization_id", "name", "host_name", "description", "approves", "serial_number", "machine_id", "device_version", "created_at", "updated_at"]
    q = f"SELECT {','.join(cols)} FROM {CLICKHOUSE_DATABASE}.devices FINAL"
    params = {}
    if organization_id:
        q += " WHERE organization_id = %(organization_id)s"
        params["organization_id"] = organization_id
    q += " ORDER BY name"
    rows = execute(q, params)
    return [row_to_dict(cols, r) for r in rows]
