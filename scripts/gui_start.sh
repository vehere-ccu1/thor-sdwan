#!/usr/bin/env bash
# Start the SD-WAN CMS GUI (Vite dev server). Logs to /var/log/sdwan_cms_gui by default.
SCRIPT_DIR="$(dirname "$0")"
[ -f "$SCRIPT_DIR/run-with-node" ] && . "$SCRIPT_DIR/run-with-node"
cd "$SCRIPT_DIR/../gui" || exit 1

LOG_PATH="${LOG_PATH:-/var/log/sdwan_cms_gui}"
mkdir -p "$LOG_PATH" 2>/dev/null || true
GUI_LOG="${LOG_PATH}/gui.log"

if [ ! -d node_modules ] || [ ! -f node_modules/.bin/vite ]; then
  echo "Installing GUI dependencies..."
  npm install
fi
echo "Starting GUI... (log: $GUI_LOG)"
exec npm run dev >> "$GUI_LOG" 2>&1
