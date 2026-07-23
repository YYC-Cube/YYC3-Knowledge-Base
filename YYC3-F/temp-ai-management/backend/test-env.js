// 测试dotenv是否能正确加载.env.local文件
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 测试1：使用绝对路径
const absolutePath = path.resolve(__dirname, '../.env.local');
console.log('测试1：使用绝对路径', absolutePath);
const result1 = dotenv.config({ path: absolutePath });
if (result1.error) {
  console.error('Error loading .env.local:', result1.error);
} else {
  console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✓ 已加载' : '✗ 未加载');
  console.log('JWT_REFRESH_SECRET:', process.env.JWT_REFRESH_SECRET ? '✓ 已加载' : '✗ 未加载');
  console.log('加载的所有环境变量数量:', Object.keys(result1.parsed || {}).length);
}

// 重置环境变量
process.env = { ...process.env, JWT_SECRET: undefined, JWT_REFRESH_SECRET: undefined };

// 测试2：使用相对路径
console.log('\n测试2：使用相对路径 ../.env.local');
const result2 = dotenv.config({ path: '../.env.local' });
if (result2.error) {
  console.error('Error loading .env.local:', result2.error);
} else {
  console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✓ 已加载' : '✗ 未加载');
  console.log('JWT_REFRESH_SECRET:', process.env.JWT_REFRESH_SECRET ? '✓ 已加载' : '✗ 未加载');
  console.log('加载的所有环境变量数量:', Object.keys(result2.parsed || {}).length);
}