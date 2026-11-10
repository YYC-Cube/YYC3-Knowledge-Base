-- ============================================
-- P1 Phase: Identity, Permissions, Assets & Audit
-- ============================================

-- ============================================
-- Identity Domain
-- ============================================

-- Users table with account state machine
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,

    -- Account state: enabled, disabled, locked
    status VARCHAR(20) NOT NULL DEFAULT 'enabled' CHECK (status IN ('enabled', 'disabled', 'locked')),

    -- Security policy
    failed_login_attempts INT NOT NULL DEFAULT 0,
    last_failed_login_at TIMESTAMPTZ,
    locked_until TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,

    -- Metadata
    full_name VARCHAR(255),
    department VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    -- Version for optimistic locking
    version INT NOT NULL DEFAULT 1
);

-- Indexes for users
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT FALSE, -- System roles cannot be deleted
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Permissions table (resource + action)
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource VARCHAR(100) NOT NULL, -- e.g., "asset", "job", "audit"
    action VARCHAR(100) NOT NULL,   -- e.g., "read", "write", "execute", "approve"
    description TEXT,
    UNIQUE(resource, action)
);

CREATE INDEX idx_permissions_resource_action ON permissions(resource, action);

-- Role permissions (many-to-many)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Role bindings: users assigned to roles with scopes
CREATE TABLE IF NOT EXISTS role_bindings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,

    -- Scope: global, group-specific, or resource-specific
    scope_type VARCHAR(20) NOT NULL DEFAULT 'global' CHECK (scope_type IN ('global', 'group', 'environment')),
    scope_value VARCHAR(255), -- Group ID or environment name if scope_type != global

    -- Constraints: ensure mutual exclusivity
    CONSTRAINT valid_scope_value CHECK (
        (scope_type = 'global' AND scope_value IS NULL) OR
        (scope_type != 'global' AND scope_value IS NOT NULL)
    ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_role_bindings_user ON role_bindings(user_id);
CREATE INDEX idx_role_bindings_scope ON role_bindings(scope_type, scope_value);

-- API Keys for service accounts
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_id VARCHAR(50) NOT NULL UNIQUE, -- Public identifier (e.g., "ak_...")
    key_hash VARCHAR(255) NOT NULL,     -- Hashed actual key
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,         -- Human-readable name
    scopes JSONB,                       -- Array of scopes
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_api_keys_key_id ON api_keys(key_id);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);

-- Refresh tokens (for logout/revocation support)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Device/session binding
    device_id VARCHAR(255),             -- Device fingerprint
    user_agent TEXT,
    ip_address VARCHAR(45),             -- IPv6-compatible

    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    replaced_by UUID REFERENCES refresh_tokens(id), -- Token rotation

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- ============================================
-- Asset Domain
-- ============================================

-- Asset groups (hierarchical, environment-aware)
CREATE TABLE IF NOT EXISTS assets_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Environment: dev, stage, prod, etc.
    environment VARCHAR(50) NOT NULL DEFAULT 'dev' CHECK (environment IN ('dev', 'stage', 'prod', 'custom')),

    -- Hierarchical structure (optional)
    parent_id UUID REFERENCES assets_groups(id) ON DELETE SET NULL,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE UNIQUE INDEX idx_assets_groups_name_env ON assets_groups(name, environment);
CREATE INDEX idx_assets_groups_parent ON assets_groups(parent_id);

-- Host assets
CREATE TABLE IF NOT EXISTS assets_hosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier VARCHAR(255) NOT NULL UNIQUE, -- Unique hostname/ID
    display_name VARCHAR(255),

    -- Connection info
    address VARCHAR(255) NOT NULL,         -- IP or hostname
    port INT DEFAULT 22,

    -- Grouping and organization
    group_id UUID NOT NULL REFERENCES assets_groups(id) ON DELETE RESTRICT,
    environment VARCHAR(50) NOT NULL DEFAULT 'dev',

    -- Tagging system
    tags JSONB DEFAULT '[]',               -- Array of tag strings

    -- Ownership and lifecycle
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'decommissioned')),

    -- Additional info
    notes TEXT,
    os_type VARCHAR(100),
    os_version VARCHAR(100),

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),

    -- Version for optimistic locking and change tracking
    version INT NOT NULL DEFAULT 1
);

CREATE INDEX idx_assets_hosts_identifier ON assets_hosts(identifier);
CREATE INDEX idx_assets_hosts_group ON assets_hosts(group_id);
CREATE INDEX idx_assets_hosts_environment ON assets_hosts(environment);
CREATE INDEX idx_assets_hosts_status ON assets_hosts(status);
CREATE INDEX idx_assets_hosts_tags ON assets_hosts USING GIN(tags);

-- ============================================
-- Audit Domain
-- ============================================

