# 输出合约与 Agent 输出模式

> 引用方：所有 agent、commands/project.md、commands/diff.md

本文件统一定义：风险发现 JSON 格式、各 Agent 输出字段、输出目录结构。

## 前置条件

脚本和资源文件使用相对路径引用（`scripts/`、`resource/`、`references/`），相对于插件根目录。

---

## 风险发现 JSON 输出格式

风险发现按**风险类型**拆分，每种类型一个文件：`finding-{risk-type-slug}.json`（slug：小写、连字符分隔）。

### 标准风险类型表

> Ref: `resource/risk-type-taxonomy.yaml`（完整的风险类型分类、slug 映射和扩展规则）

Agent 按需 Read 该文件获取标准 slug 和中文名称映射。**此表并非穷举**——agent 应基于实际代码发现风险，而非仅匹配表中的类别。对于未列出的风险类型，agent 应自行创建 slug（小写、连字符分隔）并附上中文分类注释。不得因类型不在表中而忽略真实风险。

创建文件时必须输出中文说明：
```
 finding-sql-injection.json -- 漏洞安全审计 -- SQL 注入（2 个风险）
 finding-hardcoded-secret.json -- 密钥安全审计 -- 硬编码凭证（1 个风险）
 finding-endpoint-exposure.json -- 配置不当安全审计 -- 敏感端点暴露（2 个风险）
```

### 风险发现 JSON 结构

```json
{
  "metadata": {
    "requestId": "(optional)",
    "fileName": "src/dao/UserDao.java",
    "timestamp": "ISO 8601",
    "version": "1.0",
    "auditBatchId": "{command}-audit-{timestamp}"
  },
  "summary": {
    "totalIssues": 2,
    "criticalRisk": 0, "highRisk": 1, "mediumRisk": 1, "lowRisk": 0
  },
  "StatInfo": { "RiskNum": 2 },
  "RiskList": [
    {
      "FilePath": "src/dao/UserDao.java",
      "RiskType": "SQL 注入",
      "RiskLevel": "critical",
      "LineNumber": 45,
      "RiskCode": "String sql = \"SELECT * FROM users WHERE id = \" + userId;",
      "RiskConfidence": 95,
      "RiskDetail": "...",
      "Suggestions": "...",
      "FixedCode": "...",
      "auditedBy": ["deep-scan", "verification"],
      "verificationStatus": "verified",
      "chainAnalysis": { "isChainCandidate": true, "chainType": "source-to-sink", "chainComponents": ["..."], "combinedImpact": "..." },
      "verifiability": { "reproducible": true, "verificationMethod": "LSP-trace", "evidenceStrength": "high", "manualVerificationNeeded": false }
    }
  ]
}
```

### RiskType 约束

**优先使用标准风险类型表中的中文简称。** 当发现的风险不属于任何已有类型时，允许创建新的 RiskType（中文简称）和对应 slug。标准 RiskType 与 slug 的映射关系见 `resource/risk-type-taxonomy.yaml`。

> **扩展规则**：发现新类型时，自行创建 `{中文简称}` + `{slug}` 并写入对应 `finding-{slug}.json`。不得因类型未预定义而丢弃真实风险。同一 `finding-{slug}.json` 中的所有条目 RiskType 必须一致。

### summary.json

在所有风险发现文件生成完毕后生成：

