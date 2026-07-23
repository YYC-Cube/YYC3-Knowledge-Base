# 编排器规则（共享片段）

> 引用方：commands/project.md、commands/diff.md

## 核心原则

编排器是调度器，而非执行器。每个 agent 通过 Task 工具（后台模式）运行，拥有独立的上下文窗口。

## 上下文传递预算

编排器在整个生命周期中，**不得将任何 agent 的完整输出读入上下文**。所有跨阶段数据通过 `merge_findings.py` / `checkpoint_verify.py` 的 stdout JSON 摘要传递。

| 来源 | 传递到编排器的内容 | 上限 |
|------|-------------------|------|
| recon-lite.json | fileCount、totalLines、maxFileLines、projectInfo（type/framework） | ≤150 字 |
| recon-deep.json | 关键指标（entryPoints/endpoints/dependencies 数量） | ≤200 字 |
| light-scan.json | `merge_findings.py` stdout（totalFindings、bySeverity、验证摘要） | ≤400 字 |
| verify-artifacts stdout | readyAgents、failedAgents、missingFiles | ≤200 字 |
| quick-scan.json | `merge_findings.py` stdout（totalFindings、bySeverity） | ≤300 字 |
| deep-scan.json | `merge_findings.py` stdout（totalFindings、bySeverity） | ≤300 字 |
| verification.json | `merge_findings.py merge-verify` stdout（finalFindings、removedByAntiHallucination） | ≤300 字 |
| remediation.json | 编排器内联产出，无需传递 | — |
| batch-N-result.json | `status`、`totalFindings`、`bySeverity` | ≤200 字/批次 |

## 禁止操作

- 不要为安全分析而 Read 项目源文件
- 不要为合并而 Read `agents/*.json`（委托给 `merge_findings.py`）
- 不要在 agent 提示词中嵌入完整源代码
- 不要在 agent 缺少落盘产物时手工接管扫描并伪造阶段完成

## 允许操作

- Read 标记配置文件（`Dockerfile`、`package.json`、`go.mod`、`pom.xml`）
- Read `stage1-context.json` 的摘要字段
- Glob 检查文件存在性
- 调用 `merge_findings.py`/`checkpoint_verify.py`，解析 stdout JSON
- Read `agents/remediation.json` 的 `overallVerdict`
- Read `summary.json`
- 调用 `report_upload.py` 和 `generate_report.py`

## 进度输出

### 阶段级进度
- `[1/3] 侦查阶段：正在探索项目结构...`
- `[2/3] 扫描+验证阶段：正在执行深度安全扫描与流式验证...`
- `[3/3] 修复阶段：正在生成修复方案与报告...`

### 分级扫描级别播报（阶段 1 完成后）

在 recon-lite 完成且分级决策确定后立即输出：

```
  [v] 探索完成：{n} 个源文件，{totalLines} 行代码，技术栈 {framework}
  扫描级别：{Light|Standard|Deep}（{轻量|标准|深度}模式）— {基于项目规模自动选择|用户指定}
     {如果是升级：注意：{upgradeReason}}
     {如果存在大文件：提示：{largeFileWarning}}
     {如需深度扫描，请使用 --scan-level deep（仅 Light/Standard 时显示）}
```

### 子任务完成摘要
- `  [v] recon-lite 完成：{n} 个文件，技术栈 {framework}`
- `  [v] recon-deep 完成：识别 {n} 个入口点，{m} 个端点，{k} 个依赖`
- `  [v] light-scan 完成：发现 {n} 个风险，验证后 {m} 个确认（Light 模式）`
- `  [v] quick-scan 完成：发现 {n} 个模式匹配风险，{m} 个危险 Sink`
- `  [v] deep-scan 完成：发现 {n} 个语义分析风险，追踪 {m} 条攻击链`
- `  [v] 合并去重完成：{before} 个发现 → 去重后 {after} 个`
- `  [v] verification 完成：{verified} 个已验证，{removed} 个误报移除，{downgraded} 个降级`
- `  [v] 内联修复完成：{eligible} 个漏洞可自动修复，审计质量评分 {score}`

