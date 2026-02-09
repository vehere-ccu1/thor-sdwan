"""
API module corresponding to gui/src/pages/account/AboutAccounts.jsx.
About accounts and organizations (static help). Optional info endpoint.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/about-accounts")
def about_accounts_info():
    """Return doc link/info for About Accounts page."""
    return {"title": "About Accounts and Organizations", "path": "/account/about"}
