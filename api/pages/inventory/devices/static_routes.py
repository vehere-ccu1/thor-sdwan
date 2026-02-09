"""
API module corresponding to gui/src/pages/inventory/devices/StaticRoutes.jsx.
Device Static Routes tab. Stub until device API is full.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/devices/{device_id}/static-routes")
def get_device_static_routes(device_id: str):
    """Device static routes. Full API TBD."""
    return {"device_id": device_id, "static_routes": []}
