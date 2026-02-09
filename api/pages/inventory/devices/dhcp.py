"""
API module corresponding to gui/src/pages/inventory/devices/Dhcp.jsx.
Device DHCP tab. Stub until device API is full.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/devices/{device_id}/dhcp")
def get_device_dhcp(device_id: str):
    """Device DHCP config. Full API TBD."""
    return {"device_id": device_id, "dhcp": []}
