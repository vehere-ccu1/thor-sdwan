"""
Ensure DB schema exists on API startup.
- When db_type=clickhouse: reads SQL from db/clickhouse/ (01–06), runs ClickHouse DDL and seed.
- When db_type=mysql: creates database and runs db/mysql/01_schema.sql (requires pymysql).
- When db_type=elasticsearch: creates index from db/elasticsearch/index_mapping.json.
- When db_type=mongodb: creates collections (db/mongodb/collections.txt or list in code).
- When db_type=oracle: use db/oracle/01_schema.sql manually; API can be extended to run it.
"""
import logging
import os
import re
import time

from config import CLICKHOUSE_DATABASE, DB_TYPE, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER
from db import get_client, get_client_default_db

logger = logging.getLogger(__name__)

# SQL files in order (01–04 are DDL; 05 is seed, run only when empty). 06 is applied in code (idempotent).
SCHEMA_FILES = [
    "01_schema.sql",
    "02_schema_accounts.sql",
    "03_schema_roles_permissions.sql",
    "04_schema_tokens.sql",
]
SEED_FILE = "05_seed_admin.sql"


def _db_folder() -> str:
    """Path to project db/ folder (parent of api/)."""
    api_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(api_dir, "..", "db")


def _split_sql_statements(content: str) -> list[str]:
    """Split SQL content into single statements. Statements end with ; at end of line."""
    statements = []
    buffer: list[str] = []
    for line in content.splitlines():
        buffer.append(line)
        if line.strip().endswith(";"):
            stmt = "\n".join(buffer).strip()
            buffer = []
            if not stmt:
                continue
            # Strip trailing semicolon for execute
            stmt = stmt[:-1].strip()
            # Skip comment-only blocks
            if re.match(r"^(\s*--[^\n]*\s*)+$", stmt, re.DOTALL):
                continue
            if stmt:
                statements.append(stmt)
    if buffer:
        stmt = "\n".join(buffer).strip()
        if stmt and not re.match(r"^(\s*--[^\n]*\s*)+$", stmt, re.DOTALL):
            stmt = stmt.rstrip(";").strip()
            if stmt:
                statements.append(stmt)
    return statements


def _run_sql_file(client, path: str) -> None:
    """Execute each statement in the SQL file. Logs and skips on error so other statements still run."""
    if not os.path.isfile(path):
        logger.warning("Schema file not found: %s", path)
        return
    with open(path, encoding="utf-8") as f:
        content = f.read()
    for stmt in _split_sql_statements(content):
        try:
            client.execute(stmt)
        except Exception as e:
            logger.warning("Schema statement failed (%s): %s", path, e)


def _table_exists(client, table_name: str) -> bool:
    """Return True if the table exists in the configured database."""
    try:
        q = "SELECT 1 FROM system.tables WHERE database = %(db)s AND name = %(name)s LIMIT 1"
        rows = client.execute(q, {"db": CLICKHOUSE_DATABASE, "name": table_name})
        return bool(rows)
    except Exception:
        return False


def _column_exists(client, table_name: str, column_name: str) -> bool:
    """Return True if the column exists on the table (ClickHouse 18.x has no ADD COLUMN IF NOT EXISTS)."""
    try:
        q = "SELECT 1 FROM system.columns WHERE database = %(db)s AND table = %(table)s AND name = %(name)s LIMIT 1"
        rows = client.execute(q, {"db": CLICKHOUSE_DATABASE, "table": table_name, "name": column_name})
        return bool(rows)
    except Exception:
        return False


