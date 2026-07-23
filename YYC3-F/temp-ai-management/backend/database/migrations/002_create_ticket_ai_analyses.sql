-- 创建 ticket_ai_analyses 表
-- 用于存储工单AI分析结果
CREATE TABLE IF NOT EXISTS ticket_ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL,
  sentiment VARCHAR(20) NOT NULL,
  urgency VARCHAR(20) NOT NULL,
  category VARCHAR(100) NOT NULL,
  keywords TEXT[] NOT NULL,
  summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
);

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_ticket_ai_analyses_ticket_id ON ticket_ai_analyses(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_ai_analyses_sentiment ON ticket_ai_analyses(sentiment);
CREATE INDEX IF NOT EXISTS idx_ticket_ai_analyses_category ON ticket_ai_analyses(category);
CREATE INDEX IF NOT EXISTS idx_ticket_ai_analyses_urgency ON ticket_ai_analyses(urgency);