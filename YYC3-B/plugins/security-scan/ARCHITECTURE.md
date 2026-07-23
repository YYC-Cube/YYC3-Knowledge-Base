# Security-Scan 插件架构文档

## 插件结构

```
security-scan/
├── .codebuddy-plugin/
│   └── plugin.json                    # 插件配置（名称、版本、功能声明、入口）
├── agents/                            # 7 个 agent 定义文件
│   ├── recon-lite.md                  # 轻量侦察：文件枚举、技术栈识别、代码行数统计（5 turns）
│   ├── recon-deep.md                  # 深度侦察：入口点枚举、端点矩阵、攻击面映射、依赖解析
│   ├── light-scan.md                  # 轻量扫描（Light 模式专用）：融合模式匹配 + LSP 追踪 + 内联验证
│   ├── quick-scan.md                  # 快速扫描：Grep 模式匹配、CVE 检测、配置基线扫描
│   ├── deep-scan.md                   # 深度扫描：核心决策规则（详细参考外置到 references/）
│   ├── verification.md                # 验证师：反幻觉 + 路径验证 + 红队挑战 + 流式验证 + 置信度评分
│   └── batch-worker.md                # 批次执行器：大项目分批并行调度
├── commands/                          # 命令定义
│   ├── project.md                     # /security-scan:project — 全项目安全审计（分级扫描）
│   └── diff.md                        # /security-scan:diff — Git 变更文件审计（含关联文件分析）
├── resource/                          # 安全规则与配置
│   ├── default-rules.yaml             # 核心审计逻辑索引 + 模式参考库
│   ├── risk-type-taxonomy.yaml        # 标准风险类型分类表（slug + 中文名称映射）
│   ├── rule-details/                  # 参考数据文件
│   │   ├── _index.yaml                # 规则文件索引（技术栈映射、行数、内联建议）
│   │   ├── ssrf.yaml                  # SSRF 绕过技术参考数据
│   │   ├── auth-basic.yaml            # 鉴权/越权基础检测模式
│   │   ├── spring-security.yaml       # Spring Security 配置模式
│   │   ├── mybatis-injection.yaml     # MyBatis 注入模式
│   │   ├── actuator-exposure.yaml     # Actuator 端点暴露模式
│   │   ├── nodejs-web.yaml            # Node.js Web 安全模式
│   │   ├── python-web.yaml            # Python Web 安全模式
│   │   └── go-web.yaml                # Go Web 安全模式
│   ├── anti-hallucination-rules.yaml  # 反幻觉规则与 Agent 合约条款
│   ├── logic-audit-rules/             # 业务逻辑缺陷审计规则
│   │   ├── authentication-bypass.yaml # 鉴权风险置信度评估与模式引用
│   │   ├── business-logic-rules.yaml  # 业务逻辑缺陷规则
│   │   └── payment-logic-rules.yaml   # 支付逻辑审计规则
│   ├── custom/                        # 用户自定义规则
│   │   ├── ignore-patterns.yaml       # 忽略模式配置
│   │   ├── sanitizers.yaml            # 净化函数配置
│   │   ├── sinks.yaml                 # 自定义 Sink 配置
│   │   └── sources.yaml               # 自定义 Source 配置
│   └── README-CONFIG-GUIDE.md         # 规则配置指南
├── scripts/                           # Python 脚本
│   ├── generate_report.py             # HTML 报告生成
│   ├── report_upload.py               # 审计结果上报
│   ├── merge_findings.py              # Findings 合并去重
│   ├── checkpoint_verify.py           # 检查点验证
│   ├── batch_files.py                 # 文件批处理
│   ├── context_budget.py              # 上下文预算追踪（估算剩余 token 容量）
│   └── extract_context.py             # 批量代码上下文提取（减少 Read 调用）
├── references/                        # 参考文档与合约（按类别分子目录）
│   ├── contracts/                     # [合约] 所有 Agent 必须遵守的硬性规则
│   │   ├── anti-hallucination-contract.md # 反幻觉合约
│   │   ├── incremental-write-contract.md  # 增量写入合约（所有 Agent 强制遵守）
│   │   ├── context-budget-contract.md     # 资源预算合约（上下文预算 + Turn 预算 + 收尾协议）
│   │   └── output-schemas.md              # 输出合约（JSON 格式、Agent 输出字段、输出目录结构）
│   ├── strategies/                    # [策略] 编排器执行的决策逻辑
│   │   ├── orchestrator-rules.md      # 编排器规则（调度、轮询、检查点、覆盖率）
│   │   ├── scan-level-strategy.md     # 分级扫描策略（阈值、参数、复合判定逻辑）
│   │   ├── batch-strategy.md          # 大型项目批量策略（Deep 模式 >80 文件）
│   │   └── post-audit-workflow.md     # 审计后工作流（上报、摘要、用户交互、修复）
│   └── guides/                        # [参考/模板] Agent 按需查阅的知识库
│       ├── deep-scan-detailed-rules.md    # 深度扫描完整决策树（按需 Read 对应章节）
│       ├── error-recovery-runbook.md      # 统一错误恢复手册（所有异常场景和降级路径）
│       ├── agent-prompt-template.md       # Agent Prompt 模板（含流式模式扩展）
│       └── lsp-setup.md                   # LSP 配置指南
├── ARCHITECTURE.md                    # 本文件
├── CHANGELOG.md                       # 更新日志
├── CONTRIBUTING.md                    # 贡献指南
└── README.md                          # 插件说明
```

