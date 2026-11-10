-- ============================================
-- P2 Phase: Job System (SSH Execution) & Build System
-- ============================================

-- ============================================
-- Job Domain (作业系统)
-- ============================================

-- Custom types for Job system
CREATE TYPE job_type AS ENUM ('command', 'script', 'build');
CREATE TYPE job_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled', 'partially_succeeded');
CREATE TYPE task_status AS ENUM ('pending', 'running', 'succeeded', 'failed', 'timeout', 'cancelled');
CREATE TYPE failure_reason AS ENUM ('network_error', 'auth_failed', 'connection_timeout', 'handshake_timeout', 'command_timeout', 'command_failed', 'unknown');

-- Jobs table (顶层作业概念)
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type job_type NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Status
    status job_status NOT NULL DEFAULT 'pending',

    -- 目标集（固化）
    target_hosts JSONB NOT NULL DEFAULT '[]', -- UUID[]
    target_groups JSONB NOT NULL DEFAULT '[]', -- UUID[]

    -- 执行参数
    command TEXT,                    -- 命令作业的命令
    script TEXT,                     -- 脚本作业的脚本内容
    script_path VARCHAR(500),        -- 脚本路径

    -- 执行配置
    concurrent_limit INT,            -- 并发上限
    timeout_secs INT,                -- 超时时间（秒）
    retry_times INT DEFAULT 0,       -- 重试次数
    execute_user VARCHAR(100),       -- 执行用户

    -- 幂等性控制
    idempotency_key VARCHAR(255) UNIQUE,

    -- 结果统计
    total_tasks INT NOT NULL DEFAULT 0,
    succeeded_tasks INT NOT NULL DEFAULT 0,
    failed_tasks INT NOT NULL DEFAULT 0,
    timeout_tasks INT NOT NULL DEFAULT 0,
    cancelled_tasks INT NOT NULL DEFAULT 0,

    -- 审计字段
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- 元数据
    tags JSONB NOT NULL DEFAULT '[]' -- VARCHAR[]
);

-- Indexes for jobs
CREATE INDEX idx_jobs_type ON jobs(job_type);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_by ON jobs(created_by);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX idx_jobs_idempotency_key ON jobs(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_jobs_tags ON jobs USING GIN(tags);

-- Tasks table (单个主机执行任务)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    host_id UUID NOT NULL REFERENCES assets_hosts(id) ON DELETE CASCADE,

    -- Status
    status task_status NOT NULL DEFAULT 'pending',
    failure_reason failure_reason,
    failure_message TEXT,            -- 详细错误信息

    -- 执行信息
    exit_code INT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_secs BIGINT,            -- 执行时长（秒）

    -- 输出存档
    output_summary TEXT,             -- 输出摘要（限制长度）
    output_detail TEXT,              -- 完整输出

    -- 重试信息
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 0,

    -- 审计字段
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for tasks
CREATE INDEX idx_tasks_job_id ON tasks(job_id);
CREATE INDEX idx_tasks_host_id ON tasks(host_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);

-- ============================================
-- Build System Domain (构建系统)
-- ============================================

-- Custom types for Build system
CREATE TYPE build_type AS ENUM ('node', 'java', 'rust', 'frontend', 'other');
CREATE TYPE runner_capability AS ENUM ('node', 'java', 'rust', 'frontend', 'docker', 'general');
CREATE TYPE step_status AS ENUM ('pending', 'running', 'succeeded', 'failed', 'skipped');

-- Build jobs table
CREATE TABLE IF NOT EXISTS build_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

    -- 代码来源
    repository VARCHAR(500) NOT NULL,
    branch VARCHAR(255) NOT NULL,
    commit_hash VARCHAR(100) NOT NULL,
    commit_message TEXT,
    commit_author VARCHAR(255),
    commit_time TIMESTAMPTZ,

    -- 构建配置
    build_type build_type NOT NULL,
    build_parameters JSONB NOT NULL DEFAULT '{}',
    docker_image VARCHAR(500),
    runner_capability runner_capability NOT NULL,

    -- 构建状态
    status job_status NOT NULL DEFAULT 'pending',

    -- 构建输出
    build_summary TEXT,
    build_log_path VARCHAR(500),

    -- 产物信息
    has_artifacts BOOLEAN NOT NULL DEFAULT FALSE,
    artifact_count INT NOT NULL DEFAULT 0,

    -- 审计字段
    triggered_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- 元数据
    tags JSONB NOT NULL DEFAULT '[]'
);

