# 资源预算合约（共享片段）

> 引用方：所有 agent（`agents/*.md`）

本合约统一定义：上下文预算控制、工具调用计数器、Turn 预算与收尾协议。

---

## Read 工具调用规范

1. **禁止全文件 Read** -- 所有 Read 调用必须使用 `offset` + `limit` 参数
   - Sink 方法 / finding 上下文：以目标行号为中心，+/-30 行（最大 60 行）
   - 防御函数实现：仅读取函数体（通过 LSP documentSymbol 获取范围后精确读取）
   - 入口方法签名：仅读取方法声明 +/-5 行
2. **同文件去重** -- 同一文件在单次任务中最多 Read 3 次，后续引用前次结果
3. **大文件警戒** -- 文件超过 500 行时，必须先用 LSP documentSymbol 定位目标区域再精确读取

## 工具调用计数器

维护内部计数器：`readCount`、`grepCount`、`lspCount`、`totalCalls`、`estimatedLinesRead`。

| totalCalls | 行动 |
|------------|------|
| 40 | 调用 `context_budget.py` 评估 |
| 65 | 强制增量写入 + 调用 `context_budget.py` |
| 95 | 节约模式：Read 范围缩至 +/-10 行，跳过低优先级 finding |
| 120 | 收尾模式：完成当前 finding 后立即写入并结束 |
| 130 | 紧急写入，立即结束 |

## 上下文预算检查

检查时机：每执行 20 次工具调用后、`totalCalls` 达到收尾阈值的 50% 时、开始新子任务/阶段前。

> **注意**：`totalCalls` 计数器 + `max_turns` 限制已经提供了可靠的收尾触发机制。`context_budget.py` 作为补充确认，不需频繁调用。

```bash
python3 "scripts/context_budget.py" estimate \
  --total-budget 170000 \
  --files-read {已读取文件数} \
  --avg-lines-per-file {平均读取行数} \
  --findings-completed {已完成findings数} \
  --findings-remaining {剩余findings数} \
  --tool-calls {已执行工具调用数}
```

| recommendation | 操作 |
|----------------|------|
| `continue` | 正常继续 |
| `flush_and_continue` | 立即写入，继续但缩小 Read 范围至 +/-15 行 |
| `flush_and_stop` | 立即写入，完成当前 finding 后结束 |
| `emergency_flush` | 立即写入所有数据（status="partial"），停止分析 |

## LSP 结果复用

对同一方法的 `incomingCalls`/`outgoingCalls` 结果在本次审计中有效，不重复调用。记录到内部工作列表，后续引用列表而非重新调用。

---

## Agent Turn 预算

| Agent | max_turns | Turn 预留 | totalCalls 收尾阈值 | 特殊收尾动作 |
|-------|-----------|----------|-------------------|-------------|
| recon-lite | 5 | 最后 1 轮 | 15 | — |
| recon-deep | 18 | 最后 3 轮 | 70 | — |
| **light-scan** | **25** | **最后 3 轮** | **85** | **跳过攻击链验证/对抗审查/全局审计质量评估，仅执行代码存在性校验 + 置信度评分** |
| quick-scan (Deep) | 30 | 最后 3 轮 | 100 | — |
| quick-scan (Standard) | 15 | 最后 3 轮 | 50 | — |
| deep-scan (Deep) | 35 | 最后 5 轮 | 130 | 记录正在分析的 finding 当前进度并写入 |
| deep-scan (Standard) | 25 | 最后 3 轮 | 90 | 记录正在分析的 finding 当前进度并写入 |
| verification（流式） | 30 | 最后 3 轮 | 100 | 跳过全局审计质量评估，直接执行置信度评分（零工具调用） |
| verification（批量） | 25 | 最后 3 轮 | 90 | 跳过全局审计质量评估，直接执行置信度评分（零工具调用） |
| verification（批量-Standard） | 18 | 最后 2 轮 | 65 | 跳过全局审计质量评估，直接执行置信度评分（零工具调用） |
| batch-worker | 20 | 最后 3 轮 | — | — |

## 收尾触发条件（任一即触发）

1. 连续工具调用后输出被截断
2. `context_budget.py` 返回 `flush_and_stop` 或 `emergency_flush`
3. `totalCalls` 达到 Agent 收尾阈值

## 收尾模式动作

1. 停止所有新探索/分析
2. 立即写入已完成结果（Read → 合并 → Write）
3. 设置 `status: "completed"` 或 `"partial"`
4. 更新 `lastCheckpoint`、`completedItems`、`writeCount`

> **Turn 预留底线：预留 turns 仅用于写入输出和设置状态，不得用于新探索。**