-- Audit logs (all write operations)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Subject: who performed the action
    subject_id UUID NOT NULL,             -- User ID
    subject_type VARCHAR(20) NOT NULL DEFAULT 'user', -- user, api_key, system
    subject_name VARCHAR(255),            -- Username or key name

    -- Action: what was done
    action VARCHAR(100) NOT NULL,         -- create, update, delete, execute, etc.
    resource_type VARCHAR(100) NOT NULL,  -- user, asset, group, job, etc.
    resource_id UUID,                     -- ID of affected resource
    resource_name VARCHAR(255),           -- Human-readable name

    -- Change tracking
    changes JSONB,                        -- Diff: {before: {...}, after: {...}}
    changes_summary TEXT,                 -- Human-readable summary

    -- Context
    source_ip VARCHAR(45),
    user_agent TEXT,
    trace_id VARCHAR(255),                -- Request tracing ID
    request_id VARCHAR(255),

    -- Result
    result VARCHAR(20) NOT NULL CHECK (result IN ('success', 'failure', 'partial')),
    error_message TEXT,

    -- Timing
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_subject ON audit_logs(subject_id, occurred_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id, occurred_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, occurred_at DESC);
CREATE INDEX idx_audit_logs_time ON audit_logs(occurred_at DESC);
CREATE INDEX idx_audit_logs_trace ON audit_logs(trace_id);

-- Login events (security monitoring)
CREATE TABLE IF NOT EXISTS login_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User identification
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(100) NOT NULL,

    -- Event details
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('login_success', 'login_failure', 'logout', 'token_refresh')),
    auth_method VARCHAR(20) NOT NULL CHECK (auth_method IN ('password', 'api_key', 'refresh_token')),

    -- Failure reason
    failure_reason VARCHAR(100),          -- invalid_credentials, account_locked, etc.

    -- Context
    source_ip VARCHAR(45) NOT NULL,
    user_agent TEXT,
    device_id VARCHAR(255),

    -- Risk assessment
    risk_tag VARCHAR(50),                 -- suspicious, brute_force, new_device, etc.

    -- Timing
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_login_events_user ON login_events(user_id, occurred_at DESC);
CREATE INDEX idx_login_events_username ON login_events(username, occurred_at DESC);
CREATE INDEX idx_login_events_type ON login_events(event_type, occurred_at DESC);
CREATE INDEX idx_login_events_risk ON login_events(risk_tag, occurred_at DESC) WHERE risk_tag IS NOT NULL;

-- ============================================
-- Initial Data: Seeds
-- ============================================

-- Default permissions
INSERT INTO permissions (resource, action, description) VALUES
    ('asset', 'read', 'View assets and groups'),
    ('asset', 'write', 'Create, update, delete assets'),
    ('job', 'read', 'View jobs and tasks'),
    ('job', 'execute', 'Execute jobs on targets'),
    ('job', 'approve', 'Approve jobs (for production)'),
    ('approval', 'read', 'View approval requests and groups'),
    ('approval', 'approve', 'Approve or reject approval requests'),
    ('build', 'read', 'View build jobs and build status'),
    ('build', 'execute', 'Create, cancel, retry build jobs'),
    ('build', 'output_detail', 'View detailed build step output'),
    ('runner', 'read', 'View runner status and runner list'),
    ('runner', 'write', 'Manage runner status and runner records'),
    ('artifact', 'read', 'View artifacts and download metadata'),
    ('artifact', 'write', 'Manage artifact metadata and retention'),
    ('audit', 'read', 'View audit logs'),
    ('audit', 'admin', 'Access system-level audit'),
    ('user', 'read', 'View user information'),
    ('user', 'write', 'Manage users and roles'),
    ('role', 'read', 'View roles and permissions'),
    ('role', 'write', 'Manage roles and permissions'),
    ('role_binding', 'write', 'Manage user role bindings'),
    ('system', 'admin', 'System administration')
ON CONFLICT (resource, action) DO NOTHING;

-- Default roles
INSERT INTO roles (name, description, is_system) VALUES
    ('admin', 'Full system access', TRUE),
    ('operator', 'Can execute jobs and view assets', FALSE),
    ('viewer', 'Read-only access to assets and jobs', FALSE),
    ('auditor', 'Read-only access to audit logs', FALSE)
ON CONFLICT (name) DO NOTHING;

-- Admin role gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Operator role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'operator'
  AND (
    (p.resource = 'asset' AND p.action = 'read') OR
    (p.resource = 'job' AND p.action IN ('read', 'execute')) OR
    (p.resource = 'approval' AND p.action = 'read') OR
    (p.resource = 'build' AND p.action IN ('read', 'execute')) OR
    (p.resource = 'runner' AND p.action = 'read') OR
    (p.resource = 'artifact' AND p.action = 'read')
  )
ON CONFLICT DO NOTHING;

-- Viewer role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'viewer'
  AND (
    (p.resource = 'asset' AND p.action = 'read') OR
    (p.resource = 'job' AND p.action = 'read') OR
    (p.resource = 'approval' AND p.action = 'read') OR
    (p.resource = 'build' AND p.action = 'read') OR
    (p.resource = 'runner' AND p.action = 'read') OR
    (p.resource = 'artifact' AND p.action = 'read')
  )
