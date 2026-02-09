"""
API module corresponding to gui/src/components/Icons.jsx.
Icons are client-side; this endpoint returns icon set info.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/components/icons")
def icons_info():
    return {"component": "Icons", "description": "Icon components; no server API."}
