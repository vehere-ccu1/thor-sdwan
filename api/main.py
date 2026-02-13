"""
Thor SD-WAN CMS API – Account and Users Management.
Stores data in ClickHouse. Run: uvicorn main:app --host 0.0.0.0 --port 3443
All route logic lives in pages/* modules; this file assembles the app and health.
On startup, missing tables are created by running SQL from the project db/ folder.
"""
import hashlib
import logging
import os
import threading

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import API_PREFIX, DB_TYPE, HANDSHAKING_TOKEN, LOG_PATH
from db import UnsupportedBackendError
from db_wrapper import check_current_db_health
from schema_sync import ensure_schema

# Configure logging to file under LOG_PATH (and keep console)
def _setup_logging():
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    try:
        os.makedirs(LOG_PATH, mode=0o755, exist_ok=True)
        log_file = os.path.join(LOG_PATH, "api.log")
        fh = logging.FileHandler(log_file, encoding="utf-8")
        fh.setLevel(logging.INFO)
        fh.setFormatter(fmt)
        root.addHandler(fh)
    except OSError:
        pass  # fallback to console only if dir not writable

_setup_logging()
logger = logging.getLogger(__name__)

PREFIX = API_PREFIX

# Paths that do not require handshaking (config dialog, login, forgot-password)
SKIP_HANDSHAKING_SUFFIXES = (
    "/config/test-api",
    "/config/test-db",
    "/config/save",
    "/login",
    "/forgot-password/request-otp",
    "/forgot-password/reset",
    "/create-owner-account",
)


class HandshakingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if HANDSHAKING_TOKEN and request.url.path.startswith(PREFIX):
            path = request.url.path[len(PREFIX):].lstrip("/")
            path_with_slash = "/" + path
            if not any(path_with_slash == s or path_with_slash.startswith(s + "/") for s in SKIP_HANDSHAKING_SUFFIXES):
                x_hash = request.headers.get("X-API-Hash", "")
                x_random = request.headers.get("X-API-Random", "")
                if not x_random or not x_hash:
                    return JSONResponse(status_code=401, content={"detail": "Missing X-API-Hash or X-API-Random"})
                expected = hashlib.sha256((HANDSHAKING_TOKEN + x_random).encode("utf-8")).hexdigest()
                if x_hash.strip().lower() != expected.lower():
                    return JSONResponse(status_code=401, content={"detail": "Invalid handshaking hash"})
        return await call_next(request)


# Explicit origins so CORS works with credentials (allow_origins=["*"] is invalid with allow_credentials=True).
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://[::1]:5173",
    "http://localhost:3443",
    "http://127.0.0.1:3443",
]

app = FastAPI(title="Thor SD-WAN CMS API", version="1.0.0")
app.add_middleware(HandshakingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


def _cors_headers(request: Request) -> dict:
    """Return CORS headers for error responses so browser does not block (e.g. on 500)."""
    origin = request.headers.get("origin", "")
    if origin in CORS_ORIGINS:
        return {"Access-Control-Allow-Origin": origin, "Access-Control-Allow-Credentials": "true"}
    return {}


@app.exception_handler(UnsupportedBackendError)
def unsupported_backend_handler(request: Request, exc: UnsupportedBackendError):
    """Return 503 when db_type is not supported for app data."""
    return JSONResponse(
        status_code=503,
        content={"detail": str(exc)},
        headers=_cors_headers(request),
    )


@app.exception_handler(Exception)
def generic_exception_handler(request: Request, exc: Exception):
    """Return 500 with CORS headers so the browser receives a proper response."""
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers=_cors_headers(request),
    )


@app.on_event("startup")
def on_startup():
    """
    Kick off ClickHouse schema sync.

    IMPORTANT: do not block API startup on ClickHouse availability. If ClickHouse
    is down/unreachable, schema sync can take timeouts; the API should still
    start and return proper HTTP errors (instead of failing to accept
    connections and causing ERR_EMPTY_RESPONSE in the UI).
    """

    def _run_schema_sync():
        try:
            ensure_schema()
        except Exception as e:
            logger.warning("Schema sync failed (API will still run): %s", e)

    threading.Thread(target=_run_schema_sync, name="schema-sync", daemon=True).start()


