# Configuration (config.json)

This file is read by the API at startup and can be edited via the GUI **Account → Configuration**.

| Key | Description | Default |
|-----|-------------|--------|
| `api_host` | Bind address for the API server (e.g. `0.0.0.0` for all interfaces). | `0.0.0.0` |
| `api_port` | Listener port for the API. | `3443` |
| `api_prefix` | URL path prefix for all API routes (e.g. `/sdwan_cms_api`). | `/sdwan_cms_api` |
| `product` | Product name shown in the UI. | — |
| `company` | Organization / vendor name shown in the UI (e.g. product vendor). | — |
| `clickhouse_host` | ClickHouse server host. | `localhost` |
| `clickhouse_port` | ClickHouse server port. | `9000` |
| `clickhouse_database` | ClickHouse database name. | `sdwan_cms` |
| `clickhouse_user` | ClickHouse user. | `default` |
| `clickhouse_password` | ClickHouse password. | — |
| `audit_log_retention_in_days` | Audit trail retention; records older than this are removed by TTL. | `30` |

**Note:** Changes to `api_host`, `api_port`, or `api_prefix` require an **API restart** to take effect. The startup script (`scripts/api_start.sh`) reads host and port from this file.

Environment variables override these values (e.g. `API_HOST`, `API_PORT`, `CLICKHOUSE_HOST`).
