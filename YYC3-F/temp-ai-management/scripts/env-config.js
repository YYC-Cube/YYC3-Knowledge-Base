#!/usr/bin/env node

/**
 * 环境配置管理脚本
 * 用于验证、测试和管理环境变量配置
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// ANSI颜色代码
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  title: (msg) => console.log(`${colors.bright}${colors.cyan}🌟 ${msg}${colors.reset}`)
}

/**
 * 检查必需的环境变量
 */
function checkRequiredEnvVars() {
  log.title('检查必需环境变量')
  
  const requiredVars = [
    'DB_HOST',
    'DB_PORT', 
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'REDIS_HOST',
    'REDIS_PORT',
    'OPENAI_API_KEY',
    'JWT_SECRET',
    'NEXT_PUBLIC_API_BASE_URL'
  ]
  
  const missing = []
  const warnings = []
  
  requiredVars.forEach(varName => {
    const value = process.env[varName]
    if (!value) {
      missing.push(varName)
    } else if (value.includes('your-') || value.includes('test-') || value.includes('placeholder')) {
      warnings.push(`${varName}: 使用占位符值`)
    }
  })
  
  if (missing.length > 0) {
    log.error(`缺少必需环境变量: ${missing.join(', ')}`)
    return false
  }
  
  if (warnings.length > 0) {
    warnings.forEach(warning => log.warning(warning))
  }
  
  log.success('所有必需环境变量已设置')
  return true
}

/**
 * 测试数据库连接
 */
async function testDatabaseConnection() {
  log.title('测试数据库连接')
  
  try {
    const { Pool } = require('pg')
    const pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectionTimeoutMillis: 5000,
    })
    
    const client = await pool.connect()
    const result = await client.query('SELECT NOW()')
    client.release()
    await pool.end()
    
    log.success(`数据库连接成功: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`)
    return true
  } catch (error) {
    log.error(`数据库连接失败: ${error.message}`)
    return false
  }
}

/**
 * 测试Redis连接
 */
async function testRedisConnection() {
  log.title('测试Redis连接')
  
  try {
    const Redis = require('ioredis')
    const redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      connectTimeout: 5000,
      lazyConnect: true
    })
    
    await redis.connect()
    await redis.ping()
    await redis.disconnect()
    
    log.success(`Redis连接成功: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`)
    return true
  } catch (error) {
    log.error(`Redis连接失败: ${error.message}`)
    return false
  }
}

/**
 * 测试OpenAI API
 */
async function testOpenAIConnection() {
  log.title('测试OpenAI API')
  
  try {
    const OpenAI = require('openai')
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORGANIZATION,
      timeout: 10000
    })
    
    // 简单的API测试
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [{ role: 'user', content: '测试连接' }],
      max_tokens: 10
    })
    
    if (response.choices && response.choices.length > 0) {
      log.success(`OpenAI API连接成功，模型: ${process.env.OPENAI_MODEL}`)
      return true
    } else {
      throw new Error('API响应异常')
    }
  } catch (error) {
    log.error(`OpenAI API连接失败: ${error.message}`)
    return false
  }
}

/**
 * 生成环境变量报告
 */
