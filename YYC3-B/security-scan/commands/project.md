---
description: 通过 agent 团队执行全项目代码安全审计
argument-hint: "[file_path...] [--include *.py,*.js] [--exclude node_modules,dist] [--scan-level light|standard|deep]"
allowed-tools: Bash, Read, Glob, Write, Grep, Task, Edit, LSP
---

# 全项目安全审计

> **[语言要求]** 所有面向用户的输出（进度提示、摘要、说明、错误信息）必须使用**简体中文**。Agent 提示词中的结构化标签保持中文。JSON 字段名和技术标识符（agent 名称、文件路径等）保持英文不变。

使用混合调度模式执行全项目安全审计：轻量任务内联执行，重 workload 使用独立 Agent。支持**分级扫描**（Light / Standard / Deep），根据项目规模自动选择最优策略。阶段 1-3 自动执行，无需用户交互；用户交互仅在阶段 3 进行。

> **分级扫描策略**：参见 `references/strategies/scan-level-strategy.md` 了解完整的级别定义、阈值和参数差异。

---

## 架构概览（Deep 模式）

> 以下为 Deep 模式（>80 文件）的架构。Light/Standard 模式的流水线见「分级扫描分支」章节。

```
阶段 1（侦察）           阶段 2（扫描 + 流式验证）                    阶段 3（修复）
─────────────           ──────────────────────────                  ──────────
recon-lite (5t)         quick-scan ─────────────────┐              内联 remediation
    │                   recon-deep → deep-scan ──────┤              + 报告生成
    └→ quick-scan 提前启动                            │
                        verification (流式验证) ←─────┘
```

---

## 阶段 1：侦察

> 进度输出参见 `references/strategies/orchestrator-rules.md > 进度输出`

### 1.1 初始化 + 启动探索

```bash
audit_batch_id="project-audit-$(date +%Y%m%d%H%M%S)"
mkdir -p security-scan-output/$audit_batch_id
```

**立即启动 recon-lite**（不等待 LSP 或规则加载——recon-lite 不依赖它们）：

- **recon-lite** -- 文件枚举、技术栈识别（max_turns=5），通过 Task 后台模式启动

### 1.2 并行准备（与 recon-lite 同时进行）

在等待 recon-lite 期间，编排器并行执行：

- **语言检测 + LSP 探活**（Ref: `references/guides/lsp-setup.md`）
  > 按统一探活流程执行：PATH 前置检查 → 插件状态检查 → 统一探活（3 轮，约 6s）→ 失败则自动安装 → 安装后验证 1 次。
  > 安装失败的恢复策略参见 `references/guides/error-recovery-runbook.md > 2.2.1`。
- **提取契约摘要**：从 anti-hallucination-rules.yaml 中提取 4 行契约核心，用于 agent 提示词注入（Ref: `references/contracts/anti-hallucination-contract.md`）

```
1.1 → recon-lite (后台)
   → 1.2 LSP 探活 + 契约提取 (并行)
```

### 1.3 决策分流（recon-lite 完成后）

按 `references/strategies/orchestrator-rules.md > 等待期轮询协议` 轮询 recon-lite 状态，向用户播报进度。完成后从 `agents/recon-lite.json` 读取 `fileList`、`fileCount`、`totalLines`、`maxFileLines`、`largeFiles`、`projectInfo`，写入 `stage1-context.json`。

按 `references/strategies/orchestrator-rules.md > 子任务完成摘要` 格式打印摘要。

**条件规则加载**（此时已有文件列表，可精确判断）：

- 检查认证风险信号（Controller/Handler/路由定义、权限检查）
- 如果触发：Read `resource/logic-audit-rules/authentication-bypass.yaml`
- 检查自定义规则：`resource/custom/*.yaml`
- 将已加载的规则写入 `stage1-context.json` 的 `auditRules` 字段

**按技术栈加载框架安全知识**（Ref: `references/strategies/orchestrator-rules.md > 按技术栈加载框架安全知识`）：基于 projectInfo 中的 framework 信息加载对应知识文件。

**分级决策**（Ref: `references/strategies/scan-level-strategy.md`）：

