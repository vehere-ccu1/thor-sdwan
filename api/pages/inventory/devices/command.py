"""
API module corresponding to gui/src/pages/inventory/devices/Command.jsx.
Device Command tab (CLI). Stub until device API is full.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/devices/{device_id}/command")
def get_device_command_info(device_id: str):
    """Device command/CLI info. Full API TBD."""
    return {"device_id": device_id, "command": ""}
