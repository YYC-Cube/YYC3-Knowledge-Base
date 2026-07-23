// 加载环境变量
require('dotenv').config({ path: './.env' });

// 调试输出，确认变量是否正确加载
console.log('🔍 Loaded DB config:', {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const mysql = require('mysql2/promise');

const [rows] = await conn.query('SELECT DATABASE() AS current_db');
console.log('🧭 当前连接数据库:', rows[0].current_db);

const connectionConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'yyc3_admin',
  password: process.env.DB_PASSWORD || 'yyc3_management',
  database: process.env.DB_NAME || 'yyc3_mymgmt',
};

(async () => {
  try {
    const conn = await mysql.createConnection(connectionConfig);
    console.log('✅ 数据库连接成功');

    const env = process.env;
    const environment = 'development';

    for (const key in env) {
      const value = env[key];
      const description = ''; // 可扩展为注释提取或映射表

      const sql = `
        INSERT INTO system_config (env_key, env_value, description, environment)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          env_value = VALUES(env_value),
          description = VALUES(description),
          environment = VALUES(environment),
          updated_at = CURRENT_TIMESTAMP;
      `;
      await conn.execute(sql, [key, value, description, environment]);
      console.log(`✅ Synced: ${key}`);
    }

    await conn.end();
    console.log('🎉 所有环境变量已同步完成');
  } catch (err) {
    console.error('❌ 数据库连接失败:', err.message);
  }
})();
