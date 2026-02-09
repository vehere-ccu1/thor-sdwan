"""
API module corresponding to gui/src/pages/inventory/devices/PacketTraces.jsx.
Device Packet Traces tab. Stub until device API is full.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/devices/{device_id}/packet-traces")
def get_device_packet_traces(device_id: str):
    """Device packet traces. Full API TBD."""
    return {"device_id": device_id, "packet_traces": []}