### 阶段完成摘要
- `── 侦查阶段完成：{n} 个文件，{m} 个入口点，LSP {status} ──`
- `── 扫描+验证完成：quick-scan {n1} 个 + deep-scan {n2} 个 → 验证后 {verified} 个确认风险 ──`
- `── 修复阶段完成：{eligible} 个可自动修复，报告已生成 ──`

## 并行调度规则

阶段 2 中 quick-scan 和 deep-scan **必须并行启动**，互不阻塞。编排器在两者都完成后再执行合并。

## Agent 生命周期

1. Task 工具后台模式启动 agent
2. 编排器进入**等待期轮询**（见下方协议），不空等
3. 完成条件满足 → 读取 `agents/{name}.json` 提取摘要
4. 调用合并/检查点脚本（仅解析 stdout）
5. 将文件路径引用传递给下一阶段 agent

## 等待期轮询协议（Wait-Loop Polling）

### 设计目标

解决"Agent 已完成工作但 Task 进程未退出"导致用户感知卡住的问题。编排器在等待后台 Agent 期间**主动轮询输出文件**，向用户播报实时进度，并以**文件状态为完成判据**。

### 轮询机制

编排器在 Task 后台模式启动 agent 后，进入**基于 sleep 的时间间隔轮询循环**：

```
轮询间隔策略（sleep-based，避免空转消耗工具调用配额）：
  - 前 2 次轮询：sleep 15（秒），用于快速检测 agent 是否正常启动
  - 第 3-5 次：  sleep 30（秒），降低轮询频率
  - 超过 5 次无进展：sleep 45（秒），进入低频监控

长间隔预期提示：当 sleep 间隔 >= 45 秒时，在 sleep 前输出预期提示：
  `{agent} 正在进行深度分析，预计还需 1-2 分钟...`

每次 sleep 结束后执行：
  1. Glob 检查 agents/{agent-name}.json 是否存在
  2. 如存在，Read 顶层字段：status, writeCount, lastCheckpoint, completedItems
  3. 根据状态输出差异化提示（见下表）
  4. 判断完成条件（见下方）
```

**等待期有效利用**：在等待某个 agent 的 sleep 间隔内，编排器**应当**利用空闲做有用工作，而非空等：
- 读取已完成 agent 的产物，提前准备下一阶段输入
- 执行不依赖当前 agent 输出的独立检查（如文件完整性校验）
- 预加载 reference 文档，减少后续阶段启动延迟

**禁止行为**：不得在未加 sleep 的情况下连续调用 Glob/Read 轮询，这会浪费工具调用配额且无实际收益。

### 差异化进度提示

| 文件状态 | writeCount | 用户提示 |
|---------|------------|---------|
| 文件不存在 或 `in_progress` + 0 | — | `⏳ {agent} 正在分析中...` |
| `in_progress` | >0 | ` {agent} 已完成 {writeCount} 次检查点（{lastCheckpoint}）` |
| `partial` | >0 | ` {agent} 因资源限制提前结束，已产出 {len(completedItems)} 项结果` |
| `completed` | >0 | ` {agent} 已完成` |
| `failed` | — | ` {agent} 执行失败` |

**输出纪律**：
- **去重**：相同 `{agent} + status + writeCount` 组合不重复输出。仅在状态或 writeCount **发生变化**时才输出新提示
- **静默合并**：同一轮询周期内多个 agent 的状态变化，合并为一组输出（不逐条打印）
- **首次播报延迟**：agent 启动后前 2 个轮询周期内，仅在首次检测到文件创建时输出 1 条 `⏳`；之后才按 writeCount 变化输出

### 完成判据（文件优先）

编排器将 agent 视为"已完成"的条件——满足**任一**即可：

| 条件 | 说明 |
|------|------|
| **Task 正常返回** | Task 工具调用返回结果（常规路径） |
| **文件状态完成** | `agents/{name}.json` 存在 且 `status` 为 `completed` 或 `partial` 且 `writeCount >= 1` | 