@app.get(f"{PREFIX}/health")
def health():
    """Health check. Handshaking validated by middleware when token is set. DB connectivity for configured db_type."""
    ok, msg = check_current_db_health()
    if not ok:
        raise HTTPException(status_code=503, detail=f"Database: {msg}")
    return {"status": "ok", "database": DB_TYPE}


# Include all page routers (each defines its own routes under PREFIX)
from components.collapsible_add_panel import router as collapsible_add_panel_router
from components.icons import router as icons_router
from components.main_layout import router as main_layout_router
from components.side_menu import router as side_menu_router
from context.theme_context import router as theme_context_router
from pages.about import router as about_router
from pages.audit_trail import router as audit_trail_router
from pages.config_app import router as config_app_router
from pages.account.about_accounts import router as about_accounts_router
from pages.account.organizations import router as organizations_router
from pages.account.profile import router as profile_router
from pages.create_account import router as create_account_router
from pages.forgot_password import router as forgot_password_router
from pages.home import router as home_router
from pages.inventory.device_configuration_help import router as device_configuration_help_router
from pages.inventory.devices import router as devices_router
from pages.inventory.devices.apps import router as devices_apps_router
from pages.inventory.devices.command import router as devices_command_router
from pages.inventory.devices.configuration import router as devices_configuration_router
from pages.inventory.devices.dhcp import router as devices_dhcp_router
from pages.inventory.devices.general import router as devices_general_router
from pages.inventory.devices.interfaces import router as devices_interfaces_router
from pages.inventory.devices.logs import router as devices_logs_router
from pages.inventory.devices.packet_traces import router as devices_packet_traces_router
from pages.inventory.devices.placeholder_tab import router as devices_placeholder_tab_router
from pages.inventory.devices.policies import router as devices_policies_router
from pages.inventory.devices.routing import router as devices_routing_router
from pages.inventory.devices.static_routes import router as devices_static_routes_router
from pages.inventory.tokens import router as tokens_router
from pages.inventory.traffic_app_identification import router as traffic_app_identification_router
from pages.inventory.tunnels import router as tunnels_router
from pages.login import router as login_router
from pages.placeholder_page import router as placeholder_router
from pages.security.organization_firewall_policies import router as organization_firewall_policies_router
from pages.users import router as users_router

app.include_router(create_account_router, prefix=PREFIX)
app.include_router(login_router, prefix=PREFIX)
app.include_router(forgot_password_router, prefix=PREFIX)
app.include_router(about_router, prefix=PREFIX)
app.include_router(audit_trail_router, prefix=PREFIX)
app.include_router(config_app_router, prefix=PREFIX)
app.include_router(home_router, prefix=PREFIX)
app.include_router(placeholder_router, prefix=PREFIX)
app.include_router(profile_router, prefix=PREFIX)
app.include_router(about_accounts_router, prefix=PREFIX)
app.include_router(organizations_router, prefix=PREFIX)
app.include_router(users_router, prefix=PREFIX)
app.include_router(tokens_router, prefix=PREFIX)
app.include_router(devices_router, prefix=PREFIX)
app.include_router(devices_general_router, prefix=PREFIX)
app.include_router(devices_interfaces_router, prefix=PREFIX)
app.include_router(devices_dhcp_router, prefix=PREFIX)
app.include_router(devices_routing_router, prefix=PREFIX)
app.include_router(devices_policies_router, prefix=PREFIX)
app.include_router(devices_static_routes_router, prefix=PREFIX)
app.include_router(devices_apps_router, prefix=PREFIX)
app.include_router(devices_logs_router, prefix=PREFIX)
app.include_router(devices_configuration_router, prefix=PREFIX)
app.include_router(devices_command_router, prefix=PREFIX)
app.include_router(devices_packet_traces_router, prefix=PREFIX)
app.include_router(devices_placeholder_tab_router, prefix=PREFIX)
app.include_router(device_configuration_help_router, prefix=PREFIX)
app.include_router(tunnels_router, prefix=PREFIX)
app.include_router(traffic_app_identification_router, prefix=PREFIX)
app.include_router(organization_firewall_policies_router, prefix=PREFIX)
app.include_router(main_layout_router, prefix=PREFIX)
app.include_router(side_menu_router, prefix=PREFIX)
app.include_router(icons_router, prefix=PREFIX)
app.include_router(collapsible_add_panel_router, prefix=PREFIX)
app.include_router(theme_context_router, prefix=PREFIX)