根据 `fileCount`（文件数量）+ `totalLines`（总行数修正）+ 用户参数，复合判定扫描级别：

> 完整的判定逻辑（含复合修正、用户覆盖、级别播报格式）参见 `references/strategies/scan-level-strategy.md > 级别判定逻辑`。

按级别分流执行：
- Light → 跳转到「Light 模式分支」
- Standard → 跳转到「Standard 模式分支」
- Deep → 继续执行 1.4（当前流水线）

### 1.4 并行启动 quick-scan + recon-deep（Deep 模式）

**关键优化**：recon-lite 完成后，**同时并行启动**：

- **quick-scan** -- 仅需 fileList 即可工作（max_turns=30）
- **recon-deep** -- 完成端点矩阵、攻击面等深度侦察（max_turns=18）

```
recon-lite 完成 → quick-scan (并行)
               → recon-deep (并行)
```

### 1.5 探索检查点

> Ref: `references/strategies/orchestrator-rules.md > 检查点逻辑 > 探索检查点`

在 recon-deep 完成后执行探索检查点。

---

## 阶段 2：扫描 + 流式验证（并行）（Deep 模式）

### 2.1 等待 recon-deep + 写入完整 stage1-context

按 `references/strategies/orchestrator-rules.md > 等待期轮询协议` 轮询 recon-deep 状态。当完成条件满足后，从 `agents/recon-deep.json` 中读取关键指标，追加到 `stage1-context.json`：`entryPoints`、`endpointPermissionMatrix`、`attackSurfaceMapping`、`cloudServices`、`dependencies`。

### 2.2 启动 deep-scan

recon-deep 完成后，通过 Task 工具后台模式启动：

- **deep-scan** -- LSP 语义数据流追踪（max_turns=35）

> 注意：此时 quick-scan 已在运行中（1.4 启动），deep-scan 与 quick-scan 并行。

### 2.3 启动流式 verification（关键优化）

**不等待 Stage 2 全部完成**。在 deep-scan 启动后，立即启动：

- **verification（流式模式）** -- 流式验证 findings，边扫描边验证（max_turns=30）

提示词中注入流式模式指令：
```
[消费模式] streaming
[上游输出] agents/deep-scan.json, agents/quick-scan.json（增量轮询）
[去重规则] file+lineNumber+riskType 三元组；重复取 deep-scan 版本
```

### 2.4 等待 quick-scan 完成

按 `references/strategies/orchestrator-rules.md > 等待期轮询协议` 轮询 quick-scan 状态。完成条件满足后打印摘要。

### 2.5 等待 deep-scan 完成

按 `references/strategies/orchestrator-rules.md > 等待期轮询协议` 轮询 deep-scan 状态。完成条件满足后打印摘要。

### 2.6 等待 verification 完成

按 `references/strategies/orchestrator-rules.md > 等待期轮询协议` 轮询 verification 状态。verification 在检测到上游 agent 全部完成后，会自动执行全局审计质量评估并结束。完成条件满足后打印摘要。

### 2.7 校验阶段 2 产物完整性（强制）

> Ref: `references/strategies/orchestrator-rules.md > 检查点逻辑 > 阶段 2 产物完整性检查`

在进入合并前，必须先确认 `quick-scan`、`deep-scan`、`verification` 已实际写出产物文件，且 `status` 为 `completed` 或 `partial`：

```bash
python3 "scripts/checkpoint_verify.py" verify-artifacts \
  --batch-dir security-scan-output/{batch} \
  --agents quick-scan,deep-scan,verification
```

处理规则：
- `status: "ok"`：继续 2.8
- `status: "fail"`：仅允许重试缺失/损坏的 agent **1 次**
- 重试后仍失败：终止本批次，禁止编排器手工接管扫描或直接拼装结果

### 2.8 合并扫描结果

> Ref: `references/strategies/orchestrator-rules.md > 检查点逻辑 > 扫描合并`

```bash
python3 "scripts/merge_findings.py" merge-scan \
  --batch-dir security-scan-output/{batch}
```

### 2.9 漏洞链检测

