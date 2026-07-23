import request from "supertest"
import { app } from "../../server"
import { pool } from "../../config/database"

describe("Reconciliation API Integration Tests", () => {
  const authToken = "Bearer test-token-admin"

  beforeAll(async () => {
    // Setup test database
    await pool.query("BEGIN")
  })

  afterAll(async () => {
    await pool.query("ROLLBACK")
    await pool.end()
  })

  describe("GET /api/reconciliation/records", () => {
    it("should return paginated records with valid auth", async () => {
      const response = await request(app)
        .get("/api/reconciliation/records")
        .set("Authorization", authToken)
        .query({ limit: 10, offset: 0 })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.pagination).toBeDefined()
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(0)
    })

    it("should return 401 without auth token", async () => {
      await request(app).get("/api/reconciliation/records").expect(401)
    })

    it("should filter records by status", async () => {
      const response = await request(app)
        .get("/api/reconciliation/records")
        .set("Authorization", authToken)
        .query({ status: "matched", limit: 10 })
        .expect(200)

      expect(response.body.success).toBe(true)
      response.body.data.forEach((record: any) => {
        expect(record.status).toBe("matched")
      })
    })

    it("should handle invalid pagination parameters", async () => {
      const response = await request(app)
        .get("/api/reconciliation/records")
        .set("Authorization", authToken)
        .query({ limit: -1 })
        .expect(400)

      expect(response.body.success).toBe(false)
    })
  })

  describe("POST /api/reconciliation/records", () => {
    it("should create a new reconciliation record", async () => {
      const newRecord = {
        transactionDate: "2024-01-15",
        transactionType: "payment",
        amount: 15000.0,
        currency: "CNY",
        description: "Test payment record",
        category: "sales",
        customerName: "Test Customer",
      }

      const response = await request(app)
        .post("/api/reconciliation/records")
        .set("Authorization", authToken)
        .send(newRecord)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.recordNumber).toMatch(/^REC-\d{4}-\d{4}$/)
      expect(response.body.data.amount).toBe(15000.0)
      expect(response.body.data.status).toBe("unmatched")
    })

    it("should reject invalid transaction type", async () => {
      const invalidRecord = {
        transactionDate: "2024-01-15",
        transactionType: "invalid-type",
        amount: 15000.0,
        currency: "CNY",
        description: "Test",
        category: "sales",
      }

      await request(app)
        .post("/api/reconciliation/records")
        .set("Authorization", authToken)
        .send(invalidRecord)
        .expect(400)
    })

    it("should reject zero amount", async () => {
      const invalidRecord = {
        transactionDate: "2024-01-15",
        transactionType: "payment",
        amount: 0,
        currency: "CNY",
        description: "Test",
        category: "sales",
      }

      await request(app)
        .post("/api/reconciliation/records")
        .set("Authorization", authToken)
        .send(invalidRecord)
        .expect(400)
    })
  })

  describe("POST /api/reconciliation/auto-reconcile", () => {
    it("should execute auto-reconciliation", async () => {
      const response = await request(app)
        .post("/api/reconciliation/auto-reconcile")
        .set("Authorization", authToken)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty("processed")
      expect(response.body.data).toHaveProperty("matched")
      expect(response.body.data).toHaveProperty("failed")
      expect(typeof response.body.data.processed).toBe("number")
    })

    it("should respect rate limiting", async () => {
      // Make multiple requests quickly
      const requests = Array(15)
        .fill(null)
        .map(() => request(app).post("/api/reconciliation/auto-reconcile").set("Authorization", authToken))

      const responses = await Promise.all(requests)
      const rateLimitedResponses = responses.filter((r) => r.status === 429)

      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    })
  })

  describe("GET /api/reconciliation/stats", () => {
    it("should return reconciliation statistics", async () => {
      const response = await request(app).get("/api/reconciliation/stats").set("Authorization", authToken).expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty("totalRecords")
      expect(response.body.data).toHaveProperty("matchedAmount")
      expect(response.body.data).toHaveProperty("unmatchedAmount")
      expect(response.body.data).toHaveProperty("matchRate")
      expect(typeof response.body.data.matchRate).toBe("number")
    })
  })

  describe("GET /api/reconciliation/exceptions", () => {
    it("should return exception records", async () => {
      const response = await request(app)
        .get("/api/reconciliation/exceptions")
        .set("Authorization", authToken)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeInstanceOf(Array)
    })

    it("should filter exceptions by severity", async () => {
      const response = await request(app)
        .get("/api/reconciliation/exceptions")
        .set("Authorization", authToken)
        .query({ severity: "high" })
        .expect(200)

      response.body.data.forEach((exception: any) => {
        expect(exception.severity).toBe("high")
      })
    })
  })
})