---

## 架构概览

Security-Scan 采用**编排器驱动 + 多 Agent 对抗验证**架构。

```
/security-scan:project 或 :diff
         │
         ▼
┌──────────────────────┐
│  Orchestrator 编排器   │  加载规则 · LSP 探活 · 全局调度
└──────────┬───────────┘
           ▼
┌──────────────────────┐     ┌─────────────────────────┐
│  ① 侦察 Recon        │────→│  分级适配                 │
│  文件枚举 · 技术栈识别  │     │  按项目规模自动选择       │
│  攻击面映射            │     │  Light / Standard / Deep │
└──────────┬───────────┘     └─────────────────────────┘
           ▼
┌──────────────────────┐     ┌─────────────────────────┐
│  ② 扫描 Scan          │────→│  Grep + LSP 双引擎       │
│  quick-scan ┐ 并行     │     │  Grep 广覆盖 + LSP 精确  │
│  deep-scan  ┘          │     │  LSP 不可用自动降级       │
│  / light-scan (融合)   │     └─────────────────────────┘
└──────────┬───────────┘
           ▼
┌──────────────────────┐     ┌─────────────────────────┐
│  ③ 验证 Verify        │────→│  红蓝对抗 + 流式验证      │
│  反幻觉 · 路径验证     │     │  Scanner 高召回           │
│  红队挑战 · 置信度评分  │     │  Verifier 高精确          │
└──────────┬───────────┘     │  五维置信度门控            │
           │                 └─────────────────────────┘
           ▼
┌──────────────────────┐     ┌─────────────────────────┐
│  ④ 修复 Remediate     │────→│  自动修复 + 可扩展规则     │
│  修复代码 · HTML 报告  │     │  ≥0.9 自动修复            │
│  结果上报 · 用户交互   │     │  自定义 Source/Sink/净化   │
└──────────────────────┘     └─────────────────────────┘
```

**分级扫描策略**——侦察后按文件数 + 代码行数复合指标自动选择：

| 级别 | 触发条件 | Agent 组合 | 耗时 |
|:----:|---------|-----------|:----:|
| Light | ≤ 15 文件 | light-scan（融合扫描+验证） | ~20t |
| Standard | 16-80 文件 | quick-scan + deep-scan + verification（批量） | ~45t |
| Deep | > 80 文件 | recon-deep + quick-scan + deep-scan + verification（流式） | ~68-100t |

> 文件少但代码量大时自动升级（≤15 文件 / >2000 行 → Standard，≤80 文件 / >15000 行 → Deep）。详见 `references/strategies/scan-level-strategy.md`。

---

## Agent 目录

| # | Agent | 角色 | 阶段 | 关键能力 | 适用模式 |
|---|-------|------|:----:|---------|----------|
| 1 | recon-lite | 轻量侦察 — 文件枚举、技术栈识别、代码行数统计 | 1 | Glob + Bash（无 LSP） | Deep, Standard |
| 2 | recon-deep | 深度侦察 — 入口点、端点矩阵、攻击面、依赖 | 1 | LSP documentSymbol/workspaceSymbol + 依赖解析 | Deep（Standard 内联精简版） |
| 3 | light-scan | 轻量扫描 — 融合模式匹配 + LSP 追踪 + 内联验证 | 2 | Grep + LSP + 内联验证 | Light 专用 |
| 4 | quick-scan | 快速扫描 — Grep 模式匹配、CVE 检测、配置基线 | 2 | Grep 正则 + 版本号比对（无 LSP 依赖） | Deep, Standard |
| 5 | deep-scan | 深度扫描 — LSP 语义数据流追踪、授权覆盖、业务逻辑 | 2 | LSP 全套操作 | Deep, Standard |
| 6 | verification | 验证师 — 五步对抗验证（代码存在性校验 → 攻击链验证 → 对抗审查 → 全局审计质量评估 → 置信度评分） | 2 | Glob/Read 事实校验 + LSP 路径验证 | Deep（流式）, Standard（批量） |
| +1 | batch-worker | 批次执行器 — 大项目分批并行调度 | 2 | 独立上下文窗口 | Deep（>80 文件分批） |
| — | remediation | **内联执行** — 修复代码生成 + HTML 报告 | 3 | Edit + generate_report.py | 所有模式 |