合并后，分析 `merged-scan.json` 中的跨文件漏洞链：

- 识别多文件攻击路径
- 将同一路径的发现关联为 `vulnerabilityChain` 条目
- 提升严重级别
- 将链数据写入 `merged-scan.json` 的 `chains` 字段

### 2.9.5 覆盖率评估 + 补漏调度（可选）

> Ref: `references/strategies/orchestrator-rules.md > 覆盖率评估与补漏调度`

### 2.10 合并验证结果

```bash
python3 "scripts/merge_findings.py" merge-verify \
  --batch-dir security-scan-output/{batch}
```

仅解析 stdout JSON。

### 2.11 扫描检查点

> Ref: `references/strategies/orchestrator-rules.md > 检查点逻辑 > 扫描检查点`

### 2.12 跨仓库来源关联

> Ref: `references/strategies/orchestrator-rules.md > 检查点逻辑 > 跨仓库源关联`

---

## 阶段 3：修复（所有模式共享）

### 3.1 内联修复（编排器直接执行）

> **不启动独立 Agent**。修复逻辑足够轻量，在编排器上下文内直接执行。

**修复资格**：`ahAction=pass` 且 `RiskConfidence>=90` 且 `challengeVerdict` 为（confirmed 或 escalated）。

**执行步骤**：

1. 从验证产物中提取符合资格的 findings 列表（Deep 模式读取 `agents/verification.json`；Standard 模式同；Light 模式读取 `agents/light-scan.json`），仅读取 `findingId`、`RiskConfidence`、`verificationStatus`、`challengeVerdict`、`ahAction` 字段
2. 对每个符合资格的 finding：
   - Read Sink 所在文件的漏洞上下文（目标行号 ±20 行）
   - Read Source 所在文件（理解数据入口）
   - Grep 项目中已有的安全组件（sanitizer、validator、encoder）
   - 按修复优先级选择修复层级（Sink 层 > 中间层 > Source 层 > 架构层）
   - 生成 `originalCode`（从 Read 逐字提取）和 `fixedCode`
3. 写入 `agents/remediation.json`

**修复原则**（与原 remediation agent 一致）：
- 复用优先——使用项目已有的安全组件
- 风格一致——匹配项目代码风格
- 最小变更——仅修改必要代码行
- 业务无损——不破坏业务逻辑
- 编译即通——包含所有必要 import
- 可逆安全——复杂修复拆分为独立步骤

**上下文控制**：内联修复的 Read 调用遵循 context-budget-contract.md 的 Read 规范（offset+limit，每文件最多 3 次）。如果待修复 findings 超过 10 个，仅修复 Top-10（按 RiskLevel 和 RiskConfidence 排序）。

### 3.2 报告生成

调用 `generate_report.py` 生成 HTML 报告。切勿手动生成 HTML。

```bash
python3 "scripts/generate_report.py" \
  --input security-scan-output/"$audit_batch_id" \
  --audit-batch-id "$audit_batch_id" \
  --format html \
  --output security-scan-output/"$audit_batch_id"/security-scan-report.html
```

### 3.3 输出与报告

> Ref: `references/strategies/post-audit-workflow.md` for report upload, summary template, user interaction
> Ref: `references/contracts/output-schemas.md` for JSON output format

项目特有的附加内容：

```
扫描范围：{total_files} 个文件
```

### 3.4 执行用户选择

> Ref: `references/strategies/post-audit-workflow.md` > User Interaction

---

## 分级扫描分支

### Light 模式分支（≤ 15 文件）

当步骤 1.3 确定 `scanLevel = light` 时，跳过 1.4-1.5 和阶段 2 的 Deep 模式流水线，执行以下精简流水线：

#### L-阶段 1：标记完成

将 `stage1-context.json` 标记为完成（`scanLevel: "light"`）。文件枚举、技术栈识别、LSP 探活、条件规则加载均已在主线 1.1-1.3 中完成。

#### L-阶段 2：单 Agent 扫描（≈15-20t）

通过 Task 后台模式启动唯一的 Agent：

- **light-scan** -- 融合模式匹配 + LSP 追踪 + 内联验证（max_turns=25）

