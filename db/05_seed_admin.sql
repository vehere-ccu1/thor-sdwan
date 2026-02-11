-- Thor SD-WAN CMS - Seed default owner user (run after 04_schema_tokens.sql or 03_schema_roles_permissions.sql)
-- Creates: one account, one Owner role, one user "admin" / "admin" with password_hash = SHA256('admin').
-- Fixed UUIDs so re-running is idempotent (ReplacingMergeTree keeps latest row per id).

-- Default account for the seed admin user
INSERT INTO sdwan_cms.accounts (id, name, billing_email)
VALUES (toUUID('11111111-1111-1111-1111-111111111111'), 'Default', 'admin@local');

-- Owner role (full permissions)
INSERT INTO sdwan_cms.roles (id, name, description, permissions)
VALUES (toUUID('22222222-2222-2222-2222-222222222222'), 'Owner', 'Account owner', '["*"]');

-- Manager role
INSERT INTO sdwan_cms.roles (id, name, description, permissions)
VALUES (toUUID('44444444-4444-4444-4444-444444444444'), 'Manager', 'Manager', '["users:read","devices:read","devices:write"]');

-- Viewer role
INSERT INTO sdwan_cms.roles (id, name, description, permissions)
VALUES (toUUID('55555555-5555-5555-5555-555555555555'), 'Viewer', 'Viewer', '["users:read","devices:read"]');

-- Admin user: email=admin, password=admin, password_hash = hex(SHA256('admin'))
INSERT INTO sdwan_cms.users (id, account_id, email, name, password_hash, role_id, is_owner, enabled)
VALUES (
    toUUID('33333333-3333-3333-3333-333333333333'),
    toUUID('11111111-1111-1111-1111-111111111111'),
    'admin',
    'admin',
    hex(SHA256('admin')),
    toUUID('22222222-2222-2222-2222-222222222222'),
    1,
    1
);
