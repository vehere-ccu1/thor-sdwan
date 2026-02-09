"""
API module corresponding to gui/src/pages/inventory/devices/PlaceholderTab.jsx.
Placeholder device tab. No dedicated API.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/devices/{device_id}/placeholder")
def get_device_placeholder(device_id: str):
    """Placeholder tab stub."""
    return {"device_id": device_id, "placeholder": True}