---

## 数据流

```
阶段 1（侦察）                       阶段 2（扫描 + 验证）                  阶段 3（修复）
──────────                           ────────────────                      ──────────

recon-lite ──→ recon-lite.json
                    │
                    ↓
              stage1-context.json ─────────────────────────────┐
              (fileList, projectInfo,                          │
               totalLines, scanLevel)                         │
                    │                                         │
          ┌────────┤ [Deep/Standard]                          │
          │        │                                          │
recon-deep│  ──→ stage1-context.json                          │
 [Deep]   │    (追加 entryPoints, matrix,                     │
 或       │     attackSurface, deps)                          │
编排器内联│                                                    │
 [Standard]        │                                          │
          └────────┤                                          │
                   │                                          │
        ┌──────────┼──────────┐                               │
        │          │          │                               │
        ↓          ↓          ↓                               │
  quick-scan   deep-scan   light-scan                         │
  [Deep/Std]   [Deep/Std]  [Light]                            │
        │          │          │                               │
        ↓          ↓          │                               │
  quick-scan   deep-scan     │                               │
    .json        .json       │                               │
        │          │         │                               │
        │          │    light-scan.json                       │
        │          │    (findings +                           │
        │          │     validatedFindings)                   │
        │          │         │                               │
        ↓          ↓         │                               │
  pattern-scan-results.json  │                               │
  (sinkLocations,            │                               │
   defenseIndicators)        │                               │
        │          │         │                               │
        └────┬─────┘         │                               │
             ↓               │                               │
     [merge] merged-scan.json│                               │
             │               │                               │
             ↓               │                               │
      verification           │                               │
      [Deep: 流式]            │                               │
      [Standard: 批量]        │                               │
             │               │                               │
             ↓               │                               │
      verification.json      │                               │
             │               │                               │
             └───────┬───────┘                               │
                     ↓                                       │
           [merge] finding-{risk-type-slug}.json             │
                   summary.json                              │
                     │                                       │
                     ↓                                       │
           编排器内联修复 → remediation.json ←────────────────┘
                     │
                     ↓
            generate_report.py → HTML 报告
            report_upload.py → 结果上报
```

**说明**：
- 编排器在阶段 1 结束后根据 `scanLevel`（由文件数 + 总代码行数复合判定）选择分支
- **Light 分支**（≤15 文件）：light-scan 融合扫描+验证，跳过 merge 和独立 verification
- **Standard/Deep 分支**（>15 文件）：quick-scan + deep-scan 并行，再由 verification 验证
- 所有分支最终汇聚到 `finding-*.json` + `summary.json`，由编排器内联执行修复和报告

**核心中间文件**：
- `stage1-context.json` — 阶段 1 上下文汇总（文件列表、项目结构、入口点矩阵、依赖、规则、分级参数）
- `pattern-scan-results.json` — 模式扫描结果（sinkLocations、defenseIndicators、cveFindings）
- `merged-scan.json` — 阶段 2 合并去重后的发现（Standard/Deep 模式）
- `light-scan.json` — Light 模式融合输出（findings + validatedFindings）
- `agents/{agent-name}.json` — 各 agent 详细输出
- `finding-{risk-type-slug}.json` — 最终审计结果（按风险类型命名）
- `summary.json` — 审计摘要（含执行指标）

---

## 验证策略

### Deep 模式：流式验证 Pipeline

核心优化：verification 不再等待 Stage 2 全部完成，而是**流式验证**：

```
deep-scan:    [finding-1] [finding-2] [finding-3] ... [finding-N] [completed]
                  ↓            ↓            ↓                         ↓
verification: [PhaseA-1] [PhaseA-2] [PhaseA-3]                  [Phase-D/E]
              [PhaseB-1] [PhaseB-2] [PhaseB-3]
              [PhaseC-1] [PhaseC-2] [PhaseC-3]
              [PhaseE-1] [PhaseE-2] [PhaseE-3]
```