**关键规则**：当文件状态已满足完成条件但 Task 未返回时，编排器**不再等待 Task 返回**，直接读取 JSON 产物继续下一步。这解决了"JSON 已完成但 agent 进程空转"的卡顿问题。

### 超时保护（原则导向）

核心原则：**文件状态优先于 Task 返回**。当输出文件已表明工作完成或长期无进展时，编排器应果断推进流水线而非无限等待。

| 场景 | 判定原则 | 操作 |
|------|---------|------|
| 文件状态 `completed` 但 Task 未返回 | Agent 空转 | 立即标记完成，跳过等待 |
| 文件状态 `in_progress` 但长时间无进展 | 疑似卡住 | 输出警告提示；持续无进展则视为 partial 完成 |
| 输出文件不存在且等待时间过长 | 启动失败 | 重试 1 次，仍失败则按产物完整性检查规则处理 |

### StreamTimeout 恢复协议

当 Task 返回 `StreamTimeoutError` 时，编排器**必须先检查输出文件再决定是否重试**——文件存在且有效则视为完成，否则最多重试 1 次。

> 详细恢复步骤参见 `references/guides/error-recovery-runbook.md > §1.1 StreamTimeout 恢复`。

### MaxTurnsExceeded 处理协议

当 Task 返回 `MaxTurnsExceededError` 时，**文件状态优先于 Task 错误状态**——已有有效结果（writeCount >= 1）仍可用于下游处理，编排器不应仅因 Task 报错丢弃有效产物。

> 详细恢复步骤参见 `references/guides/error-recovery-runbook.md > §1.2 MaxTurnsExceeded 恢复`。

### 进度输出示例

```
[2/3] 扫描+验证阶段：正在执行深度安全扫描与流式验证...
   quick-scan 正在分析中...
   deep-scan 正在分析中...
   quick-scan 已完成 2 次检查点（D2-CVE检测）
   deep-scan 已完成 1 次检查点（SubtaskA-finding-3）
   quick-scan 已完成
   deep-scan 已完成 5 次检查点（SubtaskB-D3）
   deep-scan 已完成
  [v] quick-scan 完成：发现 12 个模式匹配风险，8 个危险 Sink
  [v] deep-scan 完成：发现 5 个语义分析风险，追踪 3 条攻击链
```

## 通信机制

Agent 间**没有**消息传递 API。唯一通信方式是**文件读写**：agent 写 JSON → 编排器读 JSON。禁止编造不存在的通信机制。

---

## 检查点逻辑

### 探索检查点（阶段 1 → 阶段 2）

```bash
python3 "scripts/checkpoint_verify.py" verify-explore \
  --batch-dir security-scan-output/{batch}
```

仅解析 stdout JSON（`status`、`passRate`、`failedItems`）。
- `status: "ok"` → 进入阶段 2
- `status: "fail"`（passRate < 0.6）→ Glob 回退失败项，从 stage1-context.json 中移除失败的 entryPoints

### 扫描合并（阶段 2 → 合并）

### 阶段 2 产物完整性检查（等待完成 → 合并前）

```bash
python3 "scripts/checkpoint_verify.py" verify-artifacts \
  --batch-dir security-scan-output/{batch} \
  --agents quick-scan,deep-scan,verification
```

仅解析 stdout JSON（`status`、`readyAgents`、`failedAgents`、`missingFiles`）。
- `status: "ok"` → 允许进入扫描合并
- `status: "fail"` → **禁止**手工补扫或跳过；仅允许重试缺失 agent 1 次
- 重试后仍失败 → 终止本批次，向用户输出友好提示（参见下方「产物完整性失败用户提示」）

#### 产物完整性失败用户提示

```
❌ 扫描过程中遇到异常，部分分析结果未完成。

已保留的结果：{readyAgents 列表及对应发现数}
未完成的分析：{failedAgents 列表}（{失败原因摘要}）

建议：重新运行扫描命令重试完整扫描。
诊断文件已保存至 security-scan-output/{batch}/（如需技术支持可提供此目录）。
```