```json
{
  "batchId": "audit-batch-id",
  "command": "project | diff",
  "totalFindings": 11,
  "criticalRisk": 1, "highRisk": 3, "mediumRisk": 5, "lowRisk": 2,
  "executionMetrics": {
    "lspStatus": "active | unavailable",
    "auditMode": "full | incremental | batched",
    "totalAgents": 4,
    "agentDurations": {
      "recon-lite": "3s",
      "recon-deep": "10s",
      "quick-scan": "15s",
      "deep-scan": "45s",
      "verification": "35s"
    },
    "totalDuration": "120s",
    "patternScanFindingsCount": 5,
    "semanticAnalysisFindingsCount": 8,
    "deduplicatedCount": 2,
    "antiHallucinationGateRejected": 0
  },
  "crossRepoDependencies": [
    {
      "fromFile": "src/service/PaymentService.java",
      "fromLine": 45,
      "toModule": "com.example:payment-sdk:2.3.0",
      "reason": "...",
      "recommendation": "...",
      "status": "resolved | unresolved"
    }
  ],
  "crossRepoResolution": "full | partial | skipped | none"
}
```

> 即使 `totalFindings` 为 0，也必须生成 `summary.json`（RiskList 为空）并上报。

---

## 编排器职责

- 每个 agent 完成后，将其完整输出写入 `agents/{agent-name}.json`。
- 仅将所需字段传递给下游（通过提示注入或文件路径引用）。
- verification 的发现通过 `findingId` 引用上游发现，而非嵌入完整数据。

---

## Agent 输出字段定义

所有 agent 将详细输出写入 `security-scan-output/{batch}/agents/{agent-name}.json`。

## 公共必需字段

每个 agent 输出必须包含：`"agent": "{agent-name}"`（字符串）。

## 完整性标记（_integrity）

每个 agent 输出在**最终写入时**必须包含 `_integrity` 字段，用于编排器检测输出是否完整：

```json
{
  "agent": "deep-scan",
  "status": "completed",
  "_integrity": {
    "expectedFindingsCount": 8,
    "actualFindingsCount": 8,
    "allPhasesCompleted": true,
    "lastWriteTimestamp": "2026-03-05T10:30:00Z"
  }
}
```

| 字段 | 类型 | 描述 |
|------|------|------|
| expectedFindingsCount | number | Agent 预期产出的 findings 总数（基于 Sink 发现阶段的计数） |
| actualFindingsCount | number | 实际写入的 findings 数量 |
| allPhasesCompleted | boolean | 是否完成了所有分析阶段 |
| lastWriteTimestamp | string | 最后一次写入的时间戳 |

### 编排器完整性检查规则

Agent 完成后，编排器通过 `merge_findings.py` 的 stdout 获取完整性摘要，按以下规则处理：

| 条件 | 判定 | 操作 |
|------|------|------|
| `expectedFindingsCount != actualFindingsCount` | 部分完成 | 标记为 `partial`，使用已有数据继续 |
| `status == "in_progress"` | Agent 异常终止 | 使用已有数据继续后续阶段 |
| `allPhasesCompleted == false` | 未完成所有阶段 | 记录日志，使用已有数据继续 |
| 文件不存在或 JSON 解析失败 | Agent 完全失败 | 记录错误，跳过该 Agent 的输出 |

---

## recon-lite

| 字段 | 类型 | 必需 | 描述 |
|---|---|---|---|
| agent | string | Y | "recon-lite" |
| fileList | string[] | Y | 源文件路径列表 |
| fileCount | number | Y | 源文件总数 |
| totalLines | number | Y | 所有源文件的总行数（用于复合分级修正） |
| maxFileLines | number | Y | 最大单文件行数 |
| largeFiles | object[] | Y | 超过 500 行的文件列表（path + lines），无则为空数组 |
| projectInfo | object | Y | type, framework, buildTool |
| configFiles | string[] | Y | 配置文件列表 |
| dependencyFiles | string[] | Y | 依赖管理文件列表 |

## recon-deep

| 字段 | 类型 | 必需 | 描述 |
|---|---|---|---|
| agent | string | Y | "recon-deep" |
| entryPoints[] | array | Y | file, endpoints[] |
| endpointPermissionMatrix[] | array | Y | path, httpMethod, authRequired, permissionAnnotation?, ownershipCheck |
| securityConfig | object | Y | authExclusions 等 |
| attackSurfaceMapping | object | Y | HTTP 端点、文件上传、WebSocket、cron、MQ、RPC |
| cloudServices | object | N | provider, services, imdsAccess, sdkPatterns |
| dependencyAnalysis | object | Y | ecosystem, dependencies[], summary |

