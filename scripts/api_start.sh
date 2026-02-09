#!/usr/bin/env bash
# Start the SD-WAN CMS API (Python FastAPI + ClickHouse)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$SCRIPT_DIR/../api"
cd "$API_DIR" || exit 1

export CLICKHOUSE_HOST="${CLICKHOUSE_HOST:-localhost}"
export CLICKHOUSE_PORT="${CLICKHOUSE_PORT:-9000}"

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

echo "Starting API (uvicorn) on $HOST:$PORT... (Ctrl+C to stop)"
# Run uvicorn as child so trap can forward Ctrl+C/SIGTERM for reliable stop
trap 'kill $UVICORN_PID 2>/dev/null; exit 0' INT TERM
$PYTHON -m uvicorn main:app --host "$HOST" --port "$PORT" &
UVICORN_PID=$!
wait $UVICORN_PID
