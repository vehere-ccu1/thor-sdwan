"""
API module corresponding to gui/src/pages/inventory/devices/Interfaces.jsx.
Device Interfaces tab. Stub until device API is full.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/devices/{device_id}/interfaces")
def get_device_interfaces(device_id: str):
    """Device interfaces. Full API TBD."""
    return {"device_id": device_id, "interfaces": []}
