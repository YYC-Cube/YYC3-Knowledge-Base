-- ============================================
-- Runner Docker Configuration Management
-- ============================================

-- Runner Docker 配置表
-- 存储控制面下发给 Runner 的 Docker 配置
CREATE TABLE IF NOT EXISTS runner_docker_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,

    -- 基础配置
    enabled BOOLEAN NOT NULL DEFAULT true,
    default_image VARCHAR(255) NOT NULL DEFAULT 'ubuntu:22.04',
    default_timeout_secs INTEGER NOT NULL DEFAULT 1800,

    -- 资源限制
    memory_limit_gb BIGINT,
    cpu_shares BIGINT,
    pids_limit BIGINT,

    -- 按构建类型指定的镜像 (JSONB)
    images_by_type JSONB DEFAULT '{}',

    -- 按能力标签的配置覆盖 (JSONB)
    per_capability JSONB DEFAULT '{}',

    -- 按 Runner 名称的配置覆盖 (JSONB)
    per_runner JSONB DEFAULT '{}',

    -- 元数据
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT check_memory_limit CHECK (memory_limit_gb IS NULL OR memory_limit_gb > 0),
    CONSTRAINT check_cpu_shares CHECK (cpu_shares IS NULL OR cpu_shares > 0),
    CONSTRAINT check_pids_limit CHECK (pids_limit IS NULL OR pids_limit > 0),
    CONSTRAINT check_timeout CHECK (default_timeout_secs > 0)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_runner_docker_configs_name ON runner_docker_configs(name);
CREATE INDEX IF NOT EXISTS idx_runner_docker_configs_enabled ON runner_docker_configs(enabled);

-- 创建更新时间触发器
DROP TRIGGER IF EXISTS update_runner_docker_configs_updated_at ON runner_docker_configs;
CREATE TRIGGER update_runner_docker_configs_updated_at
    BEFORE UPDATE ON runner_docker_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 插入默认配置
INSERT INTO runner_docker_configs (name, enabled, default_image, default_timeout_secs, memory_limit_gb, cpu_shares, pids_limit, description)
VALUES (
    'default',
    true,
    'ubuntu:22.04',
    1800,
    4,
    1024,
    1024,
    'Default Docker configuration for all runners'
)
ON CONFLICT (name) DO NOTHING;

-- 添加配置版本历史表（用于追踪配置变更）
CREATE TABLE IF NOT EXISTS runner_config_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES runner_docker_configs(id) ON DELETE CASCADE,

    -- 变更前的配置
    old_config JSONB,

    -- 变更后的配置
    new_config JSONB,

    -- 变更原因
    change_reason TEXT,

    -- 变更者
    changed_by UUID REFERENCES users(id),

    -- 变更时间
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runner_config_history_config_id ON runner_config_history(config_id);
CREATE INDEX IF NOT EXISTS idx_runner_config_history_created_at ON runner_config_history(created_at DESC);

-- 注释
COMMENT ON TABLE runner_docker_configs IS 'Docker configuration for runners, managed via web interface';
COMMENT ON COLUMN runner_docker_configs.name IS 'Configuration profile name (e.g., default, web-runner, java-runner)';
COMMENT ON COLUMN runner_docker_configs.per_runner IS 'Override configs by runner name (JSONB)';
COMMENT ON COLUMN runner_docker_configs.per_capability IS 'Override configs by capability tag (JSONB)';
COMMENT ON TABLE runner_config_history IS 'Audit trail for runner configuration changes';
