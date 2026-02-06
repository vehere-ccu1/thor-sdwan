#!/usr/bin/env bash
# Start the SD-WAN CMS API (backend server)
SCRIPT_DIR="$(dirname "$0")"
[ -f "$SCRIPT_DIR/run-with-node" ] && . "$SCRIPT_DIR/run-with-node"
cd "$SCRIPT_DIR/../api" || exit 1
echo "Starting API..."
exec npm start
