import request from "supertest"
import { app } from "../../server"
import { pool } from "../../config/database"

describe("AI Analysis Integration Tests", () => {
  beforeAll(async () => {
    // 确保数据库连接
    await pool.query("SELECT 1")
  })

  afterAll(async () => {
    await pool.end()
  })

  describe("POST /api/ai-analysis/analyze/:recordId", () => {
    it("should analyze a single record", async () => {
      // 首先创建一个测试记录
      const createResponse = await request(app)
        .post("/api/reconciliation/records")
        .set("Authorization", "Bearer test-token")
        .send({
          transactionDate: "2024-01-15",
          transactionType: "payment",
          amount: 1000.0,
          currency: "USD",
          description: "Test payment",
          category: "revenue",
        })

      const recordId = createResponse.body.data.id

      // 执行 AI 分析
      const response = await request(app)
        .post(`/api/ai-analysis/analyze/${recordId}`)
        .set("Authorization", "Bearer test-token")
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty("rootCause")
      expect(response.body.data).toHaveProperty("confidence")
      expect(response.body.data).toHaveProperty("recommendations")
      expect(response.body.data.recordId).toBe(recordId)
    }, 60000) // 增加超时时间

    it("should handle invalid record ID", async () => {
      const response = await request(app)
        .post("/api/ai-analysis/analyze/invalid-uuid")
        .set("Authorization", "Bearer test-token")
        .expect(400)

      expect(response.body.success).toBe(false)
    })

    it("should enforce rate limiting", async () => {
      const recordId = "11111111-1111-1111-1111-111111111111"

      // 发送多个请求以触发速率限制
      const requests = Array(25)
        .fill(null)
        .map(() => request(app).post(`/api/ai-analysis/analyze/${recordId}`).set("Authorization", "Bearer test-token"))

      const responses = await Promise.all(requests)

      const rateLimited = responses.some((r) => r.status === 429)
      expect(rateLimited).toBe(true)
    }, 30000)
  })

  describe("POST /api/ai-analysis/analyze-batch", () => {
    it("should analyze multiple records in batch", async () => {
      // 创建测试记录
      const createResponses = await Promise.all([
        request(app).post("/api/reconciliation/records").set("Authorization", "Bearer test-token").send({
          transactionDate: "2024-01-15",
          transactionType: "payment",
          amount: 1000.0,
          currency: "USD",
          description: "Test payment 1",
          category: "revenue",
        }),
        request(app).post("/api/reconciliation/records").set("Authorization", "Bearer test-token").send({
          transactionDate: "2024-01-16",
          transactionType: "invoice",
          amount: 2000.0,
          currency: "USD",
          description: "Test invoice 1",
          category: "revenue",
        }),
      ])

      const recordIds = createResponses.map((r) => r.body.data.id)

      // 执行批量分析
      const response = await request(app)
        .post("/api/ai-analysis/analyze-batch")
        .set("Authorization", "Bearer test-token")
        .send({ recordIds })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.total).toBe(2)
      expect(response.body.data.results).toHaveLength(2)
    }, 120000)
  })

  describe("GET /api/ai-analysis/health", () => {
    it("should check OpenAI connection health", async () => {
      const response = await request(app)
        .get("/api/ai-analysis/health")
        .set("Authorization", "Bearer test-token")
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty("status")
      expect(response.body.data).toHaveProperty("model")
    })
  })
})
