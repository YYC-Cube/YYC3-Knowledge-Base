-- ============================================
-- Seed Data: 初始化示例数据
-- ============================================
-- 此脚本提供示例数据，方便快速开始和测试
-- 生产环境可以根据需要修改或删除此脚本

-- ============================================
-- 1. 演示用户
-- ============================================

DO $$
DECLARE
    demo_user_id UUID;
    operator_role_id UUID;
    viewer_role_id UUID;
BEGIN
    -- 创建演示用户 (密码: Demo123!)
    INSERT INTO users (username, email, password_hash, full_name, department, status)
    VALUES (
        'demo',
        'demo@ops-system.local',
        '$argon2id$v=19$m=65536,t=3,p=4$mP+j6QhTsozyICFqnpcXow$3ZHgLZQyJjv8/CnuEGvX0Y8S4lMdKQ9tNXhPXvcyePM',
        'Demo User',
        'Operations',
        'enabled'
    )
    ON CONFLICT (username) DO NOTHING
    RETURNING id INTO demo_user_id;

    -- 获取角色 ID
    SELECT id INTO operator_role_id FROM roles WHERE name = 'operator';
    SELECT id INTO viewer_role_id FROM roles WHERE name = 'viewer';

    -- 分配 operator 角色给演示用户
    IF demo_user_id IS NOT NULL AND operator_role_id IS NOT NULL THEN
        INSERT INTO role_bindings (user_id, role_id, scope_type)
        VALUES (demo_user_id, operator_role_id, 'global')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 创建更多测试用户 (密码均为: Demo123!)
INSERT INTO users (username, email, password_hash, full_name, department, status) VALUES
    ('john.doe', 'john.doe@example.com', '$argon2id$v=19$m=65536,t=3,p=4$mP+j6QhTsozyICFqnpcXow$3ZHgLZQyJjv8/CnuEGvX0Y8S4lMdKQ9tNXhPXvcyePM', 'John Doe', 'Engineering', 'enabled'),
    ('jane.smith', 'jane.smith@example.com', '$argon2id$v=19$m=65536,t=3,p=4$mP+j6QhTsozyICFqnpcXow$3ZHgLZQyJjv8/CnuEGvX0Y8S4lMdKQ9tNXhPXvcyePM', 'Jane Smith', 'Operations', 'enabled'),
    ('bob.wilson', 'bob.wilson@example.com', '$argon2id$v=19$m=65536,t=3,p=4$mP+j6QhTsozyICFqnpcXow$3ZHgLZQyJjv8/CnuEGvX0Y8S4lMdKQ9tNXhPXvcyePM', 'Bob Wilson', 'QA', 'enabled')
ON CONFLICT (username) DO NOTHING;

-- ============================================
-- 2. 资产组（按环境和层级组织）
-- ============================================

-- 生产环境资产组
INSERT INTO assets_groups (name, description, environment) VALUES
    ('prod-servers', 'Production Servers', 'prod'),
    ('prod-databases', 'Production Databases', 'prod'),
    ('prod-networking', 'Production Network Equipment', 'prod')
ON CONFLICT (name, environment) DO NOTHING;

-- 预发布环境资产组
INSERT INTO assets_groups (name, description, environment) VALUES
    ('stage-servers', 'Staging Servers', 'stage'),
    ('stage-databases', 'Staging Databases', 'stage')
ON CONFLICT (name, environment) DO NOTHING;

-- 开发环境资产组
INSERT INTO assets_groups (name, description, environment) VALUES
    ('dev-servers', 'Development Servers', 'dev'),
    ('dev-databases', 'Development Databases', 'dev'),
    ('dev-testbeds', 'Test Environments', 'dev')
ON CONFLICT (name, environment) DO NOTHING;

-- ============================================
-- 3. 示例主机
-- ============================================

DO $$
DECLARE
    prod_servers_group_id UUID;
    dev_servers_group_id UUID;
    admin_user_id UUID;
