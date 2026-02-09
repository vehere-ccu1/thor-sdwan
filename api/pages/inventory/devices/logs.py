"""
API module corresponding to gui/src/pages/inventory/devices/Logs.jsx.
Device Logs tab. Stub until device API is full.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/devices/{device_id}/logs")
def get_device_logs(device_id: str):
    """Device logs. Full API TBD."""
    return {"device_id": device_id, "logs": []}
