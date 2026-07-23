---
name: lead-discovery
description: "面向B2B出口的AI驱动线索发现。基于ICP画像在网络上搜索潜在买家，评估匹配度，并创建CRM记录以便后续跟进。"
---

# Lead Discovery — AI 智能拓客

基于 ICP 画像自动搜索、筛选和评估潜在买家。

## 触发条件
- 定时任务执行（每日 10:00）
- 所有者手动指令："在 [市场/行业] 中搜索线索"

## 搜索策略

### 搜索维度（每日轮换，选取1-2个）
1. **目标市场采购**
   - "{{product}} buyers [目标国家] 2026"
   - "[目标国家] fleet expansion logistics company"
   - "[目标国家] construction equipment procurement"

2. **展会与采购信号**
   - "{{product}} buyers exhibition Africa Middle East 2026"
   - "transport logistics tender [区域]"

3. **企业研究（读取官网）**
   - 发现目标公司后，阅读其官网获取详细信息

4. **海关/贸易数据**
   - "[目标国家] {{product}} import statistics"
   - "{{product}} import demand [区域] 2026"

## 搜索执行

### Jina 搜索（发现潜在买家）
```bash
curl -s 'https://s.jina.ai/QUERY_URL_ENCODED' \
  -H 'Authorization: Bearer $JINA_API_KEY' \
  -H 'Accept: application/json'
```

### Jina 阅读器（读取企业官网）
```bash
curl -s 'https://r.jina.ai/https://target-company.com' \
  -H 'Authorization: Bearer $JINA_API_KEY' \
  -H 'Accept: application/json'
```

JINA_API_KEY 位于 .secrets/env。免费申请：https://jina.ai/

## 三层信息增强流水线

### 第一层：网站提取
通过 Jina Reader 读取企业官网 → 提取：
- 公司规模、员工人数
- 产品线、服务范围
- 认证资质（ISO 等）
- 联系方式（邮箱、电话、WhatsApp）
- 办公/仓库地址

### 第二层：采购信号搜索
通过 Jina 搜索：
- "[公司名] procurement tender"
- "[公司名] fleet expansion"
- "[公司名] import export"

### 第三层：信息整合
- 汇总所有发现，生成增强画像
- 根据 USER.md 中的 ICP 标准计算匹配评分
- 将研究笔记存储到 Supermemory，标签为 "customer_research"

## 评估流程
对每个发现的潜在客户：
1. 提取：公司名、国家、行业、规模、联系方式（邮箱/WhatsApp/电话）
2. 通过 Jina Reader 读取企业官网，深入了解
3. 根据 USER.md ICP 标准评分（1-10）
4. ICP ≥ 5：写入 CRM（来源=`web_discovery`，状态=`new`）
5. ICP ≥ 7：同时标记为 hot_lead，创建研究笔记
6. 有邮箱：标记 next_action=`email_outreach`
7. 有 WhatsApp：标记 next_action=`whatsapp_outreach`

## 输出格式（向所有者报告）
```
今日发现 X 条潜在线索：

1. [公司] - [国家] - ICP [X]/10
   行业：[行业] | 规模：[规模]
   来源：[搜索查询]
   联系方式：[邮箱/网站/WhatsApp]
   建议：[发送冷邮件 / WhatsApp联系 / 深入调研 / 进入培育池]

已添加至 CRM：X | 待邮件开发：X | 待WhatsApp联系：X
```

## 搜索频率与配额
- 每日最多20次搜索（API 配额管理）
- 周覆盖计划：非洲2天、中东2天、东南亚1天、拉美1天、其他1天
- 重复公司自动跳过（先检查 CRM）

## 各市场搜索模板

### 非洲（周一/周二）
- "{{product}} importers Nigeria Lagos"
- "logistics company Tanzania fleet"
- "construction company Kenya equipment procurement"

### 中东（周三/周四）
- "{{product}} dealers Saudi Arabia"
- "logistics fleet UAE Dubai"
- "construction equipment Oman transport"

### 东南亚（周五）
- "{{product}} importers Philippines Manila"
- "logistics company Vietnam fleet"
- "construction Indonesia heavy vehicles"

### 拉丁美洲（周六）
- "{{product}} importers Brazil"
- "logistics company Chile fleet"
- "mining transport vehicles Peru"