BEGIN
    -- 获取资产组 ID
    SELECT id INTO prod_servers_group_id FROM assets_groups WHERE name = 'prod-servers' AND environment = 'prod';
    SELECT id INTO dev_servers_group_id FROM assets_groups WHERE name = 'dev-servers' AND environment = 'dev';
    SELECT id INTO admin_user_id FROM users WHERE username = 'admin';

    -- 生产环境主机
    INSERT INTO assets_hosts (
        identifier, display_name, address, port,
        group_id, environment, tags, owner_id, status,
        os_type, os_version, notes
    ) VALUES
        (
            'prod-web-01',
            'Production Web Server 01',
            '192.168.1.10',
            22,
            prod_servers_group_id,
            'prod',
            '["web", "nginx", "frontend"]'::JSONB,
            admin_user_id,
            'active',
            'Ubuntu',
            '22.04 LTS',
            'Main web server, handles ~10k req/s'
        ),
        (
            'prod-web-02',
            'Production Web Server 02',
            '192.168.1.11',
            22,
            prod_servers_group_id,
            'prod',
            '["web", "nginx", "frontend"]'::JSONB,
            admin_user_id,
            'active',
            'Ubuntu',
            '22.04 LTS',
            'Web server standby'
        ),
        (
            'prod-api-01',
            'Production API Server',
            '192.168.1.20',
            22,
            prod_servers_group_id,
            'prod',
            '["api", "rust", "backend"]'::JSONB,
            admin_user_id,
            'active',
            'Ubuntu',
            '22.04 LTS',
            'API backend server'
        ),
        (
            'prod-db-01',
            'Production Database Primary',
            '192.168.1.30',
            22,
            prod_servers_group_id,
            'prod',
            '["database", "postgresql", "primary"]'::JSONB,
            admin_user_id,
            'active',
            'Ubuntu',
            '22.04 LTS',
            'Primary PostgreSQL server'
        ),
        (
            'prod-db-02',
            'Production Database Replica',
            '192.168.1.31',
            22,
            prod_servers_group_id,
            'prod',
            '["database", "postgresql", "replica"]'::JSONB,
            admin_user_id,
            'active',
            'Ubuntu',
            '22.04 LTS',
            'PostgreSQL read replica'
        )
    ON CONFLICT (identifier) DO NOTHING;

    -- 开发环境主机
    INSERT INTO assets_hosts (
        identifier, display_name, address, port,
        group_id, environment, tags, owner_id, status,
        os_type, os_version, notes
    ) VALUES
        (
            'dev-web-01',
            'Dev Web Server',
            '192.168.2.10',
            22,
            dev_servers_group_id,
            'dev',
            '["web", "development", "testing"]'::JSONB,
            admin_user_id,
            'active',
            'Ubuntu',
            '22.04 LTS',
            'Development web server'
        ),
        (
            'dev-api-01',
            'Dev API Server',
            '192.168.2.20',
            22,
            dev_servers_group_id,
            'dev',
            '["api", "development"]'::JSONB,
            admin_user_id,
            'active',
            'Ubuntu',
            '22.04 LTS',
            'API development server'
        ),
        (
            'dev-db-01',
            'Dev Database',
            '192.168.2.30',
            22,
            dev_servers_group_id,
            'dev',
            '["database", "development"]'::JSONB,
            admin_user_id,
            'active',
            'Ubuntu',
            '22.04 LTS',
            'Development database server'
        )
    ON CONFLICT (identifier) DO NOTHING;
END $$;

-- ============================================
-- 4. 示例审计日志（模拟历史记录）
-- ============================================

DO $$
DECLARE
    admin_user_id UUID;
    demo_user_id UUID;
    web_host_id UUID;
BEGIN
    SELECT id INTO admin_user_id FROM users WHERE username = 'admin';
    SELECT id INTO demo_user_id FROM users WHERE username = 'demo';
    SELECT id INTO web_host_id FROM assets_hosts WHERE identifier = 'prod-web-01';

    -- 模拟一些历史审计记录
    IF web_host_id IS NOT NULL THEN
        INSERT INTO audit_logs (
            subject_id, subject_type, subject_name,
            action, resource_type, resource_id, resource_name,
            changes, changes_summary,
            source_ip, result, occurred_at
        ) VALUES
            (
                admin_user_id, 'user', 'admin',
                'create', 'asset_host', web_host_id, 'prod-web-01',
                '{"before": null, "after": {"identifier": "prod-web-01", "address": "192.168.1.10"}}'::JSONB,
                'Created host prod-web-01',
                '10.0.0.1', 'success', NOW() - INTERVAL '7 days'
            ),
            (
                admin_user_id, 'user', 'admin',
                'update', 'asset_host', web_host_id, 'prod-web-01',
                '{"before": {"status": "maintenance"}, "after": {"status": "active"}}'::JSONB,
                'Changed host status to active',
                '10.0.0.1', 'success', NOW() - INTERVAL '6 days'
            ),
            (
                demo_user_id, 'user', 'demo',
                'execute', 'job', NULL, 'deploy-app-v1.2',
                '{"before": null, "after": {"status": "completed", "duration": "45s"}}'::JSONB,
                'Executed deployment job on prod-web-01',
                '10.0.0.50', 'success', NOW() - INTERVAL '1 day'
            );
    END IF;
END $$;

-- ============================================
-- 5. 示例登录事件
-- ============================================

DO $$
DECLARE
    admin_user_id UUID;
    demo_user_id UUID;