-- Indexes for build_jobs
CREATE INDEX idx_build_jobs_job_id ON build_jobs(job_id);
CREATE INDEX idx_build_jobs_type ON build_jobs(build_type);
CREATE INDEX idx_build_jobs_status ON build_jobs(status);
CREATE INDEX idx_build_jobs_repository ON build_jobs(repository);
CREATE INDEX idx_build_jobs_triggered_by ON build_jobs(triggered_by);
CREATE INDEX idx_build_jobs_created_at ON build_jobs(created_at DESC);

-- Build steps table
CREATE TABLE IF NOT EXISTS build_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    build_job_id UUID NOT NULL REFERENCES build_jobs(id) ON DELETE CASCADE,

    -- 步骤信息
    step_order INT NOT NULL,
    step_name VARCHAR(255) NOT NULL,
    step_type VARCHAR(100) NOT NULL,  -- clone, compile, test, package, etc.
    status step_status NOT NULL DEFAULT 'pending',

    -- 执行信息
    command TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_secs BIGINT,

    -- 输出
    output_summary TEXT,
    output_detail TEXT,

    -- 审计字段
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(build_job_id, step_order)
);

-- Indexes for build_steps
CREATE INDEX idx_build_steps_build_job_id ON build_steps(build_job_id);
CREATE INDEX idx_build_steps_status ON build_steps(status);

-- Build artifacts table
CREATE TABLE IF NOT EXISTS build_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    build_job_id UUID NOT NULL REFERENCES build_jobs(id) ON DELETE CASCADE,

    -- 产物信息
    artifact_name VARCHAR(255) NOT NULL,
    artifact_type VARCHAR(100) NOT NULL, -- binary, docker_image, archive, etc.
    artifact_path VARCHAR(1000) NOT NULL,
    artifact_size BIGINT NOT NULL,
    artifact_hash VARCHAR(128) NOT NULL,  -- SHA256
    version VARCHAR(255),

    -- 产物元数据
    metadata JSONB NOT NULL DEFAULT '{}',

    -- 安全信息
    scanned BOOLEAN NOT NULL DEFAULT FALSE,
    scan_result TEXT,
    vulnerabilities_count INT,

    -- 访问控制
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    download_count INT NOT NULL DEFAULT 0,

    -- 审计字段
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uploaded_by UUID NOT NULL REFERENCES users(id)
);

-- Indexes for build_artifacts
CREATE INDEX idx_build_artifacts_build_job_id ON build_artifacts(build_job_id);
CREATE INDEX idx_build_artifacts_type ON build_artifacts(artifact_type);
CREATE INDEX idx_build_artifacts_version ON build_artifacts(version);
CREATE INDEX idx_build_artifacts_hash ON build_artifacts(artifact_hash);
CREATE INDEX idx_build_artifacts_is_public ON build_artifacts(is_public);
CREATE INDEX idx_build_artifacts_created_at ON build_artifacts(created_at DESC);

-- 不可变约束：同版本号 + artifact_type 不得重复
CREATE UNIQUE INDEX idx_build_artifacts_unique_version
ON build_artifacts(version, artifact_type)
WHERE version IS NOT NULL;

-- Artifact download records (audit)
CREATE TABLE IF NOT EXISTS artifact_downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_id UUID NOT NULL REFERENCES build_artifacts(id) ON DELETE CASCADE,
    downloaded_by UUID NOT NULL REFERENCES users(id),
    downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address VARCHAR(100),         -- INET for PostgreSQL
    user_agent TEXT
);