> 技术细节（checkpoint-artifact-failures.json、agent 名称缩写等）仅记录在诊断文件中，不在用户提示中出现。

> diff 模式下若 `hasCodeChanges = false`，仅检查 `quick-scan`；若 `hasCodeChanges = true`，检查 `quick-scan,deep-scan,verification`。
> Light 模式下仅检查 `light-scan`。Standard 模式检查 `quick-scan,deep-scan,verification`。

```bash
python3 "scripts/merge_findings.py" merge-scan \
  --batch-dir security-scan-output/{batch}
```

读取阶段 2 agent 输出，验证字段，按 `file+line+riskType` 去重，分配 `findingId`，输出 `merged-scan.json`。编排器仅解析 stdout JSON。

### 扫描检查点（阶段 2 → 阶段 3）

```bash
python3 "scripts/checkpoint_verify.py" verify-scan \
  --batch-dir security-scan-output/{batch}
```

`hallucinations[]` 中的 findingId 标记为待移除。`status: "fail"` → 发出警告但继续阶段 3。

### 验证合并（阶段 3 → 输出）

```bash
python3 "scripts/merge_findings.py" merge-verify \
  --batch-dir security-scan-output/{batch}
```

应用 ahAction/verificationStatus/challengeVerdict，执行高置信度门控，输出 `finding-{slug}.json` + `summary.json`。

### 跨仓库源关联（可选）

当 `crossRepoDependencies` 非空且含高/严重级别时触发：
1. 向用户展示断点摘要
2. 用户选择：关联全部 / 部分 / 跳过
3. 浅克隆到 `.tmp-cross-repo/`，仅对受影响链重新 deep-scan
4. 阶段 3 前清理；每模块克隆超时 60 秒

---

## 覆盖率评估与补漏调度

扫描合并后，基于 `merge_findings.py` stdout 和 `stage1-context.json` 攻击面信息评估维度覆盖。

| 维度 | 代号 | 覆盖来源 |
|------|------|---------|
| 注入类 | D1 | deep-scan + quick-scan |
| 凭证/密钥 | D2 | quick-scan D1 |
| 认证/授权 | D3 | deep-scan 子任务B |
| 配置安全 | D4 | quick-scan D3 |
| 文件操作 | D5 | deep-scan |
| SSRF/反序列化 | D6 | deep-scan |
| 业务逻辑 | D7 | deep-scan D9 |
| 依赖安全 | D8 | quick-scan D2 |
| 云安全 | D9 | deep-scan（当存在 cloudServices） |
| 加密安全 | D10 | quick-scan D3 |

标记状态：**已覆盖**（有 findings 或 Fast Exclusion 确认 0-hit）、**未覆盖**（有攻击面但无 findings 且非 fast-excluded）、**浅覆盖**（仅 Grep 模式匹配）。

| 未覆盖维度数 | 操作 |
|-------------|------|
| 0-2 | 继续阶段 3，在 verification 全局审计质量评估中标记 |
| ≥3 | 启动 1 个补漏 deep-scan Agent（max_turns=15） |

---

## 按技术栈加载框架安全知识

侦察完成后，根据检测到的技术栈按需加载对应知识文件。未检测到的技术栈**不加载**。

| 技术栈 | 知识文件 |
|--------|---------|
| Java + Spring | `resource/rule-details/spring-security.yaml` |
| Java + MyBatis | `resource/rule-details/mybatis-injection.yaml` |
| Python + Flask/Django/FastAPI | `resource/rule-details/python-web.yaml` |
| Node.js + Express/Koa/NestJS | `resource/rule-details/nodejs-web.yaml` |
| Go + Gin/Echo/Fiber | `resource/rule-details/go-web.yaml` |
| 存在 SSRF 攻击面 | `resource/rule-details/ssrf.yaml` |

知识文件路径记录到 `stage1-context.json > frameworkKnowledge[]`。Agent 按需 Read 相关章节——**绝不注入完整内容到提示词**。

**推理优先原则**：知识文件是参考资料，Agent 的分析能力**不受限于**知识文件中列出的风险类型。发现未列出的风险时正常报告。
