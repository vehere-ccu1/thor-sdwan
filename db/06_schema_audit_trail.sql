-- Thor SD-WAN CMS - Audit trail: scope columns for role-based visibility (run after 02_schema_accounts.sql)
-- Records are append-only; no one can delete. On ClickHouse 18.x there is no TTL; use external job for retention (audit_log_retention_in_days in config).
-- Re-run may log "column already exists" for account_id/organization_id; safe to ignore.

-- Add scope columns for role-based visibility (Owner: all; Manager: assigned orgs/groups; Viewer: self only)
ALTER TABLE sdwan_cms.audit_trail ADD COLUMN account_id UUID DEFAULT toUUID('00000000-0000-0000-0000-000000000000');
ALTER TABLE sdwan_cms.audit_trail ADD COLUMN organization_id UUID DEFAULT toUUID('00000000-0000-0000-0000-000000000000');
