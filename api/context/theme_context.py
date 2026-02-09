"""
API module corresponding to gui/src/context/ThemeContext.jsx.
Theme is client-side; this endpoint returns theme info.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/context/theme")
def theme_info():
    return {"context": "ThemeContext", "modes": ["light", "dark"], "description": "Client-side theme."}
