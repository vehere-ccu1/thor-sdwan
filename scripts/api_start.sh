#!/usr/bin/env bash
# Start the SD-WAN CMS API (Python FastAPI + ClickHouse)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$SCRIPT_DIR/../api"
cd "$API_DIR" || exit 1

export CLICKHOUSE_HOST="${CLICKHOUSE_HOST:-localhost}"
export CLICKHOUSE_PORT="${CLICKHOUSE_PORT:-9000}"

# Best-effort create system log dir used by API (works when running with sudo/root).
mkdir -p /var/log/sdwan_cms_api 2>/dev/null || true

PID_FILE="${PID_FILE:-/tmp/sdwan_cms_api.pid}"

PYTHON=
if [ -x "./vdev/bin/python" ]; then
  if ./vdev/bin/python -c "import uvicorn" 2>/dev/null; then
    PYTHON="./vdev/bin/python"
  fi
fi
if [ -z "$PYTHON" ]; then
  if python3 -c "import uvicorn" 2>/dev/null; then
    PYTHON="python3"
  fi
fi

if [ -z "$PYTHON" ]; then
  echo "uvicorn not found. Install dependencies first:"
  echo "  sudo apt install python3.11-venv"
  echo "  cd api && ./setup_vdev.sh"
  echo "Then run this script again."
  exit 1
fi

# Check api/resource/config.json and DB health at startup.
# If config is missing, incomplete, or DB is unreachable, prompt for input and create/update config.
# DB health is tested via db/<type>/test_<type>.py scripts (test_clickhouse.py, test_mysql.py, etc.).
CONFIG_PATH="resource/config.json"
DB_DIR="$SCRIPT_DIR/../db"
check_config_and_db() {
  "$PYTHON" -c "
import json
import os
import sys
cfg_path = '$CONFIG_PATH'
required_db = ['db_type', 'db_host', 'db_port', 'db_name', 'db_user']
if not os.path.isfile(cfg_path):
    print('CONFIG_MISSING', file=sys.stderr)
    sys.exit(1)
try:
    with open(cfg_path, encoding='utf-8') as f:
        c = json.load(f)
except Exception as e:
    print('CONFIG_INVALID: ' + str(e), file=sys.stderr)
    sys.exit(1)
missing = [k for k in required_db if c.get(k) is None or (isinstance(c.get(k), str) and str(c.get(k)).strip() == '')]
if missing:
    print('CONFIG_INCOMPLETE: missing ' + ','.join(missing), file=sys.stderr)
    sys.exit(1)
sys.exit(0)
" 2>/dev/null || return 1
  db_type=$("$PYTHON" -c "
import json
try:
    c = json.load(open('$CONFIG_PATH'))
    print((c.get('db_type') or 'clickhouse').strip().lower())
except Exception:
    print('clickhouse')
" 2>/dev/null || echo "clickhouse")
  db_type="${db_type:-clickhouse}"
  test_script="$DB_DIR/$db_type/test_$db_type.py"
  if [ -f "$test_script" ]; then
    "$PYTHON" "$test_script" --config "$(pwd)/$CONFIG_PATH" 2>/dev/null || return 1
  else
    "$PYTHON" -c "
import sys
sys.path.insert(0, '.')
try:
    from db_wrapper import check_current_db_health
    ok, msg = check_current_db_health()
    if not ok:
        print('DB_HEALTH_FAIL:', msg, file=sys.stderr)
        sys.exit(1)
except Exception as e:
    print('DB_HEALTH_ERROR:', e, file=sys.stderr)
    sys.exit(1)
" 2>/dev/null || return 1
  fi
}

ensure_config_and_db() {
  while true; do
    if check_config_and_db; then
      return 0
    fi
    if [ ! -t 0 ]; then
      echo "Config or DB check failed (non-interactive). Fix api/resource/config.json and re-run." >&2
      exit 1
    fi
    echo ""
    echo "API config or DB check failed. Provide values to create/update api/resource/config.json"
    echo "Press Enter to accept [default]."
    read -r -p "db_type [clickhouse]: " IN_DB_TYPE; IN_DB_TYPE=${IN_DB_TYPE:-clickhouse}
    read -r -p "db_host [localhost]: " IN_DB_HOST; IN_DB_HOST=${IN_DB_HOST:-localhost}
    read -r -p "db_port [9000]: " IN_DB_PORT; IN_DB_PORT=${IN_DB_PORT:-9000}
    read -r -p "db_name [sdwan_cms]: " IN_DB_NAME; IN_DB_NAME=${IN_DB_NAME:-sdwan_cms}
    read -r -p "db_user [default]: " IN_DB_USER; IN_DB_USER=${IN_DB_USER:-default}
    read -r -p "db_password (optional): " IN_DB_PASSWORD
    read -r -p "api_host [0.0.0.0]: " IN_API_HOST; IN_API_HOST=${IN_API_HOST:-0.0.0.0}
    read -r -p "api_port [3443]: " IN_API_PORT; IN_API_PORT=${IN_API_PORT:-3443}
    export CONFIG_PATH="$CONFIG_PATH"
    IN_DB_TYPE="${IN_DB_TYPE:-clickhouse}" IN_DB_HOST="${IN_DB_HOST:-localhost}" \
    IN_DB_PORT="${IN_DB_PORT:-9000}" IN_DB_NAME="${IN_DB_NAME:-sdwan_cms}" \
    IN_DB_USER="${IN_DB_USER:-default}" IN_DB_PASSWORD="${IN_DB_PASSWORD:-}" \
    IN_API_HOST="${IN_API_HOST:-0.0.0.0}" IN_API_PORT="${IN_API_PORT:-3443}" \
    "$PYTHON" -c "
import json
import os
cfg_path = os.environ.get('CONFIG_PATH', 'resource/config.json')
defaults = {
    'api_host': '0.0.0.0',
    'api_port': 3443,
    'api_prefix': '/sdwan_cms_api',
    'db_type': 'clickhouse',
    'db_host': 'localhost',
    'db_port': 9000,
    'db_name': 'sdwan_cms',
    'db_user': 'default',
    'db_password': '',
    'audit_log_retention_in_days': 30,
    'log_path': '/var/log/sdwan_cms_api',
}
existing = {}
if os.path.isfile(cfg_path):
    try:
        with open(cfg_path, encoding='utf-8') as f:
            existing = json.load(f)
    except Exception:
        pass
merged = {**defaults, **existing}
merged['api_host'] = os.environ.get('IN_API_HOST', '0.0.0.0')
merged['api_port'] = int(os.environ.get('IN_API_PORT', '3443') or '3443')
merged['db_type'] = os.environ.get('IN_DB_TYPE', 'clickhouse')
merged['db_host'] = os.environ.get('IN_DB_HOST', 'localhost')
merged['db_port'] = int(os.environ.get('IN_DB_PORT', '9000') or '9000')
merged['db_name'] = os.environ.get('IN_DB_NAME', 'sdwan_cms')
merged['db_user'] = os.environ.get('IN_DB_USER', 'default')
merged['db_password'] = os.environ.get('IN_DB_PASSWORD', '')
if 'handshaking_token' not in merged or merged.get('handshaking_token') is None:
    merged['handshaking_token'] = ''
os.makedirs(os.path.dirname(cfg_path), exist_ok=True)
with open(cfg_path, 'w', encoding='utf-8') as f:
    json.dump(merged, f, indent=2)
print('Config written to', cfg_path)
" 2>/dev/null || true
    echo "Checking DB connection again..."
    if check_config_and_db; then
      echo "Config and DB check OK."
      return 0
    fi
    echo "DB connection still failed. Edit api/resource/config.json and re-run, or press Enter to start anyway (API may fail)."
    read -r -p "Retry config? [y/N]: " RETRY
    case "${RETRY:-n}" in
      [yY]|[yY][eE][sS]) ;;
      *) return 0 ;;
    esac
  done
}

