#!/usr/bin/env python3
"""
Test Oracle connectivity. Used by api_start.sh for DB health check.
Usage:
  python test_oracle.py --config /path/to/api/resource/config.json
  python test_oracle.py --host localhost --port 1521 [--user ...] [--password ...] [--database ORCL]
Exit: 0 on success, 1 on failure (message to stderr).
"""
import argparse
import json
import sys

_TIMEOUT = 5


def test_connection(host: str, port: int, user: str = "", password: str = "", database: str = "") -> tuple[bool, str]:
    try:
        import oracledb
        dsn = oracledb.makedsn(host, port, service_name=database or "ORCL")
        conn = oracledb.connect(user=user, password=password, dsn=dsn)
        conn.close()
        return True, "OK"
    except ImportError:
        return False, "oracledb not installed (pip install oracledb)"
    except Exception as e:
        return False, str(e)


def main() -> int:
    ap = argparse.ArgumentParser(description="Test Oracle connectivity")
    ap.add_argument("--config", help="Path to api/resource/config.json (reads db_* from it)")
    ap.add_argument("--host", default="localhost", help="DB host")
    ap.add_argument("--port", type=int, default=1521, help="DB port")
    ap.add_argument("--user", default="", help="DB user")
    ap.add_argument("--password", default="", help="DB password")
    ap.add_argument("--database", default="ORCL", help="Service name")
    args = ap.parse_args()

    if args.config:
        try:
            with open(args.config, encoding="utf-8") as f:
                c = json.load(f)
            host = str(c.get("db_host", "localhost"))
            port = int(c.get("db_port", 1521))
            user = str(c.get("db_user", ""))
            password = str(c.get("db_password", ""))
            database = str(c.get("db_name", "ORCL"))
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
