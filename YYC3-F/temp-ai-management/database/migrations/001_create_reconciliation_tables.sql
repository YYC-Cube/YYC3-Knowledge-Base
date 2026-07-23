-- 对账记录表
CREATE TABLE IF NOT EXISTS reconciliation_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_number VARCHAR(50) UNIQUE NOT NULL,
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('bank', 'invoice', 'payment', 'refund')),
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'CNY',
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'unmatched' CHECK (status IN ('matched', 'unmatched', 'disputed', 'resolved')),
    bank_reference VARCHAR(100),
    invoice_number VARCHAR(50),
    customer_name VARCHAR(200),
    category VARCHAR(50) NOT NULL,
    notes TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT amount_not_zero CHECK (amount != 0)
);

-- 创建索引优化查询性能
CREATE INDEX idx_reconciliation_records_date ON reconciliation_records(transaction_date);
CREATE INDEX idx_reconciliation_records_status ON reconciliation_records(status);
CREATE INDEX idx_reconciliation_records_customer ON reconciliation_records(customer_name);
CREATE INDEX idx_reconciliation_records_invoice ON reconciliation_records(invoice_number);
CREATE INDEX idx_reconciliation_records_bank_ref ON reconciliation_records(bank_reference);
CREATE INDEX idx_reconciliation_records_created_at ON reconciliation_records(created_at DESC);

-- 对账规则表
CREATE TABLE IF NOT EXISTS reconciliation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('amount_match', 'date_match', 'description_match', 'reference_match')),
    amount_tolerance DECIMAL(10, 2) DEFAULT 0,
    date_tolerance_days INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 对账匹配表
CREATE TABLE IF NOT EXISTS reconciliation_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID NOT NULL REFERENCES reconciliation_records(id) ON DELETE CASCADE,
    matched_record_id UUID REFERENCES reconciliation_records(id) ON DELETE SET NULL,
    match_confidence DECIMAL(5, 2) NOT NULL CHECK (match_confidence >= 0 AND match_confidence <= 100),
    match_type VARCHAR(50) NOT NULL,
    matched_by UUID NOT NULL,
    matched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- 对账异常表
CREATE TABLE IF NOT EXISTS reconciliation_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID NOT NULL REFERENCES reconciliation_records(id) ON DELETE CASCADE,
    exception_type VARCHAR(50) NOT NULL CHECK (exception_type IN ('duplicate', 'invalid', 'amount_mismatch', 'missing_data')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    resolution_status VARCHAR(20) DEFAULT 'pending' CHECK (resolution_status IN ('pending', 'investigating', 'resolved', 'ignored')),
    assigned_to UUID,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_exceptions_record_id ON reconciliation_exceptions(record_id);
CREATE INDEX idx_exceptions_status ON reconciliation_exceptions(resolution_status);
CREATE INDEX idx_exceptions_severity ON reconciliation_exceptions(severity);

-- CSV 导入批次表
CREATE TABLE IF NOT EXISTS csv_import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number VARCHAR(50) UNIQUE NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    total_records INTEGER NOT NULL,
    processed_records INTEGER DEFAULT 0,
    matched_records INTEGER DEFAULT 0,
    unmatched_records INTEGER DEFAULT 0,
    exception_records INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'partial')),
    import_started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    import_completed_at TIMESTAMP WITH TIME ZONE,
    imported_by UUID NOT NULL,
    error_log TEXT
);

CREATE INDEX idx_csv_batches_status ON csv_import_batches(status);
CREATE INDEX idx_csv_batches_imported_by ON csv_import_batches(imported_by);

-- 审计日志表
CREATE TABLE IF NOT EXISTS reconciliation_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID REFERENCES reconciliation_records(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    performed_by UUID NOT NULL,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_audit_log_record_id ON reconciliation_audit_log(record_id);
CREATE INDEX idx_audit_log_performed_at ON reconciliation_audit_log(performed_at DESC);

-- 创建更新时间自动触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reconciliation_records_updated_at BEFORE UPDATE ON reconciliation_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reconciliation_rules_updated_at BEFORE UPDATE ON reconciliation_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入默认对账规则
INSERT INTO reconciliation_rules (rule_name, rule_type, amount_tolerance, date_tolerance_days, priority) VALUES
('精确金额匹配', 'amount_match', 0, 0, 1),
('金额容差1元', 'amount_match', 1, 0, 2),
('同日期匹配', 'date_match', 0, 0, 1),
('3天容差匹配', 'date_match', 0, 3, 2),
('描述模糊匹配', 'description_match', 0, 0, 3),
('银行参考号匹配', 'reference_match', 0, 0, 1);