## quick-scan

| 字段 | 类型 | 必需 | 描述 |
|---|---|---|---|
| agent | string | Y | "quick-scan" |
| findings[] | array | Y | type, dimension, filePath, lineNumber, pattern, code, severity |
| sinkLocations[] | array | Y | sinkType, filePath, lineNumber, code, needsLSPTrace |
| defenseIndicators[] | array | Y | type, filePath, lineNumber |
| cveFindings[] | array | N | type("高危组件漏洞"), component, currentVersion, fixedVersion?, cve?, severity, dependencyFile, lineNumber, description, recommendation, source (enum: cve_table/knowledge_inference), reasoning? (当 source=knowledge_inference 时必需) |

## deep-scan

| 字段 | 类型 | 必需 | 描述 |
|---|---|---|---|
| agent | string | Y | "deep-scan" |
| findings[] | array | Y | FilePath, RiskType, RiskLevel, LineNumber, RiskCode, RiskDetail, attackChain, defenses, discoveryMethod? (enum: sink-driven/source-driven/cross-confirmed), confidenceCeiling?, confidenceCeilingReason? |
| findings[].attackChain | object | Y | source (string), propagation (string[]), sink (string), traceMethod (enum: LSP/Grep+Read/unknown) |
| crossRepoDependencies[] | array | N | fromFile, fromLine, toModule, breakPoint, reason, recommendation, status |
| chainAnalysis[] | array | N | chainId, findingIds, combinedPattern, individualSeverities, combinedSeverity, narrative, evidence[] |

### attackChain 模式合约

所有 `attackChain` 必须满足：source 非空，propagation 为数组，sink 非空，traceMethod 为 LSP/Grep+Read/unknown 之一。`merge_findings.py` 会验证此规则；不符合要求的发现会被标记为 `_chainIncomplete: true`，并在阶段 3 中强制重新追踪。

## light-scan（Light 模式专用）

> light-scan 的输出融合了 quick-scan + deep-scan + verification 的字段。`merge_findings.py` 和 `merge-verify` 均兼容此格式。

| 字段 | 类型 | 必需 | 描述 |
|---|---|---|---|
| agent | string | Y | "light-scan" |
| scanLevel | string | Y | "light" |
| findings[] | array | Y | 同 deep-scan 的 findings 格式（含 attackChain, defenses, discoveryMethod） |
| findings[].attackChain | object | Y | 同 deep-scan（source, propagation, sink, traceMethod） |
| sinkLocations[] | array | Y | 同 quick-scan（sinkType, filePath, lineNumber, code, needsLSPTrace） |
| defenseIndicators[] | array | Y | 同 quick-scan（type, filePath, lineNumber） |
| cveFindings[] | array | N | 同 quick-scan |
| crossRepoDependencies[] | array | N | 同 deep-scan |
| chainAnalysis[] | array | N | 同 deep-scan |
| validatedFindings[] | array | Y | 同 verification（findingId, antiHallucination{}, verification{}, confidence{}） |
| validatedFindings[].antiHallucination | object | Y | 同 verification |
| validatedFindings[].verification | object | Y* | 同 verification |
| validatedFindings[].confidence | object | Y* | 同 verification |
| validatedFindings[].verifiability | object | N | 同 verification（可选，Light 模式可省略） |
| summary | object | Y | totalFindings, bySeverity, antiHallucination{}, confidence{} |

> *Y = 当 ahAction != "remove" 时必需

## verification

