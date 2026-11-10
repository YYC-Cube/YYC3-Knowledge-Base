const { Pool } = require("pg");
require("dotenv").config({ path: "../.env" });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log("🚀 开始填充数据库...");

    // 清空旧数据（可选）
    await client.query("DELETE FROM users");
    await client.query("DELETE FROM tickets");
    await client.query("DELETE FROM reconciliation_records");
    await client.query("DELETE FROM system_config");

    // 插入用户
    await client.query(`
      INSERT INTO users (id, username, email, password_hash, full_name, role, is_active)
      VALUES 
        ('00000000-0000-0000-0000-000000000001', 'admin', 'admin@example.com', 'hashed_password', '系统管理员', 'admin', true),
        ('00000000-0000-0000-0000-000000000002', 'user1', 'user1@example.com', 'hashed_password', '用户一号', 'user', true)
    `);

    // 插入工单
    await client.query(`
      INSERT INTO tickets (id, ticket_number, title, description, category, priority, status, created_by)
      VALUES 
        ('10000000-0000-0000-0000-000000000001', 'TKT-001', '初始化工单', '用于测试系统功能', '系统', 'high', 'open', '00000000-0000-0000-0000-000000000001')
    `);

    // 插入对账记录
    await client.query(`
      INSERT INTO reconciliation_records (id, record_number, transaction_date, transaction_type, amount, currency, status, created_by)
      VALUES 
        ('20000000-0000-0000-0000-000000000001', 'REC-001', CURRENT_DATE, 'payment', 1000.00, 'USD', 'pending', '00000000-0000-0000-0000-000000000001')
    `);

    // 插入环境变量配置
    await client.query(`
      INSERT INTO system_config (env_key, env_value, description, environment)
      VALUES 
        ('DB_HOST', 'localhost', '数据库主机地址', 'development'),
        ('DB_PORT', '5432', '数据库端口', 'development'),
        ('JWT_SECRET', 'your_jwt_secret_key_min_32_characters', 'JWT 密钥', 'development')
    `);

    console.log("✅ 数据填充完成");
  } catch (err) {
    console.error("❌ 数据填充失败:", err);
  } finally {
    client.release();
    process.exit(0);
  }
}

seed();
