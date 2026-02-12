"""
API module corresponding to gui/src/pages/Home.jsx.
Dashboard summary: counts for accounts, users, organizations.
"""
from fastapi import APIRouter

from config import CLICKHOUSE_DATABASE
from db import execute

router = APIRouter()


@router.get("/dashboard/summary")
def dashboard_summary():
    """Return counts for home/dashboard. Used by Home page."""
    accounts = execute(
        f"SELECT count() FROM {CLICKHOUSE_DATABASE}.accounts FINAL"
    )
    users = execute(
        f"SELECT count() FROM {CLICKHOUSE_DATABASE}.users FINAL"
    )
    sites = execute(
        f"SELECT count() FROM {CLICKHOUSE_DATABASE}.sites FINAL"
    )
    return {
        "accounts": accounts[0][0] if accounts else 0,
        "users": users[0][0] if users else 0,
        "organizations": sites[0][0] if sites else 0,
    }
