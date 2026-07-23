---
description: 通过 agent 团队执行 Git diff 增量安全审计
argument-hint: [--commit <hash>] [--mode staged|unstaged|all]
allowed-tools: Bash, Read, Glob, Write, Grep, Task, Edit, LSP
---

# Git Diff 增量安全审计

> **[语言要求]** 所有面向用户的输出（进度提示、摘要、说明、错误信息）必须使用**简体中文**。Agent 提示词中的结构化标签保持中文。JSON 字段名和技术标识符（agent 名称、文件路径等）保持英文不变。

通过 agent 团队审计 git 变更。针对 diff 场景做了两项专项优化：**纯配置/依赖变更快速通道** + **变更影响范围扩展（关联文件分析）**。阶段 1-2 自动执行；用户交互仅在阶段 3 进行。

## 阶段 1：侦察

> 进度输出参见 `references/strategies/orchestrator-rules.md > 进度输出`

### 1.1 初始化 + 获取变更

```bash
audit_batch_id="diff-audit-$(date +%Y%m%d%H%M%S)"
mkdir -p security-scan-output/$audit_batch_id
```

**获取 git diff 文件列表**：

```bash
git diff <hash>^ <hash> --name-only --diff-filter=ACMR  # specific commit
git diff HEAD --name-only --diff-filter=ACMR              # --mode all (default)
git diff --cached --name-only --diff-filter=ACMR           # --mode staged
git diff --name-only --diff-filter=ACMR                    # --mode unstaged
git diff HEAD^ HEAD --name-only --diff-filter=ACMR         # fallback: clean tree
```

**空文件列表快速退出**：如果所有 diff 命令均返回空结果（无变更文件），立即终止并输出友好提示：

```
未检测到任何代码变更，无需执行安全扫描。

请确认：
  - 当前分支是否有未提交的修改（git status 查看）
  - 或指定具体 commit：/security-scan:diff --commit <hash>
  - 或切换模式：--mode staged / --mode unstaged
```

> 此路径不创建审计批次目录、不启动任何 agent，直接结束命令。

**对变更文件进行分类**：
- **依赖文件**（供应链审计）：`pom.xml`、`package.json`、`go.mod`、`requirements.txt` 等
- **配置文件**（配置基线）：`application.yml`、`.env`、`settings.py`、`config.json` 等
- **代码文件**（漏洞审计）：`.java`、`.kt`、`.py`、`.go`、`.js`、`.ts`、`.tsx`、`.php`、`.rb`、`.cs`、`.cpp`、`.c`、`.rs`、`.swift`、`.vue`
- **运维文件**（凭据扫描）：`Dockerfile`、`docker-compose.yml`、`.env`（非示例文件）

将分类后的 fileList 写入 `stage1-context.json`。

### 1.2 并行准备（与 1.1 的 git diff 同时进行）

在获取文件列表的同时，编排器并行执行：

- **语言检测 + LSP 探活 + 自动安装**（Ref: `references/guides/lsp-setup.md`）
  > 按统一探活流程执行：PATH 前置检查 → 插件状态检查 → 统一探活（3 轮，约 6s）→ 失败则自动安装 → 安装后验证 1 次。
  > 安装失败的恢复策略参见 `references/guides/error-recovery-runbook.md > 2.2.1`。
  > 阶段 1 中唯一的用户交互步骤（PATH 修复提示 / 自动安装提示）。
- **提取契约摘要**：从 anti-hallucination-rules.yaml 中提取 4 行契约核心，用于 agent 提示词注入（Ref: `references/contracts/anti-hallucination-contract.md`）

```
1.1 → git diff + 分类 + 写入 fileList
   → 1.2 LSP 探活/安装 + 契约提取 (并行)
```

### 1.3 决策分流（文件列表就绪后）

**条件规则加载**（此时已有文件列表，可精确判断）：

- 检查认证风险信号（Controller/Handler/路由定义、权限检查）
- 如果触发：Read `resource/logic-audit-rules/authentication-bypass.yaml`
- 检查自定义规则：`resource/custom/*.yaml`
- 将已加载的规则写入 `stage1-context.json` 的 `auditRules` 字段

**分流判断**：

```
hasCodeChanges = true?
  └─ true  → 完整 diff 流水线（含关联文件分析）→ 1.3a
  └─ false → 纯配置/依赖变更快速通道 → 1.3b
```

#### 1.3a 完整 diff 流水线（hasCodeChanges = true）

