import { OpenAIService } from "../openai.service"
import OpenAI from "openai"
import jest from "jest"

jest.mock("openai")

describe("OpenAIService", () => {
  let openaiService: OpenAIService
  let mockOpenAIClient: jest.Mocked<OpenAI>

  beforeEach(() => {
    mockOpenAIClient = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
      models: {
        list: jest.fn(),
      },
    } as any
    ;(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAIClient)

    openaiService = new OpenAIService({
      apiKey: "test-key",
      model: "gpt-4o",
      maxRetries: 3,
      timeout: 30000,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("createChatCompletion", () => {
    it("should successfully create chat completion", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '{"result": "test"}',
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          total_tokens: 500,
        },
        model: "gpt-4o",
      }

      mockOpenAIClient.chat.completions.create = jest.fn().mockResolvedValue(mockResponse)

      const result = await openaiService.createChatCompletion("System message", "User message")

      expect(result).toEqual({
        content: '{"result": "test"}',
        tokensUsed: 500,
        model: "gpt-4o",
      })
    })

    it("should enforce rate limits", async () => {
      // 模拟超出速率限制
      const longMessage = "a".repeat(100000) // 约 25,000 tokens

      await expect(openaiService.createChatCompletion("System", longMessage)).rejects.toThrow("rate limit")
    })

    it("should handle API errors", async () => {
      mockOpenAIClient.chat.completions.create = jest.fn().mockRejectedValue({
        status: 429,
        message: "Rate limit exceeded",
      })

      await expect(openaiService.createChatCompletion("System", "User")).rejects.toThrow("rate limit")
    })
  })

  describe("validateConnection", () => {
    it("should validate successful connection", async () => {
      mockOpenAIClient.models.list = jest.fn().mockResolvedValue({
        data: [{ id: "gpt-4o" }, { id: "gpt-3.5-turbo" }],
      })

      const isValid = await openaiService.validateConnection()

      expect(isValid).toBe(true)
    })

    it("should handle connection failure", async () => {
      mockOpenAIClient.models.list = jest.fn().mockRejectedValue(new Error("Connection failed"))

      const isValid = await openaiService.validateConnection()

      expect(isValid).toBe(false)
    })
  })

  describe("estimateTokens", () => {
    it("should estimate tokens correctly", () => {
      const text = "This is a test message"
      const estimated = openaiService.estimateTokens(text)

      expect(estimated).toBeGreaterThan(0)
      expect(estimated).toBeLessThan(text.length)
    })
  })
})
