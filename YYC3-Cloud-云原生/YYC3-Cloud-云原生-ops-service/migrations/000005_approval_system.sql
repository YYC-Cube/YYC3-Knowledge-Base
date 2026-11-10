-- P3: 审批流系统
-- 实现作业审批流程、审批组和审批记录管理

-- 审批状态类型
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled', 'timeout');

-- 审批组表
CREATE TABLE approval_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,

    -- 成员配置
    member_ids JSONB NOT NULL DEFAULT '[]',
    required_approvals INTEGER NOT NULL DEFAULT 1,

    -- 适用范围
    scope VARCHAR(255),
    priority INTEGER NOT NULL DEFAULT 0,

    -- 状态
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- 审计字段
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 审批请求表
CREATE TABLE approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    request_type VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,

    -- 触发条件
    triggers JSONB NOT NULL DEFAULT '[]',

    -- 审批配置
    required_approvers INTEGER NOT NULL DEFAULT 1,
    approval_group_id UUID REFERENCES approval_groups(id) ON DELETE SET NULL,

    -- 状态
    status approval_status NOT NULL DEFAULT 'pending',
    current_approvals INTEGER NOT NULL DEFAULT 0,

    -- 申请信息
    requested_by UUID NOT NULL REFERENCES users(id),
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- 审批窗口
    timeout_mins INTEGER,
    expires_at TIMESTAMP WITH TIME ZONE,

    -- 审计字段
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    -- 元数据
    metadata JSONB NOT NULL DEFAULT '{}'
);

-- 审批记录表
CREATE TABLE approval_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES users(id),
    approver_name VARCHAR(255) NOT NULL,

    -- 审批决策
    decision approval_status NOT NULL,
    comment TEXT,

    -- 时间戳
    approved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- 审计字段
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 作业模板表
CREATE TABLE job_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    template_type VARCHAR(50) NOT NULL,

    -- 模板内容
    template_content TEXT NOT NULL,
    parameters_schema JSONB NOT NULL DEFAULT '{}',

    -- 默认配置
    default_timeout_secs INTEGER,
    default_retry_times INTEGER,
    default_concurrent_limit INTEGER,

    -- 风险等级
    risk_level VARCHAR(50) NOT NULL DEFAULT 'medium',
    requires_approval BOOLEAN NOT NULL DEFAULT false,

    -- 适用范围
    applicable_environments JSONB NOT NULL DEFAULT '[]',
    applicable_groups JSONB NOT NULL DEFAULT '[]',

    -- 状态
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- 审计字段
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_approval_requests_requested_by ON approval_requests(requested_by);
CREATE INDEX idx_approval_requests_job_id ON approval_requests(job_id);
CREATE INDEX idx_approval_requests_requested_at ON approval_requests(requested_at);
CREATE INDEX idx_approval_requests_expires_at ON approval_requests(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX idx_approval_records_request_id ON approval_records(approval_request_id);
CREATE INDEX idx_approval_records_approver_id ON approval_records(approver_id);

CREATE INDEX idx_job_templates_type ON job_templates(template_type);
CREATE INDEX idx_job_templates_risk_level ON job_templates(risk_level);
CREATE INDEX idx_job_templates_is_active ON job_templates(is_active);

CREATE INDEX idx_approval_groups_is_active ON approval_groups(is_active);

-- 注释
COMMENT ON TABLE approval_requests IS '审批请求表';
COMMENT ON TABLE approval_records IS '审批记录表';
COMMENT ON TABLE approval_groups IS '审批组表';
COMMENT ON TABLE job_templates IS '作业模板表';

COMMENT ON COLUMN approval_requests.triggers IS '触发条件列表（生产环境、关键分组等）';
COMMENT ON COLUMN approval_requests.required_approvers IS '需要的审批人数';
COMMENT ON COLUMN approval_requests.current_approvals IS '当前已批准数量';
COMMENT ON COLUMN job_templates.parameters_schema IS '参数定义（JSON Schema）';
COMMENT ON COLUMN job_templates.risk_level IS '风险等级（low/medium/high/critical）';