```
提示词注入：
[扫描级别] light
[源文件数] {fileCount}
[stage1-context] security-scan-output/{batch}/stage1-context.json
```

按 `references/strategies/orchestrator-rules.md > 等待期轮询协议` 轮询 light-scan 状态。完成后打印摘要。

#### L-阶段 2.5：合并验证结果

```bash
python3 "scripts/merge_findings.py" merge-verify \
  --batch-dir security-scan-output/{batch}
```

> Light 模式跳过 verify-artifacts（仅 1 个 Agent，无需校验多 Agent 产物完整性）和 merge-scan（light-scan 已内联去重）。

#### L-阶段 3：修复

跳转到「阶段 3：修复」，与 Deep 模式共享修复 + 报告 + 用户交互流程。

---

### Standard 模式分支（16-80 文件）

当步骤 1.3 确定 `scanLevel = standard` 时，跳过 1.4-1.5 的 Deep 模式流程，执行以下优化流水线：

#### S-阶段 1：编排器内联侦察（≈5-8t）

1.3 分级决策完成后，编排器内联执行 recon-deep 的精简版（不启动独立 recon-deep Agent）：

> 保留与跳过的功能对照表见 `references/strategies/scan-level-strategy.md > Standard 模式侦察内联化细节`。

执行步骤：
1. `LSP workspaceSymbol("Controller")` + `workspaceSymbol("Handler")` 枚举入口点
2. Grep 补充：`@Controller|@RestController|@app.route|router.(get|post)` 等
3. 读取安全配置文件（SecurityConfig / middleware），提取 URL 权限规则
4. 对入口类读取前 10 行，提取类级权限注解
5. 将 entryPoints + 精简版 endpointPermissionMatrix 写入 `stage1-context.json`

> 编排器执行这些不会污染上下文——仅读取配置文件和 LSP 元数据，不读取源码内容。

#### S-阶段 2：3 Agent 并行扫描（≈25-35t）

同时启动 3 个 Agent（通过 Task 后台模式）：

- **quick-scan** -- 模式匹配（max_turns=**15**，totalCalls 收尾阈值=**50**）
- **deep-scan** -- LSP 追踪（max_turns=**25**，totalCalls 收尾阈值=**90**）

```
提示词注入 deep-scan：
[扫描级别] standard
[子任务B范围] D3 + D9.1 + D9.2（精简版：D9.3 仅 Grep 标记，D9.4 仅已知反模式，跳过 D9.5/D9.6/D9.7）
```

等待 quick-scan 和 deep-scan **都完成**后，启动：

- **verification（批量模式）** -- 批量验证（max_turns=**18**，totalCalls 收尾阈值=**65**）

```
提示词注入 verification：
[消费模式] batch
[输入] merged-scan.json
[全局审计质量评估] 精简版
```

> Standard 模式使用**批量验证**而非流式验证——findings 数量通常 < 20，等扫描完再一次性验证更高效（省去轮询开销和去重）。

按 `references/strategies/orchestrator-rules.md > 等待期轮询协议` 分别轮询各 Agent 状态。

#### S-阶段 2.5：合并

```bash
# 校验产物完整性
python3 "scripts/checkpoint_verify.py" verify-artifacts \
  --batch-dir security-scan-output/{batch} \
  --agents quick-scan,deep-scan,verification

# 合并扫描结果
python3 "scripts/merge_findings.py" merge-scan \
  --batch-dir security-scan-output/{batch}

# 合并验证结果
python3 "scripts/merge_findings.py" merge-verify \
  --batch-dir security-scan-output/{batch}
```

#### S-阶段 3：修复

跳转到「阶段 3：修复」，与 Deep 模式共享修复 + 报告 + 用户交互流程。

---

## 调度器上下文控制

> Ref: references/strategies/orchestrator-rules.md

## Agent 团队概览与执行时间线

> Ref: ARCHITECTURE.md > Agent 目录、执行时间线对比

## 大型项目批量策略

> Ref: references/strategies/batch-strategy.md（仅 Deep 模式 > 80 文件时适用）
