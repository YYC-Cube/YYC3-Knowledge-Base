import { parse } from "csv-parse"
import { stringify } from "csv-stringify"
import { pool } from "../config/database"
import { logger } from "../config/logger"
import { csvImportDuration } from "../config/metrics"
import type { CsvRecord, CsvImportBatch, ReconciliationException } from "../types/reconciliation"
import { ReconciliationService } from "./reconciliation.service"

export class CsvImportService {
  private reconciliationService: ReconciliationService

  constructor() {
    this.reconciliationService = new ReconciliationService()
  }

  /**
   * 导入CSV文件
   */
  async importCsv(
    fileBuffer: Buffer,
    fileName: string,
    userId: string,
  ): Promise<{
    batchId: string
    totalRecords: number
    matched: number
    unmatched: number
    exceptions: number
    exceptionDetails: ReconciliationException[]
  }> {
    const startTime = Date.now()
    const batchNumber = await this.generateBatchNumber()

    logger.info("Starting CSV import", { fileName, batchNumber, userId })

    try {
      // 解析CSV
      const records = await this.parseCsv(fileBuffer)

      // 创建导入批次
      const batch = await this.createBatch({
        batchNumber,
        fileName,
        fileSize: fileBuffer.length,
        totalRecords: records.length,
        importedBy: userId,
      })

      // 处理记录
      const results = await this.processRecords(records, userId, batch.id)

      // 更新批次状态
      await this.updateBatchStatus(batch.id, {
        status: "completed",
        processedRecords: results.processed,
        matchedRecords: results.matched,
        unmatchedRecords: results.unmatched,
        exceptionRecords: results.exceptions.length,
      })

      const duration = (Date.now() - startTime) / 1000
      csvImportDuration.observe(duration)

      logger.info("CSV import completed", {
        batchNumber,
        totalRecords: records.length,
        duration,
        results,
      })

      return {
        batchId: batch.id,
        totalRecords: records.length,
        matched: results.matched,
        unmatched: results.unmatched,
        exceptions: results.exceptions.length,
        exceptionDetails: results.exceptions,
      }
    } catch (error) {
      logger.error("CSV import failed", { fileName, error })
      throw error
    }
  }

  /**
   * 导出异常记录为CSV
   */
  async exportExceptions(exceptionIds: string[]): Promise<Buffer> {
    const query = `
      SELECT 
        e.id,
        r.record_number,
        r.transaction_date,
        r.description,
        r.amount,
        r.currency,
        e.exception_type,
        e.severity,
        e.description as issue_description,
        e.resolution_status
      FROM reconciliation_exceptions e
      JOIN reconciliation_records r ON e.record_id = r.id
      WHERE e.id = ANY($1)
      ORDER BY e.created_at DESC
    `

    const result = await pool.query(query, [exceptionIds])

    return new Promise((resolve, reject) => {
      stringify(
        result.rows,
        {
          header: true,
          columns: {
            id: "异常ID",
            record_number: "记录号",
            transaction_date: "交易日期",
            description: "描述",
            amount: "金额",
            currency: "币种",
            exception_type: "异常类型",
            severity: "严重程度",
            issue_description: "问题说明",
            resolution_status: "处理状态",
          },
        },
        (err, output) => {
          if (err) {
            reject(err)
          } else {
            resolve(Buffer.from("\ufeff" + output, "utf-8"))
          }
        },
      )
    })
  }

  /**
   * 获取导入批次列表
   */
  async getBatches(filters: {
    status?: string
    limit?: number
    offset?: number
  }): Promise<{ batches: CsvImportBatch[]; total: number }> {
    const { status, limit = 50, offset = 0 } = filters

    let query = `
      SELECT * FROM csv_import_batches
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (status) {
      query += ` AND status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    // 获取总数
    const countQuery = `SELECT COUNT(*) FROM (${query}) AS count_query`
    const countResult = await pool.query(countQuery, params)
    const total = Number.parseInt(countResult.rows[0].count)

    // 添加排序和分页
    query += ` ORDER BY import_started_at DESC`
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)

    const result = await pool.query(query, params)

