#!/usr/bin/env bash
# Create Python venv 'vdev' in api/ and install API dependencies.
# On Debian/Ubuntu: sudo apt install python3.11-venv  (if venv creation fails)
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Create venv if missing or broken (e.g. vdev dir exists but bin/activate does not)
if [[ ! -f vdev/bin/activate ]]; then
  if [[ -d vdev ]]; then
    echo "Removing incomplete vdev directory..."
    rm -rf vdev
  fi
  echo "Creating virtual environment vdev..."
  python3 -m venv vdev || {
    echo "Failed to create venv. On Debian/Ubuntu run: sudo apt install python3.11-venv"
    exit 1
  }
fi
source vdev/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
echo "API vdev ready. Activate with: source $SCRIPT_DIR/vdev/bin/activate"
