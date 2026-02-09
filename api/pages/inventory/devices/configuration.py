"""
API module corresponding to gui/src/pages/inventory/devices/Configuration.jsx.
Device Configuration tab. Stub until device API is full.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/devices/{device_id}/configuration")
def get_device_configuration(device_id: str):
    """Device configuration. Full API TBD."""
    return {"device_id": device_id, "configuration": {}}
