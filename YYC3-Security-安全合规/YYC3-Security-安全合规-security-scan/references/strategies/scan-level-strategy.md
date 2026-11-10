# 分级扫描策略（共享定义）

> 引用方：commands/project.md、commands/diff.md、references/strategies/orchestrator-rules.md

本文件统一定义：扫描级别判定逻辑、阈值、参数覆盖、级别间差异。

---

## 扫描级别定义

| 级别 | 适用场景 | 源文件数 | Agent 数量 | 预计耗时 | 核心特点 |
|------|---------|---------|-----------|---------|---------|
| **Light** | 微型项目 | <= 15 | 1（light-scan） | 约15-20t | 单 Agent 完成全部工作，消除 Agent 间通信开销 |
| **Standard** | 小型项目 | 16-80 | 3（quick-scan + deep-scan + verification） | 约35-45t | 保留双扫描互补，简化侦察和验证 |
| **Deep** | 中大型项目 | > 80 | 5-6（完整流水线） | 约68-100t | 当前架构不变，仅微调优化 |

## 级别判定逻辑

### 自动判定（默认）——复合指标

在编排器阶段 1 完成 recon-lite（或文件枚举）后，基于 `fileCount`（文件数量）为主轴，`totalLines`（总有效代码行数）为修正因子，`maxFileLines`（最大单文件行数）为预警信号，三维度复合判定：

```
fileCount  = stage1-context.json > fileCount（源文件总数，不含配置/依赖文件）
totalLines = stage1-context.json > totalLines（所有源文件的有效代码总行数）
maxFileLines = stage1-context.json > maxFileLines（最大单文件行数）

# 第一步：基于文件数量确定基准级别
if fileCount <= 15:
    baseLevel = "light"
elif fileCount <= 80:
    baseLevel = "standard"
else:
    baseLevel = "deep"

# 第二步：基于总行数修正——防止"文件少但代码量大"的降级风险
if baseLevel == "light" and totalLines > 2000:
    scanLevel = "standard"    # 文件少但代码量大，升级
    upgradeReason = "文件数量仅 {fileCount} 个，但总代码量达 {totalLines} 行，已升级扫描深度"
elif baseLevel == "standard" and totalLines > 15000:
    scanLevel = "deep"        # 文件中等但代码量巨大，升级
    upgradeReason = "文件数量 {fileCount} 个，但总代码量达 {totalLines} 行，已升级扫描深度"
else:
    scanLevel = baseLevel
    upgradeReason = null

# 第三步：标记大文件预警（不影响级别，影响扫描优先级）
largeFiles = [f for f in fileList if f.lines > 500]
if largeFiles:
    largeFileWarning = "发现 {len(largeFiles)} 个大文件（> 500 行），将优先进行深度分析"
else:
    largeFileWarning = null
```

### recon-lite 额外输出要求

recon-lite 在文件枚举阶段需额外统计并写入 `stage1-context.json`：

| 字段 | 说明 | 获取方式 |
|------|------|---------|
| `totalLines` | 所有源文件的总行数 | 枚举时批量 `wc -l`，零额外 turns 开销 |
| `maxFileLines` | 最大单文件行数 | 同上，取 max |
| `largeFiles` | 超过 500 行的文件列表（含路径和行数） | 同上，过滤 > 500 |

> 这些统计在 recon-lite 的 Glob 枚举阶段通过一次 `wc -l` 批量完成，不增加额外的 turns 开销。

### 用户覆盖（可选）

用户可通过参数显式指定扫描级别，覆盖自动判定（包括复合修正）：

```
/security-scan:project --scan-level light|standard|deep
```

- 不传参数时使用自动判定（含复合修正）
- 用户可对微型项目强制 `--scan-level deep` 进行深度扫描
- 用户可对大型项目选择 `--scan-level standard` 快速出结果
- 用户显式指定时，跳过复合修正逻辑，直接使用指定级别

### 级别确定后进度播报

```
[1/3] 侦查阶段：正在探索项目结构...
  [v] 探索完成：{n} 个源文件，{totalLines} 行代码，技术栈 {framework}
  扫描级别：{Light|Standard|Deep}（{轻量|标准|深度}模式）— {基于项目规模自动选择|用户指定}
     {如果是升级的情况：注意：{upgradeReason}}
     {如果存在大文件：提示：{largeFileWarning}}
     {如需深度扫描，请使用 --scan-level deep （仅 Light/Standard 时显示）}
```

---

## 各级别流水线对比

### Light 模式流水线

```
阶段 1（编排器内联，≈3-5t）        阶段 2（单 Agent，≈15-20t）      阶段 3（编排器内联，≈3-5t）
─────────────────────             ──────────────────────          ──────────────────────
├ 文件枚举（替代 recon-lite）       light-scan (25t)             ├ merge-verify
├ 技术栈识别                        ├ 模式匹配 (D1-D5)              ├ 内联修复
├ LSP 探活                          ├ LSP 数据流追踪                ├ 报告生成
├ 规则加载                          ├ 授权审计                      └ 用户交互
└ stage1-context.json               ├ 内联反幻觉验证
                                    └ 置信度评分
```