| 字段 | 类型 | 必需 | 描述 |
|---|---|---|---|
| agent | string | Y | "verification" |
| validatedFindings[] | array | Y | findingId, antiHallucination{}, verification{}, confidence{}, verifiability{} |
| validatedFindings[].antiHallucination | object | Y | fileExists, lineValid, codeMatches, ahAction (pass/remove/downgrade), failureReason? |
| validatedFindings[].verification | object | Y* | verificationStatus, verificationDetail, reachability, traceMethod, reusedScanTrace, challengeVerdict, challengeDetail, defenseChecks[], exploitabilityAssessment, impactAssessment |
| validatedFindings[].confidence | object | Y* | RiskConfidence (0-100), confidenceBreakdown{attackChainScore,defenseScore,dataSourceScore}, highConfidenceGatePass, confidenceDetail |
| validatedFindings[].verifiability | object | N | attackPathNarrative, evidenceRefs[], defenseSearchRecord[], expectedImpact, verifiabilityLevel。**已降级为可选字段**：主要服务于人类审计师阅读报告时的可追溯性。自动化流水线中置信度评分才是驱动修复决策的数据。Light 模式可以省略此字段。 |
| qualityChallenge | object | Y | coverageRate, unscannedEndpoints[], blindSpots[], falseNegativeSuspects[], consistencyIssues[], qualityVerdict |
| summary | object | Y | totalReceived, antiHallucination{}, verification{}, challenge{}, confidence{} |

> *Y = 当 ahAction != "remove" 时必需

## remediation（编排器内联产出）

> 所有扫描模式（Light/Standard/Deep）共享相同的 remediation 输出格式。

| 字段 | 类型 | 必需 | 描述 |
|---|---|---|---|
| agent | string | Y | "remediation" |
| remediations[] | array | Y | 每个待修复发现的修复方案（单一最优方案） |
| remediations[].findingId | string | Y | 关联的发现 ID |
| remediations[].FilePath | string | Y | 漏洞文件路径 |
| remediations[].RiskType | string | Y | 风险类型 |
| remediations[].RiskLevel | string | Y | 风险级别 (critical/high) |
| remediations[].LineNumber | number | Y | 漏洞行号 |
| remediations[].RiskConfidence | number | Y | 置信度 (>=90) |
| remediations[].attackChainSummary | string | Y | 攻击链摘要（Source->...->Sink 一句话描述） |
| remediations[].fixLayer | string | Y | 修复层级 (sink/middle/source/architecture) |
| remediations[].strategy | string | Y | 修复策略描述 |
| remediations[].originalCode | string | Y | 原始代码（从 Read 输出逐字提取） |
| remediations[].fixedCode | string | Y | 修复后代码（可直接通过 Edit 应用） |
| remediations[].additionalImports | string[] | N | 需要新增的 import 语句 |
| remediations[].additionalDependencies | string[] | N | 需要新增的依赖（含版本号） |
| remediations[].explanation | string | Y | 修复原理说明 |
| remediations[].breakingRisk | string | Y | 兼容性风险 (none/low/medium/high) |
| remediations[].testSuggestions | string[] | Y | 修复后测试建议 |
| summary | object | Y | totalEligible, totalRemediated, byRiskLevel{} |
| reportPath | string | Y | 生成的 HTML 报告路径 |

---

## 输出目录结构

```
security-scan-output/{batch}/
  agents/
    recon-lite.json          # Deep/Standard 模式
    recon-deep.json           # Deep 模式（Standard 侦察内联化，无此文件）
    light-scan.json         # Light 模式专用
    quick-scan.json           # Standard/Deep 模式
    deep-scan.json            # Standard/Deep 模式
    verification.json         # Standard/Deep 模式
    remediation.json          # 编排器内联产出（所有模式）
  stage1-context.json
  pattern-scan-results.json   # 共享扫描结果（由 quick-scan 或 light-scan 写入）
  merged-scan.json            # merge_findings.py merge-scan 输出（Standard/Deep）
  finding-{slug}.json         # 按风险类型划分的最终结果
  summary.json                # 审计摘要
```
