# ClickHouse schema for Thor SD-WAN CMS

When `db_type=clickhouse` in API config, schema sync on startup runs these SQL files from `db/clickhouse/` in order.

**Files (run in order):**
- `00_drop_db.sql` – manual only; drops database
- `01_schema.sql` – database, roles, users, audit_trail, sites, devices, vpn_tunnels, firewall_rules
- `02_schema_accounts.sql` – accounts, groups, views (users_with_roles, sites_with_account)
- `03_schema_roles_permissions.sql` – user_permissions table and view
- `04_schema_tokens.sql` – organization_tokens table and view
- `05_seed_admin.sql` – seed admin user (email=admin, password=admin); run only when no users exist
- `06_schema_audit_trail.sql` – add account_id, organization_id to audit_trail (idempotent in code)

**Manual run (from project root):**
```bash
clickhouse-client --multiquery < db/clickhouse/01_schema.sql
clickhouse-client --multiquery < db/clickhouse/02_schema_accounts.sql
# ... etc
```

Config uses unified keys: `db_type`, `db_host`, `db_port`, `db_name`, `db_user`, `db_password`.
