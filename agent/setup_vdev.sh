#!/usr/bin/env bash
# Create Python venv 'vdev' in agent/ and install agent dependencies.
# On Debian/Ubuntu: sudo apt install python3-venv  (if venv creation fails)
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [[ ! -d vdev ]]; then
  python3 -m venv vdev || {
    echo "Failed to create venv. On Debian/Ubuntu run: sudo apt install python3-venv"
    exit 1
  }
fi
source vdev/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
echo "Agent vdev ready. Activate with: source $SCRIPT_DIR/vdev/bin/activate"