function generateEnvReport() {
  log.title('生成环境配置报告')
  
  const report = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.NEXT_PUBLIC_VERSION || 'unknown',
    configuration: {
      database: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        name: process.env.DB_NAME,
        ssl: process.env.DB_SSL === 'true'
      },
      redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        db: process.env.REDIS_DB || '0'
      },
      ai: {
        provider: 'OpenAI',
        model: process.env.OPENAI_MODEL,
        hasApiKey: !!process.env.OPENAI_API_KEY
      },
      security: {
        jwtConfigured: !!process.env.JWT_SECRET,
        corsOrigin: process.env.CORS_ORIGIN,
        helmetEnabled: process.env.HELMET_ENABLED === 'true'
      },
      features: {
        websocketEnabled: process.env.WS_ENABLED === 'true',
        metricsEnabled: process.env.ENABLE_METRICS === 'true',
        uploadProvider: process.env.UPLOAD_PROVIDER || 'local'
      }
    }
  }
  
  const reportPath = path.join(process.cwd(), 'env-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  
  log.success(`环境配置报告已生成: ${reportPath}`)
  
  // 显示配置摘要
  console.log('\n📊 配置摘要:')
  console.log(`   环境: ${report.environment}`)
  console.log(`   数据库: ${report.configuration.database.host}:${report.configuration.database.port}`)
  console.log(`   Redis: ${report.configuration.redis.host}:${report.configuration.redis.port}`)
  console.log(`   AI模型: ${report.configuration.ai.model}`)
  console.log(`   WebSocket: ${report.configuration.features.websocketEnabled ? '启用' : '禁用'}`)
}

/**
 * 主函数
 */
async function main() {
  const command = process.argv[2]
  
  // 加载环境变量
  require('dotenv').config({ path: '.env.local' })
  
  console.log(`${colors.bright}${colors.magenta}`)
  console.log('🌟 ================================')
  console.log('   YanYu Cloud³ 环境配置工具')
  console.log('================================')
  console.log(colors.reset)
  
  switch (command) {
    case 'validate':
      if (checkRequiredEnvVars()) {
        log.success('环境变量验证通过')
        process.exit(0)
      } else {
        log.error('环境变量验证失败')
        process.exit(1)
      }
      break
      
    case 'test-db':
      const dbOk = await testDatabaseConnection()
      process.exit(dbOk ? 0 : 1)
      break
      
    case 'test-redis':
      const redisOk = await testRedisConnection()
      process.exit(redisOk ? 0 : 1)
      break
      
    case 'test-ai':
      const aiOk = await testOpenAIConnection()
      process.exit(aiOk ? 0 : 1)
      break
      
    case 'test-all':
      console.log('🧪 运行全部连接测试...\n')
      
      const envOk = checkRequiredEnvVars()
      console.log()
      
      const dbTestOk = await testDatabaseConnection()
      console.log()
      
      const redisTestOk = await testRedisConnection()
      console.log()
      
      const aiTestOk = await testOpenAIConnection()
      console.log()
      
      const allOk = envOk && dbTestOk && redisTestOk && aiTestOk
      
      if (allOk) {
        log.success('所有测试通过！🎉')
        process.exit(0)
      } else {
        log.error('部分测试失败！')
        process.exit(1)
      }
      break
      
    case 'report':
      generateEnvReport()
      break
      
    case 'init':
      log.title('初始化环境配置')
      
      if (!fs.existsSync('.env.local')) {
        if (fs.existsSync('.env.example')) {
          fs.copyFileSync('.env.example', '.env.local')
          log.success('已从 .env.example 创建 .env.local')
          log.warning('请编辑 .env.local 文件并填入实际配置值')
        } else {
          log.error('未找到 .env.example 文件')
          process.exit(1)
        }
      } else {
        log.warning('.env.local 文件已存在')
      }
      break
      
    default:
      console.log('使用方法:')
      console.log('  node scripts/env-config.js validate     # 验证环境变量')
      console.log('  node scripts/env-config.js test-db      # 测试数据库连接')
      console.log('  node scripts/env-config.js test-redis   # 测试Redis连接')
      console.log('  node scripts/env-config.js test-ai      # 测试OpenAI API')
      console.log('  node scripts/env-config.js test-all     # 运行所有测试')
      console.log('  node scripts/env-config.js report       # 生成配置报告')
      console.log('  node scripts/env-config.js init         # 初始化配置文件')
      break
  }
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    log.error(`脚本执行失败: ${error.message}`)
    process.exit(1)
  })
}

module.exports = {
  checkRequiredEnvVars,
  testDatabaseConnection,
  testRedisConnection,
  testOpenAIConnection,
  generateEnvReport
}