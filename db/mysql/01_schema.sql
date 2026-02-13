-- Thor SD-WAN CMS - MySQL schema (equivalent to ClickHouse 01 + 02)
-- Run when db_type=mysql. API connects to db_name (default sdwan_cms) and runs this file.
-- Create database separately; this file assumes connection is already using the target database.

-- Roles
CREATE TABLE IF NOT EXISTS roles (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255),
    description VARCHAR(512),
    permissions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Users (account_id, is_owner, job_title for account model)
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,
    email VARCHAR(255),
    name VARCHAR(255),
    password_hash VARCHAR(64),
    role_id CHAR(36),
    entity_id VARCHAR(255),
    enabled TINYINT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    job_title VARCHAR(255) DEFAULT '',
    account_id CHAR(36) DEFAULT '00000000-0000-0000-0000-000000000000',
    is_owner TINYINT DEFAULT 0,
    master_owner_user_id CHAR(36),
    created_by_user_id CHAR(36),
    organizations JSON,
    organization_group_ids JSON,
    INDEX idx_users_email (email)
);

-- Accounts
CREATE TABLE IF NOT EXISTS accounts (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) DEFAULT '',
    billing_email VARCHAR(255),
    master_owner_user_id CHAR(36),
    master_organization_name VARCHAR(255) DEFAULT '',
    country VARCHAR(255) DEFAULT '',
    notifications TINYINT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Groups (backticks: groups is a MySQL reserved word)
CREATE TABLE IF NOT EXISTS `groups` (
    id CHAR(36) PRIMARY KEY,
    account_id CHAR(36),
    name VARCHAR(255),
    master_owner_user_id CHAR(36),
    created_by_user_id CHAR(36),
    parent_group_id CHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_groups_account (account_id)
);

-- Sites (organizations)
CREATE TABLE IF NOT EXISTS sites (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255),
    group_name VARCHAR(255) DEFAULT '',
    tunnel_key_exchange VARCHAR(64) DEFAULT 'ikev2',
    is_default TINYINT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    account_id CHAR(36),
    group_id CHAR(36),
    master_owner_user_id CHAR(36),
    created_by_user_id CHAR(36)
);

-- Audit trail
CREATE TABLE IF NOT EXISTS audit_trail (
    id CHAR(36) PRIMARY KEY,
    ts DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id CHAR(36),
    user_email VARCHAR(255) DEFAULT '',
    action VARCHAR(128),
    resource VARCHAR(128),
    resource_id VARCHAR(255) DEFAULT '',
    details TEXT,
    ip VARCHAR(64) DEFAULT '',
    user_agent VARCHAR(512) DEFAULT '',
    account_id CHAR(36),
    organization_id CHAR(36),
    INDEX idx_audit_ts (ts),
    INDEX idx_audit_user (user_id)
);

-- User permissions
CREATE TABLE IF NOT EXISTS user_permissions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36),
    permission_to VARCHAR(64),
    entity_id VARCHAR(255),
    entity_name VARCHAR(255) DEFAULT '',
    role VARCHAR(64),
    deleted TINYINT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Organization tokens
CREATE TABLE IF NOT EXISTS organization_tokens (
    id CHAR(36) PRIMARY KEY,
    organization_id CHAR(36),
    token_secret VARCHAR(255),
    label VARCHAR(255) DEFAULT '',
    revoked TINYINT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Devices, VPN tunnels, firewall_rules (minimal for schema sync)
CREATE TABLE IF NOT EXISTS devices (
    id CHAR(36) PRIMARY KEY,
    organization_id CHAR(36),
    name VARCHAR(255),
    host_name VARCHAR(255) DEFAULT '',
    description TEXT,
    approves TINYINT DEFAULT 0,
    serial_number VARCHAR(255),
    machine_id VARCHAR(255),
    device_version VARCHAR(64),
    settings TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vpn_tunnels (
    id CHAR(36) PRIMARY KEY,
    organization_id CHAR(36),
    device_a_id CHAR(36),
    device_b_id CHAR(36),
    interface_a VARCHAR(128),
    interface_b VARCHAR(128),
    path_label VARCHAR(128),
    encrypt TINYINT DEFAULT 1,
    status VARCHAR(32) DEFAULT 'inactive',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS firewall_rules (
    id CHAR(36) PRIMARY KEY,
    organization_id CHAR(36),
    direction VARCHAR(32),
    name VARCHAR(255),
    destination VARCHAR(255),
    source VARCHAR(255) DEFAULT '* Any',
    action VARCHAR(32),
    description TEXT,
    enabled TINYINT DEFAULT 1,
    sort_order INT DEFAULT 0,
    payload TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Views (equivalent to ClickHouse users_with_roles, sites_with_account, user_permissions_final)
DROP VIEW IF EXISTS users_with_roles;
CREATE VIEW users_with_roles AS
SELECT
    u.id,
    u.email,
    u.name,
    u.job_title,
    u.account_id,
    u.entity_id,
    u.is_owner,
    u.enabled,
    u.created_at,
    u.updated_at,
    r.name AS role_name,
    r.permissions,
    a.billing_email AS account_billing_email,
    u.master_owner_user_id,
    u.created_by_user_id,
    u.organizations,
    u.organization_group_ids
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
LEFT JOIN accounts a ON u.account_id = a.id;

DROP VIEW IF EXISTS sites_with_account;
CREATE VIEW sites_with_account AS
SELECT
    o.id,
    o.account_id,
    o.group_id,
    o.name,
    o.group_name,
    o.tunnel_key_exchange,
    o.is_default,
    o.created_at,
    o.updated_at,
    COALESCE(NULLIF(o.master_owner_user_id, '00000000-0000-0000-0000-000000000000'), a.master_owner_user_id) AS master_owner_user_id,
    o.created_by_user_id,
    a.billing_email AS account_billing_email,
    g.name AS group_name_resolved
FROM sites o
LEFT JOIN accounts a ON o.account_id = a.id
LEFT JOIN `groups` g ON o.group_id = g.id;

DROP VIEW IF EXISTS user_permissions_final;
CREATE VIEW user_permissions_final AS
SELECT id, user_id, permission_to, entity_id, entity_name, role, created_at, updated_at
FROM user_permissions
WHERE deleted = 0;
