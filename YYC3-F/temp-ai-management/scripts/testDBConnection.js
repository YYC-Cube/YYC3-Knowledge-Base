const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT),
    });
    console.log('✅ 成功连接数据库');
    await conn.end();
  } catch (err) {
    console.error('❌ 连接失败:', err.message);
  }
})();