def _ensure_accounts_columns(client) -> None:
    """Add account_id, group_id to sites and account_id, is_owner to users if missing (ClickHouse 18.x)."""
    default_uuid = "toUUID('00000000-0000-0000-0000-000000000000')"
    if _table_exists(client, "sites"):
        t = f"{CLICKHOUSE_DATABASE}.sites"
        if not _column_exists(client, "sites", "account_id"):
            try:
                client.execute(f"ALTER TABLE {t} ADD COLUMN account_id UUID DEFAULT {default_uuid}")
            except Exception as e:
                logger.warning("Could not add sites.account_id: %s", e)
        if not _column_exists(client, "sites", "group_id"):
            try:
                client.execute(f"ALTER TABLE {t} ADD COLUMN group_id UUID DEFAULT {default_uuid}")
            except Exception as e:
                logger.warning("Could not add sites.group_id: %s", e)
        if not _column_exists(client, "sites", "master_owner_user_id"):
            try:
                client.execute(f"ALTER TABLE {t} ADD COLUMN master_owner_user_id UUID DEFAULT {default_uuid}")
            except Exception as e:
                logger.warning("Could not add sites.master_owner_user_id: %s", e)
        if not _column_exists(client, "sites", "created_by_user_id"):
            try:
                client.execute(f"ALTER TABLE {t} ADD COLUMN created_by_user_id UUID DEFAULT {default_uuid}")
            except Exception as e:
                logger.warning("Could not add sites.created_by_user_id: %s", e)
    if _table_exists(client, "groups"):
        t = f"{CLICKHOUSE_DATABASE}.groups"
        if not _column_exists(client, "groups", "master_owner_user_id"):
            try:
                client.execute(f"ALTER TABLE {t} ADD COLUMN master_owner_user_id UUID DEFAULT {default_uuid}")
            except Exception as e:
                logger.warning("Could not add groups.master_owner_user_id: %s", e)
        if not _column_exists(client, "groups", "created_by_user_id"):
            try:
                client.execute(f"ALTER TABLE {t} ADD COLUMN created_by_user_id UUID DEFAULT {default_uuid}")
            except Exception as e:
                logger.warning("Could not add groups.created_by_user_id: %s", e)
        if not _column_exists(client, "groups", "parent_group_id"):
            try:
                client.execute(f"ALTER TABLE {t} ADD COLUMN parent_group_id UUID DEFAULT {default_uuid}")
            except Exception as e:
                logger.warning("Could not add groups.parent_group_id: %s", e)
    if _table_exists(client, "users"):
        t = f"{CLICKHOUSE_DATABASE}.users"
        if not _column_exists(client, "users", "account_id"):
            try:
                client.execute(f"ALTER TABLE {t} ADD COLUMN account_id UUID DEFAULT {default_uuid}")
            except Exception as e:
                logger.warning("Could not add users.account_id: %s", e)
        if not _column_exists(client, "users", "is_owner"):
            try:
                client.execute(f"ALTER TABLE {t} ADD COLUMN is_owner UInt8 DEFAULT 0")
            except Exception as e:
                logger.warning("Could not add users.is_owner: %s", e)
        if not _column_exists(client, "users", "created_by_user_id"):
            try:
                client.execute(f"ALTER TABLE {t} ADD COLUMN created_by_user_id UUID DEFAULT {default_uuid}")
            except Exception as e:
                logger.warning("Could not add users.created_by_user_id: %s", e)
        if not _column_exists(client, "users", "master_owner_user_id"):
            try:
                client.execute(f"ALTER TABLE {t} ADD COLUMN master_owner_user_id UUID DEFAULT {default_uuid}")
            except Exception as e:
                logger.warning("Could not add users.master_owner_user_id: %s", e)
        if not _column_exists(client, "users", "organizations"):
            try:
                client.execute(f"ALTER TABLE {t} ADD COLUMN organizations Array(String) DEFAULT []")
            except Exception as e:
                logger.warning("Could not add users.organizations: %s", e)
        if not _column_exists(client, "users", "organization_group_ids"):
            try:
                client.execute(f"ALTER TABLE {t} ADD COLUMN organization_group_ids Array(String) DEFAULT []")
            except Exception as e:
                logger.warning("Could not add users.organization_group_ids: %s", e)
        if not _column_exists(client, "users", "job_title"):
            try:
                client.execute(f"ALTER TABLE {t} ADD COLUMN job_title String DEFAULT ''")
            except Exception as e:
                logger.warning("Could not add users.job_title: %s", e)
    if _table_exists(client, "accounts"):
        t = f"{CLICKHOUSE_DATABASE}.accounts"
        if not _column_exists(client, "accounts", "master_owner_user_id"):
            try:
                client.execute(f"ALTER TABLE {t} ADD COLUMN master_owner_user_id UUID DEFAULT {default_uuid}")
            except Exception as e:
                logger.warning("Could not add accounts.master_owner_user_id: %s", e)
        # Optional UI fields on Account Profile
        if not _column_exists(client, "accounts", "country"):
            try:
                client.execute(f"ALTER TABLE {t} ADD COLUMN country String DEFAULT ''")
            except Exception as e:
                logger.warning("Could not add accounts.country: %s", e)
        if not _column_exists(client, "accounts", "notifications"):
            try:
                client.execute(f"ALTER TABLE {t} ADD COLUMN notifications UInt8 DEFAULT 0")
            except Exception as e:
                logger.warning("Could not add accounts.notifications: %s", e)
        if not _column_exists(client, "accounts", "master_organization_name"):
            try:
                client.execute(f"ALTER TABLE {t} ADD COLUMN master_organization_name String DEFAULT ''")
            except Exception as e:
                logger.warning("Could not add accounts.master_organization_name: %s", e)


