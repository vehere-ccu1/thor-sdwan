-- Thor SD-WAN CMS - Audit trail: scope columns for role-based visibility (run after 02_schema_accounts.sql)
-- Re-run may log "column already exists"; safe to ignore.

ALTER TABLE sdwan_cms.audit_trail ADD COLUMN account_id UUID DEFAULT toUUID('00000000-0000-0000-0000-000000000000');
ALTER TABLE sdwan_cms.audit_trail ADD COLUMN organization_id UUID DEFAULT toUUID('00000000-0000-0000-0000-000000000000');
