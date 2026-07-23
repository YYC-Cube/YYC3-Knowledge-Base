const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config({ path: "../.env" });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log("🚀 开始执行数据库迁移...");
    const migrationsDir = path.join(__dirname, "../database/migrations");
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"));

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      console.log(`📄 执行迁移文件: ${file}`);
      await client.query(sql);
    }

    console.log("✅ 所有迁移执行完成");
  } catch (err) {
    console.error("❌ 迁移失败:", err);
  } finally {
    client.release();
    process.exit(0);
  }
}

runMigrations();
