"""
API module corresponding to gui/src/pages/inventory/devices/Apps.jsx.
Device Apps status tab. Stub until device API is full.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/devices/{device_id}/apps")
def get_device_apps(device_id: str):
    """Device apps status. Full API TBD."""
    return {"device_id": device_id, "apps": []}
