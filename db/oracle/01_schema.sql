-- Thor SD-WAN CMS - Oracle schema
-- Run with SQL*Plus or oracledb. Uses db_name as schema/user or service name.

-- Roles
CREATE TABLE roles (
    id VARCHAR2(36) PRIMARY KEY,
    name VARCHAR2(255),
    description VARCHAR2(512),
    permissions CLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users
CREATE TABLE users (
    id VARCHAR2(36) PRIMARY KEY,
    email VARCHAR2(255),
    name VARCHAR2(255),
    password_hash VARCHAR2(64),
    role_id VARCHAR2(36),
    entity_id VARCHAR2(255),
    enabled NUMBER(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    job_title VARCHAR2(255) DEFAULT '',
    account_id VARCHAR2(36) DEFAULT '00000000-0000-0000-0000-000000000000',
    is_owner NUMBER(1) DEFAULT 0
);

CREATE INDEX idx_users_email ON users(email);

-- Accounts
CREATE TABLE accounts (
    id VARCHAR2(36) PRIMARY KEY,
    name VARCHAR2(255) DEFAULT '',
    billing_email VARCHAR2(255),
    master_owner_user_id VARCHAR2(36),
    master_organization_name VARCHAR2(255) DEFAULT '',
    country VARCHAR2(255) DEFAULT '',
    notifications NUMBER(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Groups
CREATE TABLE groups (
    id VARCHAR2(36) PRIMARY KEY,
    account_id VARCHAR2(36),
    name VARCHAR2(255),
    master_owner_user_id VARCHAR2(36),
    created_by_user_id VARCHAR2(36),
    parent_group_id VARCHAR2(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_groups_account ON groups(account_id);

-- Sites (organizations)
CREATE TABLE sites (
    id VARCHAR2(36) PRIMARY KEY,
    name VARCHAR2(255),
    group_name VARCHAR2(255) DEFAULT '',
    tunnel_key_exchange VARCHAR2(64) DEFAULT 'ikev2',
    is_default NUMBER(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    account_id VARCHAR2(36),
    group_id VARCHAR2(36),
    master_owner_user_id VARCHAR2(36),
    created_by_user_id VARCHAR2(36)
);

-- Audit trail
CREATE TABLE audit_trail (
    id VARCHAR2(36) PRIMARY KEY,
    ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR2(36),
    user_email VARCHAR2(255) DEFAULT '',
    action VARCHAR2(128),
    resource VARCHAR2(128),
    resource_id VARCHAR2(255) DEFAULT '',
    details CLOB,
    ip VARCHAR2(64) DEFAULT '',
    user_agent VARCHAR2(512) DEFAULT '',
    account_id VARCHAR2(36),
    organization_id VARCHAR2(36)
);

CREATE INDEX idx_audit_ts ON audit_trail(ts);
CREATE INDEX idx_audit_user ON audit_trail(user_id);

-- User permissions
CREATE TABLE user_permissions (
    id VARCHAR2(36) PRIMARY KEY,
    user_id VARCHAR2(36),
    permission_to VARCHAR2(64),
    entity_id VARCHAR2(255),
    entity_name VARCHAR2(255) DEFAULT '',
    role VARCHAR2(64),
    deleted NUMBER(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Organization tokens
CREATE TABLE organization_tokens (
    id VARCHAR2(36) PRIMARY KEY,
    organization_id VARCHAR2(36),
    token_secret VARCHAR2(255),
    label VARCHAR2(255) DEFAULT '',
    revoked NUMBER(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Devices
CREATE TABLE devices (
    id VARCHAR2(36) PRIMARY KEY,
    organization_id VARCHAR2(36),
    name VARCHAR2(255),
    host_name VARCHAR2(255) DEFAULT '',
    description CLOB,
    approves NUMBER(1) DEFAULT 0,
    serial_number VARCHAR2(255),
    machine_id VARCHAR2(255),
    device_version VARCHAR2(64),
    settings CLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- VPN tunnels
CREATE TABLE vpn_tunnels (
    id VARCHAR2(36) PRIMARY KEY,
    organization_id VARCHAR2(36),
    device_a_id VARCHAR2(36),
    device_b_id VARCHAR2(36),
    interface_a VARCHAR2(128),
    interface_b VARCHAR2(128),
    path_label VARCHAR2(128),
    encrypt NUMBER(1) DEFAULT 1,
    status VARCHAR2(32) DEFAULT 'inactive',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Firewall rules
CREATE TABLE firewall_rules (
    id VARCHAR2(36) PRIMARY KEY,
    organization_id VARCHAR2(36),
    direction VARCHAR2(32),
    name VARCHAR2(255),
    destination VARCHAR2(255),
    source VARCHAR2(255) DEFAULT '* Any',
    action VARCHAR2(32),
    description CLOB,
    enabled NUMBER(1) DEFAULT 1,
    sort_order NUMBER(10) DEFAULT 0,
    payload CLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
