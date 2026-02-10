-- Thor SD-WAN CMS - Account & Users model (run after 01_schema.sql)
-- Terminology: Account (billing, multi-tenant) -> Groups -> Organizations; Users belong to Account (Owner/Manager).

-- =============================================================================
-- ACCOUNTS (billing entity; one per MSP/SI; owns organizations)
-- =============================================================================
CREATE TABLE IF NOT EXISTS sdwan_cms.accounts
(
    id                   UUID DEFAULT generateUUIDv4(),
    name                 String DEFAULT '',
    billing_email        String,
    master_owner_user_id UUID DEFAULT toUUID('00000000-0000-0000-0000-000000000000'),
    created_at           DateTime DEFAULT now(),
    updated_at           DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(updated_at)
  ORDER BY id;

-- =============================================================================
-- GROUPS (group of organizations; for management permissions)
-- =============================================================================
CREATE TABLE IF NOT EXISTS sdwan_cms.groups
(
    id          UUID DEFAULT generateUUIDv4(),
    account_id  UUID,
    name        String,
    created_at  DateTime DEFAULT now(),
    updated_at  DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(updated_at)
  ORDER BY (account_id, id);

-- =============================================================================
-- ORGANIZATIONS (account_id, group_id added by schema_sync if missing)
-- =============================================================================

-- =============================================================================
-- USERS (account_id, is_owner added by schema_sync if missing)
-- =============================================================================

-- View: users with role and account (one JOIN per level for ClickHouse 18.x)
-- Includes: master_owner_user_id, created_by_user_id, organizations, created_at (columns added by schema_sync if missing) and job_title.
DROP TABLE IF EXISTS sdwan_cms.users_with_roles;
CREATE VIEW sdwan_cms.users_with_roles AS
SELECT
    ur.id,
    ur.email,
    ur.name,
    ur.job_title,
    ur.account_id,
    ur.entity_id,
    ur.is_owner,
    ur.enabled,
    ur.created_at,
    ur.updated_at,
    ur.role_name,
    ur.permissions,
    a.billing_email AS account_billing_email,
    ur.master_owner_user_id,
    ur.created_by_user_id,
    ur.organizations,
    ur.organization_group_ids
FROM (
    SELECT u.id, u.email, u.name, u.job_title, u.account_id, u.entity_id, u.is_owner, u.enabled, u.created_at, u.updated_at,
           r.name AS role_name, r.permissions,
           u.master_owner_user_id,
           u.created_by_user_id,
           u.organizations,
           u.organization_group_ids
    FROM (SELECT * FROM sdwan_cms.users FINAL) u
    LEFT JOIN (SELECT * FROM sdwan_cms.roles FINAL) r ON u.role_id = r.id
) ur
LEFT JOIN (SELECT * FROM sdwan_cms.accounts FINAL) a ON ur.account_id = a.id;

-- View: organizations with account and group (Master-Owner, Created-By, GroupName, Created-At)
-- Use account's master_owner_user_id when organization's is null/nil so Master Owner column is always populated.
DROP TABLE IF EXISTS sdwan_cms.organizations_with_account;
CREATE VIEW sdwan_cms.organizations_with_account AS
SELECT
    oa.id,
    oa.account_id,
    oa.group_id,
    oa.name,
    oa.group_name,
    oa.tunnel_key_exchange,
    oa.is_default,
    oa.created_at,
    oa.updated_at,
    coalesce(nullIf(oa.master_owner_user_id, toUUID('00000000-0000-0000-0000-000000000000')), oa.account_master_owner_user_id) AS master_owner_user_id,
    oa.created_by_user_id,
    oa.account_billing_email,
    g.name AS group_name_resolved
FROM (
    SELECT o.id, o.account_id, o.group_id, o.name, o.group_name, o.tunnel_key_exchange, o.is_default, o.created_at, o.updated_at,
           o.master_owner_user_id, o.created_by_user_id,
           a.billing_email AS account_billing_email,
           a.master_owner_user_id AS account_master_owner_user_id
    FROM (SELECT * FROM sdwan_cms.organizations FINAL) o
    LEFT JOIN (SELECT * FROM sdwan_cms.accounts FINAL) a ON o.account_id = a.id
) oa
LEFT JOIN (SELECT * FROM sdwan_cms.groups FINAL) g ON oa.group_id = g.id;
