# Thor SD-WAN CMS – Database schema and scripts

Schema and scripts per DB type: **db/clickhouse/**, **db/mysql/**, **db/elasticsearch/**, **db/mongodb/**, **db/oracle/**. See each folder's README. API schema_sync runs the matching folder on startup from config `db_type`.

**Note:** These scripts (and `api/schema_sync.py`) are written for ClickHouse. They will **not** run on MySQL, Elasticsearch, MongoDB, or Oracle. The API’s DB wrapper supports testing connectivity to those databases (config dialog), but application data and schema are currently stored only in ClickHouse. To use another DB for storage you would need separate schema definitions per database.

- **User Management / User roles** – `roles`, `users`, `users_with_roles` view  
- **Audit Trail** – `audit_trail` (append-only), `audit_recent` view  
- **VPN and Device Management** – `organizations`, `devices`, `vpn_tunnels`, `firewall_rules`, and helper views  

## One-time setup (password + schema)

From project root, run **once** to set the default ClickHouse user password to `pk@123` (if not already set in `/etc/clickhouse-server/users.xml`), restart ClickHouse, and create all tables and views:

```bash
./db/setup.sh
```

Requires `sudo` for editing `users.xml` and restarting the service. If a password is already configured, the script will prompt; you can set `CLICKHOUSE_PASSWORD` and continue to apply the schema with your existing credentials.

## Check if ClickHouse is installed

From project root:

```bash
./db/check_clickhouse.sh
```

To apply only the schema (no password change, no restart):

```bash
./db/check_clickhouse.sh --run-schema
```

Or manually:

```bash
clickhouse-client --version
```

If not installed, see [ClickHouse install](https://clickhouse.com/docs/en/install).

**Quick install (Linux):**

```bash
curl https://clickhouse.com/ | sh
sudo ./clickhouse install
```

## Create database and objects (ClickHouse)

From the project root, run in order (schema files live under `db/clickhouse/`):

```bash
clickhouse-client --multiquery < db/clickhouse/01_schema.sql
clickhouse-client --multiquery < db/clickhouse/02_schema_accounts.sql
clickhouse-client --multiquery < db/clickhouse/03_schema_roles_permissions.sql
clickhouse-client --multiquery < db/clickhouse/04_schema_tokens.sql
clickhouse-client --multiquery < db/clickhouse/05_seed_admin.sql
clickhouse-client --multiquery < db/clickhouse/06_schema_audit_trail.sql
```

`06_schema_audit_trail.sql` adds `account_id` and `organization_id` to **audit_trail** and sets TTL so records are removed automatically after the retention period (aligned with `audit_log_retention_in_days` in API config). No manual delete of audit records; deletion is by TTL only.

Or with explicit host/port:

```bash
clickhouse-client --host localhost --port 9000 --multiquery < db/clickhouse/01_schema.sql
clickhouse-client --host localhost --port 9000 --multiquery < db/clickhouse/02_schema_accounts.sql
```

`02_schema_accounts.sql` adds **Account** (billing entity) and **Group** tables, and links **organizations** and **users** to accounts and groups.

`03_schema_roles_permissions.sql` adds **user_permissions**: Permission To (account/organization/group), Entity (id/name), Role (owner/manager/viewer). Supports soft-delete.

`04_schema_tokens.sql` adds **organization_tokens**: token entries for device registration (same data as the base64 token payload is stored here so the CMS can validate agent requests).

`05_seed_admin.sql` seeds a default **owner user**: email `admin`, password `admin`. The password is stored as **SHA256** in `users.password_hash` (computed at insert time with `hex(SHA256('admin'))`). Change or disable this user in production.

## Schema overview

| Area        | Tables / views |
|------------|-----------------|
| Accounts   | `accounts` (billing email, name) |
| Groups     | `groups` (per-account, for org grouping) |
| Users/Roles| `roles`, `users`, `users_with_roles` (users have `account_id`, `is_owner`) |
| Organizations | `organizations` (`account_id`, `group_id`), `organizations_with_account` view |
| Audit      | `audit_trail`, `audit_recent` |
| VPN/Device | `devices`, `vpn_tunnels`, `firewall_rules`, `devices_by_org`, `vpn_tunnels_active` |
| Tokens    | `organization_tokens`, `organization_tokens_active` (device registration) |

All config tables use `ReplacingMergeTree(updated_at)` so the latest row per key is kept after merges. Use `FINAL` in queries when you need deduplicated results. Only **audit_trail** has TTL (30 days by default); all other tables have no TTL.

## Python API

Use the `vdev` virtual environment and the `api/` Python service for multithreaded, batch-friendly access to these tables.
