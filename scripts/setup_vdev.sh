#!/usr/bin/env bash
# Create Python vdev in both api/ and agent/.
# On Debian/Ubuntu: sudo apt install python3-venv  (if venv creation fails)
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Setting up api/vdev..."
(cd "$PROJECT_ROOT/api" && ./setup_vdev.sh)
echo "Setting up agent/vdev..."
(cd "$PROJECT_ROOT/agent" && ./setup_vdev.sh)
echo "Done. Activate API: source $PROJECT_ROOT/api/vdev/bin/activate"
echo "       Activate Agent: source $PROJECT_ROOT/agent/vdev/bin/activate"
