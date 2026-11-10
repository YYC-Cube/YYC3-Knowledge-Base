# 增量写入合约（所有 Agent 强制遵守）

> 引用方：agents/deep-scan.md、agents/quick-scan.md、agents/recon-lite.md、agents/recon-deep.md、agents/verification.md、agents/batch-worker.md

## 目的

防止因上下文窗口耗尽或 max_turns 限制导致已完成的分析结果丢失。所有 agent 必须遵循本合约进行增量写入。

## 核心原则

**任何已完成的分析结果必须在 3 个工具调用周期内写入磁盘。宁可多次写入产生 IO 开销，也不可因上下文耗尽而丢失结果。**

## 写入触发条件（满足任一即触发）

1. 完成一个完整 finding 的分析
2. 完成一个 Phase / 子任务
3. 累积未写入数据估计超过 2000 tokens
4. 已连续执行 10 次工具调用未写入
5. `context_budget.py` 返回 `flush_and_continue`、`flush_and_stop` 或 `emergency_flush`

## 写入方式

1. Read 当前输出文件（如存在）
2. 合并新数据到已有数据
3. Write 完整 JSON
4. 更新 `status`、`lastCheckpoint`、`completedItems[]`、`writeCount`

## 输出文件状态字段（强制）

每个 agent 的输出 JSON 必须包含以下顶层字段：

```json
{
  "agent": "<agent名称>",
  "status": "in_progress | partial | completed | failed",
  "lastCheckpoint": "<最后完成的检查点标识>",
  "completedItems": ["<已完成的item标识列表>"],
  "totalExpected": 0,
  "writeCount": 0,
  "findings": []
}
```

### 状态值说明

| status | 含义 |
|--------|------|
| `in_progress` | 正在分析中，尚未完成全部任务 |
| `partial` | 因上下文预算不足或 turns 耗尽而提前终止，已完成的部分结果有效 |
| `completed` | 全部任务正常完成 |
| `failed` | 发生错误导致无法继续 |

## 恢复协议

Agent 启动时检查输出文件是否已存在且 `status != "completed"`：

- **如果存在**：Read 已有数据，从 `lastCheckpoint` 之后继续，跳过 `completedItems` 中已完成的 items
- **如果不存在**：从头开始，创建初始结构

## 交接门禁（新增）

编排器在把任一 agent 视为“已完成”前，必须同时满足：

1. 对应输出文件已存在
2. JSON 可解析
3. `status` 为 `completed` 或 `partial`
4. `writeCount >= 1`（若字段存在）

不满足以上任一条件时，只能重试该 agent 或终止批次；**禁止**编排器直接接管扫描并手工拼接下游输入。

## 各 Agent 的写入节奏

| Agent | 写入时机 |
|-------|---------|
| **recon-lite** | fileList 枚举完成后写入（含 projectInfo）。仅需 1 次写入 |
| **recon-deep** | 1. 每完成 10 个入口点写入一次；2. 每完成一个 Controller 的端点矩阵写入一次；3. 依赖解析完成后最终写入 |
| **quick-scan** | 1. D1 密钥检测完成后写入；2. D2 CVE 检测完成后追加写入；3. D3 配置基线完成后追加写入；4. D4/D5 完成后最终写入 |
| **deep-scan** | 每完成 **1 个** finding 的完整分析（步骤 1-6）后立即写入 |
| **verification** | 1. 代码存在性校验完成后立即写入；2. 每完成 3 个 finding 的攻击链验证后追加写入；3. 全局审计质量评估/置信度评分完成后最终写入 |

## 紧急写入协议

当 `context_budget.py` 返回 `emergency_flush` 或 agent 感知到即将耗尽上下文时：

1. **立即**将所有已完成的数据写入输出文件
2. 设置 `status: "partial"`
3. 记录 `lastCheckpoint` 为最后完成的 item
4. 不再进行任何新的分析
5. 输出包含 `earlyTermination` 字段说明原因

```json
{
  "earlyTermination": {
    "reason": "context_budget_exceeded",
    "completedCount": 5,
    "remainingCount": 8,
    "recommendation": "使用恢复协议从 lastCheckpoint 继续"
  }
}
```