-- Indexes for artifact_downloads
CREATE INDEX idx_artifact_downloads_artifact_id ON artifact_downloads(artifact_id);
CREATE INDEX idx_artifact_downloads_downloaded_by ON artifact_downloads(downloaded_by);
CREATE INDEX idx_artifact_downloads_downloaded_at ON artifact_downloads(downloaded_at DESC);

-- ============================================
-- Runners (构建执行器)
-- ============================================

CREATE TABLE IF NOT EXISTS runners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,

    -- Runner 能力
    capabilities JSONB NOT NULL DEFAULT '[]', -- runner_capability[]
    docker_supported BOOLEAN NOT NULL DEFAULT FALSE,

    -- 资源限制
    max_concurrent_jobs INT NOT NULL DEFAULT 1,
    current_jobs INT NOT NULL DEFAULT 0,

    -- 状态
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'disabled')),
    last_heartbeat TIMESTAMPTZ,

    -- 网络配置
    allowed_domains JSONB DEFAULT '[]', -- VARCHAR[]
    allowed_ips JSONB DEFAULT '[]',     -- VARCHAR[] (CIDR)

    -- 审计字段
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for runners
CREATE INDEX idx_runners_status ON runners(status);
CREATE INDEX idx_runners_capabilities ON runners USING GIN(capabilities);

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON TABLE jobs IS '作业表：批量执行任务的顶层概念';
COMMENT ON TABLE tasks IS '任务表：单个主机的执行单元';
COMMENT ON TABLE build_jobs IS '构建作业表：CI/CD 构建任务';
COMMENT ON TABLE build_steps IS '构建步骤表：构建过程的步骤级记录';
COMMENT ON TABLE build_artifacts IS '构建产物表：构建输出的不可变存储';
COMMENT ON TABLE runners IS 'Runner表：构建执行器配置与状态';
COMMENT ON TABLE artifact_downloads IS '产物下载记录：审计追踪';

COMMENT ON COLUMN jobs.job_type IS '作业类型：command/script/build';
COMMENT ON COLUMN jobs.status IS '作业状态：pending/running/completed/failed/cancelled/partially_succeeded';
COMMENT ON COLUMN jobs.target_hosts IS '目标主机ID列表（创建时固化）';
COMMENT ON COLUMN jobs.idempotency_key IS '幂等键：防止重复提交';

COMMENT ON COLUMN tasks.status IS '任务状态：pending/running/succeeded/failed/timeout/cancelled';
COMMENT ON COLUMN tasks.failure_reason IS '失败原因分类：network_error/auth_failed/connection_timeout/handshake_timeout/command_timeout/command_failed/unknown';
COMMENT ON COLUMN tasks.output_summary IS '输出摘要：用于列表展示，限制长度';
COMMENT ON COLUMN tasks.output_detail IS '完整输出：用于详细查询';

COMMENT ON COLUMN build_jobs.build_type IS '构建类型：node/java/rust/frontend/other';
COMMENT ON COLUMN build_jobs.runner_capability IS '需要的Runner能力：node/java/rust/frontend/docker/general';
COMMENT ON COLUMN build_jobs.commit_hash IS 'Git commit hash：用于追溯构建来源';

COMMENT ON COLUMN build_artifacts.artifact_hash IS '产物Hash（SHA256）：用于验证完整性和去重';
COMMENT ON COLUMN build_artifacts.is_public IS '是否公开：控制访问权限';

COMMENT ON COLUMN runners.capabilities IS 'Runner支持的能力列表';
COMMENT ON COLUMN runners.allowed_domains IS '出站白名单域名';
COMMENT ON COLUMN runners.allowed_ips IS '出站白名单IP段（CIDR格式）';

-- ============================================
-- Triggers for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all relevant tables
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_build_jobs_updated_at BEFORE UPDATE ON build_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_build_steps_updated_at BEFORE UPDATE ON build_steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_runners_updated_at BEFORE UPDATE ON runners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
