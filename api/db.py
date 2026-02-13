"""
Database connection and helpers for Thor SD-WAN CMS.
Supports db_type=clickhouse (full) and db_type=mysql (full). Other backends use db_wrapper for health only.
Thread-safe: one Client per thread (clickhouse-driver Client is not thread-safe).
"""
import threading
from contextlib import contextmanager
from uuid import UUID

from config import (
    CLICKHOUSE_DATABASE,
    CLICKHOUSE_HOST,
    CLICKHOUSE_PASSWORD,
    CLICKHOUSE_PORT,
    CLICKHOUSE_USER,
    DB_TYPE,
)

_db_type = (DB_TYPE or "clickhouse").strip().lower()
_SUPPORTED_APP_BACKENDS = ("clickhouse", "mysql", "mongodb", "elasticsearch")


class UnsupportedBackendError(RuntimeError):
    """Raised when an endpoint uses db.execute() but db_type does not support app data (e.g. mongodb without DAL)."""

    def __init__(self, db_type: str):
        self.db_type = db_type
        super().__init__(
            f"Application data storage is not available for db_type '{db_type}'. "
            f"Use one of: {', '.join(_SUPPORTED_APP_BACKENDS)}."
        )


# --- ClickHouse implementation ---
_CONNECT_TIMEOUT_SEC = 5
_SEND_RECEIVE_TIMEOUT_SEC = 30
_SYNC_REQUEST_TIMEOUT_SEC = 30
_local = threading.local()


def _get_clickhouse_client():
    from clickhouse_driver import Client
    if not hasattr(_local, "client") or _local.client is None:
        _local.client = Client(
            host=CLICKHOUSE_HOST,
            port=CLICKHOUSE_PORT,
            database=CLICKHOUSE_DATABASE,
            user=CLICKHOUSE_USER,
            password=CLICKHOUSE_PASSWORD,
            connect_timeout=_CONNECT_TIMEOUT_SEC,
            send_receive_timeout=_SEND_RECEIVE_TIMEOUT_SEC,
            sync_request_timeout=_SYNC_REQUEST_TIMEOUT_SEC,
        )
    return _local.client


def get_client():
    """Return DB client (ClickHouse, MySQL, MongoDB, or Elasticsearch wrapper). Used for DELETE and similar."""
    if _db_type == "mysql":
        from db_mysql import get_client as mysql_get_client
        return mysql_get_client()
    if _db_type == "mongodb":
        from db_mongo import get_client as mongo_get_client
        return mongo_get_client()
    if _db_type == "elasticsearch":
        from db_elasticsearch import get_client as es_get_client
        return es_get_client()
    if _db_type != "clickhouse":
        raise UnsupportedBackendError(DB_TYPE or "unknown")
    return _get_clickhouse_client()


def get_client_default_db():
    """Client that uses database 'default' (ClickHouse bootstrap only)."""
    if _db_type != "clickhouse":
        raise UnsupportedBackendError(DB_TYPE or "unknown")
    from clickhouse_driver import Client
    return Client(
        host=CLICKHOUSE_HOST,
        port=CLICKHOUSE_PORT,
        database="default",
        user=CLICKHOUSE_USER,
        password=CLICKHOUSE_PASSWORD,
        connect_timeout=_CONNECT_TIMEOUT_SEC,
        send_receive_timeout=_SEND_RECEIVE_TIMEOUT_SEC,
        sync_request_timeout=_SYNC_REQUEST_TIMEOUT_SEC,
    )


@contextmanager
def connection():
    """Context manager for DB connection (for inserts with many rows)."""
    if _db_type == "mysql":
        from db_mysql import connection as mysql_connection
        with mysql_connection() as conn:
            yield conn
        return
    if _db_type == "mongodb":
        from db_mongo import connection as mongo_connection
        with mongo_connection() as conn:
            yield conn
        return
    if _db_type == "elasticsearch":
        from db_elasticsearch import connection as es_connection
        with es_connection() as conn:
            yield conn
        return
    if _db_type != "clickhouse":
        raise UnsupportedBackendError(DB_TYPE or "unknown")
    from clickhouse_driver.dbapi import connect
    conn = connect(
        host=CLICKHOUSE_HOST,
        port=CLICKHOUSE_PORT,
        database=CLICKHOUSE_DATABASE,
        user=CLICKHOUSE_USER,
        password=CLICKHOUSE_PASSWORD,
        connect_timeout=_CONNECT_TIMEOUT_SEC,
        send_receive_timeout=_SEND_RECEIVE_TIMEOUT_SEC,
        sync_request_timeout=_SYNC_REQUEST_TIMEOUT_SEC,
    )
    try:
        yield conn
    finally:
        conn.close()


def execute(query: str, params: dict | None = None) -> list:
    """Execute SELECT and return list of rows (tuples)."""
    if _db_type == "mysql":
        from db_mysql import execute as mysql_execute
        return mysql_execute(query, params)
    if _db_type == "mongodb":
        from db_mongo import execute as mongo_execute
        return mongo_execute(query, params)
    if _db_type == "elasticsearch":
        from db_elasticsearch import execute as es_execute
        return es_execute(query, params)
    if _db_type != "clickhouse":
        raise UnsupportedBackendError(DB_TYPE or "unknown")
    client = _get_clickhouse_client()
    return client.execute(query, params or {}, with_column_types=False)


def execute_many(query: str, rows: list[tuple]) -> None:
    """Execute INSERT with many rows (batch)."""
    if _db_type == "mysql":
        from db_mysql import execute_many as mysql_execute_many
        return mysql_execute_many(query, rows)
    if _db_type == "mongodb":
        from db_mongo import execute_many as mongo_execute_many
        return mongo_execute_many(query, rows)
    if _db_type == "elasticsearch":
        from db_elasticsearch import execute_many as es_execute_many
        return es_execute_many(query, rows)
    if _db_type != "clickhouse":
        raise UnsupportedBackendError(DB_TYPE or "unknown")
    client = _get_clickhouse_client()
    client.execute(query, rows)


def _uuid(s: str | UUID) -> str:
    if isinstance(s, UUID):
        return str(s)
    return str(s) if s else "00000000-0000-0000-0000-000000000000"
