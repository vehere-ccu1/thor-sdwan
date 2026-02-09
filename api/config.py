"""API config from environment and api/resource/config.json."""
import json
import os

_CONFIG_JSON = None
_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "resource", "config.json")


def _load_config_json():
    global _CONFIG_JSON
    if _CONFIG_JSON is None:
        try:
            with open(_CONFIG_PATH, encoding="utf-8") as f:
                _CONFIG_JSON = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            _CONFIG_JSON = {}
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
    return str(_load_config_json().get(key, default))


def _get_int(key: str, env_var: str, default: int) -> int:
    value = os.environ.get(env_var)
    if value is not None:
        try:
            return int(value)
        except ValueError:
            pass
    v = _load_config_json().get(key, default)
    return int(v) if v is not None else default


# API listener (bind address, port, URL prefix) – from config; restart required to apply changes
API_HOST = _get("api_host", "API_HOST", "0.0.0.0")
API_PORT = _get_int("api_port", "API_PORT", 3443)
API_PREFIX = _get("api_prefix", "API_PREFIX", "/sdwan_cms_api")

# ClickHouse
CLICKHOUSE_HOST = _get("clickhouse_host", "CLICKHOUSE_HOST", "localhost")
CLICKHOUSE_PORT = _get_int("clickhouse_port", "CLICKHOUSE_PORT", 9000)
CLICKHOUSE_DATABASE = _get("clickhouse_database", "CLICKHOUSE_DATABASE", "sdwan_cms")
CLICKHOUSE_USER = _get("clickhouse_user", "CLICKHOUSE_USER", "default")
CLICKHOUSE_PASSWORD = _get("clickhouse_password", "CLICKHOUSE_PASSWORD", "")

# CMS API listener (for token payload: agent uses this to reach the CMS) – same as API_HOST/PORT
CMS_API_HOST = os.environ.get("CMS_API_HOST") or _load_config_json().get("api_host", "localhost")
CMS_API_PORT = _get_int("api_port", "CMS_API_PORT", 3443)

# Audit trail: records are never deleted by API; only TTL (retention) drops old rows
AUDIT_LOG_RETENTION_DAYS = _get_int("audit_log_retention_in_days", "AUDIT_LOG_RETENTION_DAYS", 30)

# Log file directory (API writes e.g. api.log under this path)
LOG_PATH = _get("log_path", "LOG_PATH", "/var/log/sdwan_cms_api")
