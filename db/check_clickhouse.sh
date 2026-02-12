#!/usr/bin/env bash
# Check if ClickHouse is installed and optionally run schema.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if ! command -v clickhouse-client &>/dev/null; then
  echo "ClickHouse is not installed or clickhouse-client is not in PATH."
  echo "Install: https://clickhouse.com/docs/en/install"
  exit 1
fi

SCHEMA_DIR="$SCRIPT_DIR/clickhouse"
echo "ClickHouse client: $(clickhouse-client --version 2>/dev/null || true)"
echo "To create schema run: clickhouse-client --multiquery < $SCHEMA_DIR/01_schema.sql"

if [[ "${1:-}" == "--run-schema" ]]; then
  clickhouse-client --multiquery < "$SCHEMA_DIR/01_schema.sql"
  clickhouse-client --multiquery < "$SCHEMA_DIR/02_schema_accounts.sql"
  clickhouse-client --multiquery < "$SCHEMA_DIR/03_schema_roles_permissions.sql"
  clickhouse-client --multiquery < "$SCHEMA_DIR/04_schema_tokens.sql"
  clickhouse-client --multiquery < "$SCHEMA_DIR/05_seed_admin.sql"
  clickhouse-client --multiquery < "$SCHEMA_DIR/06_schema_audit_trail.sql"
  echo "Schema applied (01–06 from db/clickhouse/)."
fi
