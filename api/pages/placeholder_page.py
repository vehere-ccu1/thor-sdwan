"""
API module corresponding to gui/src/pages/PlaceholderPage.jsx.
Generic placeholder page. No specific backend; optional info endpoint.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/placeholder")
def placeholder_info():
    """Return placeholder page info. Used by any placeholder route in GUI."""
    return {"message": "Placeholder", "description": "This section is under development."}
