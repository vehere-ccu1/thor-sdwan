#!/usr/bin/env python3
"""
Test MySQL connectivity. Used by api_start.sh for DB health check.
Usage:
  python test_mysql.py --config /path/to/api/resource/config.json
  python test_mysql.py --host localhost --port 3306 [--user root] [--password ...] [--database sdwan_cms]
Exit: 0 on success, 1 on failure (message to stderr).
"""
import argparse
import json
import sys

_TIMEOUT = 5


def test_connection(host: str, port: int, user: str = "", password: str = "", database: str = "") -> tuple[bool, str]:
    try:
        import pymysql
        conn = pymysql.connect(
            host=host,
            port=port,
            user=user or "root",
            password=password,
            database=database or None,
            connect_timeout=_TIMEOUT,
        )
        conn.close()
        return True, "OK"
    except ImportError:
        return False, "pymysql not installed (pip install pymysql)"
    except Exception as e:
        return False, str(e)


def main() -> int:
    ap = argparse.ArgumentParser(description="Test MySQL connectivity")
    ap.add_argument("--config", help="Path to api/resource/config.json (reads db_* from it)")
    ap.add_argument("--host", default="localhost", help="DB host")
    ap.add_argument("--port", type=int, default=3306, help="DB port")
    ap.add_argument("--user", default="root", help="DB user")
    ap.add_argument("--password", default="", help="DB password")
    ap.add_argument("--database", default="sdwan_cms", help="DB name")
    args = ap.parse_args()

    if args.config:
        try:
            with open(args.config, encoding="utf-8") as f:
                c = json.load(f)
            host = str(c.get("db_host", "localhost"))
            port = int(c.get("db_port", 3306))
            user = str(c.get("db_user", "root"))
            password = str(c.get("db_password", ""))
            database = str(c.get("db_name", "sdwan_cms"))
        except FileNotFoundError:
            print("CONFIG_MISSING", file=sys.stderr)
            return 1
        except (json.JSONDecodeError, TypeError) as e:
            print("CONFIG_INVALID:", e, file=sys.stderr)
            return 1
    else:
        host = args.host
        port = args.port
        user = args.user
        password = args.password
        database = args.database

    ok, msg = test_connection(host=host, port=port, user=user, password=password, database=database)
    if not ok:
        print("DB_HEALTH_FAIL:", msg, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
