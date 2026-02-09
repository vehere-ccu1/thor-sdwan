"""
API module corresponding to gui/src/pages/inventory/devices/General.jsx.
Device General tab: hardware config, IKEv2 keys. Stub until device API is full.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/devices/{device_id}/general")
def get_device_general(device_id: str):
    """Device general settings. Full API TBD."""
    return {"device_id": device_id, "hardware_config": {}, "ikev2": {}}
