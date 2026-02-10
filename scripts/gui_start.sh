#!/usr/bin/env bash
# Start the SD-WAN CMS GUI (Vite dev server). Logs to /var/log/sdwan_cms_gui by default.
set -euo pipefail
SCRIPT_DIR="$(dirname "$0")"
[ -f "$SCRIPT_DIR/run-with-node" ] && . "$SCRIPT_DIR/run-with-node"
cd "$SCRIPT_DIR/../gui" || exit 1

# Best-effort create system log dir (works when running with sudo/root).
SYSTEM_LOG_PATH="/var/log/sdwan_cms_gui"
mkdir -p "$SYSTEM_LOG_PATH" 2>/dev/null || true

# Default to a user-writable log directory to avoid requiring sudo.
# Override by exporting LOG_PATH (e.g. /var/log/sdwan_cms_gui).
DEFAULT_FALLBACK_BASE="${XDG_STATE_HOME:-$HOME/.local/state}"
DEFAULT_USER_LOG_PATH="${DEFAULT_FALLBACK_BASE}/sdwan_cms_gui"
LOG_PATH="${LOG_PATH:-$DEFAULT_USER_LOG_PATH}"
DEFAULT_LOG_PATH="$LOG_PATH"
PID_FILE="${PID_FILE:-/tmp/sdwan_cms_gui.pid}"

# Try to use the requested/default log path (often under /var/log).
# If we can't create/write there (common without sudo), fall back to a user-writable location.
if ! mkdir -p "$LOG_PATH" 2>/dev/null; then
  LOG_PATH=""
fi

if [ -n "$LOG_PATH" ] && ! ( : >> "$LOG_PATH/gui.log" ) 2>/dev/null; then
  LOG_PATH=""
fi

if [ -z "$LOG_PATH" ]; then
  FALLBACK_BASE="${XDG_STATE_HOME:-$HOME/.local/state}"
  LOG_PATH="${FALLBACK_BASE}/sdwan_cms_gui"
  mkdir -p "$LOG_PATH" 2>/dev/null || LOG_PATH="/tmp/sdwan_cms_gui"
  mkdir -p "$LOG_PATH" 2>/dev/null || true
  echo "Warning: cannot write to ${DEFAULT_LOG_PATH}; logging to ${LOG_PATH}/gui.log instead." >&2
fi

GUI_LOG="${LOG_PATH}/gui.log"

kill_existing() {
  local pid="${1:-}"
  [ -n "$pid" ] || return 0
  if kill -0 "$pid" 2>/dev/null; then
    echo "Stopping existing GUI instance (pid: $pid)..."
    kill -TERM "$pid" 2>/dev/null || true
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      if ! kill -0 "$pid" 2>/dev/null; then
        return 0
      fi
      sleep 0.2
    done
    echo "Existing GUI did not stop gracefully; forcing kill (pid: $pid)..."
    kill -KILL "$pid" 2>/dev/null || true
  fi
}

# Stop previous instance if started via this script.
if [ -f "$PID_FILE" ]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  kill_existing "$OLD_PID"
fi

if [ ! -d node_modules ] || [ ! -f node_modules/.bin/vite ]; then
  echo "Installing GUI dependencies..."
  npm install
fi
echo "Starting GUI... (log: $GUI_LOG)"
npm run dev >> "$GUI_LOG" 2>&1 &
GUI_PID=$!
echo "$GUI_PID" > "$PID_FILE" 2>/dev/null || true
trap 'kill ${GUI_PID:-} 2>/dev/null || true; rm -f "$PID_FILE" 2>/dev/null || true' INT TERM EXIT
wait $GUI_PID
