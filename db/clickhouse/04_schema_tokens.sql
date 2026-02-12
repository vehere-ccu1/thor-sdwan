-- Thor SD-WAN CMS - Organization tokens for device registration (run after 02_schema_accounts.sql)

CREATE TABLE IF NOT EXISTS sdwan_cms.organization_tokens
(
    id              UUID DEFAULT generateUUIDv4(),
    organization_id UUID,
    token_secret    String,
    label           String DEFAULT '',
    revoked         UInt8 DEFAULT 0,
    created_at      DateTime DEFAULT now(),
    updated_at      DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(updated_at)
  ORDER BY (organization_id, id);

DROP TABLE IF EXISTS sdwan_cms.organization_tokens_active;
CREATE VIEW sdwan_cms.organization_tokens_active AS
SELECT
    t.id,
    t.organization_id,
    t.label,
    t.created_at,
    t.updated_at,
    o.name AS organization_name
FROM (SELECT * FROM sdwan_cms.organization_tokens FINAL) t
LEFT JOIN (SELECT * FROM sdwan_cms.sites FINAL) o ON t.organization_id = o.id
WHERE t.revoked = 0
ORDER BY t.organization_id, t.created_at DESC;
