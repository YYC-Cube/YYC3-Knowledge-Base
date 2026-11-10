import { TicketService } from "../ticket.service"
import { pool } from "../../config/database"
import jest from "jest"

jest.mock("../../config/database")
jest.mock("../../config/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

describe("TicketService", () => {
  let service: TicketService
  const mockQuery = pool.query as jest.MockedFunction<typeof pool.query>

  beforeEach(() => {
    service = new TicketService()
    jest.clearAllMocks()
  })

  describe("createTicket", () => {
    it("should create a new support ticket", async () => {
      const mockTicket = {
        id: "1",
        ticket_number: "TKT-2024-001",
        title: "Login Issue",
        description: "Cannot login to system",
        category: "technical",
        priority: "high",
        status: "open",
        customer_name: "Test Customer",
        customer_email: "test@example.com",
        due_date: new Date(),
        created_by: "user-1",
        created_at: new Date(),
        updated_at: new Date(),
      }

      // Mock generateTicketNumber
      mockQuery.mockResolvedValueOnce({ rows: [{ count: "0" }] } as any)
      // Mock insert ticket
      mockQuery.mockResolvedValueOnce({ rows: [mockTicket] } as any)
      // Mock insert initial message
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: "1",
            ticket_id: "1",
            sender: "customer",
            sender_name: "Test Customer",
            sender_type: "customer",
            content: "Cannot login to system",
            timestamp: new Date(),
          },
        ],
      } as any)
      // Mock update ticket
      mockQuery.mockResolvedValueOnce({ rows: [] } as any)

      const result = await service.createTicket({
        title: "Login Issue",
        description: "Cannot login to system",
        category: "technical",
        priority: "high",
        customerName: "Test Customer",
        customerEmail: "test@example.com",
        status: "open",
        createdBy: "user-1",
      })

      expect(result.ticketNumber).toBe("TKT-2024-001")
      expect(result.priority).toBe("high")
      expect(result.status).toBe("open")
    })

    it("should calculate correct due date based on priority", async () => {
      const mockTicket = {
        id: "1",
        ticket_number: "TKT-2024-001",
        title: "Test",
        description: "Test",
        category: "technical",
        priority: "urgent",
        status: "open",
        customer_name: "Test",
        customer_email: "test@example.com",
        due_date: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
        created_by: "user-1",
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: "0" }] } as any)
        .mockResolvedValueOnce({ rows: [mockTicket] } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              id: "1",
              ticket_id: "1",
              sender: "customer",
              sender_name: "Test",
              sender_type: "customer",
              content: "Test",
              timestamp: new Date(),
            },
          ],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any)

      const result = await service.createTicket({
        title: "Test",
        description: "Test",
        category: "technical",
        priority: "urgent",
        customerName: "Test",
        customerEmail: "test@example.com",
        status: "open",
        createdBy: "user-1",
      })

      expect(result.priority).toBe("urgent")
      // Due date should be approximately 4 hours from now
      const hoursDiff = (result.dueDate.getTime() - Date.now()) / (1000 * 60 * 60)
      expect(hoursDiff).toBeGreaterThan(3)
      expect(hoursDiff).toBeLessThan(5)
    })
  })

  describe("updateTicket", () => {
    it("should update ticket status", async () => {
      const mockTicket = {
        id: "1",
        ticket_number: "TKT-2024-001",
        title: "Test",
        description: "Test",
        category: "technical",
        priority: "high",
        status: "open",
        customer_name: "Test",
        customer_email: "test@example.com",
        created_by: "user-1",
        created_at: new Date(),
        updated_at: new Date(),
      }

      const updatedTicket = { ...mockTicket, status: "in-progress" }

      // Mock getTicketById
      mockQuery.mockResolvedValueOnce({ rows: [mockTicket] } as any)
      mockQuery.mockResolvedValueOnce({ rows: [] } as any) // messages
      // Mock update query
      mockQuery.mockResolvedValueOnce({ rows: [updatedTicket] } as any)
      // Mock audit log
      mockQuery.mockResolvedValueOnce({ rows: [] } as any)
      // Mock getTicketMessages
      mockQuery.mockResolvedValueOnce({ rows: [] } as any)

      const result = await service.updateTicket("1", { status: "in-progress" }, "user-1")

      expect(result?.status).toBe("in-progress")
    })

    it("should return null for non-existent ticket", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] } as any)

      const result = await service.updateTicket("999", { status: "closed" }, "user-1")

      expect(result).toBeNull()
    })
  })

  describe("getStats", () => {
    it("should return ticket statistics", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total: "100",
            open: "20",
            in_progress: "30",
            pending: "10",
            resolved: "35",
            closed: "5",
            avg_resolution_hours: 24.5,
            avg_satisfaction: 4.2,
          },
        ],
      } as any)

      const stats = await service.getStats()

      expect(stats.total).toBe(100)
      expect(stats.open).toBe(20)
      expect(stats.inProgress).toBe(30)
      expect(stats.resolved).toBe(35)
      expect(stats.avgResolutionTime).toBe("24.5h")
      expect(stats.satisfactionRate).toBe("4.2/5.0")
    })

    it("should handle no tickets", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total: "0",
            open: "0",
            in_progress: "0",
            pending: "0",
            resolved: "0",
            closed: "0",
            avg_resolution_hours: null,
            avg_satisfaction: null,
          },
        ],
      } as any)

      const stats = await service.getStats()

      expect(stats.total).toBe(0)
      expect(stats.avgResolutionTime).toBe("N/A")
      expect(stats.satisfactionRate).toBe("N/A")
    })
  })

  describe("addMessage", () => {
    it("should add a message to ticket", async () => {
      const mockMessage = {
        id: "1",
        ticket_id: "ticket-1",
        sender: "agent-1",
        sender_name: "Agent",
        sender_type: "agent",
        content: "We are looking into this",
        timestamp: new Date(),
        is_internal: false,
      }

      mockQuery.mockResolvedValueOnce({ rows: [mockMessage] } as any).mockResolvedValueOnce({ rows: [] } as any) // update ticket

      const result = await service.addMessage("ticket-1", {
        sender: "agent-1",
        senderName: "Agent",
        senderType: "agent",
        content: "We are looking into this",
      })

      expect(result.content).toBe("We are looking into this")
      expect(result.senderType).toBe("agent")
    })
  })
})