**跳过的 Agent**：recon-lite、recon-deep、quick-scan、deep-scan、verification（全部由 light-scan 替代）
**跳过的检查点**：verify-explore（无 recon-deep 产物）、verify-artifacts（仅 1 个 Agent）
**保留的脚本**：merge-verify（如有多个 finding 文件）、generate_report.py、report_upload.py

### Standard 模式流水线

```
阶段 1（编排器内联，≈7-11t）       阶段 2（3 Agent 并行，≈25-35t）    阶段 3（编排器内联）
─────────────────────             ──────────────────────────        ──────────────────
├ recon-lite 内联（2-3t）           quick-scan (15t) ─┐               ├ 合并扫描结果
├ recon-deep 内联精简（5-8t）       deep-scan (25t) ──┤               ├ 内联修复
├ LSP 探活                          verification ←────┘               ├ 报告生成
├ 规则加载                          （批量模式, 18t）                  └ 用户交互
└ stage1-context.json
```

**跳过的 Agent**：recon-lite（内联）、recon-deep（内联精简版）
**保留的 Agent**：quick-scan（缩减到 15t）、deep-scan（缩减到 25t）、verification（批量模式 18t）
**保留的检查点**：verify-artifacts、merge-scan、merge-verify

### Deep 模式流水线

与当前架构完全相同。参见 `commands/project.md` 原有流水线。

**微调优化**：
- 分批阈值：≤80 不分批（Standard 模式已覆盖 16-80 范围）
- verification 流式模式：初始等待从最多 3 轮降到 2 轮；超时保护从连续 5 轮降到 3 轮

---

## 各级别 Agent 参数差异

### light-scan（仅 Light 模式）

| 参数 | 值 |
|------|---|
| max_turns | 25 |
| totalCalls 收尾阈值 | 85 |
| Turn 预留 | 最后 3 轮 |

### quick-scan 参数差异

| 参数 | Standard | Deep |
|------|----------|------|
| max_turns | 15 | 20 |
| totalCalls 收尾阈值 | 50 | 65 |

### deep-scan 参数差异

| 参数 | Standard | Deep |
|------|----------|------|
| max_turns | 25 | 35 |
| totalCalls 收尾阈值 | 90 | 130 |
| 子任务 B 范围 | D3 + D9.1 + D9.2（精简版） | D3 + D9 全量 |
| D9.3 竞态条件 | 仅 Grep 标记，跳过深入确认 | 完整 |
| D9.4 业务逻辑 | 仅"已知反模式匹配" | 完整（含入口点驱动推理） |
| D9.5 支付逻辑 | 跳过 | 按条件执行 |
| D9.6 云安全 | 跳过 | 按条件执行 |
| D9.7 潜在 0day | 跳过 | 按条件执行 |

### verification 参数差异

| 参数 | Standard（批量模式） | Deep（流式模式） |
|------|-------------------|----------------|
| max_turns | 18 | 30 |
| totalCalls 收尾阈值 | 65 | 100 |
| 模式 | 批量（等扫描完再验证） | 流式（边扫描边验证） |
| 全局审计质量评估 | 精简版 | 完整版 |

---

## Standard 模式侦察内联化细节

Standard 模式下，recon-lite 和 recon-deep 的功能由编排器内联执行：

### recon-lite 内联（≈2-3t）

与 Light 模式的编排器阶段 1 相同——Glob 枚举 + Grep 识别技术栈。

### recon-deep 内联精简版（≈5-8t）

| recon-deep 原有功能 | Standard 模式处理 |
|--------------------|------------------|
| 入口点枚举（LSP workspaceSymbol + Grep） | [Y] 保留——编排器直接执行 |
| 端点-权限矩阵（精简版） | [Y] 保留——仅类级注解 + 安全配置，跳过逐方法 hover |
| 攻击面映射（WebSocket/定时任务/MQ/RPC） | [N] 跳过 |
| 云服务检测（IMDS/云 SDK/存储桶） | [N] 跳过 |
| 完整依赖树解析 | [N] 跳过——保留依赖文件定位，CVE 由 quick-scan 处理 |

编排器执行这些操作不会污染其上下文——因为只读取配置文件和 LSP 元数据，不读取源码内容。

---

## 阈值选择依据

> 以下内容仅供人类开发者参考，Agent 执行时无需阅读。

阈值设定的核心依据是各级别 Agent 组合的实际分析能力（turns × 每 turn 分析量）与项目规模的匹配关系。Light 上限 15 文件（单 Agent 25t 的注意力上限）、Standard/Deep 分界 80 文件（3-Agent 不分批可覆盖的上限）、行数修正阈值（2000/15000）基于每 turn 可精读行数反推。详细论证参见 `CONTRIBUTING.md > 设计决策记录`。

---

## 质量保障：不分级的部分

以下机制在所有扫描级别中**保持不变**，确保质量底线：

- [Y] 反幻觉合约（`references/contracts/anti-hallucination-contract.md`）
- [Y] 增量写入合约（`references/contracts/incremental-write-contract.md`）
- [Y] Read 工具调用规范（offset + limit，同文件去重）
- [Y] 攻击链合约（source + propagation + sink + traceMethod）
- [Y] 置信度评分公式和高置信度门控（>= 90 全部 7 条件）
- [Y] 修复资格标准（ahAction=pass + RiskConfidence>=90 + challengeVerdict confirmed/escalated）
