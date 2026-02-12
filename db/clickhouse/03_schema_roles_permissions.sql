-- Thor SD-WAN CMS - Roles and Permissions (run after 02_schema_accounts.sql)

CREATE TABLE IF NOT EXISTS sdwan_cms.user_permissions
(
    id            UUID DEFAULT generateUUIDv4(),
    user_id       UUID,
    permission_to String,
    entity_id     String,
    entity_name   String DEFAULT '',
    role          String,
    deleted       UInt8 DEFAULT 0,
    created_at    DateTime DEFAULT now(),
    updated_at    DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(updated_at)
  ORDER BY (user_id, permission_to, entity_id);

DROP TABLE IF EXISTS sdwan_cms.user_permissions_with_user;
DROP TABLE IF EXISTS sdwan_cms.user_permissions_final;
CREATE VIEW sdwan_cms.user_permissions_final AS
SELECT id, user_id, permission_to, entity_id, entity_name, role, created_at, updated_at
FROM sdwan_cms.user_permissions FINAL
WHERE deleted = 0
ORDER BY user_id, permission_to, entity_id;
