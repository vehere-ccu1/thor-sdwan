"""
API module corresponding to gui/src/components/SideMenu.jsx.
Menu config is in GUI; this endpoint returns menu info for debugging.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/components/side-menu")
def side_menu_info():
    return {"component": "SideMenu", "description": "Navigation menu; config in GUI menuConfig.js."}