ON CONFLICT DO NOTHING;

-- Auditor role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'auditor' AND p.resource IN ('audit')
ON CONFLICT DO NOTHING;

-- ============================================
-- Functions for updated_at and version increment
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assets_groups_updated_at ON assets_groups;
CREATE TRIGGER update_assets_groups_updated_at BEFORE UPDATE ON assets_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assets_hosts_updated_at ON assets_hosts;
CREATE TRIGGER update_assets_hosts_updated_at BEFORE UPDATE ON assets_hosts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment version on update
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS increment_assets_hosts_version ON assets_hosts;
CREATE TRIGGER increment_assets_hosts_version BEFORE UPDATE ON assets_hosts
    FOR EACH ROW EXECUTE FUNCTION increment_version();

-- ============================================
-- Audit trigger for assets_hosts
-- ============================================

-- Create a function to get current user from session variable
-- This will be set by application code before transactions
CREATE OR REPLACE FUNCTION audit_assets_hosts_changes()
RETURNS TRIGGER AS $$
DECLARE
    changes_data JSONB;
    changes_summary_text TEXT;
    current_user_id UUID;
BEGIN
    -- Try to get current user from session variable (set by app)
    current_user_id := NULLIF(current_setting('app.current_user_id', true), '')::UUID;

    -- Build changes JSON
    IF TG_OP = 'INSERT' THEN
        changes_data = jsonb_build_object(
            'before', NULL::JSONB,
            'after', jsonb_build_object(
                'identifier', NEW.identifier,
                'address', NEW.address,
                'status', NEW.status,
                'group_id', NEW.group_id
            )
        );
        changes_summary_text = 'Created host ' || NEW.identifier;

    ELSIF TG_OP = 'UPDATE' THEN
        changes_data = jsonb_build_object(
            'before', jsonb_build_object(
                'identifier', OLD.identifier,
                'address', OLD.address,
                'status', OLD.status,
                'group_id', OLD.group_id
            ),
            'after', jsonb_build_object(
                'identifier', NEW.identifier,
                'address', NEW.address,
                'status', NEW.status,
                'group_id', NEW.group_id
            )
        );
        changes_summary_text = 'Updated host ' || NEW.identifier;

    ELSIF TG_OP = 'DELETE' THEN
        changes_data = jsonb_build_object(
            'before', jsonb_build_object(
                'identifier', OLD.identifier,
                'address', OLD.address
            ),
            'after', NULL::JSONB
        );
        changes_summary_text = 'Deleted host ' || OLD.identifier;
    END IF;

    -- Insert audit log (for INSERT/UPDATE/DELETE)
    INSERT INTO audit_logs (
        subject_id, subject_type, subject_name,
        action, resource_type, resource_id, resource_name,
        changes, changes_summary,
        result,
        occurred_at
    ) VALUES (
        COALESCE(current_user_id, NEW.created_by, NEW.updated_by, OLD.created_by, '00000000-0000-0000-0000-000000000000'::UUID),
        'user',
        'system', -- Will be replaced by middleware context
        CASE TG_OP WHEN 'INSERT' THEN 'create' WHEN 'UPDATE' THEN 'update' ELSE 'delete' END,
        'asset_host',
        COALESCE(NEW.id, OLD.id),
        COALESCE(NEW.identifier, OLD.identifier),
        changes_data,
        changes_summary_text,
        'success',
        NOW()
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_assets_hosts_trigger ON assets_hosts;
CREATE TRIGGER audit_assets_hosts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON assets_hosts
    FOR EACH ROW EXECUTE FUNCTION audit_assets_hosts_changes();

-- ============================================
-- Default admin user creation
-- Note: The password hash below is for 'Admin123!'
-- This should be changed on first login
-- ============================================

DO $$
DECLARE
    admin_user_id UUID;
    admin_role_id UUID;
BEGIN
    -- Create admin user
    INSERT INTO users (id, username, email, password_hash, full_name, status, must_change_password)
    VALUES (
        gen_random_uuid(),
        'admin',
        'admin@ops-system.local',
        '$argon2id$v=19$m=65536,t=3,p=4$ZCh5u+DL3T0pMzvmDajKlA$9jCTTIjyWgptllHK3ptDzGwFXFd06c8NC/P+j9z199g', -- Password: Admin123!
        'System Administrator',
        'enabled',
        TRUE
    )
    ON CONFLICT (username) DO NOTHING
    RETURNING id INTO admin_user_id;

    -- Grant admin role to admin user
    SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';

    IF admin_user_id IS NOT NULL AND admin_role_id IS NOT NULL THEN
        INSERT INTO role_bindings (user_id, role_id, scope_type, created_by)
        VALUES (admin_user_id, admin_role_id, 'global', admin_user_id)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
