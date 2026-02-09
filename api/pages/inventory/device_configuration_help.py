"""
API module corresponding to gui/src/pages/inventory/DeviceConfigurationHelp.jsx.
Device configuration help (static). Optional info endpoint.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/device-configuration-help")
def device_configuration_help_info():
    """Return doc link/info for Device Configuration help page."""
    return {"title": "Device Configuration", "path": "/inventory/device-configuration"}