    return {
      batches: result.rows.map(this.mapDbBatchToModel),
      total,
    }
  }

  // 私有方法

  private async parseCsv(buffer: Buffer): Promise<CsvRecord[]> {
    return new Promise((resolve, reject) => {
      const records: CsvRecord[] = []

      parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      })
        .on("data", (row) => {
          records.push({
            date: row.date || row["日期"] || row["Date"],
            description: row.description || row["描述"] || row["Description"],
            amount: Number.parseFloat(row.amount || row["金额"] || row["Amount"]),
            currency: row.currency || row["币种"] || row["Currency"] || "CNY",
            type: row.type || row["类型"] || row["Type"] || "payment",
            reference: row.reference || row["参考号"] || row["Reference"],
            customerName: row.customer_name || row["客户名称"] || row["Customer Name"],
          })
        })
        .on("end", () => {
          resolve(records)
        })
        .on("error", (error) => {
          reject(error)
        })
    })
  }

  private async processRecords(
    csvRecords: CsvRecord[],
    userId: string,
    batchId: string,
  ): Promise<{
    processed: number
    matched: number
    unmatched: number
    exceptions: ReconciliationException[]
  }> {
    let matched = 0
    let unmatched = 0
    const exceptions: ReconciliationException[] = []

    for (const csvRecord of csvRecords) {
      try {
        // 验证记录
        const validation = this.validateRecord(csvRecord)
        if (!validation.valid) {
          const exception = await this.reconciliationService.createException({
            recordId: "", // 将在创建记录后更新
            exceptionType: "invalid",
            severity: "high",
            description: validation.errors.join("; "),
            resolutionStatus: "pending",
          })
          exceptions.push(exception)
          continue
        }

        // 创建对账记录
        const record = await this.reconciliationService.createRecord({
          transactionDate: new Date(csvRecord.date),
          transactionType: csvRecord.type as any,
          amount: csvRecord.amount,
          currency: csvRecord.currency,
          description: csvRecord.description,
          status: "unmatched",
          bankReference: csvRecord.reference,
          customerName: csvRecord.customerName,
          category: "导入记录",
          createdBy: userId,
        })

        // 检查重复
        const isDuplicate = await this.checkDuplicate(record.id, csvRecord)
        if (isDuplicate) {
          const exception = await this.reconciliationService.createException({
            recordId: record.id,
            exceptionType: "duplicate",
            severity: "medium",
            description: "发现重复的交易记录",
            resolutionStatus: "pending",
          })
          exceptions.push(exception)
        }

        // 尝试自动匹配
        // 这里简化处理，实际应该调用自动对账逻辑
        if (record.status === "matched") {
          matched++
        } else {
          unmatched++
        }
      } catch (error) {
        logger.error("Error processing CSV record", { record: csvRecord, error })
        unmatched++
      }
    }

    return {
      processed: csvRecords.length,
      matched,
      unmatched,
      exceptions,
    }
  }

  private validateRecord(record: CsvRecord): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!record.date || isNaN(Date.parse(record.date))) {
      errors.push("日期格式无效")
    }

    if (!record.description || record.description.trim() === "") {
      errors.push("描述不能为空")
    }

    if (isNaN(record.amount) || record.amount === 0) {
      errors.push("金额无效或为零")
    }

    if (!record.currency || record.currency.length !== 3) {
      errors.push("币种代码无效")
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  private async checkDuplicate(recordId: string, csvRecord: CsvRecord): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count
      FROM reconciliation_records
      WHERE id != $1
      AND transaction_date = $2
      AND amount = $3
      AND description = $4
    `

    const result = await pool.query(query, [recordId, csvRecord.date, csvRecord.amount, csvRecord.description])

    return Number.parseInt(result.rows[0].count) > 0
  }

  private async generateBatchNumber(): Promise<string> {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")

    const query = `
      SELECT COUNT(*) as count 
      FROM csv_import_batches 
      WHERE batch_number LIKE $1
    `
    const result = await pool.query(query, [`CSV-${year}${month}${day}-%`])
    const count = Number.parseInt(result.rows[0].count) + 1

    return `CSV-${year}${month}${day}-${String(count).padStart(3, "0")}`
  }

  private async createBatch(batch: {
    batchNumber: string
    fileName: string
    fileSize: number
    totalRecords: number
    importedBy: string
  }): Promise<CsvImportBatch> {
    const query = `
      INSERT INTO csv_import_batches (
        batch_number, file_name, file_size, total_records, imported_by
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `

    const values = [batch.batchNumber, batch.fileName, batch.fileSize, batch.totalRecords, batch.importedBy]

    const result = await pool.query(query, values)
    return this.mapDbBatchToModel(result.rows[0])
  }

  private async updateBatchStatus(
    batchId: string,
    updates: {
      status: string
      processedRecords: number
      matchedRecords: number
      unmatchedRecords: number
      exceptionRecords: number
    },
  ): Promise<void> {
    const query = `
      UPDATE csv_import_batches
      SET status = $1,
          processed_records = $2,
          matched_records = $3,
          unmatched_records = $4,
          exception_records = $5,
          import_completed_at = CURRENT_TIMESTAMP
      WHERE id = $6
    `

    await pool.query(query, [
      updates.status,
      updates.processedRecords,
      updates.matchedRecords,
      updates.unmatchedRecords,
      updates.exceptionRecords,
      batchId,
    ])
  }

  private mapDbBatchToModel(row: any): CsvImportBatch {
    return {
      id: row.id,
      batchNumber: row.batch_number,
      fileName: row.file_name,
      fileSize: row.file_size,
      totalRecords: row.total_records,
      processedRecords: row.processed_records,
      matchedRecords: row.matched_records,
      unmatchedRecords: row.unmatched_records,
      exceptionRecords: row.exception_records,
      status: row.status,
      importStartedAt: row.import_started_at,
      importCompletedAt: row.import_completed_at,
      importedBy: row.imported_by,
      errorLog: row.error_log,
    }
  }
}
