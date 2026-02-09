"""
API module corresponding to gui/src/components/MainLayout.jsx.
Main layout has no dedicated API; this endpoint returns layout info for debugging.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/components/main-layout")
def main_layout_info():
    return {"component": "MainLayout", "description": "Header, sidebar, content wrapper."}
