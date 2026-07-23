import { pool } from "../config/database"
import { logger } from "../config/logger"
import { reconciliationProcessed, reconciliationMatchRate, exceptionsTotal } from "../config/metrics"
import type { ReconciliationFilters, ReconciliationResult } from "../types/reconciliation"
import type {
  ReconciliationRecord,
  ReconciliationRule,
  ReconciliationException,
  ReconciliationStats,
} from "../types/reconciliation"

export class ReconciliationService {
  /**
   * 获取单个对账记录
   */
  async getRecordById(id: string): Promise<ReconciliationRecord | null> {
    const query = `
      SELECT * FROM reconciliation_records
      WHERE id = $1
    `
    
    const result = await pool.query(query, [id])
    
    if (result.rows.length === 0) {
      return null
    }
    
    return this.mapDbRecordToModel(result.rows[0])
  }

  /**
   * 获取对账记录列表
   */
  async getRecords(filters: {
    status?: string
    startDate?: string
    endDate?: string
    customerName?: string
    limit?: number
    offset?: number
  }): Promise<{ records: ReconciliationRecord[]; total: number }> {
    const { status, startDate, endDate, customerName, limit = 50, offset = 0 } = filters

    let query = `
      SELECT * FROM reconciliation_records
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (status) {
      query += ` AND status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    if (startDate) {
      query += ` AND transaction_date >= $${paramIndex}`
      params.push(startDate)
      paramIndex++
    }

    if (endDate) {
      query += ` AND transaction_date <= $${paramIndex}`
      params.push(endDate)
      paramIndex++
    }

    if (customerName) {
      query += ` AND customer_name ILIKE $${paramIndex}`
      params.push(`%${customerName}%`)
      paramIndex++
    }

    // 获取总数
    const countQuery = `SELECT COUNT(*) FROM (${query}) AS count_query`
    const countResult = await pool.query(countQuery, params)
    const total = Number.parseInt(countResult.rows[0].count)

    // 添加排序和分页
    query += ` ORDER BY transaction_date DESC, created_at DESC`
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)

    const result = await pool.query(query, params)

