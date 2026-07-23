# 错误恢复手册（统一参考）

> 引用方：commands/project.md、commands/diff.md、agents/*.md、references/strategies/orchestrator-rules.md
>
> 本文件汇总所有异常场景的恢复策略和降级路径。Agent 和编排器在遇到异常时 Read 对应章节。

---

## 1. 编排器层异常

### 1.1 StreamTimeout 恢复

当 Task 返回 `StreamTimeoutError` 时：

```
1. Glob 检查 agents/{agent-name}.json 是否存在
2. 若文件存在：Read status + writeCount
   - status=completed/partial 且 writeCount>=1 → 视为完成，不重试
   - status=in_progress 且 writeCount>=1 → 改为 partial，视为部分完成
   - writeCount=0 或文件为空 → 删除空文件，重试 1 次
3. 若文件不存在 → 重试 1 次（使用新编号，如 deep-scan-3）
4. 重试仍失败 → 输出警告，按产物完整性检查规则处理
```

### 1.2 MaxTurnsExceeded 恢复

当 Task 返回 `MaxTurnsExceededError` 时，**文件状态优先于 Task 错误**：

```
1. Glob 检查 agents/{agent-name}.json
2. 文件存在 且 status=completed/partial 且 writeCount>=1 → 视为成功，忽略错误
3. 文件存在 且 status=in_progress 且 writeCount>=1 → 视为 partial 完成
4. 文件不存在或无有效内容 → 报告失败，按产物完整性检查规则处理
```

> 关键：MaxTurnsExceeded 表示 turn 配额耗尽，但已有有效结果仍可用于下游。编排器**不应**仅因 Task 报错丢弃有效产物。

### 1.3 Agent 产物完整性失败

```
1. checkpoint_verify.py verify-artifacts 返回 status="fail"
2. 仅允许重试缺失/损坏的 agent **1 次**
3. 重试后仍失败 → 终止本批次
4. 禁止编排器手工接管扫描或直接拼装结果
5. 保留 checkpoint-artifact-failures.json 供排障
```

**面向用户的提示**（终止时输出）：
```
❌ 扫描过程中遇到异常，部分分析结果未完成。

已保留的结果：{readyAgents 及其发现数}
未完成的分析：{failedAgents}（因资源限制中断）

建议：重新运行扫描命令重试完整扫描。
诊断文件已保存至 security-scan-output/{batch}/（如需技术支持可提供此目录）。
```

> 禁止在用户提示中出现 checkpoint、artifact、batch ID 等技术术语。将技术信息保留在诊断文件中。

### 1.4 Agent 长时间无进展

```
1. 文件状态 in_progress 但长时间无 writeCount 变化
2. 输出警告提示
3. 持续无进展 → 视为 partial 完成
4. 输出文件不存在且等待时间过长 → 重试 1 次
```

**面向用户的警告提示**：
```
⚠️ 部分分析任务耗时较长，已使用当前可用的结果继续。
最终报告中可能标注部分维度为「未完全覆盖」。
```

---

## 2. Agent 层异常

### 2.1 上下文预算耗尽

当 `context_budget.py` 返回 `emergency_flush` 或 Agent 感知即将耗尽时：

```
1. 立即将所有已完成的数据写入输出文件
2. 设置 status: "partial"
3. 记录 lastCheckpoint 为最后完成的 item
4. 不再进行任何新的分析
5. 输出 earlyTermination 字段说明原因
```

参见 `references/contracts/incremental-write-contract.md > 紧急写入协议`。

### 2.2 LSP 不可用

```
1. 所有 agent 回退到 Grep + Read 手动追踪
2. 所有发现设置 traceMethod: "Grep+Read"
3. 未验证比例增加，整体置信度降低
4. Agent 提示词包含降级通知
```

参见 `references/guides/lsp-setup.md > LSP 降级规则`。

### 2.2.1 LSP 自动安装失败

LSP 安装流程为：探活失败 → 自动安装（二进制 + 插件）→ 安装后验证 1 次。按错误类型恢复：

**A. `codebuddy plugin install` 失败**

```
常见错误及恢复：
- "Failed to acquire lock" → 按错误信息提示的 rm -rf <路径> 删除锁文件，重试 1 次
- "Marketplace ... not found" → 确认使用 {pluginName}@codebuddy-plugins-official 格式
- 其他错误 → 记录到 lspInstallLog，不阻塞扫描
重试上限：最多 2 次（首次 + 1 次重试）
```

**B. 二进制安装失败或安装后验证仍失败**

```
恢复步骤：
1. 记录错误到 summary.json > executionMetrics.lspInstallLog
2. 提示用户可能需要重启 CodeBuddy
3. AskUser：已重启则再验证 1 次，否则降级
4. 不阻塞扫描 → 设置 lspStatus: "unavailable"，按降级规则继续
```

参见 `references/guides/lsp-setup.md > 步骤 5：自动安装流程` 了解完整安装流程。

### 2.3 增量写入失败

当 Write 操作失败时：

```
1. 重试 Write 1 次
2. 仍失败 → 尝试写入备用路径（如 agents/{agent-name}-backup.json）
3. 继续分析，在下一个写入周期合并累积数据
4. 如果连续 3 次写入失败 → 设置 status: "failed"，停止分析
```

### 2.4 批次失败（batch-worker）

```
1. 单个批次失败不中止审计
2. 调度器跳过失败的批次
3. 记录失败批次信息到 batch-failures.json
4. 其他批次结果正常合并
5. 在 summary.json 中标记 auditMode: "partial"
```

---

## 3. 数据层异常

### 3.1 JSON 解析失败

```
1. 标记该 Agent 输出为无效
2. 跳过该 Agent 的输出
3. 使用其他 Agent 的结果继续
4. 在 summary.json 中记录错误
```

### 3.2 merge_findings.py 失败

```
1. 检查输入文件是否存在且合法
2. 如果某 agent 输出损坏 → 跳过该 agent，合并其余
3. 合并脚本本身异常 → 检查 Python 环境
4. 最终回退：手动从各 agent JSON 中提取 findings（仅限紧急情况）
```

### 3.3 恢复协议（Agent 重启续做）

Agent 启动时检查输出文件是否已存在且 `status != "completed"`：

```
- 文件存在 → Read 已有数据，从 lastCheckpoint 之后继续
- 文件不存在 → 从头开始，创建初始结构
- 跳过 completedItems 中已完成的 items
```

---

## 4. 降级策略汇总

| 异常场景 | 降级操作 | 数据影响 |
|---------|---------|---------|
| LSP 不可用 | Grep+Read 替代 | 置信度降低，traceMethod 标记 |
| Agent StreamTimeout | 使用已落盘数据 | partial 完成，结果可用 |
| Agent MaxTurnsExceeded | 使用已落盘数据 | partial 完成，结果可用 |
| 上下文预算耗尽 | emergency_flush | partial 完成，记录断点 |
| 单批次失败 | 跳过该批次 | 覆盖率降低，标记 partial |
| 产物完整性失败 | 重试 1 次 → 终止 | 不伪造数据 |

> **核心原则**：文件状态优先于 Task 返回；已有有效数据不因错误丢弃；宁可 partial 也不伪造 completed。
