#!/usr/bin/env bash
# Start the SD-WAN CMS GUI (Vite dev server)
SCRIPT_DIR="$(dirname "$0")"
[ -f "$SCRIPT_DIR/run-with-node" ] && . "$SCRIPT_DIR/run-with-node"
cd "$SCRIPT_DIR/../gui" || exit 1
if [ ! -d node_modules ] || [ ! -f node_modules/.bin/vite ]; then
  echo "Installing GUI dependencies..."
  npm install
fi
echo "Starting GUI..."
exec npm run dev
