# Oracle schema for Thor SD-WAN CMS

When `db_type=oracle`, use these scripts for manual setup. Config: `db_type`, `db_host`, `db_port`, `db_name` (service name or SID), `db_user`, `db_password`. Default port 1521.

**Files:** `01_schema.sql` – tables (roles, users, accounts, groups, sites, audit_trail, etc.).

**Manual run (SQL*Plus):**
```bash
sqlplus user/pass@//localhost:1521/servicename @db/oracle/01_schema.sql
```