ensure_config_and_db

# Host and port from api/resource/config.json (defaults: 0.0.0.0, 3443)
HOST=$($PYTHON -c "
import json
try:
    c = json.load(open('resource/config.json'))
    print(c.get('api_host', '0.0.0.0'))
except Exception:
    print('0.0.0.0')
" 2>/dev/null || echo "0.0.0.0")
PORT=$($PYTHON -c "
import json
try:
    c = json.load(open('resource/config.json'))
    print(int(c.get('api_port', 3443)))
except Exception:
    print(3443)
" 2>/dev/null || echo "3443")

# If config uses 0.0.0.0, prefer IPv6 dual-stack binding when available.
# Many browsers resolve "localhost" to ::1 first; binding only IPv4 can lead to
# intermittent connection failures in the UI.
if [ "$HOST" = "0.0.0.0" ] && [ -f /proc/net/if_inet6 ]; then
  HOST="::"
fi

kill_existing() {
  local pid="${1:-}"
  [ -n "$pid" ] || return 0
  if kill -0 "$pid" 2>/dev/null; then
    echo "Stopping existing API instance (pid: $pid)..."
    kill -TERM "$pid" 2>/dev/null || true
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      if ! kill -0 "$pid" 2>/dev/null; then
        return 0
      fi
      sleep 0.2
    done
    echo "Existing API did not stop gracefully; forcing kill (pid: $pid)..."
    kill -KILL "$pid" 2>/dev/null || true
  fi
}

# 1) Prefer PID file (previous start)
if [ -f "$PID_FILE" ]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  kill_existing "$OLD_PID"
fi

# 2) Also ensure nothing is listening on the port (e.g. started manually)
if command -v ss >/dev/null 2>&1; then
  # Extract pids from ss output like: users:(("python",pid=41757,fd=16))
  # NOTE: use ss filter instead of regex word boundaries (sed has no \b).
  LISTEN_PIDS="$(ss -ltnp "sport = :$PORT" 2>/dev/null | sed -n 's/.*pid=\\([0-9][0-9]*\\).*/\\1/p' | sort -u | tr '\n' ' ')"
  for p in $LISTEN_PIDS; do
    # Avoid killing our current shell or unrelated processes if parsing goes wrong
    [ "$p" != "$$" ] || continue
    kill_existing "$p"
  done
fi

echo "Starting API (uvicorn) on $HOST:$PORT... (Ctrl+C to stop)"
# Run uvicorn as child so trap can forward Ctrl+C/SIGTERM for reliable stop
trap 'kill ${UVICORN_PID:-} 2>/dev/null || true; rm -f "$PID_FILE" 2>/dev/null || true; exit 0' INT TERM
$PYTHON -m uvicorn main:app --host "$HOST" --port "$PORT" &
UVICORN_PID=$!
echo "$UVICORN_PID" > "$PID_FILE" 2>/dev/null || true
wait $UVICORN_PID
