-- ====================================================================
-- 迁移: 000007_add_host_credentials
-- 描述: 为主机表添加 SSH 认证凭据字段
-- ====================================================================

-- 添加 SSH 认证字段到 hosts 表
ALTER TABLE assets_hosts
    ADD COLUMN IF NOT EXISTS ssh_username VARCHAR(255),
    ADD COLUMN IF NOT EXISTS ssh_password TEXT,              -- 加密存储
    ADD COLUMN IF NOT EXISTS ssh_private_key TEXT,           -- 加密存储
    ADD COLUMN IF NOT EXISTS ssh_key_passphrase TEXT;        -- 加密存储

-- 添加注释
COMMENT ON COLUMN assets_hosts.ssh_username IS 'SSH 登录用户名（为空时使用全局默认值）';
COMMENT ON COLUMN assets_hosts.ssh_password IS 'SSH 登录密码（加密存储，为空时使用全局默认值）';
COMMENT ON COLUMN assets_hosts.ssh_private_key IS 'SSH 私钥内容（加密存储，PEM 格式）';
COMMENT ON COLUMN assets_hosts.ssh_key_passphrase IS 'SSH 私钥密码（加密存储）';

-- 创建索引以快速查找已配置凭据的主机
CREATE INDEX IF NOT EXISTS idx_assets_hosts_has_creds
    ON assets_hosts(id) WHERE ssh_username IS NOT NULL;