def _ensure_audit_trail_columns(client) -> None:
    """Add account_id and organization_id to audit_trail if missing (idempotent for ClickHouse 18.x)."""
    if not _table_exists(client, "audit_trail"):
        return
    table = f"{CLICKHOUSE_DATABASE}.audit_trail"
    default_uuid = "toUUID('00000000-0000-0000-0000-000000000000')"
    if not _column_exists(client, "audit_trail", "account_id"):
        try:
            client.execute(f"ALTER TABLE {table} ADD COLUMN account_id UUID DEFAULT {default_uuid}")
        except Exception as e:
            logger.warning("Could not add audit_trail.account_id: %s", e)
    if not _column_exists(client, "audit_trail", "organization_id"):
        try:
            client.execute(f"ALTER TABLE {table} ADD COLUMN organization_id UUID DEFAULT {default_uuid}")
        except Exception as e:
            logger.warning("Could not add audit_trail.organization_id: %s", e)


def _has_any_users(client) -> bool:
    """Return True if the users table exists and has at least one row."""
    if not _table_exists(client, "users"):
        return False
    try:
        q = f"SELECT 1 FROM {CLICKHOUSE_DATABASE}.users LIMIT 1"
        rows = client.execute(q)
        return bool(rows)
    except Exception:
        return False


def _ensure_manager_viewer_roles(client) -> None:
    """Ensure Manager and Viewer roles exist (fixed UUIDs) so account role updates work.
    On timeout we retry once. A 401 on /login is unrelated (invalid email or password)."""
    if not _table_exists(client, "roles"):
        return
    for attempt in range(2):
        try:
            rows = client.execute(
                f"SELECT name FROM {CLICKHOUSE_DATABASE}.roles FINAL WHERE name IN ('Manager', 'Viewer')",
            )
            found = {str(r[0]) for r in rows} if rows else set()
            if "Manager" not in found:
                client.execute(
                    f"""INSERT INTO {CLICKHOUSE_DATABASE}.roles (id, name, description, permissions)
                    VALUES (toUUID('44444444-4444-4444-4444-444444444444'), 'Manager', 'Manager', '["users:read","devices:read","devices:write"]')""",
                )
                logger.info("Created Manager role")
            if "Viewer" not in found:
                client.execute(
                    f"""INSERT INTO {CLICKHOUSE_DATABASE}.roles (id, name, description, permissions)
                    VALUES (toUUID('55555555-5555-5555-5555-555555555555'), 'Viewer', 'Viewer', '["users:read","devices:read"]')""",
                )
                logger.info("Created Viewer role")
            return
        except Exception as e:
            if attempt == 0 and ("timed out" in str(e).lower() or "timeout" in str(e).lower()):
                time.sleep(1)
                continue
            logger.warning("Could not ensure Manager/Viewer roles: %s", e)
            return


def _ensure_database() -> None:
    """Create the configured database if it does not exist. Uses 'default' DB connection so it works when target DB is missing."""
    try:
        client = get_client_default_db()
        client.execute(f"CREATE DATABASE IF NOT EXISTS {CLICKHOUSE_DATABASE}")
    except Exception as e:
        logger.warning("Could not create database %s: %s", CLICKHOUSE_DATABASE, e)