**轮询协议**：

1. verification 启动后轮询 `agents/deep-scan.json` 和 `agents/quick-scan.json`
2. 记录 `lastProcessedIndex`，每轮处理新增 findings
3. 按 `file+lineNumber+riskType` 三元组去重
4. 上游 agent 状态变为 completed/partial 后，执行全局审计质量评估

**收益**：

- **消除串行瓶颈**：deep-scan 的 35 turns 中，verification 重叠执行约 18 turns
- **早期发现误报**：高置信度 findings 在 deep-scan 完成前就已验证
- **容错**：即使 deep-scan 因上下文耗尽提前终止，已产出的 findings 已被验证

### Standard 模式：批量验证

等待 quick-scan 和 deep-scan **都完成**后，一次性批量验证所有 findings：

- findings 数量通常 < 20，流式轮询开销不值得
- max_turns=18，totalCalls 收尾阈值=65
- 全局审计质量评估采用精简版（覆盖率评估简化）

### Light 模式：内联验证

light-scan 在扫描过程中**内联执行**代码存在性校验和置信度评分：

- 无独立 verification Agent
- 每个 finding 发现后立即执行代码存在性校验 + 置信度评分
- 攻击链验证和对抗审查融入扫描流程，不单独执行
- 输出 `validatedFindings[]` 与 `findings[]` 在同一个 `light-scan.json` 中

---

## 置信度评分体系

置信度（0-100）由三个独立维度累加计算：

| 维度 | 满分 | 评估内容 |
|------|:----:|---------|
| 攻击链可达性 | 40 | Source→Sink 完整性、LSP 追踪确认、入口可达性 |
| 防御措施 | 30 | 防御有效性（无防御=高分，有效防御=低分） |
| 数据源可控性 | 30 | 攻击者对输入数据的控制程度 |

**高置信度门控（≥90）**需同时满足 7 项条件（验证通过、链路完整、防御搜索记录等），任一未通过则上限 89。

| 等级 | 范围 | 操作 |
|------|------|------|
| 高 | >= 90 | 可自动修复 |
| 中 | 60-89 | 需人工审核 |
| 低 | < 60 | 仅供参考 |

详细评分逻辑参见 `agents/verification.md > 步骤五：置信度评分`。详见 `references/strategies/scan-level-strategy.md`。

---

## 执行时间线对比

**Deep 模式（> 80 文件）：**
```
|recon-lite(5t)|                                                              |
|LSP探活(并行) |                                                              |
               |---- quick-scan (30t) ------|                                 |
               |-- recon-deep (18t) --|                                       |
                                      |---- deep-scan (35t) ----|             |
                              |---- verification(流式, 30t) ----|             |
                                                                 |内联修复+报告|
                                                                              
关键路径 ≈ 5 + 18 + 35 + 10 = 68 turns（验证与扫描重叠 ~18t）
```

**Standard 模式（16-80 文件）：**
```
|recon-lite(5t)|                                                   |
|LSP探活(并行) |                                                   |
               |内联侦察(5-8t)|                                    |
                              |-- quick-scan (15t) --|             |
                              |-- deep-scan (25t) ---|             |
                                                      |verify(18t)|
                                                                   |修复+报告|

关键路径 ≈ 5 + 8 + 25 + 18 + 8 = ~45 turns（约 35-47% 提速）
```

**Light 模式（≤ 15 文件）：**
```
|recon-lite(5t)|                        |
|LSP探活(并行) |                        |
               |light-scan (15-20t)   |
                                        |修复+报告|

关键路径 ≈ 5 + 20 + 5 = ~20 turns（约 70% 提速）
```

---

## 文件交叉引用

> 类别说明：**合约** = 所有 Agent 必须遵守的硬性规则；**策略** = 编排器执行的决策逻辑；**参考** = Agent 按需查阅的知识库；**模板** = 可复用的格式定义。
>
> 加载频率：**Always** = 每次审计必定 Read；**Conditional** = 条件触发 Read；**Rare** = 极少 Read。

