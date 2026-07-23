import { ReconciliationService } from "../reconciliation.service"
import { pool } from "../../config/database"
import { jest } from "@jest/globals"

// Mock database pool
jest.mock("../../config/database", () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}))

jest.mock("../../config/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

describe("ReconciliationService", () => {
  let service: ReconciliationService
  const mockQuery = pool.query as jest.MockedFunction<typeof pool.query>

  beforeEach(() => {
    service = new ReconciliationService()
    jest.clearAllMocks()
  })

  describe("getRecords", () => {
    it("should return paginated reconciliation records", async () => {
      const mockRecords = [
        {
          id: "1",
          record_number: "REC-2024-001",
          transaction_date: new Date("2024-01-15"),
          transaction_type: "payment",
          amount: 15000.0,
          currency: "CNY",
          description: "Test payment",
          status: "matched",
          created_by: "user-1",
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]

      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: "1" }] } as any)
        .mockResolvedValueOnce({ rows: mockRecords } as any)

      const result = await service.getRecords({
        limit: 10,
        offset: 0,
      })

      expect(result.total).toBe(1)
      expect(result.records).toHaveLength(1)
      expect(result.records[0].recordNumber).toBe("REC-2024-001")
      expect(mockQuery).toHaveBeenCalledTimes(2)
    })

    it("should filter records by status", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: "0" }] } as any).mockResolvedValueOnce({ rows: [] } as any)

      const result = await service.getRecords({
        status: "unmatched",
        limit: 10,
        offset: 0,
      })

      expect(result.total).toBe(0)
      expect(result.records).toHaveLength(0)
      expect(mockQuery.mock.calls[0][0]).toContain("status = $1")
    })

    it("should filter records by date range", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: "0" }] } as any).mockResolvedValueOnce({ rows: [] } as any)

      await service.getRecords({
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        limit: 10,
        offset: 0,
      })

      expect(mockQuery.mock.calls[0][0]).toContain("transaction_date >=")
      expect(mockQuery.mock.calls[0][0]).toContain("transaction_date <=")
    })
  })

  describe("createRecord", () => {
    it("should create a new reconciliation record", async () => {
      const mockRecord = {
        id: "1",
        record_number: "REC-2024-001",
        transaction_date: new Date("2024-01-15"),
        transaction_type: "payment",
        amount: 15000.0,
        currency: "CNY",
        description: "Test payment",
        status: "unmatched",
        created_by: "user-1",
        created_at: new Date(),
        updated_at: new Date(),
      }

      // Mock generateRecordNumber
      mockQuery.mockResolvedValueOnce({ rows: [{ count: "0" }] } as any)
      // Mock insert query
      mockQuery.mockResolvedValueOnce({ rows: [mockRecord] } as any)

      const result = await service.createRecord({
        transactionDate: new Date("2024-01-15"),
        transactionType: "payment",
        amount: 15000.0,
        currency: "CNY",
        description: "Test payment",
        status: "unmatched",
        category: "sales",
        createdBy: "user-1",
      })

      expect(result.recordNumber).toBe("REC-2024-001")
      expect(result.amount).toBe(15000.0)
      expect(mockQuery).toHaveBeenCalledTimes(2)
    })

    it("should throw error on invalid data", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"))

      await expect(
        service.createRecord({
          transactionDate: new Date("2024-01-15"),
          transactionType: "payment",
          amount: 0, // Invalid: amount cannot be zero
          currency: "CNY",
          description: "Test payment",
          status: "unmatched",
          category: "sales",
          createdBy: "user-1",
        }),
      ).rejects.toThrow()
    })
  })

  describe("autoReconcile", () => {
    it("should match records automatically", async () => {
      const unmatchedRecords = [
        {
          id: "1",
          record_number: "REC-2024-001",
          transaction_date: new Date("2024-01-15"),
          transaction_type: "payment",
          amount: 15000.0,
          currency: "CNY",
          description: "Test payment",
          status: "unmatched",
          category: "sales",
          created_by: "user-1",
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]

      // Mock getUnmatchedRecords
      mockQuery.mockResolvedValueOnce({ rows: unmatchedRecords } as any)
      // Mock getActiveRules
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: "1",
            rule_name: "Amount Match",
            rule_type: "amount_match",
            amount_tolerance: 1,
            date_tolerance_days: 3,
            is_active: true,
            priority: 1,
          },
        ],
      } as any)
      // Mock findAmountMatch
      mockQuery.mockResolvedValueOnce({ rows: [{ id: "2" }] } as any)
      // Mock createMatch
      mockQuery.mockResolvedValueOnce({ rows: [] } as any)
      // Mock updateRecordStatus
      mockQuery.mockResolvedValueOnce({ rows: [] } as any)
      // Mock getStats
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total_records: "10",
            matched_amount: "50000",
            unmatched_amount: "10000",
            disputed_amount: "1000",
            matched_count: "8",
          },
        ],
      } as any)
      mockQuery.mockResolvedValueOnce({ rows: [{ exception_count: "2" }] } as any)

      const result = await service.autoReconcile("user-1")

      expect(result.processed).toBe(1)
      expect(result.matched).toBe(1)
      expect(result.failed).toBe(0)
    })

    it("should handle reconciliation failures gracefully", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] } as any) // No unmatched records
        .mockResolvedValueOnce({ rows: [] } as any) // No rules
        .mockResolvedValueOnce({
          rows: [
            {
              total_records: "0",
              matched_amount: "0",
              unmatched_amount: "0",
              disputed_amount: "0",
              matched_count: "0",
            },
          ],
        } as any)
        .mockResolvedValueOnce({ rows: [{ exception_count: "0" }] } as any)

      const result = await service.autoReconcile("user-1")

      expect(result.processed).toBe(0)
      expect(result.matched).toBe(0)
    })
  })

  describe("getStats", () => {
    it("should return reconciliation statistics", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              total_records: "100",
              matched_amount: "500000",
              unmatched_amount: "50000",
              disputed_amount: "5000",
              matched_count: "90",
            },
          ],
        } as any)
        .mockResolvedValueOnce({ rows: [{ exception_count: "5" }] } as any)

      const stats = await service.getStats()

      expect(stats.totalRecords).toBe(100)
      expect(stats.matchedAmount).toBe(500000)
      expect(stats.unmatchedAmount).toBe(50000)
      expect(stats.disputedAmount).toBe(5000)
      expect(stats.matchRate).toBe(90)
      expect(stats.exceptionCount).toBe(5)
    })

    it("should handle zero records", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              total_records: "0",
              matched_amount: null,
              unmatched_amount: null,
              disputed_amount: null,
              matched_count: "0",
            },
          ],
        } as any)
        .mockResolvedValueOnce({ rows: [{ exception_count: "0" }] } as any)

      const stats = await service.getStats()

      expect(stats.totalRecords).toBe(0)
      expect(stats.matchRate).toBe(0)
    })
  })

  describe("createException", () => {
    it("should create an exception record", async () => {
      const mockException = {
        id: "1",
        record_id: "rec-1",
        exception_type: "duplicate",
        severity: "high",
        description: "Duplicate transaction found",
        resolution_status: "pending",
        created_at: new Date(),
      }

      mockQuery.mockResolvedValueOnce({ rows: [mockException] } as any)

      const result = await service.createException({
        recordId: "rec-1",
        exceptionType: "duplicate",
        severity: "high",
        description: "Duplicate transaction found",
        resolutionStatus: "pending",
      })

      expect(result.recordId).toBe("rec-1")
      expect(result.exceptionType).toBe("duplicate")
      expect(result.severity).toBe("high")
    })
  })

  describe("getExceptions", () => {
    it("should return filtered exceptions", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: "2" }] } as any).mockResolvedValueOnce({
        rows: [
          {
            id: "1",
            record_id: "rec-1",
            exception_type: "duplicate",
            severity: "high",
            description: "Test",
            resolution_status: "pending",
            created_at: new Date(),
          },
          {
            id: "2",
            record_id: "rec-2",
            exception_type: "invalid",
            severity: "medium",
            description: "Test 2",
            resolution_status: "pending",
            created_at: new Date(),
          },
        ],
      } as any)

      const result = await service.getExceptions({
        status: "pending",
        limit: 10,
        offset: 0,
      })

      expect(result.total).toBe(2)
      expect(result.exceptions).toHaveLength(2)
    })
  })
})
