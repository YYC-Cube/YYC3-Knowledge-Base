-- 创建 reconciliation_records 表
CREATE TABLE IF NOT EXISTS reconciliation_records (
  id UUID PRIMARY KEY,
  record_number VARCHAR(50) NOT NULL,
  transaction_date DATE NOT NULL,
  transaction_type VARCHAR(20) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency CHAR(3) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL,
  bank_reference VARCHAR(100),
  invoice_number VARCHAR(50),
  customer_name VARCHAR(200),
  category VARCHAR(50),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

-- 创建 reconciliation_exceptions 表
CREATE TABLE IF NOT EXISTS reconciliation_exceptions (
  id UUID PRIMARY KEY,
  record_id UUID NOT NULL,
  exception_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20),
  description TEXT,
  resolution_status VARCHAR(20),
  assigned_to UUID,
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  ai_analysis JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建 tickets 表
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY,
  ticket_number VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  priority VARCHAR(20),
  status VARCHAR(20),
  created_by UUID,
  assigned_to UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  sla_deadline TIMESTAMP
);

-- 创建 users 表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  role VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_reconciliation_status ON reconciliation_records(status);
CREATE INDEX IF NOT EXISTS idx_reconciliation_date ON reconciliation_records(transaction_date);
CREATE INDEX IF NOT EXISTS idx_reconciliation_customer ON reconciliation_records(customer_name);
CREATE INDEX IF NOT EXISTS idx_exception_record ON reconciliation_exceptions(record_id);
CREATE INDEX IF NOT EXISTS idx_exception_status ON reconciliation_exceptions(resolution_status);
CREATE INDEX IF NOT EXISTS idx_ticket_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_ticket_assigned ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ticket_created ON tickets(created_at);
