"""API config from environment and api/resource/config.json.
Unified DB config: db_type, db_host, db_port, db_name, db_user, db_password.
If config file is missing, the API generates it with defaults (ClickHouse) and a random handshaking token.
"""
import json
import os
import secrets

_CONFIG_JSON = None
_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "resource", "config.json")

# Default config when file is missing
_DEFAULT_CONFIG = {
    "api_host": "0.0.0.0",
    "api_port": 3443,
    "api_prefix": "/sdwan_cms_api",
    "db_type": "clickhouse",
    "db_host": "localhost",
    "db_port": 9000,
    "db_name": "sdwan_cms",
    "db_user": "default",
    "db_password": "",
    "audit_log_retention_in_days": 30,
    "log_path": "/var/log/sdwan_cms_api",
}


def _ensure_handshaking_token(data: dict) -> dict:
    """Ensure handshaking_token exists; add random hex (32 bytes) if missing. Mutates data."""
    if not data.get("handshaking_token"):
        data["handshaking_token"] = secrets.token_hex(32)
    return data


def _load_config_json():
    global _CONFIG_JSON
    if _CONFIG_JSON is None:
        try:
            with open(_CONFIG_PATH, encoding="utf-8") as f:
                _CONFIG_JSON = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            _CONFIG_JSON = {}
        if not _CONFIG_JSON:
            _CONFIG_JSON = dict(_DEFAULT_CONFIG)
            try:
                os.makedirs(os.path.dirname(_CONFIG_PATH), exist_ok=True)
                with open(_CONFIG_PATH, "w", encoding="utf-8") as f:
                    json.dump(_CONFIG_JSON, f, indent=2)
            except OSError:
                pass
        # Do not auto-add handshaking_token: when missing, API does not require validation,
        # so existing GUIs and configs work. Add handshaking_token via config dialog or manually to enable.
    return _CONFIG_JSON


def reload_config():
    """Force reload of config from file (e.g. after GUI update)."""
    global _CONFIG_JSON
    _CONFIG_JSON = None
    return _load_config_json()


def _get(key: str, env_var: str, default: str) -> str:
    value = os.environ.get(env_var)
    if value is not None:
        return value
    c = _load_config_json()
    # Backward compat: map old clickhouse_* to db_* when db_* missing
    if key == "db_host" and key not in c and c.get("clickhouse_host") is not None:
        return str(c.get("clickhouse_host", default))
    if key == "db_port" and key not in c and c.get("clickhouse_port") is not None:
        return str(c.get("clickhouse_port", default))
    if key == "db_name" and key not in c and c.get("clickhouse_database") is not None:
        return str(c.get("clickhouse_database", default))
    if key == "db_user" and key not in c and c.get("clickhouse_user") is not None:
        return str(c.get("clickhouse_user", default))
    if key == "db_password" and key not in c and c.get("clickhouse_password") is not None:
        return str(c.get("clickhouse_password", default))
    return str(c.get(key, default))


def _get_int(key: str, env_var: str, default: int) -> int:
    value = os.environ.get(env_var)
    if value is not None:
        try:
            return int(value)
        except ValueError:
            pass
    c = _load_config_json()
    if key == "db_port" and key not in c and c.get("clickhouse_port") is not None:
        try:
            return int(c.get("clickhouse_port"))
        except (TypeError, ValueError):
            pass
    v = c.get(key, default)
    return int(v) if v is not None else default


# API listener
API_HOST = _get("api_host", "API_HOST", "0.0.0.0")
API_PORT = _get_int("api_port", "API_PORT", 3443)
API_PREFIX = _get("api_prefix", "API_PREFIX", "/sdwan_cms_api")

# Handshaking: GUI sends SHA256(handshaking_token + random_number) and random_number; API validates.
HANDSHAKING_TOKEN = os.environ.get("HANDSHAKING_TOKEN") or str(_load_config_json().get("handshaking_token", ""))

# DB: unified keys (db_type, db_host, db_port, db_name, db_user, db_password)
DB_TYPE = (os.environ.get("DB_TYPE") or _get("db_type", "DB_TYPE", "clickhouse")).strip().lower() or "clickhouse"
DB_HOST = _get("db_host", "DB_HOST", "localhost")
DB_PORT = _get_int("db_port", "DB_PORT", 9000)
DB_NAME = _get("db_name", "DB_NAME", "sdwan_cms")
DB_USER = _get("db_user", "DB_USER", "default")
DB_PASSWORD = os.environ.get("DB_PASSWORD") or _get("db_password", "DB_PASSWORD", "")

# Backward compat for code that still uses CLICKHOUSE_* (same as db_* when db_type=clickhouse)
CLICKHOUSE_HOST = DB_HOST
CLICKHOUSE_PORT = DB_PORT
CLICKHOUSE_DATABASE = DB_NAME
CLICKHOUSE_USER = DB_USER
CLICKHOUSE_PASSWORD = DB_PASSWORD

# CMS API listener (for token payload)
CMS_API_HOST = os.environ.get("CMS_API_HOST") or _load_config_json().get("api_host", "localhost")
CMS_API_PORT = _get_int("api_port", "CMS_API_PORT", 3443)

AUDIT_LOG_RETENTION_DAYS = _get_int("audit_log_retention_in_days", "AUDIT_LOG_RETENTION_DAYS", 30)
LOG_PATH = _get("log_path", "LOG_PATH", "/var/log/sdwan_cms_api")
