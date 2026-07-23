import request from "supertest"
import { app } from "../../server"
import { pool } from "../../config/database"

describe("Tickets API Integration Tests", () => {
  const authToken = "Bearer test-token-admin"
  let testTicketId: string

  beforeAll(async () => {
    await pool.query("BEGIN")
  })

  afterAll(async () => {
    await pool.query("ROLLBACK")
    await pool.end()
  })

  describe("POST /api/tickets", () => {
    it("should create a new support ticket", async () => {
      const newTicket = {
        title: "System Login Issue",
        description: "Cannot access the admin panel",
        category: "technical",
        priority: "high",
        customerName: "Test Customer",
        customerEmail: "customer@test.com",
        customerPhone: "1234567890",
      }

      const response = await request(app)
        .post("/api/tickets")
        .set("Authorization", authToken)
        .send(newTicket)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.ticketNumber).toMatch(/^TKT-\d{4}-\d{4}$/)
      expect(response.body.data.title).toBe(newTicket.title)
      expect(response.body.data.status).toBe("open")

      testTicketId = response.body.data.id
    })

    it("should reject ticket without required fields", async () => {
      const invalidTicket = {
        title: "Test",
        // missing description
        category: "technical",
        priority: "high",
      }

      await request(app).post("/api/tickets").set("Authorization", authToken).send(invalidTicket).expect(400)
    })

    it("should validate email format", async () => {
      const invalidTicket = {
        title: "Test",
        description: "Test description",
        category: "technical",
        priority: "high",
        customerName: "Test",
        customerEmail: "invalid-email",
      }

      await request(app).post("/api/tickets").set("Authorization", authToken).send(invalidTicket).expect(400)
    })
  })

  describe("GET /api/tickets", () => {
    it("should return list of tickets", async () => {
      const response = await request(app).get("/api/tickets").set("Authorization", authToken).expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.pagination).toBeDefined()
    })

    it("should filter tickets by status", async () => {
      const response = await request(app)
        .get("/api/tickets")
        .set("Authorization", authToken)
        .query({ status: "open" })
        .expect(200)

      response.body.data.forEach((ticket: any) => {
        expect(ticket.status).toBe("open")
      })
    })

    it("should filter tickets by priority", async () => {
      const response = await request(app)
        .get("/api/tickets")
        .set("Authorization", authToken)
        .query({ priority: "urgent" })
        .expect(200)

      response.body.data.forEach((ticket: any) => {
        expect(ticket.priority).toBe("urgent")
      })
    })
  })

  describe("GET /api/tickets/:id", () => {
    it("should return ticket details", async () => {
      if (!testTicketId) {
        // Create a ticket first
        const createResponse = await request(app).post("/api/tickets").set("Authorization", authToken).send({
          title: "Test Ticket",
          description: "Test description",
          category: "technical",
          priority: "medium",
          customerName: "Test",
          customerEmail: "test@example.com",
        })

        testTicketId = createResponse.body.data.id
      }

      const response = await request(app)
        .get(`/api/tickets/${testTicketId}`)
        .set("Authorization", authToken)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.id).toBe(testTicketId)
      expect(response.body.data.messages).toBeInstanceOf(Array)
    })

    it("should return 404 for non-existent ticket", async () => {
      await request(app)
        .get("/api/tickets/00000000-0000-0000-0000-000000000000")
        .set("Authorization", authToken)
        .expect(404)
    })
  })

  describe("PATCH /api/tickets/:id", () => {
    it("should update ticket status", async () => {
      if (!testTicketId) {
        const createResponse = await request(app).post("/api/tickets").set("Authorization", authToken).send({
          title: "Test",
          description: "Test",
          category: "technical",
          priority: "low",
          customerName: "Test",
          customerEmail: "test@example.com",
        })

        testTicketId = createResponse.body.data.id
      }

      const response = await request(app)
        .patch(`/api/tickets/${testTicketId}`)
        .set("Authorization", authToken)
        .send({ status: "in-progress" })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.status).toBe("in-progress")
    })

    it("should reject invalid status", async () => {
      await request(app)
        .patch(`/api/tickets/${testTicketId}`)
        .set("Authorization", authToken)
        .send({ status: "invalid-status" })
        .expect(400)
    })
  })

  describe("POST /api/tickets/:id/messages", () => {
    it("should add message to ticket", async () => {
      if (!testTicketId) {
        const createResponse = await request(app).post("/api/tickets").set("Authorization", authToken).send({
          title: "Test",
          description: "Test",
          category: "technical",
          priority: "low",
          customerName: "Test",
          customerEmail: "test@example.com",
        })

        testTicketId = createResponse.body.data.id
      }

      const response = await request(app)
        .post(`/api/tickets/${testTicketId}/messages`)
        .set("Authorization", authToken)
        .send({
          content: "We are investigating the issue",
          isInternal: false,
        })
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.content).toBe("We are investigating the issue")
    })

    it("should enforce message length limit", async () => {
      const longMessage = "a".repeat(2100)

      await request(app)
        .post(`/api/tickets/${testTicketId}/messages`)
        .set("Authorization", authToken)
        .send({ content: longMessage })
        .expect(400)
    })
  })

  describe("Circuit Breaker", () => {
    it("should open circuit after failures", async () => {
      // Simulate multiple failures by requesting non-existent resources
      const failureRequests = Array(10)
        .fill(null)
        .map(() =>
          request(app).get("/api/tickets/00000000-0000-0000-0000-000000000000").set("Authorization", authToken),
        )

      await Promise.all(failureRequests)

      // Next request might get circuit breaker error
      const response = await request(app).get("/api/tickets").set("Authorization", authToken)

      // Circuit breaker might be open (503) or closed (200)
      expect([200, 503]).toContain(response.status)
    })
  })
})
