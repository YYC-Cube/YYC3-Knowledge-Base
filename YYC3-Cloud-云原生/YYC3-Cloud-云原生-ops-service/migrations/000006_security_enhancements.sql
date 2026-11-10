-- P3 阶段：安全增强功能
-- 添加 is_critical 字段到 assets_groups 表

-- 添加 is_critical 字段用于标记关键分组
-- 关键分组的作业操作需要审批
ALTER TABLE assets_groups ADD COLUMN IF NOT EXISTS is_critical BOOLEAN NOT NULL DEFAULT false;

-- 为 is_critical 字段添加索引以优化查询
CREATE INDEX IF NOT EXISTS idx_assets_groups_is_critical ON assets_groups(is_critical);

-- 添加注释
COMMENT ON COLUMN assets_groups.is_critical IS '标记是否为关键分组，关键分组的作业操作需要审批';
