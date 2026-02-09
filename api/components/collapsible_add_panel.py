"""
API module corresponding to gui/src/components/CollapsibleAddPanel.jsx.
Collapsible panel has no dedicated API.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/components/collapsible-add-panel")
def collapsible_add_panel_info():
    return {"component": "CollapsibleAddPanel", "description": "Expandable add form panel."}
