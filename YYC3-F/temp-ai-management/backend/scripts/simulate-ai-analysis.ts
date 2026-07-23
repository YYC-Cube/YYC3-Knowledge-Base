import { OpenAIService } from "../src/services/openai.service"
import { PromptTemplatesService } from "../src/services/prompt-templates.service"
import { AiAnalysisService } from "../src/services/ai-analysis.service"
import { ReconciliationService } from "../src/services/reconciliation.service"
import { logger } from "../src/config/logger"
import type { AiAnalysisRequest } from "../src/types/ai-analysis"
import * as dotenv from "dotenv"

dotenv.config()

/**
 * 模拟 AI 分析推送脚本
 * 用于测试和演示 AI 异常分析功能
 */

async function simulateAiAnalysis() {
  logger.info("Starting AI analysis simulation")

  // 初始化服务
  const openaiConfig = {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4o",
    maxRetries: 3,
    timeout: 30000,
    organization: process.env.OPENAI_ORGANIZATION,
  }

  const openaiService = new OpenAIService(openaiConfig)
  const promptService = new PromptTemplatesService()
  const reconciliationService = new ReconciliationService()
  const aiAnalysisService = new AiAnalysisService(openaiService, promptService, reconciliationService)

  // 测试场景 1: 金额不匹配
  const scenario1: AiAnalysisRequest = {
    recordId: "test-scenario-1",
    transactionData: {
      date: "2024-01-15",
      amount: 1000.0,
      currency: "USD",
      description: "Payment for Invoice INV-001",
      type: "payment",
      reference: "REF-12345",
      customerName: "Acme Corporation",
    },
    matchingAttempts: [
      {
        candidateId: "candidate-1",
        similarity: 75,
        reason: "金额相差 $5.00 (0.5%)",
      },
      {
        candidateId: "candidate-2",
        similarity: 60,
        reason: "日期相差 3 天",
      },
    ],
    historicalContext: {
      similarTransactions: 45,
      averageAmount: 985.0,
      frequentCustomers: ["Acme Corporation", "Beta Inc", "Gamma LLC"],
    },
  }

  console.log("\n" + "=".repeat(80))
  console.log("场景 1: 金额不匹配分析")
  console.log("=".repeat(80))

  try {
    const result1 = await aiAnalysisService.analyzeException(scenario1)
    console.log("\n分析结果:")
    console.log(JSON.stringify(result1, null, 2))
  } catch (error: any) {
    console.error("场景 1 分析失败:", error.message)
  }

  // 等待以避免速率限制
  await delay(3000)

  // 测试场景 2: 描述不匹配
  const scenario2: AiAnalysisRequest = {
    recordId: "test-scenario-2",
    transactionData: {
      date: "2024-01-20",
      amount: 5000.0,
      currency: "EUR",
      description: "Rechnung 2024-001",
      type: "invoice",
      reference: "DE-2024-001",
      customerName: "Deutsche GmbH",
    },
    matchingAttempts: [
      {
        candidateId: "candidate-3",
        similarity: 50,
        reason: "描述语言不同 (德语 vs 英语)",
      },
    ],
    historicalContext: {
      similarTransactions: 12,
      averageAmount: 4800.0,
      frequentCustomers: ["Deutsche GmbH"],
    },
  }

  console.log("\n" + "=".repeat(80))
  console.log("场景 2: 描述不匹配分析")
  console.log("=".repeat(80))

  try {
    const result2 = await aiAnalysisService.analyzeException(scenario2)
    console.log("\n分析结果:")
    console.log(JSON.stringify(result2, null, 2))
  } catch (error: any) {
    console.error("场景 2 分析失败:", error.message)
  }

  // 等待以避免速率限制
  await delay(3000)

  // 测试场景 3: 时间延迟
  const scenario3: AiAnalysisRequest = {
    recordId: "test-scenario-3",
    transactionData: {
      date: "2024-01-10",
      amount: 2500.0,
      currency: "GBP",
      description: "Quarterly Service Fee Q1 2024",
      type: "payment",
      reference: "SVC-Q1-2024",
      customerName: "British Ltd",
    },
    matchingAttempts: [
      {
        candidateId: "candidate-4",
        similarity: 70,
        reason: "日期相差 7 天，可能是周末延迟",
      },
      {
        candidateId: "candidate-5",
        similarity: 68,
        reason: "金额完全匹配，但日期不在容差范围内",
      },
    ],
    historicalContext: {
      similarTransactions: 28,
      averageAmount: 2500.0,
      frequentCustomers: ["British Ltd", "Scotland PLC"],
    },
  }

  console.log("\n" + "=".repeat(80))
  console.log("场景 3: 时间延迟分析")
  console.log("=".repeat(80))

  try {
    const result3 = await aiAnalysisService.analyzeException(scenario3)
    console.log("\n分析结果:")
    console.log(JSON.stringify(result3, null, 2))
  } catch (error: any) {
    console.error("场景 3 分析失败:", error.message)
  }

  // 批量分析测试
  console.log("\n" + "=".repeat(80))
  console.log("批量分析测试")
  console.log("=".repeat(80))

  try {
    const batchResults = await aiAnalysisService.analyzeBatch([scenario1, scenario2, scenario3])
    console.log(`\n成功分析 ${batchResults.length} 条记录`)
    batchResults.forEach((result, index) => {
      console.log(`\n记录 ${index + 1}:`)
      console.log(`  - 置信度: ${result.confidence}%`)
      console.log(`  - 根本原因: ${result.rootCause.substring(0, 100)}...`)
      console.log(`  - 建议数量: ${result.recommendations.length}`)
    })
  } catch (error: any) {
    console.error("批量分析失败:", error.message)
  }

  // 速率限制测试
  console.log("\n" + "=".repeat(80))
  console.log("速率限制信息")
  console.log("=".repeat(80))

  const rateLimitInfo = openaiService.getRateLimitInfo()
  console.log(JSON.stringify(rateLimitInfo, null, 2))

  logger.info("AI analysis simulation completed")
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// 执行模拟
simulateAiAnalysis()
  .then(() => {
    console.log("\n✓ 模拟完成")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n✗ 模拟失败:", error)
    process.exit(1)
  })
