-- 示例用户（实际应该来自用户表）
-- 假设用户ID: '11111111-1111-1111-1111-111111111111'

-- 插入示例对账记录
INSERT INTO reconciliation_records (
    record_number, transaction_date, transaction_type, amount, currency, 
    description, status, bank_reference, invoice_number, customer_name, 
    category, created_by, notes
) VALUES
-- 已匹配记录
('REC-2024-001', '2024-01-15', 'payment', 15000.00, 'CNY', 
 '客户付款 - 订单 #ORD-2024-0156', 'matched', 'TXN-20240115-001', 
 'INV-2024-0156', '北京科技有限公司', '销售收入', 
 '11111111-1111-1111-1111-111111111111', '自动匹配成功'),

('REC-2024-002', '2024-01-14', 'invoice', 8500.00, 'CNY', 
 '服务费发票 - 项目咨询', 'unmatched', NULL, 
 'INV-2024-0157', '上海贸易公司', '服务收入', 
 '11111111-1111-1111-1111-111111111111', '等待银行到账确认'),

('REC-2024-003', '2024-01-13', 'refund', -2300.00, 'CNY', 
 '退款处理 - 订单取消', 'disputed', 'TXN-20240113-003', 
 NULL, '深圳制造企业', '退款支出', 
 '11111111-1111-1111-1111-111111111111', '客户对退款金额有异议'),

('REC-2024-004', '2024-01-12', 'bank', 25000.00, 'CNY', 
 '银行转账收入', 'unmatched', 'TXN-20240112-005', 
 NULL, NULL, '其他收入', 
 '11111111-1111-1111-1111-111111111111', '需要核实收款来源'),

('REC-2024-005', '2024-01-11', 'payment', 12800.00, 'CNY', 
 '月度服务费收款', 'resolved', 'TXN-20240111-002', 
 'INV-2024-0155', '广州软件公司', '服务收入', 
 '11111111-1111-1111-1111-111111111111', '争议已解决，确认收款');

-- 插入异常记录
INSERT INTO reconciliation_exceptions (
    record_id, exception_type, severity, description, resolution_status
) VALUES
((SELECT id FROM reconciliation_records WHERE record_number = 'REC-2024-002'), 
 'missing_data', 'medium', '缺少银行交易记录', 'pending'),

((SELECT id FROM reconciliation_records WHERE record_number = 'REC-2024-003'), 
 'amount_mismatch', 'high', '退款金额与客户期望不符', 'investigating'),

((SELECT id FROM reconciliation_records WHERE record_number = 'REC-2024-004'), 
 'missing_data', 'medium', '缺少客户信息和发票号', 'pending');

-- 插入匹配记录
INSERT INTO reconciliation_matches (
    record_id, match_confidence, match_type, matched_by
) VALUES
((SELECT id FROM reconciliation_records WHERE record_number = 'REC-2024-001'), 
 95.50, 'automatic', '11111111-1111-1111-1111-111111111111'),

((SELECT id FROM reconciliation_records WHERE record_number = 'REC-2024-005'), 
 88.30, 'manual', '11111111-1111-1111-1111-111111111111');
