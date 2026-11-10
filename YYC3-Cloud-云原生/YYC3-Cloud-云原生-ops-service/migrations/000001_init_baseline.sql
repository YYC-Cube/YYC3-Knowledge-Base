-- P0 阶段：基线表结构
-- 此阶段仅创建必要的基础表，业务表在 P1 阶段添加

-- 健康检查测试表（可选）
CREATE TABLE IF NOT EXISTS health_check (
    id SERIAL PRIMARY KEY,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 插入测试数据
INSERT INTO health_check (checked_at) VALUES (NOW());