    return {
      records: result.rows.map(this.mapDbRecordToModel),
      total,
    }
  }

  /**
   * 创建对账记录
   */
  async createRecord(
    record: Omit<ReconciliationRecord, "id" | "recordNumber" | "createdAt" | "updatedAt">,
  ): Promise<ReconciliationRecord> {
    const recordNumber = await this.generateRecordNumber()

    const query = `
      INSERT INTO reconciliation_records (
        record_number, transaction_date, transaction_type, amount, currency,
        description, status, bank_reference, invoice_number, customer_name,
        category, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `

    const values = [
      recordNumber,
      record.transactionDate,
      record.transactionType,
      record.amount,
      record.currency,
      record.description,
      record.status,
      record.bankReference,
      record.invoiceNumber,
      record.customerName,
      record.category,
      record.notes,
      record.createdBy,
    ]

    const result = await pool.query(query, values)
    const created = this.mapDbRecordToModel(result.rows[0])

    reconciliationProcessed.inc({ status: created.status, type: created.transactionType })
    logger.info("Reconciliation record created", { recordNumber })

    return created
  }

  /**
   * 自动对账
   */
  async autoReconcile(userId: string): Promise<{
    processed: number
    matched: number
    failed: number
  }> {
    logger.info("Starting auto-reconciliation", { userId })

    const unmatchedRecords = await this.getUnmatchedRecords()
    const rules = await this.getActiveRules()

    let matched = 0
    let failed = 0

    for (const record of unmatchedRecords) {
      try {
        const match = await this.findMatch(record, rules)
        if (match) {
          await this.createMatch(record.id, match.matchedRecordId, match.confidence, "automatic", userId)
          await this.updateRecordStatus(record.id, "matched")
          matched++
        } else {
          failed++
        }
      } catch (error) {
        logger.error("Auto-reconciliation error", { recordId: record.id, error })
        failed++
      }
    }

    // 更新匹配率指标
    const stats = await this.getStats()
    reconciliationMatchRate.set(stats.matchRate)

    logger.info("Auto-reconciliation completed", { processed: unmatchedRecords.length, matched, failed })

    return {
      processed: unmatchedRecords.length,
      matched,
      failed,
    }
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<ReconciliationStats> {
    const query = `
      SELECT 
        COUNT(*) as total_records,
        SUM(CASE WHEN status = 'matched' THEN amount ELSE 0 END) as matched_amount,
        SUM(CASE WHEN status = 'unmatched' THEN amount ELSE 0 END) as unmatched_amount,
        SUM(CASE WHEN status = 'disputed' THEN amount ELSE 0 END) as disputed_amount,
        COUNT(CASE WHEN status = 'matched' THEN 1 END) as matched_count
      FROM reconciliation_records
    `

    const result = await pool.query(query)
    const row = result.rows[0]

    const totalRecords = Number.parseInt(row.total_records)
    const matchedCount = Number.parseInt(row.matched_count)
    const matchRate = totalRecords > 0 ? (matchedCount / totalRecords) * 100 : 0

    // 获取异常数量
    const exceptionQuery = `
      SELECT COUNT(*) as exception_count
      FROM reconciliation_exceptions
      WHERE resolution_status IN ('pending', 'investigating')
    `
    const exceptionResult = await pool.query(exceptionQuery)
    const exceptionCount = Number.parseInt(exceptionResult.rows[0].exception_count)

    return {
      totalRecords,
      matchedAmount: Number.parseFloat(row.matched_amount) || 0,
      unmatchedAmount: Number.parseFloat(row.unmatched_amount) || 0,
      disputedAmount: Number.parseFloat(row.disputed_amount) || 0,
      matchRate: Math.round(matchRate * 100) / 100,
      exceptionCount,
    }
  }

  /**
   * 创建异常记录
   */
  async createException(
    exception: Omit<ReconciliationException, "id" | "createdAt">,
  ): Promise<ReconciliationException> {
    const query = `
      INSERT INTO reconciliation_exceptions (
        record_id, exception_type, severity, description, resolution_status, assigned_to
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `

    const values = [
      exception.recordId,
      exception.exceptionType,
      exception.severity,
      exception.description,
      exception.resolutionStatus,
      exception.assignedTo,
    ]

    const result = await pool.query(query, values)
    const created = this.mapDbExceptionToModel(result.rows[0])

    exceptionsTotal.inc({ exception_type: created.exceptionType, severity: created.severity })
    logger.info("Exception created", { exceptionId: created.id, recordId: created.recordId })

    return created
  }

  /**
   * 获取异常列表
   */
  async getExceptions(filters: {
    status?: string
    severity?: string
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
  }): Promise<{ exceptions: ReconciliationException[]; total: number }> {
    const { status, severity, startDate, endDate, limit = 50, offset = 0 } = filters

    let query = `
      SELECT * FROM reconciliation_exceptions
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (status) {
      query += ` AND resolution_status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    if (severity) {
      query += ` AND severity = $${paramIndex}`
      params.push(severity)
      paramIndex++
    }

    if (startDate) {
      query += ` AND created_at >= $${paramIndex}`
      params.push(startDate)
      paramIndex++
    }

    if (endDate) {
      query += ` AND created_at <= $${paramIndex}`
      params.push(endDate)
      paramIndex++
    }

    // 获取总数
    const countQuery = `SELECT COUNT(*) FROM (${query}) AS count_query`
    const countResult = await pool.query(countQuery, params)
    const total = Number.parseInt(countResult.rows[0].count)

    // 添加排序和分页
    query += ` ORDER BY created_at DESC`
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)

    const result = await pool.query(query, params)

    return {
      exceptions: result.rows.map(this.mapDbExceptionToModel),
      total,
    }
  }

  /**
   * 批量匹配对账
   */
  async bulkMatch(filters: ReconciliationFilters): Promise<ReconciliationResult> {
    try {
      const unmatchedRecords = await this.getUnmatchedRecords()
      const rules = await this.getActiveRules()
      
      let processed = 0
      let matched = 0
      let failed = 0
      
      for (const record of unmatchedRecords) {
        try {
          const match = await this.findMatch(record, rules)
          if (match) {
            // 这里简单实现，实际应用中可能需要更复杂的匹配逻辑
            await this.updateRecordStatus(record.id, "matched")
            matched++
          } else {
            failed++
          }
          processed++
        } catch (error) {
          logger.error("Bulk match error", { recordId: record.id, error })
          failed++
          processed++
        }
      }
      
      // 更新匹配率指标
      const stats = await this.getStats()
      reconciliationMatchRate.set(stats.matchRate)
      
      logger.info("Bulk reconciliation completed", { processed, matched, failed })
      
      return {
        success: true,
        processed,
        matched,
        failed,
        message: `Bulk reconciliation completed: ${matched} matched, ${failed} failed`
      }
    } catch (error) {
      logger.error("Bulk reconciliation failed", { error })
      return {
        success: false,
        processed: 0,
        matched: 0,
        failed: 0,
        message: `Failed to perform bulk reconciliation: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  // 私有辅助方法

  protected async generateRecordNumber(): Promise<string> {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")

    const query = `
      SELECT COUNT(*) as count 
      FROM reconciliation_records 
      WHERE record_number LIKE $1
    `
    const result = await pool.query(query, [`REC-${year}${month}-%`])
    const count = Number.parseInt(result.rows[0].count) + 1

    return `REC-${year}${month}-${String(count).padStart(4, "0")}`
  }

  protected async getUnmatchedRecords(): Promise<ReconciliationRecord[]> {
    const query = `
      SELECT * FROM reconciliation_records
      WHERE status = 'unmatched'
      ORDER BY transaction_date DESC
      LIMIT 1000
    `
    const result = await pool.query(query)
    return result.rows.map(this.mapDbRecordToModel)
  }

  protected async getActiveRules(): Promise<ReconciliationRule[]> {
    const query = `
      SELECT * FROM reconciliation_rules
      WHERE is_active = true
      ORDER BY priority ASC
    `
    const result = await pool.query(query)
    return result.rows.map(this.mapDbRuleToModel)
  }

  protected async findMatch(
    record: ReconciliationRecord,
    rules: ReconciliationRule[],
  ): Promise<{ matchedRecordId: string; confidence: number } | null> {
    // 简化的匹配逻辑
    for (const rule of rules) {
      if (rule.ruleType === "amount_match") {
        const match = await this.findAmountMatch(record, rule.amountTolerance)
        if (match) return match
      }
    }
    return null
  }

  protected async findAmountMatch(
    record: ReconciliationRecord,
    tolerance: number,
  ): Promise<{ matchedRecordId: string; confidence: number } | null> {
    const query = `
      SELECT id FROM reconciliation_records
      WHERE id != $1
      AND status = 'unmatched'
      AND ABS(amount - $2) <= $3
      AND transaction_type != $4
      AND transaction_date BETWEEN $5 AND $6
      LIMIT 1
    `

    const startDate = new Date(record.transactionDate)
    startDate.setDate(startDate.getDate() - 3)
    const endDate = new Date(record.transactionDate)
    endDate.setDate(endDate.getDate() + 3)

    const result = await pool.query(query, [
      record.id,
      record.amount,
      tolerance,
      record.transactionType,
      startDate,
      endDate,
    ])

    if (result.rows.length > 0) {
      return {
        matchedRecordId: result.rows[0].id,
        confidence: 85,
      }
    }

    return null
  }

  protected async createMatch(
    recordId: string,
    matchedRecordId: string,
    confidence: number,
    matchType: string,
    userId: string,
  ): Promise<void> {
    const query = `
      INSERT INTO reconciliation_matches (
        record_id, matched_record_id, match_confidence, match_type, matched_by
      ) VALUES ($1, $2, $3, $4, $5)
    `
    await pool.query(query, [recordId, matchedRecordId, confidence, matchType, userId])
  }

  protected async updateRecordStatus(recordId: string, status: string): Promise<void> {
    const query = `
      UPDATE reconciliation_records
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `
    await pool.query(query, [status, recordId])
  }

  protected mapDbRecordToModel(row: any): ReconciliationRecord {
    return {
      id: row.id,
      recordNumber: row.record_number,
      transactionDate: row.transaction_date,
      transactionType: row.transaction_type,
      amount: Number.parseFloat(row.amount),
      currency: row.currency,
      description: row.description,
      status: row.status,
      bankReference: row.bank_reference,
      invoiceNumber: row.invoice_number,
      customerName: row.customer_name,
      category: row.category,
      notes: row.notes,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      resolvedAt: row.resolved_at,
    }
  }

  protected mapDbRuleToModel(row: any): ReconciliationRule {
    return {
      id: row.id,
      ruleName: row.rule_name,
      ruleType: row.rule_type,
      amountTolerance: Number.parseFloat(row.amount_tolerance),
      dateToleranceDays: row.date_tolerance_days,
      isActive: row.is_active,
      priority: row.priority,
    }
  }

  protected mapDbExceptionToModel(row: any): ReconciliationException {
    return {
      id: row.id,
      recordId: row.record_id,
      exceptionType: row.exception_type,
      severity: row.severity,
      description: row.description,
      resolutionStatus: row.resolution_status,
      assignedTo: row.assigned_to,
      resolvedAt: row.resolved_at,
      resolutionNotes: row.resolution_notes,
      createdAt: row.created_at,
    }
  }

  /**
   * 更新对账记录
   */
  async updateRecord(
    recordId: string,
    updates: Partial<ReconciliationRecord>,
    userId: string
  ): Promise<ReconciliationRecord | null> {
    let query = `
      UPDATE reconciliation_records
      SET updated_at = CURRENT_TIMESTAMP
    `
    const params: any[] = []
    let paramIndex = 1

    // 这里需要根据实际更新的字段动态构建SET子句
    // 简化实现，实际应用中需要根据updates对象动态生成
    
    query += ` WHERE id = $${paramIndex}`
    params.push(recordId)

    const result = await pool.query(query, params)
    // 实际实现中应该返回更新后的记录
    return this.getRecordById(recordId)
  }

  /**
   * 解决异常记录
   */
  async resolveException(
    exceptionId: string,
    resolutionNotes: string,
    userId: string
  ): Promise<ReconciliationException | null> {
    const query = `
      UPDATE reconciliation_exceptions
      SET 
        resolution_status = 'resolved',
        resolution_notes = $1,
        resolved_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `

    const result = await pool.query(query, [resolutionNotes, exceptionId])
    return this.mapDbExceptionToModel(result.rows[0])
  }
}