通过 Task 后台模式**同时并行**启动：
- **quick-scan** -- 对变更文件执行模式扫描
- **recon-deep** -- 对变更文件做入口点/端点分析 + **影响范围扩展**（见下方「变更影响范围扩展」）

**变更影响范围扩展（关联文件分析）**——diff 模式的核心差异化能力：

在 recon-deep 中增加**显式的影响范围分析**步骤，解决关联文件分析依赖隐式 LSP 行为的问题。

**执行策略**（在 recon-deep 的端点分析之后）：

```
对每个变更的代码文件：
  1. LSP findReferences → 找到所有直接引用该文件导出符号的文件
  2. LSP incomingCalls → 找到所有调用变更方法的上游文件（1 层）
  3. 将这些文件标记为 relatedFiles，写入 stage1-context.json

对 relatedFiles 的扫描策略（注入 deep-scan）：
  - 不做完整 D1-D9 扫描
  - 仅检查：变更方法的调用点上下文（±30 行）
  - 重点关注：权限检查、输入校验、数据流传递
  - 预算控制：关联文件分析不超过 deep-scan 总预算的 20%
```

**提示词注入 recon-deep**：
```
[影响范围分析] enabled
[变更文件] {changedCodeFiles}
[输出] stage1-context.json > relatedFiles[]
```

**提示词注入 deep-scan**：
```
[关联文件] stage1-context.json > relatedFiles[]
[关联文件扫描策略] focused（仅检查调用变更方法的上下文 ±30 行）
[关联文件预算上限] 20%
```

#### 1.3b 纯配置/依赖变更快速通道（hasCodeChanges = false）

当仅有配置/依赖文件变更时，启用精简流水线。**必须向用户输出快速通道通知**：

```
  [v] 探索完成：变更文件 {n} 个（均为配置/依赖文件，无代码变更）
  ⚡ 启用配置快速通道：仅执行密钥检测 + CVE 扫描 + 配置基线检查
```

通过 Task 后台模式启动：
- **quick-scan** -- 仅执行 D1（密钥）+ D2（CVE）+ D3（配置基线），跳过 D4（Sink 定位）和 D5（防御指标）

```
提示词注入 quick-scan：
[扫描范围] config-only
[跳过维度] D4, D5
[原因] 无代码变更，不需要 Sink 定位和防御指标
```

> **不启动** recon-deep 和 deep-scan（无代码变更时不需要端点分析和 LSP 追踪）。

快速通道的后续流程：跳转到「2.4 校验产物完整性」，仅校验 quick-scan → 合并 → 阶段 3。
verification 使用**批量模式（12t）**，仅执行代码存在性校验 + 置信度评分，跳过攻击链验证/对抗审查/全局审计质量评估。

### 1.4 等待 recon-deep + 加载框架知识（仅完整流水线）

按 `references/strategies/orchestrator-rules.md > 等待期轮询协议` 轮询 recon-deep 状态。完成条件满足后，追加数据到 `stage1-context.json`（含 `relatedFiles` 字段）。

**按技术栈加载框架安全知识**（Ref: `references/strategies/orchestrator-rules.md > 按技术栈加载框架安全知识`）：基于 recon-deep 产出的 projectInfo 中的 framework 信息加载对应知识文件。

### 1.5 探索检查点（仅完整流水线）

> Ref: `references/strategies/orchestrator-rules.md > 检查点逻辑 > 探索检查点`

在 recon-deep 完成后执行探索检查点。

### 并行时间线

**完整 diff 流水线（hasCodeChanges = true）：**
```
1.1 → git diff + fileList
   → 1.2 LSP 探活/安装 + 契约提取 (并行)
        → 1.3a quick-scan + recon-deep(含影响范围分析) (并行启动)
             → 1.4 等待 recon-deep + 加载框架知识
             → 1.5 探索检查点
```

**纯配置快速通道（hasCodeChanges = false）：**
```
1.1 → git diff + fileList
   → 1.2 LSP 探活/安装 + 契约提取 (并行)
        → 1.3b quick-scan(D1+D2+D3 only)
             → 等待 quick-scan → 2.4 校验 → 2.5 合并 → verification(批量, 12t) → 阶段 3
```

## 阶段 2：扫描 + 流式验证

> 进度输出参见 `references/strategies/orchestrator-rules.md > 进度输出`

### 2.1 启动 deep-scan（在 recon-deep 完成后）

