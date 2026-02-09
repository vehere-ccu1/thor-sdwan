"""
API module corresponding to gui/src/pages/inventory/devices/Policies.jsx.
Device Policies tab. Stub until device API is full.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/devices/{device_id}/policies")
def get_device_policies(device_id: str):
    """Device policies. Full API TBD."""
    return {"device_id": device_id, "policies": []}
