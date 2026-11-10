# HEARTBEAT.md — 管线巡检

仅在需要操作时报告。否则回复：HEARTBEAT_OK

## 1. 新线索检查
读取 CRM 中 created_at = 今天 且 status = new 的记录。
有发现：列出（姓名、国家、产品兴趣、来源）。建议 ICP 评分 + 调研 + 起草首触消息。
无发现：跳过。

## 2. 停滞线索检查
读取 CRM 中 status = contacted/interested/quote_sent/negotiating 且 last_contact > 5个工作日的记录。
有发现：列出（姓名、公司、国家、状态、最后联系时间）。建议跟进草稿。
无发现：跳过。

## 3. 报价追踪
查找 status = quote_sent 且 last_contact > 3个工作日的记录。
有发现：建议跟进报价反馈。
无发现：跳过。

## 4. 今日会议
查找 status = meeting_set 且 next_action 包含今天日期的记录。
有发现：提醒准备材料。
无发现：跳过。

## 5. 培育检查（仅周一）
查找 status = nurture 且 last_contact > 14天 → 建议培育触达。
查找 status = closed_won 且 last_contact > 30天 → 建议售后关怀。
查找 status = closed_lost 且 last_contact > 90天 → 建议季度回访。

## 6. 数据质量（工作日，每日一次）
检查 whatsapp 为空且 status 非 closed_* 的记录。
检查 icp_score 为空且 status 非 new 的记录。
有发现：列出，建议补全。
无发现：跳过。

## 7. 邮件序列检查（每日 11:00）
检查 CRM 中 status = email_sent 的线索：
- 距上次邮件3天且无回复 → 发送跟进 #2
- 距上次邮件7天且无回复 → 发送跟进 #3
- 距上次邮件14天且无回复 → 发送最终跟进，移至培育池
- 邮件已回复 → 更新状态为 email_replied，通知所有者
无发现：跳过。

## 8. 线索发现（每日 10:00）
执行 lead-discovery 技能：
1. 根据星期选择目标市场（周一/二：非洲，周三/四：中东，周五：东南亚，周六：拉美，周日：其他）
2. 通过 Jina Search 执行2-3次搜索查询
3. 评估发现的公司，ICP ≥ 5 写入 CRM
4. 向所有者报告发现
有发现：按 lead-discovery 技能输出格式报告。
无发现：跳过。

## 9. Gmail 收件箱监控（每次心跳）
检查 Gmail 中的新客户回复：
- 将发件人邮箱匹配 CRM 记录
- 匹配成功：更新 last_contact，通知所有者收到回复
- 新发件人且含业务咨询：创建新 CRM 记录，开始资质评估
无发现：跳过。

## 10. 竞品情报（每周五）
搜索竞品动态：
- 新产品发布、价格变动、市场扩张
- 将发现存储到 Supermemory，标签为 "competitor_intel"
- 向所有者报告重大发现
无发现：跳过。

## 11. 记忆健康检查（每日 14:00）
运行 `memory:stats` + `chroma:stats` 检查完整记忆系统。
- Supermemory：若总量 > 500，建议归档旧的 `market_signal` 条目。若 `customer_fact` 为0，告警。
- ChromaDB：若过去24小时存储轮次为0，告警 — L3 可能未正常捕获。报告按轮次计数排名前5的客户。
- 报告："Supermemory：[X] 条事实，[Y] 条洞察，[Z] 条信号。ChromaDB：跨 [M] 位客户共 [N] 轮对话。"

## 12. CRM 快照（每日 12:00）
运行 `chroma:snapshot` 将当前管线状态备份至 ChromaDB（L4 容灾）。
- 通过 gws 读取完整 CRM，将摘要存储至 ChromaDB 并附带日期标签。
- 这是灾备 — 若 MemOS 或 Supermemory 出现问题，ChromaDB 中有数据。
- 报告："CRM 快照已存储：[N] 条活跃线索，管线价值 [M]。"

## 13. WhatsApp 窗口到期检查（每次心跳）
检查 CRM 中的线索：
- 主要渠道 = WhatsApp 且 `last_contact` > 48小时（接近72小时窗口）
- 且状态为活跃（contacted / interested / quote_sent / negotiating）

**48-60小时**（预警区）：
- 在窗口到期前通过 WhatsApp 发送温和跟进："Hi [Name], just checking in on [last topic]..."

**72小时+ 已过期**：
- 若客户有 Telegram：自动切换至 Telegram 跟进
- 若无 Telegram：切换至 Email
- 更新 CRM 备注："WhatsApp 窗口已过期，已切换至 [渠道]"
- WhatsApp 实际送达失败时绝不标记为"已联系"

有发现：列出接近/已过窗口到期的线索及建议操作。
无发现：跳过。

无异常 → 仅回复：HEARTBEAT_OK
