const { Pool } = require('pg');
require('dotenv').config({ path: '../../.env.local' });

console.log('🔍 加载的DB配置:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ? '******' : undefined,
  database: process.env.DB_NAME,
});

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'yanyu_cloud_dev',
  ssl: process.env.DB_SSL === 'true',
});

const createSecurityTables = `
-- 用户登录历史表
CREATE TABLE IF NOT EXISTS user_login_history (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  logout_time TIMESTAMP,
  ip_address VARCHAR(50),
  user_agent TEXT,
  device_info TEXT,
  location TEXT,
  success BOOLEAN DEFAULT true,
  failure_reason TEXT,
  session_id VARCHAR(255)
);

-- 用户活动日志表
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  activity_type VARCHAR(100) NOT NULL,
  activity_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  details JSONB,
  ip_address VARCHAR(50),
  resource_id INT,
  resource_type VARCHAR(100)
);

-- 安全警报表
CREATE TABLE IF NOT EXISTS security_alerts (
  id SERIAL PRIMARY KEY,
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  resolved_by INT,
  is_resolved BOOLEAN DEFAULT false,
  ip_address VARCHAR(50),
  user_id INT,
  affected_resource VARCHAR(255)
);

-- 登录尝试表
CREATE TABLE IF NOT EXISTS login_attempts (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(50),
  success BOOLEAN DEFAULT false,
  failure_reason TEXT
);

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_user_login_history_user_id ON user_login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_history_login_time ON user_login_history(login_time);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_activity_type ON user_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_is_resolved ON security_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts(username);
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempt_time ON login_attempts(attempt_time);
`;

async function runSimpleMigrations() {
  let client;
  try {
    console.log('🚀 开始执行数据库迁移...');
    client = await pool.connect();
    
    console.log('📄 创建安全日志相关表结构...');
    await client.query(createSecurityTables);
    
    console.log('✅ 所有迁移执行完成');
  } catch (err) {
    console.error('❌ 迁移失败:', err);
    console.log('💡 提示: 如果数据库连接失败，请确保PostgreSQL服务正在运行');
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

runSimpleMigrations();