"""
API module for application configuration (api/resource/config.json).
GET returns current config; PUT updates the config file. Used by the GUI Configuration page.
Pre-login: POST /config/test-api, POST /config/test-db, POST /config/save for the config dialog.
"""
import json
import os

from fastapi import APIRouter, HTTPException, Header

from config import (
    _CONFIG_PATH,
    _load_config_json,
    HANDSHAKING_TOKEN,
    reload_config,
)
from db_wrapper import test_db_connection

router = APIRouter()

# Keys that the GUI may read and update (unified: db_type, db_host, db_port, db_name, db_user, db_password)
CONFIG_KEYS = {
    "api_host",
    "api_port",
    "api_prefix",
    "handshaking_token",
    "db_type",
    "db_host",
    "db_port",
    "db_name",
    "db_user",
    "db_password",
    "product",
    "company",
    "audit_log_retention_in_days",
    "log_path",
}


def _mask_secrets(data: dict) -> dict:
    out = dict(data)
    for key in ("db_password", "handshaking_token"):
        if key in out and out[key]:
            out[key] = "****"
    return out


@router.get("/config")
def get_config(mask_passwords: bool = True):
    """
    Return current configuration from api/resource/config.json.
    If mask_passwords=true (default), clickhouse_password and db_password are returned as ****.
    """
    try:
        data = _load_config_json()
        # Normalize types for GUI (e.g. port as number)
        result = {}
        for k, v in data.items():
            if k in ("api_port", "clickhouse_port", "db_port"):
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
        # Normalize to unified db_* for GUI (backward compat when file has only clickhouse_*)
        if "db_type" not in result and ("clickhouse_host" in result or "clickhouse_database" in result):
            result["db_type"] = "clickhouse"
        if "db_host" not in result and result.get("clickhouse_host") is not None:
            result["db_host"] = result["clickhouse_host"]
        if "db_port" not in result and result.get("clickhouse_port") is not None:
            try:
                result["db_port"] = int(result["clickhouse_port"])
            except (TypeError, ValueError):
                result["db_port"] = 9000
        if "db_name" not in result and result.get("clickhouse_database") is not None:
            result["db_name"] = result["clickhouse_database"]
        if "db_user" not in result and result.get("clickhouse_user") is not None:
            result["db_user"] = result["clickhouse_user"]
        if "db_password" not in result and result.get("clickhouse_password") is not None:
            result["db_password"] = result["clickhouse_password"]
        return _mask_secrets(result) if mask_passwords else result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read config: {e!s}")


# ---------- Pre-login config dialog: test API key, test DB, save config ----------


@router.post("/config/test-api")
def config_test_api(body: dict | None = None):
    """
    Test API connectivity. Returns { "ok": true, "handshaking_token": "..." } so the GUI
    can store the token and use it for subsequent requests (SHA256(token + random) + random).
    """
    token = HANDSHAKING_TOKEN or ""
    return {"ok": True, "handshaking_token": token, "message": "API OK"}


@router.post("/config/test-db")
def config_test_db(body: dict):
    """
    Test DB connectivity. Body: db_type, host, port, user, password, database.
    Returns { "ok": true } on success.
    """
    if not body or not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="Body must be a JSON object")
    db_type = (body.get("db_type") or "clickhouse").strip().lower()
    host = str(body.get("host", "")).strip() or "localhost"
    try:
        port = int(body.get("port", 0))
    except (TypeError, ValueError):
        port = 9000 if db_type == "clickhouse" else 0
    user = str(body.get("user", "")).strip()
    password = str(body.get("password", "")).strip()
    database = str(body.get("db_name") or body.get("database", "")).strip()
    ok, msg = test_db_connection(
        db_type=db_type,
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
    )
    if ok:
        return {"ok": True, "message": msg}
    raise HTTPException(status_code=400, detail=msg)


@router.post("/config/save")
def config_save(body: dict):
    """
    Save config to api/resource/config.json (merge with existing). Creates file if missing.
    Body: same keys as CONFIG_KEYS. Used after config dialog when both API and DB tests pass.
    """
    if not body or not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="Body must be a JSON object")
    try:
        current = _load_config_json()
        for k, v in body.items():
            if k not in CONFIG_KEYS:
                continue
            if k in ("api_port", "db_port", "audit_log_retention_in_days"):
                try:
                    current[k] = int(v)
                except (TypeError, ValueError):
                    current[k] = v
            else:
                current[k] = v
        os.makedirs(os.path.dirname(_CONFIG_PATH), exist_ok=True)
        with open(_CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(current, f, indent=2)
        reload_config()
        return _mask_secrets(current)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write config: {e!s}")


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
            if k in ("api_port", "db_port", "audit_log_retention_in_days"):
                try:
                    current[k] = int(v)
                except (TypeError, ValueError):
                    current[k] = v
            else:
                current[k] = v
        with open(_CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(current, f, indent=2)
        reload_config()
        return _mask_secrets(current)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Config file not found")
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Invalid config file: {e!s}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write config: {e!s}")
