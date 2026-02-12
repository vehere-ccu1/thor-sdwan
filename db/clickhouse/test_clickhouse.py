#!/usr/bin/env python3
"""Test ClickHouse connectivity. Used by api_start.sh for DB health check."""
import argparse
import json
import sys

_TIMEOUT = 5


def test_connection(host, port, user="", password="", database=""):
    try:
        from clickhouse_driver import Client
        client = Client(
            host=host,
            port=port,
            database=database or "default",
            user=user or "default",
            password=password,
            connect_timeout=_TIMEOUT,
        )
        client.execute("SELECT 1")
        client.disconnect()
        return True, "OK"
    except ImportError:
        return False, "clickhouse-driver not installed"
    except Exception as e:
        return False, str(e)


def main():
    ap = argparse.ArgumentParser(description="Test ClickHouse connectivity")
    ap.add_argument("--config", help="Path to api/resource/config.json")
    ap.add_argument("--host", default="localhost")
    ap.add_argument("--port", type=int, default=9000)
    ap.add_argument("--user", default="default")
    ap.add_argument("--password", default="")
    ap.add_argument("--database", default="sdwan_cms")
    args = ap.parse_args()

    if args.config:
        try:
            with open(args.config, encoding="utf-8") as f:
                c = json.load(f)
            host = str(c.get("db_host", "localhost"))
            port = int(c.get("db_port", 9000))
            user = str(c.get("db_user", "default"))
            password = str(c.get("db_password", ""))
            database = str(c.get("db_name", "sdwan_cms"))
        except FileNotFoundError:
            print("CONFIG_MISSING", file=sys.stderr)
            return 1
        except (json.JSONDecodeError, TypeError) as e:
            print("CONFIG_INVALID:", e, file=sys.stderr)
            return 1
    else:
        host, port, user, password, database = args.host, args.port, args.user, args.password, args.database

    ok, msg = test_connection(host=host, port=port, user=user, password=password, database=database)
    if not ok:
        print("DB_HEALTH_FAIL:", msg, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
