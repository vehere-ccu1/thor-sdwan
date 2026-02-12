#!/usr/bin/env python3
"""
Test MongoDB connectivity. Used by api_start.sh for DB health check.
Usage:
  python test_mongodb.py --config /path/to/api/resource/config.json
  python test_mongodb.py --host localhost --port 27017 [--user ...] [--password ...]
Exit: 0 on success, 1 on failure (message to stderr).
"""
import argparse
import json
import sys

_TIMEOUT = 5


def test_connection(host: str, port: int, user: str = "", password: str = "", database: str = "") -> tuple[bool, str]:
    try:
        from pymongo import MongoClient
        uri = f"mongodb://{host}:{port}"
        if user or password:
            from urllib.parse import quote_plus
            user_esc = quote_plus(user or "")
            pass_esc = quote_plus(password or "")
            uri = f"mongodb://{user_esc}:{pass_esc}@{host}:{port}"
        client = MongoClient(uri, serverSelectionTimeoutMS=_TIMEOUT * 1000)
        client.admin.command("ping")
        client.close()
        return True, "OK"
    except ImportError:
        return False, "pymongo not installed (pip install pymongo)"
    except Exception as e:
        return False, str(e)


def main() -> int:
    ap = argparse.ArgumentParser(description="Test MongoDB connectivity")
    ap.add_argument("--config", help="Path to api/resource/config.json (reads db_* from it)")
    ap.add_argument("--host", default="localhost", help="DB host")
    ap.add_argument("--port", type=int, default=27017, help="DB port")
    ap.add_argument("--user", default="", help="DB user")
    ap.add_argument("--password", default="", help="DB password")
    ap.add_argument("--database", default="", help="Unused for ping")
    args = ap.parse_args()

    if args.config:
        try:
            with open(args.config, encoding="utf-8") as f:
                c = json.load(f)
            host = str(c.get("db_host", "localhost"))
            port = int(c.get("db_port", 27017))
            user = str(c.get("db_user", ""))
            password = str(c.get("db_password", ""))
        except FileNotFoundError:
            print("CONFIG_MISSING", file=sys.stderr)
            return 1
        except (json.JSONDecodeError, TypeError) as e:
            print("CONFIG_INVALID:", e, file=sys.stderr)
            return 1
    else:
        host, port, user, password = args.host, args.port, args.user, args.password

    ok, msg = test_connection(host=host, port=port, user=user, password=password, database=args.database)
    if not ok:
        print("DB_HEALTH_FAIL:", msg, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
