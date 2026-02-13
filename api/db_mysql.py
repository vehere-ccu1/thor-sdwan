"""
MySQL backend for Thor SD-WAN CMS API.
Provides execute(), execute_many(), get_client(), connection() compatible with db.py
so pages can use the same API. Normalizes ClickHouse-specific SQL (FINAL, toUUID) for MySQL.
"""
import json
import re
import threading
from contextlib import contextmanager
from typing import Any

from config import DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER

_CONNECT_TIMEOUT_SEC = 5
_local = threading.local()


def _normalize_query(query: str) -> str:
    """Strip ClickHouse-specific syntax for MySQL."""
    # Remove FINAL (ReplacingMergeTree dedup; MySQL has normal tables)
    q = re.sub(r"\s+FINAL\b", "", query, flags=re.IGNORECASE)
    # toUUID(%(id)s) -> %(id)s (MySQL uses CHAR(36))
    q = re.sub(r"toUUID\s*\(\s*%\((\w+)\)s\s*\)", r"%(\1)s", q, flags=re.IGNORECASE)
    # Quote reserved word: .groups as table name -> .`groups`
    q = re.sub(r"\.groups\b", ".`groups`", q, flags=re.IGNORECASE)
    return q


def _rewrite_alter_delete(query: str) -> str | None:
    """
    If query is ALTER TABLE db.tbl DELETE WHERE ..., return DELETE FROM db.tbl WHERE ...
    Otherwise return None.
    """
    m = re.match(
        r"\s*ALTER\s+TABLE\s+(\S+)\s+DELETE\s+WHERE\s+(.+)\s*",
        query,
        re.IGNORECASE | re.DOTALL,
    )
    if not m:
        return None
    table = m.group(1).strip()
    where = m.group(2).strip()
    return f"DELETE FROM {table} WHERE {where}"


def _expand_in_params(sql: str, params: dict | None) -> tuple[str, list]:
    """
    Replace %(name)s with %s (or %s,%s,... for tuple params) and return (sql, args) in query order.
    PyMySQL needs IN (%s,%s,%s) with a list of values, not a single tuple.
    """
    if not params:
        return sql, []
    result_sql = sql
    result_args: list[Any] = []
    while True:
        m = re.search(r"%\((\w+)\)s", result_sql)
        if not m:
            break
        key = m.group(1)
        if key not in params:
            break
        val = params[key]
        if isinstance(val, (list, tuple)):
            placeholders = "(" + ",".join(["%s"] * len(val)) + ")"
            result_sql = result_sql[: m.start()] + placeholders + result_sql[m.end() :]
            result_args.extend(val)
        else:
            result_sql = result_sql[: m.start()] + "%s" + result_sql[m.end() :]
            result_args.append(val)
    return result_sql, result_args


def _get_connection():
    import pymysql
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER or "root",
        password=DB_PASSWORD,
        database=DB_NAME,
        connect_timeout=_CONNECT_TIMEOUT_SEC,
        charset="utf8mb4",
    )


def get_client():
    """Return a client-like object with execute(query, params) for DELETE and similar."""
    if not hasattr(_local, "mysql_client") or _local.mysql_client is None:
        _local.mysql_client = _MySQLClient()
    return _local.mysql_client


class _MySQLClient:
    """Thin wrapper so client.execute(alter_delete_query, params) works like ClickHouse."""

    def execute(self, query: str, params: dict | None = None):
        q = _normalize_query(query)
        delete_sql = _rewrite_alter_delete(q)
        params = params or {}
        if delete_sql:
            sql, args = _expand_in_params(delete_sql, params)
            with _get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(sql, args)
                conn.commit()
            return
        sql, args = _expand_in_params(q, params)
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, args)
            conn.commit()


@contextmanager
def connection():
    """Context manager for DB connection (e.g. bulk inserts)."""
    conn = _get_connection()
    try:
        yield conn
    finally:
        conn.close()


def execute(query: str, params: dict | None = None) -> list:
    """Execute SELECT and return list of rows (tuples)."""
    q = _normalize_query(query)
    params = params or {}
    sql, args = _expand_in_params(q, params)
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, args)
            rows = cur.fetchall()
    return list(rows) if rows else []


def _serialize_value(v: Any) -> Any:
    """Serialize list/dict to JSON string for MySQL JSON columns; leave other types as-is."""
    if isinstance(v, (list, dict)):
        return json.dumps(v)
    return v


def execute_many(query: str, rows: list[tuple]) -> None:
    """Execute INSERT with many rows (batch). Query ends with VALUES; we append placeholders."""
    q = _normalize_query(query)
    if not rows:
        return
    # Query is "INSERT INTO db.t (a,b,c) VALUES" (no placeholders after VALUES)
    parts = re.split(r"\s+VALUES\s*$", q, flags=re.IGNORECASE, maxsplit=1)
    if len(parts) != 2:
        # Fallback: single row or already has placeholders
        ncols = len(rows[0])
        placeholders = ", ".join(["(%s)" % (",".join(["%s"] * ncols))] * len(rows))
        full_sql = q.rstrip() + " " + placeholders
    else:
        base = parts[0].strip()
        ncols = len(rows[0])
        placeholders = ", ".join(["(%s)" % (",".join(["%s"] * ncols))] * len(rows))
        full_sql = base + " VALUES " + placeholders
    flat = [_serialize_value(x) for row in rows for x in row]
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(full_sql, flat)
        conn.commit()
