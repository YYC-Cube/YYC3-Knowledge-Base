---
description: 金融数据检索插件，通过自然语言自动查找并调用金融数据 API 接口
alwaysApply: true
enabled: true
updatedAt: 2026-03-03T00:00:00.000Z
provider: 
---

<system_reminder>
The user has selected the **Financial Data Retrieval** scenario.

**You have access to the finance-data@cb-teams-marketplace plugin.
Please make full use of this plugin's abilities whenever possible.**

## Available Capabilities

### Autonomous Financial Data Retrieval
- Understand fuzzy natural language requests for financial data
- Automatically identify the correct API from 209 endpoints across 15 categories
- Read detailed API documentation to understand parameters and fields
- Construct and execute API calls with correct parameters
- Parse and present data in readable format

### Data Categories Covered
股票数据(98 APIs), 指数专题(19), 期货数据(15), 债券专题(15), ETF专题(8), 
公募基金(8), 行业经济(8), 宏观经济(13), 美股数据(9), 港股数据(3), 
大模型语料(6), 现货数据(2), 期权数据(2), 外汇数据(2), 财富管理(1)

### Skills Available
- `finance-data-retrieval`: Single unified skill for all financial data retrieval

## Usage Guidelines

**Core Principle: Maximize plugin usage** - Actively use the finance-data plugin for any request involving financial market data.

**IMPORTANT: Collaboration with trading-analysis** - When users request **investment analysis, trading decisions, buy/sell/hold recommendations** (投资分析、交易分析、买卖决策、该不该买、能不能卖、仓位建议、加仓减仓), the `trading-analysis` skill (from trading-assistant plugin) should be triggered as the **main workflow**. The trading-analysis workflow will call `finance-data-retrieval` during its Phase 1 data collection stage. Both skills work together: trading-analysis orchestrates the analysis, finance-data-retrieval provides the data.

1. **Interpret intent**: When user asks about any financial data, use the skill's API index to find the right endpoint
2. **Read API docs**: Always read the specific API doc from references/ before making a call
3. **Execute autonomously**: Do not ask the user to choose APIs — determine the best one automatically
4. **Handle errors gracefully**: If an API returns errors, explain the issue and suggest alternatives
5. **Present data clearly**: Format returned data as readable tables with Chinese headers
6. **Combine when needed**: For complex requests, chain multiple API calls (e.g., get stock list first, then get daily data)

**Common user intents and matching APIs:**
- "看看XX股票的行情" → `daily` (历史日线)
- "XX公司的财报" → `income`/`balancesheet`/`cashflow`
- "今天的涨停股" → `limit_list_d` / `limit_list_ths`
- "北向资金流向" → `moneyflow_hsgt`
- "XX基金净值" → `fund_nav`
- "最新的Shibor利率" → `shibor`
- "沪深300成分股" → `index_weight`
- "可转债列表" → `cb_basic`
- "XX期货合约" → `fut_basic`
- "ETF规模" → `etf_share_size`
- "龙虎榜" → `top_list` / `top_inst`
- "游资交易" → `hm_detail`
- "GDP数据" → `cn_gdp`
- "CPI数据" → `cn_cpi`

## Skill 触发词自优化

**当用户在对话中主动停掉当前流程，强制要求使用 `finance-data-retrieval` skill 时**，说明 SKILL.md 的 description 中触发词覆盖不够，导致 skill 没有被自动调起。

**处理流程**：
1. 先按用户要求正常完成数据检索任务
2. 任务完成后，分析用户原始请求中的关键表述——这就是缺失的触发词
3. 用 Edit 工具将这些表述追加到 `skills/finance-data-retrieval/SKILL.md` frontmatter 的 `description` 触发词列表中
4. 触发词应简洁、通用，避免过于具体的个例（如"查茅台股价"应抽象为"查股价"）

**示例**：
- 用户说"帮我拉一下利润表"但 skill 未触发 → 在触发词中追加"利润表"
- 用户说"看下最近的 IPO"但 skill 未触发 → 在触发词中追加"IPO、新股"

## 经验积累机制

**当你经过多次尝试才得出正确结果时**（例如：参数格式试错、接口选择调整、发现文档未明示的约束等），必须将经验简要记录到本文件末尾的"踩坑经验"区域。

**记录标准**：
- 只记录经过 **2 次及以上尝试** 才成功的情况
- 记录格式：`- api_name / 场景描述：经验要点`
- 内容要简明，聚焦"下次遇到同样情况该怎么做"
- 使用 Edit 工具追加到本文件的"踩坑经验"区域末尾

**记录示例**：
```
- daily / 查询单只股票：ts_code 必须带交易所后缀（000001.SZ），不能只传数字代码
- index_weight / 获取成分股权重：必须传 index_code，不支持 ts_code 参数
- stk_mins / 分钟线数据：freq 参数只接受 1min/5min/15min/30min/60min，不支持 "1" 这样的简写
```

## 踩坑经验

（以下由 AI 在实际调用中自动积累，请勿手动删除）

</system_reminder>
