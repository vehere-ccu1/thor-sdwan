#!/usr/bin/env bash
# Set ClickHouse default user password to pk@123 (if not configured), restart server, create DB tables and views.
# Requires sudo for editing /etc/clickhouse-server/users.xml and restarting the service.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
USERS_XML="/etc/clickhouse-server/users.xml"
PASSWORD="pk@123"

# --- 1. Check ClickHouse is installed ---
if ! command -v clickhouse-client &>/dev/null; then
  echo "ClickHouse is not installed or clickhouse-client is not in PATH."
  echo "Install: https://clickhouse.com/docs/en/install"
  exit 1
fi

# --- 2. Set password in users.xml if not configured ---
if [[ ! -f "$USERS_XML" ]]; then
  echo "Config not found: $USERS_XML (is ClickHouse server installed?)"
  exit 1
fi

# Check if password is already set (non-empty) for default user
# Heuristic: empty <password></password> or missing password => not configured
if grep -q '<password>pk@123</password>' "$USERS_XML" 2>/dev/null; then
  echo "ClickHouse password already set to pk@123 in $USERS_XML"
elif grep -qE '<password>[[:space:]]*</password>|<password></password>' "$USERS_XML" 2>/dev/null; then
  echo "Setting default user password in $USERS_XML (requires sudo)..."
  sudo sed -i.bak 's|<password></password>|<password>pk@123</password>|g' "$USERS_XML"
  echo "Password set. Restarting ClickHouse..."
  sudo systemctl restart clickhouse-server || sudo service clickhouse-server restart || true
else
  # Already has some non-empty password
  echo "ClickHouse users.xml already has a password configured. To use pk@123, edit $USERS_XML manually."
  read -r -p "Continue with schema? Set CLICKHOUSE_PASSWORD env if your default user has a password. [y/N] " ans
  if [[ "${ans,,}" != "y" && "${ans,,}" != "yes" ]]; then
    exit 0
  fi
  PASSWORD="${CLICKHOUSE_PASSWORD:-}"
fi

# --- 3. Ensure ClickHouse is running ---
if ! sudo systemctl is-active --quiet clickhouse-server 2>/dev/null; then
  echo "Starting ClickHouse..."
  sudo systemctl start clickhouse-server 2>/dev/null || sudo service clickhouse-server start 2>/dev/null || true
fi

# --- 4. Wait for ClickHouse to be ready ---
echo "Waiting for ClickHouse to be ready..."
for i in {1..30}; do
  if clickhouse-client --password "$PASSWORD" -q "SELECT 1" 2>/dev/null; then
    break
  fi
  if [[ $i -eq 30 ]]; then
    echo "ClickHouse did not become ready in time. Check: systemctl status clickhouse-server"
    exit 1
  fi
  sleep 1
done
echo "ClickHouse is ready."

# --- 5. Create database, tables and views ---
echo "Creating database, tables and views..."
clickhouse-client --password "$PASSWORD" --multiquery < "$SCRIPT_DIR/01_schema.sql"
clickhouse-client --password "$PASSWORD" --multiquery < "$SCRIPT_DIR/02_schema_accounts.sql"
clickhouse-client --password "$PASSWORD" --multiquery < "$SCRIPT_DIR/03_schema_roles_permissions.sql"
clickhouse-client --password "$PASSWORD" --multiquery < "$SCRIPT_DIR/04_schema_tokens.sql"
clickhouse-client --password "$PASSWORD" --multiquery < "$SCRIPT_DIR/05_seed_admin.sql"
clickhouse-client --password "$PASSWORD" --multiquery < "$SCRIPT_DIR/06_schema_audit_trail.sql"
echo "Done. Schema (01–06) applied. Default user: admin / admin (password hash in DB)."
