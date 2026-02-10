"""
API module corresponding to gui/src/pages/About.jsx.
Returns product and app info for the About page.
"""
import json
import os

from fastapi import APIRouter

router = APIRouter()


def _load_config_json() -> dict:
    path = os.path.join(os.path.dirname(__file__), "..", "resource", "config.json")
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


@router.get("/about")
def about():
    """Product and organization/vendor info; links to account and device-configuration docs."""
    cfg = _load_config_json()
    return {
        "product": cfg.get("product", "SD-WAN-CMS"),
        "company": cfg.get("company", "R & D"),
        "version": "1.0.0",
        "links": {
            "account_and_organizations": "/account/about",
            "device_configuration": "/inventory/device-configuration",
        },
    }
