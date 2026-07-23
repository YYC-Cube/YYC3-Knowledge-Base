import { AiAnalysisService } from "../ai-analysis.service"
import { OpenAIService } from "../openai.service"
import { PromptTemplatesService } from "../prompt-templates.service"
import { ReconciliationService } from "../reconciliation.service"
import type { AiAnalysisRequest } from "../../types/ai-analysis"
import jest from "jest"

// Mock 依赖
jest.mock("../openai.service")
jest.mock("../reconciliation.service")

describe("AiAnalysisService", () => {
  let aiAnalysisService: AiAnalysisService
  let openaiService: jest.Mocked<OpenAIService>
  let promptService: PromptTemplatesService
  let reconciliationService: jest.Mocked<ReconciliationService>

  beforeEach(() => {
    openaiService = new OpenAIService({
      apiKey: "test-key",
      model: "gpt-4o",
      maxRetries: 3,
      timeout: 30000,
    }) as jest.Mocked<OpenAIService>

    promptService = new PromptTemplatesService()
    reconciliationService = new ReconciliationService() as jest.Mocked<ReconciliationService>

    aiAnalysisService = new AiAnalysisService(openaiService, promptService, reconciliationService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("analyzeException", () => {
    it("should successfully analyze an exception", async () => {
      const mockRequest: AiAnalysisRequest = {
        recordId: "test-record-id",
        transactionData: {
          date: "2024-01-15",
          amount: 1000.0,
          currency: "USD",
          description: "Payment for Invoice INV-001",
          type: "payment",
          reference: "REF-12345",
          customerName: "Acme Corp",
        },
      }

      const mockOpenAIResponse = {
        content: JSON.stringify({
          rootCause: "金额不匹配：银行记录显示 $1,000.00，但发票记录显示 $1,005.00，差异 $5.00 可能是手续费",
          confidence: 85,
          recommendations: ["检查银行手续费政策", "更新对账规则以容忍 0.5% 的金额差异", "联系客户确认支付金额"],
          suggestedActions: [
            {
              action: "在对账规则中添加 0.5% 的金额容差",
              priority: "high",
              estimatedImpact: "预计可减少 30% 的手动对账工作量",
            },
            {
              action: "创建手续费专用记账科目",
              priority: "medium",
              estimatedImpact: "提高财务报表准确性",
            },
          ],
          relatedPatterns: ["手续费差异", "四舍五入误差"],
        }),
        tokensUsed: 500,
        model: "gpt-4o",
      }

      openaiService.createChatCompletion = jest.fn().mockResolvedValue(mockOpenAIResponse)

      const result = await aiAnalysisService.analyzeException(mockRequest)

      expect(result).toMatchObject({
        recordId: "test-record-id",
        confidence: 85,
        recommendations: expect.arrayContaining(["检查银行手续费政策"]),
        suggestedActions: expect.arrayContaining([
          expect.objectContaining({
            action: "在对账规则中添加 0.5% 的金额容差",
            priority: "high",
          }),
        ]),
      })

      expect(openaiService.createChatCompletion).toHaveBeenCalledWith(
        expect.stringContaining("财务系统的高级数据分析专家"),
        expect.stringContaining("test-record-id"),
        expect.objectContaining({
          temperature: 0.3,
          maxTokens: 2000,
        }),
      )
    })

    it("should handle API errors gracefully", async () => {
      const mockRequest: AiAnalysisRequest = {
        recordId: "test-record-id",
        transactionData: {
          date: "2024-01-15",
          amount: 1000.0,
          currency: "USD",
          description: "Test transaction",
          type: "payment",
        },
      }

      openaiService.createChatCompletion = jest.fn().mockRejectedValue(new Error("API rate limit exceeded"))

      await expect(aiAnalysisService.analyzeException(mockRequest)).rejects.toThrow("API rate limit exceeded")
    })

    it("should validate confidence values", async () => {
      const mockRequest: AiAnalysisRequest = {
        recordId: "test-record-id",
        transactionData: {
          date: "2024-01-15",
          amount: 1000.0,
          currency: "USD",
          description: "Test transaction",
          type: "payment",
        },
      }

      const mockOpenAIResponse = {
        content: JSON.stringify({
          rootCause: "Test root cause",
          confidence: 150, // Invalid: > 100
          recommendations: [],
          suggestedActions: [],
        }),
        tokensUsed: 200,
        model: "gpt-4o",
      }

      openaiService.createChatCompletion = jest.fn().mockResolvedValue(mockOpenAIResponse)

      const result = await aiAnalysisService.analyzeException(mockRequest)

      expect(result.confidence).toBeLessThanOrEqual(100)
      expect(result.confidence).toBeGreaterThanOrEqual(0)
    })
  })

  describe("analyzeBatch", () => {
    it("should analyze multiple records in batches", async () => {
      const mockRequests: AiAnalysisRequest[] = [
        {
          recordId: "record-1",
          transactionData: {
            date: "2024-01-15",
            amount: 1000.0,
            currency: "USD",
            description: "Transaction 1",
            type: "payment",
          },
        },
        {
          recordId: "record-2",
          transactionData: {
            date: "2024-01-16",
            amount: 2000.0,
            currency: "USD",
            description: "Transaction 2",
            type: "invoice",
          },
        },
      ]

      const mockOpenAIResponse = {
        content: JSON.stringify({
          rootCause: "Test root cause",
          confidence: 80,
          recommendations: ["Test recommendation"],
          suggestedActions: [],
        }),
        tokensUsed: 300,
        model: "gpt-4o",
      }

      openaiService.createChatCompletion = jest.fn().mockResolvedValue(mockOpenAIResponse)

      const results = await aiAnalysisService.analyzeBatch(mockRequests)

      expect(results).toHaveLength(2)
      expect(openaiService.createChatCompletion).toHaveBeenCalledTimes(2)
    })

    it("should handle partial failures in batch", async () => {
      const mockRequests: AiAnalysisRequest[] = [
        {
          recordId: "record-1",
          transactionData: {
            date: "2024-01-15",
            amount: 1000.0,
            currency: "USD",
            description: "Transaction 1",
            type: "payment",
          },
        },
        {
          recordId: "record-2",
          transactionData: {
            date: "2024-01-16",
            amount: 2000.0,
            currency: "USD",
            description: "Transaction 2",
            type: "invoice",
          },
        },
      ]

      const mockSuccessResponse = {
        content: JSON.stringify({
          rootCause: "Test root cause",
          confidence: 80,
          recommendations: [],
          suggestedActions: [],
        }),
        tokensUsed: 300,
        model: "gpt-4o",
      }

      openaiService.createChatCompletion = jest
        .fn()
        .mockResolvedValueOnce(mockSuccessResponse)
        .mockRejectedValueOnce(new Error("API error"))

      const results = await aiAnalysisService.analyzeBatch(mockRequests)

      expect(results).toHaveLength(1)
      expect(results[0].recordId).toBe("record-1")
    })
  })

  describe("generateAnalysisRequestForRecord", () => {
    it("should generate complete analysis request with context", async () => {
      const mockRecord = {
        id: "test-record-id",
        recordNumber: "REC-202401-0001",
        transactionDate: new Date("2024-01-15"),
        transactionType: "payment",
        amount: 1000.0,
        currency: "USD",
        description: "Payment for Invoice",
        status: "unmatched",
        bankReference: "REF-12345",
        invoiceNumber: "INV-001",
        customerName: "Acme Corp",
        category: "revenue",
        createdBy: "user-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      reconciliationService.getRecordById = jest.fn().mockResolvedValue(mockRecord)
      reconciliationService.getMatchingAttempts = jest.fn().mockResolvedValue([
        {
          candidateId: "candidate-1",
          similarity: 75,
          reason: "金额匹配，但日期相差3天",
        },
      ])
      reconciliationService.getHistoricalContext = jest.fn().mockResolvedValue({
        count: 50,
        avgAmount: 950.0,
        topCustomers: ["Acme Corp", "Beta Inc"],
      })

      const request = await aiAnalysisService.generateAnalysisRequestForRecord("test-record-id")

      expect(request).toMatchObject({
        recordId: "test-record-id",
        transactionData: {
          date: "2024-01-15",
          amount: 1000.0,
          currency: "USD",
          type: "payment",
        },
        matchingAttempts: expect.arrayContaining([
          expect.objectContaining({
            similarity: 75,
          }),
        ]),
        historicalContext: expect.objectContaining({
          similarTransactions: 50,
          averageAmount: 950.0,
        }),
      })
    })
  })
})
