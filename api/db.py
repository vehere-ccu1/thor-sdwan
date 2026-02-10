"""
ClickHouse connection and helpers for Thor SD-WAN CMS.
Thread-safe: one Client per thread (clickhouse-driver Client is not thread-safe).
"""
import threading
from contextlib import contextmanager
from uuid import UUID

from clickhouse_driver import Client
from clickhouse_driver.dbapi import connect

from config import CLICKHOUSE_DATABASE, CLICKHOUSE_HOST, CLICKHOUSE_PASSWORD, CLICKHOUSE_PORT, CLICKHOUSE_USER

# Keep ClickHouse waits bounded so API doesn't hang when DB is down.
_CONNECT_TIMEOUT_SEC = 5
_SEND_RECEIVE_TIMEOUT_SEC = 10
_SYNC_REQUEST_TIMEOUT_SEC = 5

# One Client per thread; clickhouse-driver Client must not be shared across threads.
_local = threading.local()


def get_client() -> Client:
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


def get_client_default_db() -> Client:
    """Client that uses database 'default' (for bootstrap, e.g. CREATE DATABASE when target DB does not exist)."""
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
    """Context manager for DBAPI connection (for inserts with many rows)."""
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
    client = get_client()
    return client.execute(query, params or {}, with_column_types=False)


def execute_many(query: str, rows: list[tuple]) -> None:
    """Execute INSERT with many rows (batch)."""
    client = get_client()
    client.execute(query, rows)


def _uuid(s: str | UUID) -> str:
    if isinstance(s, UUID):
        return str(s)
    return str(s) if s else "00000000-0000-0000-0000-000000000000"