BEGIN
    SELECT id INTO admin_user_id FROM users WHERE username = 'admin';
    SELECT id INTO demo_user_id FROM users WHERE username = 'demo';

    -- 模拟登录事件
    INSERT INTO login_events (
        user_id, username, event_type, auth_method,
        source_ip, user_agent, occurred_at
    ) VALUES
        (admin_user_id, 'admin', 'login_success', 'password',
         '10.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW() - INTERVAL '2 hours'),
        (demo_user_id, 'demo', 'login_success', 'password',
         '10.0.0.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', NOW() - INTERVAL '1 hour'),
        (NULL, 'unknown', 'login_failure', 'password',
         '10.0.0.99', 'curl/7.68.0', NOW() - INTERVAL '30 minutes');
END $$;

-- ============================================
-- 6. 额外的自定义权限（可选）
-- ============================================

-- 如果需要更细粒度的权限控制，可以添加更多权限
INSERT INTO permissions (resource, action, description) VALUES
    ('deployment', 'read', 'View deployment status'),
    ('deployment', 'execute', 'Execute deployments'),
    ('monitoring', 'read', 'View monitoring metrics'),
    ('backup', 'read', 'View backup status'),
    ('backup', 'execute', 'Execute backup operations')
ON CONFLICT (resource, action) DO NOTHING;

-- ============================================
-- 7. 自定义角色（可选）
-- ============================================

INSERT INTO roles (name, description, is_system) VALUES
    ('deployer', 'Can deploy applications but no system admin', FALSE),
    ('monitor', 'Monitoring and read-only access', FALSE)
ON CONFLICT (name) DO NOTHING;

-- 为 deployer 角色分配权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'deployer'
  AND p.resource IN ('asset', 'job', 'deployment')
  AND p.action IN ('read', 'execute')
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. 数据统计视图（便于查询）
-- ============================================

-- 主机统计视图
CREATE OR REPLACE VIEW v_host_stats AS
SELECT
    environment,
    status,
    COUNT(*) as count,
    COUNT(DISTINCT group_id) as group_count
FROM assets_hosts
GROUP BY environment, status
ORDER BY environment, status;

-- 用户统计视图
CREATE OR REPLACE VIEW v_user_stats AS
SELECT
    status,
    COUNT(*) as count,
    COUNT(CASE WHEN must_change_password THEN 1 END) as pending_password_change
FROM users
GROUP BY status;

-- 最近活动视图
CREATE OR REPLACE VIEW v_recent_activity AS
SELECT
    occurred_at,
    subject_name,
    action,
    resource_name,
    changes_summary
FROM audit_logs
ORDER BY occurred_at DESC
LIMIT 50;

-- ============================================
-- 9. 有用的查询函数
-- ============================================

-- 获取用户的所有权限（包括继承的）
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE(resource VARCHAR, action VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.resource, p.action
    FROM role_bindings rb
    JOIN role_permissions rp ON rb.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE rb.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 检查用户是否有特定权限
CREATE OR REPLACE FUNCTION check_permission(
    p_user_id UUID,
    p_resource VARCHAR,
    p_action VARCHAR
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM role_bindings rb
        JOIN role_permissions rp ON rb.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rb.user_id = p_user_id
          AND p.resource = check_permission.p_resource
          AND p.action = check_permission.p_action
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. 数据完整性检查函数
-- ============================================

-- 检查孤儿记录（没有用户的主机）
CREATE OR REPLACE FUNCTION check_orphan_hosts()
RETURNS TABLE(identifier VARCHAR, display_name VARCHAR) AS $$
BEGIN
    RETURN QUERY
        SELECT h.identifier, h.display_name
        FROM assets_hosts h
        LEFT JOIN users u ON h.owner_id = u.id
        WHERE h.owner_id IS NOT NULL AND u.id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 完成提示
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '种子数据安装完成！';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '';
    RAISE NOTICE '默认账户:';
    RAISE NOTICE '  管理员: admin / Admin123!';
    RAISE NOTICE '  演示用户: demo / Demo123!';
    RAISE NOTICE '';
    RAISE NOTICE '测试用户 (密码: Demo123!):';
    RAISE NOTICE '  - john.doe';
    RAISE NOTICE '  - jane.smith';
    RAISE NOTICE '  - bob.wilson';
    RAISE NOTICE '';
    RAISE NOTICE '已创建 % 个资产组', (SELECT COUNT(*) FROM assets_groups);
    RAISE NOTICE '已创建 % 台主机', (SELECT COUNT(*) FROM assets_hosts);
    RAISE NOTICE '已创建 % 条审计记录', (SELECT COUNT(*) FROM audit_logs);
    RAISE NOTICE '';
    RAISE NOTICE '查询统计信息:';
    RAISE NOTICE '  SELECT * FROM v_host_stats;';
    RAISE NOTICE '  SELECT * FROM v_user_stats;';
    RAISE NOTICE '  SELECT * FROM v_recent_activity;';
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
END $$;
