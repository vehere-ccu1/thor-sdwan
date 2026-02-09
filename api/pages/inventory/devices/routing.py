"""
API module corresponding to gui/src/pages/inventory/devices/Routing.jsx.
Device Routing tab. Stub until device API is full.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/devices/{device_id}/routing")
def get_device_routing(device_id: str):
    """Device routing config. Full API TBD."""
    return {"device_id": device_id, "routing": {}}
