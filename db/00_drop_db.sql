-- Drop the entire ClickHouse database for Thor SD-WAN CMS.
--
-- WARNING: This irreversibly deletes ALL CMS data (accounts, users, sites, groups, tokens, etc.).
--
-- Usage (manual):
--   clickhouse-client --multiquery < db/00_drop_db.sql
--
-- After dropping, re-run:
--   ./scripts/api_start.sh
-- The API startup schema sync will recreate the database and tables.
--
-- NOTE: The database name matches the default CLICKHOUSE_DATABASE config ("sdwan_cms").
DROP DATABASE IF EXISTS sdwan_cms;