通过 Task 后台模式启动：
- **deep-scan** -- 仅在 `hasCodeChanges = true` 时启动

### 2.2 启动流式 verification

**不等待 Stage 2 全部完成**。在 deep-scan 启动后，立即启动：
- **verification（流式模式）** -- 流式验证 findings

### 2.3 等待全部完成

按 `references/strategies/orchestrator-rules.md > 等待期轮询协议` 分别轮询 quick-scan、deep-scan（如已启动）、verification（如已启动）的状态。各 agent 完成条件满足后打印摘要。

### 2.4 校验阶段 2 产物完整性（强制）

在进入合并前，必须先确认实际需要的 agent 已完成落盘：

- `hasCodeChanges = true`：

```bash
python3 "scripts/checkpoint_verify.py" verify-artifacts \
  --batch-dir security-scan-output/{batch} \
  --agents quick-scan,deep-scan,verification
```

- `hasCodeChanges = false`：

```bash
python3 "scripts/checkpoint_verify.py" verify-artifacts \
  --batch-dir security-scan-output/{batch} \
  --agents quick-scan
```

处理规则：
- `status: "ok"`：继续 2.5
- `status: "fail"`：仅允许重试缺失 agent 1 次
- 重试后仍失败：终止本批次，禁止编排器手工补扫

### 2.5 合并扫描结果

```bash
python3 "scripts/merge_findings.py" merge-scan \
  --batch-dir security-scan-output/{batch}
```

### 2.6 合并验证结果

```bash
python3 "scripts/merge_findings.py" merge-verify \
  --batch-dir security-scan-output/{batch}
```

### 2.7 扫描检查点（Ref: `references/strategies/orchestrator-rules.md > 检查点逻辑`）

### 2.8 跨仓库检查（Ref: `references/strategies/orchestrator-rules.md > 检查点逻辑`）

## 阶段 3：内联修复 + 报告

### 3.1 内联修复

> **不启动独立 Agent**。编排器直接执行修复逻辑。

修复资格：`ahAction=pass` 且 `RiskConfidence>=90` 且 `challengeVerdict` 为 confirmed/escalated。

对每个符合资格的 finding：
1. Read 漏洞上下文（Sink ±20 行）
2. Grep 项目安全组件
3. 生成 originalCode + fixedCode
4. 写入 `agents/remediation.json`

### 3.2 报告生成

```bash
python3 "scripts/generate_report.py" \
  --input security-scan-output/"$audit_batch_id" \
  --audit-batch-id "$audit_batch_id" \
  --format html \
  --output security-scan-output/"$audit_batch_id"/security-scan-report.html
```

### 3.3 输出报告

> Ref: `references/strategies/post-audit-workflow.md` > Audit Summary Template, Report Upload

Diff 特有内容：
- 范围：`Changed files: {n}`
- 批次前缀：`diff-audit-`

### 3.4 执行用户选择
> Ref: `references/strategies/post-audit-workflow.md` > User Interaction

## Agent 团队概览

### 完整 diff 流水线（hasCodeChanges = true）

```
diff command (up to 4 agents)
  阶段 1: quick-scan + recon-deep(含影响范围分析) 并行
  阶段 2: deep-scan(含关联文件聚焦分析) + verification(流式) 并行
  阶段 3: 内联 remediation + 报告 + 用户交互
```

### 纯配置/依赖快速通道（hasCodeChanges = false）

```
diff command (1-2 agents)
  阶段 1: quick-scan(D1+D2+D3 only)
  阶段 2: verification(批量, 12t, 仅代码存在性校验+置信度评分)
  阶段 3: 内联 remediation + 报告 + 用户交互

  预计耗时：≈10-12t（比完整流水线 35-55t 提速 ≈70-80%）
```

## 调度器上下文控制

> Ref: `references/strategies/orchestrator-rules.md`

## 注意事项

- 必须在 git 仓库中运行
- 依赖文件变更会触发 quick-scan CVE 检测（D2）
- 配置基线仅在配置文件变更时触发
- 所有 agent 使用 Task 后台模式
- 模式扫描与语义分析并发执行
- 规则按需 Read，不批量注入到提示词中
- diff 模式无需 recon-lite（文件列表来自 git diff）
- `hasCodeChanges = false` 时跳过 D4/D5/recon-deep/deep-scan，启用快速通道
- `hasCodeChanges = true` 时通过影响范围分析显式扩展扫描范围到关联文件
