"""
API module for application configuration (api/resource/config.json).
GET returns current config; PUT updates the config file. Used by the GUI Configuration page.
"""
import json

from fastapi import APIRouter, HTTPException

from config import _CONFIG_PATH, _load_config_json, reload_config

router = APIRouter()

# Keys that the GUI may read and update (all config file keys)
CONFIG_KEYS = {
    "api_host",
    "api_port",
    "api_prefix",
    "product",
    "company",
    "clickhouse_host",
    "clickhouse_port",
    "clickhouse_database",
    "clickhouse_user",
    "clickhouse_password",
    "audit_log_retention_in_days",
    "log_path",
}


def _mask_password(data: dict) -> dict:
    out = dict(data)
    if "clickhouse_password" in out and out["clickhouse_password"]:
        out["clickhouse_password"] = "****"
    return out


@router.get("/config")
def get_config(mask_passwords: bool = True):
    """
    Return current configuration from api/resource/config.json.
    If mask_passwords=true (default), clickhouse_password is returned as ****.
    """
    try:
        data = _load_config_json()
        # Normalize types for GUI (e.g. port as number)
        result = {}
        for k, v in data.items():
            if k == "api_port" or k == "clickhouse_port":
                try:
                    result[k] = int(v)
                except (TypeError, ValueError):
                    result[k] = v
            elif k == "audit_log_retention_in_days":
                try:
                    result[k] = int(v)
                except (TypeError, ValueError):
                    result[k] = v
            else:
                result[k] = v
        return _mask_password(result) if mask_passwords else result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read config: {e!s}")


@router.put("/config")
def update_config(body: dict):
    """
    Update config file with provided keys (merge). Only known keys are written.
    Changes to api_host, api_port, api_prefix require an API restart to take effect.
    """
    if not body or not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="Body must be a JSON object")
    try:
        current = _load_config_json()
        for k, v in body.items():
            if k not in CONFIG_KEYS:
                continue
            if k in ("api_port", "clickhouse_port", "audit_log_retention_in_days"):
                try:
                    current[k] = int(v)
                except (TypeError, ValueError):
                    current[k] = v
            else:
                current[k] = v
        with open(_CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(current, f, indent=2)
        reload_config()
        return _mask_password(current)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Config file not found")
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Invalid config file: {e!s}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write config: {e!s}")