| 定义层 | 文件 | 类别 | 加载频率 | 作用 |
|--------|------|:----:|:-------:|------|
| Agent 定义 | `agents/{name}.md` | — | Always | agent 的角色、工具、核心决策规则 |
| Agent 详细参考 | `references/guides/deep-scan-detailed-rules.md` | 参考 | Conditional | deep-scan 的完整决策树和边缘场景（按需 Read 对应章节） |
| 编排流程 | `references/strategies/orchestrator-rules.md` | 策略 | Always | agent 间调度规则、进度输出、等待期轮询协议 |
| 输出合约 | `references/contracts/output-schemas.md` | 合约 | Always | JSON 输出格式、Agent 输出字段、输出目录结构 |
| 反幻觉合约 | `references/contracts/anti-hallucination-contract.md` | 合约 | Always | 反幻觉规则摘要（完整规则在 resource/） |
| 增量写入合约 | `references/contracts/incremental-write-contract.md` | 合约 | Always | 所有 Agent 强制遵守的增量写入规则 |
| 资源预算合约 | `references/contracts/context-budget-contract.md` | 合约 | Always | Read 规范、工具调用计数器、Turn 预算 |
| 分级策略 | `references/strategies/scan-level-strategy.md` | 策略 | Conditional | 扫描级别判定逻辑、阈值、参数差异（仅阶段 1 分级时） |
| 批量策略 | `references/strategies/batch-strategy.md` | 策略 | Conditional | 大型项目分批规则（仅 Deep 模式 >80 文件） |
| 审计后工作流 | `references/strategies/post-audit-workflow.md` | 策略 | Conditional | 上报、摘要模板、用户交互（仅阶段 3） |
| 错误恢复手册 | `references/guides/error-recovery-runbook.md` | 参考 | Conditional | 统一的异常场景和恢复策略汇总 |
| Agent 模板 | `references/guides/agent-prompt-template.md` | 模板 | Conditional | Agent 提示词模板（仅启动 Agent 时） |
| LSP 配置 | `references/guides/lsp-setup.md` | 参考 | Conditional | LSP 语言检测和安装指南（仅阶段 1 LSP 探活时） |
| 命令配置 | `commands/project.md` / `commands/diff.md` | — | Always | 各阶段的命令特定逻辑 |
| 风险类型分类 | `resource/risk-type-taxonomy.yaml` | 参考 | Conditional | 标准风险类型 slug 与中文名称映射 |
| 规则索引 | `resource/rule-details/_index.yaml` | 参考 | Conditional | 规则文件目录索引（一次 Read 精准选择） |
| 安全规则 | `resource/rule-details/*.yaml` | 参考 | Conditional | 框架安全知识（按技术栈条件加载） |
| 业务逻辑规则 | `resource/logic-audit-rules/*.yaml` | 参考 | Conditional | 鉴权/支付/业务逻辑缺陷检测模式 |
| 反幻觉规则 | `resource/anti-hallucination-rules.yaml` | 合约 | Conditional | agent 反幻觉条款完整定义（摘要注入，完整按需 Read） |

---

## 上下文控制机制

为防止上下文膨胀、数据丢失和不可预见的上下文耗尽，插件实施三层防御：

### 第一层：Read 约束（减少上下文输入）

- **禁止全文件 Read**：所有 agent 的 Read 调用必须使用 `offset` + `limit` 参数，按需读取
- **同文件去重**：同一文件在单次任务中最多 Read 3 次
- **大文件警戒**：超过 500 行的文件必须先用 LSP documentSymbol 定位后精确读取
- **批量上下文提取**：`scripts/extract_context.py` 支持一次性从 findings 中提取所有代码上下文，替代逐个 Read
- **LSP 结果复用**：同一方法的 LSP 调用结果在本次审计中有效，不重复调用

### 第二层：增量写入（防止数据丢失）

- **统一合约**：`references/contracts/incremental-write-contract.md` 定义所有 agent 必须遵守的增量写入规则
- **写入触发条件**：完成一个 finding、完成一个 Phase、累积超过 2000 tokens 未写入、连续 10 次工具调用未写入
- **恢复协议**：每个 agent 启动时检查已有输出文件，支持从 `lastCheckpoint` 断点恢复
- **紧急写入**：当上下文即将耗尽时，立即写入所有数据并设置 `status: "partial"`

### 第三层：预算感知（预测上下文容量）

- **预算追踪器**：`scripts/context_budget.py` 基于文件读取量、工具调用次数和 findings 进度估算已消耗 tokens
- **自动建议**：根据使用百分比返回 `continue`、`flush_and_continue`、`flush_and_stop`、`emergency_flush` 四级建议
- **工具调用计数器**：每个 agent 维护内部计数器，在关键阈值时触发对应行动
- **定期检查**：每完成 3 个 findings 或每 20 次工具调用后调用一次预算评估

---

## 关键设计决策

> 详见 `CONTRIBUTING.md > 设计决策记录`。此章节仅供人类开发者了解设计背景，不影响 Agent 执行。
