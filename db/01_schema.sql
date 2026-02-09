-- Thor SD-WAN CMS - ClickHouse schema
-- Run with: clickhouse-client --multiquery < db/01_schema.sql
-- Or: cat db/01_schema.sql | clickhouse-client --multiquery

-- Database (use default or create dedicated)
CREATE DATABASE IF NOT EXISTS sdwan_cms;

-- =============================================================================
-- 1. USER MANAGEMENT / USER ROLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS sdwan_cms.roles
(
    id          UUID DEFAULT generateUUIDv4(),
    name        String,
    description String,
    permissions String,  -- JSON array of permission keys, e.g. ["users:read","devices:write"]
    created_at  DateTime DEFAULT now(),
    updated_at  DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(updated_at)
  ORDER BY id;

CREATE TABLE IF NOT EXISTS sdwan_cms.users
(
    id            UUID DEFAULT generateUUIDv4(),
    email         String,
    name          String,
    password_hash String,
    role_id       UUID,
    entity_id     String,   -- org/tenant scope
    enabled       UInt8 DEFAULT 1,
    created_at    DateTime DEFAULT now(),
    updated_at    DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(updated_at)
  ORDER BY (email, id);

-- View: users with role name (latest row per user by updated_at)
CREATE VIEW IF NOT EXISTS sdwan_cms.users_with_roles AS
SELECT
    u.id,
    u.email,
    u.name,
    u.entity_id,
    u.enabled,
    u.created_at,
    u.updated_at,
    r.name AS role_name,
    r.permissions
FROM (SELECT * FROM sdwan_cms.users FINAL) u
LEFT JOIN (SELECT * FROM sdwan_cms.roles FINAL) r ON u.role_id = r.id;

-- =============================================================================
-- 2. AUDIT TRAIL (append-only). No TTL in ClickHouse 18.x; use external retention if needed.
-- =============================================================================

CREATE TABLE IF NOT EXISTS sdwan_cms.audit_trail
(
    id         UUID DEFAULT generateUUIDv4(),
    ts         DateTime DEFAULT now(),
    user_id    Nullable(UUID),
    user_email String DEFAULT '',
    action     String,   -- e.g. login, user.create, device.update
    resource   String,   -- e.g. users, devices, vpn
    resource_id String DEFAULT '',
    details    String,   -- JSON payload
    ip         String DEFAULT '',
    user_agent String DEFAULT ''
) ENGINE = MergeTree()
  ORDER BY (toDate(ts), ts, id);

-- View: recent audit (last 90 days) for dashboards
CREATE VIEW IF NOT EXISTS sdwan_cms.audit_recent AS
SELECT *
FROM sdwan_cms.audit_trail
WHERE ts >= now() - INTERVAL 90 DAY
ORDER BY ts DESC;

-- =============================================================================
-- 3. VPN AND DEVICE MANAGEMENT / SETTINGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS sdwan_cms.organizations
(
    id                      UUID DEFAULT generateUUIDv4(),
    name                    String,
    group_name              String DEFAULT '',
    tunnel_key_exchange      String DEFAULT 'ikev2',
    is_default              UInt8 DEFAULT 0,
    created_at              DateTime DEFAULT now(),
    updated_at              DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(updated_at)
  ORDER BY id;

CREATE TABLE IF NOT EXISTS sdwan_cms.devices
(
    id              UUID DEFAULT generateUUIDv4(),
    organization_id  UUID,
    name            String,
    host_name       String DEFAULT '',
    description     String DEFAULT '',
    approves        UInt8 DEFAULT 0,
    serial_number   String DEFAULT '',
    machine_id      String DEFAULT '',
    device_version  String DEFAULT '',
    settings        String,   -- JSON: interfaces, dhcp, routing, policies, etc.
    created_at      DateTime DEFAULT now(),
    updated_at      DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(updated_at)
  ORDER BY (organization_id, id);

CREATE TABLE IF NOT EXISTS sdwan_cms.vpn_tunnels
(
    id              UUID DEFAULT generateUUIDv4(),
    organization_id  UUID,
    device_a_id     UUID,
    device_b_id     UUID,
    interface_a     String DEFAULT '',
    interface_b     String DEFAULT '',
    path_label      String DEFAULT '',
    encrypt         UInt8 DEFAULT 1,
    status          String DEFAULT 'inactive',
    created_at      DateTime DEFAULT now(),
    updated_at      DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(updated_at)
  ORDER BY (organization_id, id);

CREATE TABLE IF NOT EXISTS sdwan_cms.firewall_rules
(
    id              UUID DEFAULT generateUUIDv4(),
    organization_id  UUID,
    direction       String,   -- 'inbound' | 'outbound'
    name            String,
    destination     String,
    source          String DEFAULT '* Any',
    action          String,   -- 'Allow' | 'Deny'
    description     String DEFAULT '',
    enabled         UInt8 DEFAULT 1,
    sort_order      Int32 DEFAULT 0,
    payload         String,   -- JSON: ip_ranges, protocols, port_ranges, interfaces
    created_at      DateTime DEFAULT now(),
    updated_at      DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(updated_at)
  ORDER BY (organization_id, direction, sort_order, id);

-- =============================================================================
-- VIEWS (optional, for common queries)
-- =============================================================================

CREATE VIEW IF NOT EXISTS sdwan_cms.devices_by_org AS
SELECT *
FROM sdwan_cms.devices FINAL
ORDER BY organization_id, name;

CREATE VIEW IF NOT EXISTS sdwan_cms.vpn_tunnels_active AS
SELECT *
FROM sdwan_cms.vpn_tunnels FINAL
WHERE status = 'active'
ORDER BY organization_id, path_label;
