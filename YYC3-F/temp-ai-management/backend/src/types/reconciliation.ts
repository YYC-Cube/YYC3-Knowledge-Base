export interface ReconciliationRecord {
  id: string
  recordNumber: string
  transactionDate: Date
  transactionType: "bank" | "invoice" | "payment" | "refund"
  amount: number
  currency: string
  description: string
  status: "matched" | "unmatched" | "disputed" | "resolved"
  bankReference?: string
  invoiceNumber?: string
  customerName?: string
  category: string
  notes?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date
}

export interface ReconciliationRule {
  id: string
  ruleName: string
  ruleType: "amount_match" | "date_match" | "description_match" | "reference_match"
  amountTolerance: number
  dateToleranceDays: number
  isActive: boolean
  priority: number
}

export interface ReconciliationMatch {
  id: string
  recordId: string
  matchedRecordId?: string
  matchConfidence: number
  matchType: string
  matchedBy: string
  matchedAt: Date
  notes?: string
}

export interface ReconciliationException {
  id: string
  recordId: string
  exceptionType: "duplicate" | "invalid" | "amount_mismatch" | "missing_data"
  severity: "low" | "medium" | "high" | "critical"
  description: string
  resolutionStatus: "pending" | "investigating" | "resolved" | "ignored"
  assignedTo?: string
  resolvedAt?: Date
  resolutionNotes?: string
  createdAt: Date
}

export interface CsvImportBatch {
  id: string
  batchNumber: string
  fileName: string
  fileSize: number
  totalRecords: number
  processedRecords: number
  matchedRecords: number
  unmatchedRecords: number
  exceptionRecords: number
  status: "processing" | "completed" | "failed" | "partial"
  importStartedAt: Date
  importCompletedAt?: Date
  importedBy: string
  errorLog?: string
}

export interface ReconciliationStats {
  totalRecords: number
  matchedAmount: number
  unmatchedAmount: number
  disputedAmount: number
  matchRate: number
  exceptionCount: number
}

export interface CsvRecord {
  date: string
  description: string
  amount: number
  currency: string
  type: string
  reference?: string
  customerName?: string
}

export interface ReconciliationFilters {
  status?: string
  startDate?: string
  endDate?: string
  customerName?: string
  limit?: number
  offset?: number
}

export interface ReconciliationResult {
  success: boolean
  processed: number
  matched: number
  failed: number
  message?: string
}