def _ensure_schema_mysql() -> None:
    """Create MySQL database and tables from db/mysql/01_schema.sql. Requires pymysql."""
    try:
        import pymysql
    except ImportError:
        logger.warning("pymysql not installed; skipping MySQL schema sync")
        return
    folder = _db_folder()
    mysql_folder = os.path.join(folder, "mysql")
    schema_file = os.path.join(mysql_folder, "01_schema.sql")
    if not os.path.isfile(schema_file):
        logger.warning("MySQL schema file not found: %s", schema_file)
        return
    try:
        conn_no_db = pymysql.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER or "root",
            password=DB_PASSWORD,
            connect_timeout=10,
        )
        with conn_no_db.cursor() as cur:
            cur.execute(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}`")
        conn_no_db.close()
        conn = pymysql.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER or "root",
            password=DB_PASSWORD,
            database=DB_NAME,
            connect_timeout=10,
        )
        with open(schema_file, encoding="utf-8") as f:
            content = f.read()
        for stmt in _split_sql_statements(content):
            if not stmt.strip():
                continue
            try:
                with conn.cursor() as cur:
                    cur.execute(stmt)
            except Exception as e:
                logger.warning("MySQL schema statement failed: %s", e)
        conn.close()
        logger.info("MySQL schema sync completed")
    except Exception as e:
        logger.warning("MySQL schema sync failed: %s", e)


def _ensure_schema_mongodb() -> None:
    """Create MongoDB collections (collections are created on first write; we just ensure DB is reachable). Requires pymongo."""
    try:
        from pymongo import MongoClient
        from urllib.parse import quote_plus
        uri = f"mongodb://{DB_HOST}:{DB_PORT}"
        if DB_USER or DB_PASSWORD:
            uri = f"mongodb://{quote_plus(DB_USER or '')}:{quote_plus(DB_PASSWORD or '')}@{DB_HOST}:{DB_PORT}"
        client = MongoClient(uri, serverSelectionTimeoutMS=10000)
        db = client[DB_NAME or "sdwan_cms"]
        for coll_name in ("roles", "users", "accounts", "groups", "sites", "audit_trail", "user_permissions", "organization_tokens", "devices", "vpn_tunnels", "firewall_rules"):
            if coll_name not in db.list_collection_names():
                db.create_collection(coll_name)
        client.close()
        logger.info("MongoDB schema sync completed")
    except ImportError:
        logger.warning("pymongo not installed; skipping MongoDB schema sync")
    except Exception as e:
        logger.warning("MongoDB schema sync failed: %s", e)


def _ensure_schema_elasticsearch() -> None:
    """Create Elasticsearch index from db/elasticsearch/index_mapping.json. Requires elasticsearch."""
    try:
        from elasticsearch import Elasticsearch
        folder = _db_folder()
        mapping_path = os.path.join(folder, "elasticsearch", "index_mapping.json")
        es = Elasticsearch([{"host": DB_HOST, "port": DB_PORT}], request_timeout=10)
        index = (DB_NAME or "sdwan_cms").lower().replace(" ", "_")
        if not es.indices.exists(index=index):
            if os.path.isfile(mapping_path):
                import json
                with open(mapping_path, encoding="utf-8") as f:
                    body = json.load(f)
                es.indices.create(index=index, body=body)
            else:
                es.indices.create(index=index, body={"mappings": {"properties": {"id": {"type": "keyword"}, "email": {"type": "keyword"}, "ts": {"type": "date"}}}})
        logger.info("Elasticsearch schema sync completed")
    except ImportError:
        logger.warning("elasticsearch not installed; skipping Elasticsearch schema sync")
    except Exception as e:
        logger.warning("Elasticsearch schema sync failed: %s", e)


def ensure_schema() -> None:
    """
    Ensure database and tables exist. Call on API startup.
    Dispatches to MySQL, MongoDB, Elasticsearch, or ClickHouse schema sync based on db_type.
    """
    if DB_TYPE == "mysql":
        _ensure_schema_mysql()
        return
    if DB_TYPE == "mongodb":
        _ensure_schema_mongodb()
        return
    if DB_TYPE == "elasticsearch":
        _ensure_schema_elasticsearch()
        return
    if DB_TYPE != "clickhouse":
        logger.info("Schema sync not implemented for db_type=%s; skipping", DB_TYPE)
        return
    folder = _db_folder()
    clickhouse_folder = os.path.join(folder, "clickhouse")
    if not os.path.isdir(clickhouse_folder):
        logger.warning("db/clickhouse folder not found: %s; skipping schema sync", clickhouse_folder)
        return
    _ensure_database()
    try:
        client = get_client()
    except Exception as e:
        logger.warning("Could not connect to ClickHouse for schema sync: %s", e)
        return
    for name in SCHEMA_FILES:
        path = os.path.join(clickhouse_folder, name)
        logger.info("Applying schema: %s", name)
        if name == "02_schema_accounts.sql":
            _ensure_accounts_columns(client)
        _run_sql_file(client, path)
    _ensure_audit_trail_columns(client)
    if _table_exists(client, "users") and not _has_any_users(client):
        path = os.path.join(clickhouse_folder, SEED_FILE)
        logger.info("Applying seed (no users): %s", SEED_FILE)
        _run_sql_file(client, path)
    elif not _table_exists(client, "users"):
        logger.warning("Seed skipped: users table does not exist (schema 01 may have failed)")
    else:
        logger.debug("Seed skipped (users already exist)")
    _ensure_manager_viewer_roles(client)
    logger.info("Schema sync completed")
