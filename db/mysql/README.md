# MySQL schema for Thor SD-WAN CMS

When `db_type=mysql` in API config, schema sync on startup runs `01_schema.sql` to create the database and tables (requires **pymysql**).

Config uses unified keys: `db_type`, `db_host`, `db_port`, `db_name`, `db_user`, `db_password`.

**Note:** Application queries (login, users, accounts, etc.) currently use the ClickHouse client. Full app data on MySQL requires a query abstraction layer in the API (future work). Use `db_type=clickhouse` for full app support today; use `db_type=mysql` to create MySQL tables for migration or testing.
