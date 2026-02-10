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
