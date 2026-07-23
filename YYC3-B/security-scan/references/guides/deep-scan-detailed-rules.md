# 深度扫描详细参考（按需查阅）

> 引用方：agents/deep-scan.md
>
> 本文件包含 deep-scan Agent 的完整决策树和边缘场景处理规则。正常情况下，`agents/deep-scan.md` 中的「必备决策规则」已覆盖 80% 的分析需求。在以下情况下 Read 本文件的对应章节：
> - 需要确认 Source-Driven 补盲的触发条件和执行策略
> - 需要跨仓库依赖检测规则
> - 需要置信度上限 / 链式分析规则
> - 分析第 10+ 个文件时，检查反隧道视野完整约束
> - 需要子任务 B 的完整决策树（D3 端点权限遍历、D9 各子项）
> - 需要确认预算分配表

---

## 步骤 0：Fast Exclusion 完整说明

在进入子任务 A 的 Sink 发现之前，批量 Grep 以下高消耗维度的关键标识符。**0-hit 的维度直接跳过**，不进入后续 LSP 追踪，大幅减少无效的 LSP 调用。

| 维度 | Grep 探针 | 0-hit 行为 |
|------|----------|-----------|
| 反序列化 | `ObjectInputStream\|readObject\|XMLDecoder\|pickle\|yaml.load` | SKIP 反序列化相关 Sink 追踪 |
| 模板注入 | `render_template_string\|Velocity.evaluate\|freemarker\|Thymeleaf` | SKIP SSTI 相关 Sink 追踪 |
| JNDI 注入 | `InitialContext\|\.lookup\(` | SKIP JNDI 相关 Sink 追踪 |
| 表达式注入 | `SpelExpressionParser\|Ognl.getValue\|ELProcessor` | SKIP EL 注入相关 Sink 追踪 |
| 命令执行 | `Runtime.exec\|ProcessBuilder\|os.system\|subprocess\|child_process\|exec.Command` | SKIP 命令注入相关 Sink 追踪 |
| 代码执行 | `eval\(\|exec\(\|new Function\(` | SKIP 代码执行相关 Sink 追踪 |

**保留规则**：以下高频维度**不参与 Fast Exclusion**，始终执行完整分析：
- SQL 注入（几乎所有 Web 项目都有数据库操作）
- XSS（几乎所有前端项目都有 DOM 操作）
- SSRF（网络请求普遍存在）
- 文件操作（文件读写普遍存在）
- 认证/授权（业务逻辑层面）

将排除结果记录到内部工作列表 `excludedDimensions[]`，在后续步骤中跳过已排除维度的 Sink。

---

## 子任务 A：漏洞审计 (D1/D4/D5/D6) 完整说明

### 安全推理原则

以攻击者视角分析代码，遵循以下原则：

1. **识别攻击者可控的输入** — 追踪所有外部输入（HTTP 参数、Header、文件上传、消息队列等）
2. **跟踪数据流向** — 追踪每个输入经过调用链到达危险操作（SQL 执行、命令执行、文件操作、网络请求、反序列化、HTML 渲染等）的完整路径
3. **评估每一道防御** — 评估净化器/校验器是否真正能阻止攻击（参数化查询有效、黑名单无效、自定义转义通常不完整）
4. **推理上下文** — 考虑框架行为、ORM 自动参数化、全局过滤器、中间件等隐式防御
5. **构造攻击场景** — 对每条无防御路径，构造具体 payload 并评估影响（RCE、数据泄露、权限提升）
6. **考虑间接流** — 数据可能通过数据库、缓存、消息队列间接传递（二阶注入）

> 漏洞类型由分析推理得出，不要枚举类型逐项检查。LSP 追踪方法根据具体场景灵活选择：`incomingCalls` 反向追踪调用者、`outgoingCalls` 正向确认调用链、`goToDefinition` 解析函数实现、`findReferences` 检查所有使用点。

### 推理优先原则（重要）

**推理驱动，知识辅助。** 框架安全知识文件（`resource/rule-details/*.yaml`）是参考资料，帮助识别特定框架的 Sink 和防御模式，但 Agent 的分析能力**不受限于知识文件中列出的风险类型**：

- **知识文件是线索来源，不是扫描清单** — 不逐条检查知识文件中的每个模式
- **推理发现优先** — 通过 LSP 数据流追踪和代码语义分析发现的任何安全问题，无论是否在知识文件中提及，均应正常创建 finding
- **按需参考** — 仅在分析对应框架代码时 Read 相关知识文件的章节，用于确认框架特有的防御/误报模式
- **Fast Exclusion 不限制推理** — 步骤 0 排除的维度仅指跳过该维度的 Grep Sink 发现，不影响 LSP 追踪中偶然发现的相关问题

**落地机制**：本原则通过两条路径实现——
1. **步骤 1（Sink-Driven）**：基于已知模式表匹配危险操作 → 覆盖已知风险（始终执行）
2. **步骤 1.5（Source-Driven）**：从入口点正向追踪数据流 → 发现模式表之外的未知风险（条件触发，低成本）

### 步骤 1：Sink 发现（双模式）

**模式 A -- 独立模式（默认）。** 当 quick-scan 的 `sinkLocations` 不可用时使用。

1. `LSP documentSymbol` -- 枚举目标文件中的方法，识别包含危险操作的方法。
2. `LSP workspaceSymbol` -- 搜索危险类/方法（`executeQuery`、`Runtime`、`ProcessBuilder`、`exec`、`ObjectInputStream` 等）。
3. `Grep` -- 模式匹配 Sink 签名（SQL 拼接、命令执行、反序列化、文件操作、SSRF 目标）。

将发现的 Sink 编入内部工作列表。

**模式 B -- 增强模式（可选）。** 当 quick-scan 提供了 `sinkLocations` 时：

- 合并到内部工作列表。
- 将两种模式都发现的 Sink 标记为交叉确认。
- 追加仅通过 `sinkLocations` 发现的 Sink。

> 原则：模式 A 是基线能力。agent 永远不会阻塞等待 `sinkLocations`。

### 步骤 1.5：Source-Driven 补盲扫描（条件触发）

> **目的**：步骤 1 基于预定义 Sink 模式匹配，对非典型危险操作存在盲区。本步骤从入口点正向追踪，**以最小成本**覆盖模式表外的高风险场景。

**触发条件**（满足 **任一** 即执行，否则跳过）：

| 条件 | 判断依据 | 理由 |
|------|---------|------|
| 存在无认证的敏感端点 | `endpointPermissionMatrix` 中有无 auth 的支付/管理/用户数据/文件操作端点 | 高攻击面 |
| 项目使用冷门框架/自定义协议 | 侦察识别出的框架不在知识文件列表中，或存在自定义序列化/RPC | Sink 表覆盖率低 |
| 步骤 1 Sink 命中率异常低 | 项目文件 ≥ 50 且步骤 1 发现 Sink < 3 个 | 疑似模式表不适配 |

**跳过时记录**：`"step1_5_skipped": true, "reason": "<具体原因>"`

**执行策略（轻量化）**：

预算上限 = 总工具调用预算的 **10%**（而非全量追踪）。

1. **精选 top-3 入口点**——从触发条件命中的端点中选取风险最高的 **3 个**（非 5-10 个），优先级：
   - 无认证 + 处理敏感数据 > 接收复杂输入 > 其他

2. **浅层正向追踪（≤ 2 层）**——对每个入口点：
   - `LSP outgoingCalls` 追踪 **仅 1-2 层**（Controller → Service，不递归到底层工具类）
   - `Read` 直达方法的核心逻辑段（跳过 getter/setter/日志），每个方法读取不超过 50 行
   - 用安全推理判断：用户输入是否到达非典型危险操作

3. **聚焦非典型风险**——仅关注步骤 1 模式表 **明确不覆盖** 的场景：
   - 自定义协议解析/自定义序列化
   - 数据经存储后被二次使用且未重新校验（二阶注入）
   - 用户输入传入冷门第三方 SDK 的高危方法
   - Spring MVC 视图解析变体：返回值拼接视图名、`void` controller 让 URL 路径成为视图名
   - CSV 导出场景：用户可控字段写入 CSV 单元格且未做公式中和
   - 资源耗尽场景：用户可控 `width/height/regex` 直接进入高开销 API
   - SSRF 校验绕过：代码存在 `isIntranet` / `urltoIp` 等一次性解析黑名单校验，但最终仍发起外部请求
   - 标准 Sink 类型（SQL/命令/XSS/SSRF 等）**不在此步骤范围**——它们属于步骤 1

> 例外：**SSRF 绕过属于标准 SSRF sink 的防御失效变体**。即使基础 sink 已在步骤 1 覆盖，只要发现黑名单/一次解析校验逻辑，也应在本步骤补充推理，不得因"SSRF 已在步骤 1"而跳过。

4. **去重与合并**：
   - 已存在于步骤 1 工作列表 → 标记交叉确认
   - 新发现 → 追加，标记 `discoveryMethod: "source-driven"`

> **反幻觉约束**：所有发现必须有 LSP/Read 工具输出作为证据。不得基于推测创建 Sink。

### 步骤 2-6：LSP 数据流追踪

| 步骤 | 目标 | LSP 操作 |
|------|------|---------|
| 2. Sink 上下文 | 获取 Sink 所属方法签名和参数 | `documentSymbol` |
| 3. 反向追踪 | 从 Sink 递归 `incomingCalls` 到 Controller/Handler 入口 | `incomingCalls`（递归） |
| 4. 正向确认 | 从 Source 确认参数无转换/过滤地传递到 Sink | `outgoingCalls` |
| 5. 防御检查 | 读取 sanitizer 实现评估有效性；确认所有使用点有防御 | `goToDefinition` + `findReferences` |
| 6. 影响评估 | 对无防御路径构造概念性 payload，评估 RCE/泄露/提权 | — |

**防御有效性**：有效（参数化查询、白名单、类型转换）；无效（黑名单、自定义转义、客户端校验）。

**多态性**：当目标是接口时，`goToImplementation` 解析所有实现类，逐一追踪，任一实现有漏洞即报告。

### 跨仓库依赖检测

在步骤 3-5 中，当 LSP 调用遇到以下任一情况时，记录一个**跨仓库不可审计断点**：

| LSP 操作 | 触发条件 | 含义 |
|---------------|---------|---------|
| `goToDefinition` | 结果为空 | 定义在项目源码之外 |
| `goToDefinition` | 跳转到 `.class`/`.jar`/`.so`/`.dll` | 二进制依赖，无可审计源码 |
| `goToDefinition` | 跳转到 `node_modules/`、`site-packages/`、`.m2/repository/` | 第三方包 |
| `goToImplementation` | 为空或指向外部包 | 实现在外部依赖中 |
| `incomingCalls`/`outgoingCalls` | 链在某个节点断开 | 调用目标不可解析 |

记录到 `crossRepoDependencies[]`：

```json
{
  "fromFile": "src/service/PaymentService.java",
  "fromLine": 45,
  "toModule": "com.example:payment-sdk:2.3.0",
  "breakPoint": "goToDefinition",
  "reason": "Definition points to .jar binary, no auditable source",
  "recommendation": "Attach payment-sdk source for deeper analysis",
  "status": "unresolved"
}
```

> 仅在 LSP 实际返回为空或指向外部路径时记录。不要推测。

### 置信度上限规则

| 条件 | 最大置信度 |
|-----------|----------------|
| 攻击链经过不可解析的框架方法 | <= 75 |
| Sink 位于第三方 SDK 内部 | <= 70 |
| 调用链中存在 LSP 不可解析断点 | <= 80 |

在风险发现上设置 `confidenceCeiling` 和 `confidenceCeilingReason`。

### 链式分析

当同一文件或调用链上存在 >= 2 个风险发现时触发。检查组合模式：

| 组合 | 单项严重性 | 组合严重性 |
|-------------|--------------------|--------------------|
| SSRF + IMDS 访问 | Medium + Low | Critical |
| SQL 注入 + 无认证 | High + Medium | Critical |
| 路径穿越 + 文件上传 | Medium + Medium | High |
| IDOR + 数据泄露 | Medium + Low | High |
| XSS + CSRF | Medium + Medium | High |

输出到 `chainAnalysis[]`，包含：`chainId`、`findingIds`、`combinedPattern`、`individualSeverities`、`combinedSeverity`、`narrative`、`evidence[]`。

---

## 子任务 B：授权与逻辑审计 (D3/D9) 完整说明

**输入**：来自 recon-deep 的 `endpointPermissionMatrix`。

### D3：授权审计

#### 3.1 端点权限遍历

对矩阵中的每个端点：

```
Has permission annotation/middleware?
  No  -> Is it a public endpoint (login/register/health)?
           Yes -> Skip
           No  -> Flag D3 missing auth (high/critical)
  Yes -> Proceed to CRUD consistency check
```

#### 3.2 CRUD 一致性检查

使用 `LSP documentSymbol` 枚举每个 controller 的所有方法，按资源类型分组，比较 Create/Read/Update/Delete 的权限级别：

- Create 需要认证但 Delete 不需要 -> High
- Read 需要认证但 Update 不需要 -> High

#### 3.3 IDOR 检查

对每个通过 ID 参数获取资源的端点：通过 `outgoingCalls` 追踪 controller → service → DAO，再用 `findReferences` 检查 `findById` 的所有调用点是否有归属校验（如 `findByIdAndUserId`）。

`findById(id)` 无用户关联 -> IDOR (High)。

#### 3.4 认证排除路径审计

来自 `securityConfig.authExclusions`：

- 被排除的端点是否返回或接受敏感数据？
- 是否执行特权操作？
- 排除的端点 + 敏感数据 = D2/D3 候选。

### D9：业务逻辑审计

#### D9.1 认证机制缺陷

检测存在但有缺陷的认证逻辑：

- 验证了身份但跳过了授权（authn 与 authz 混淆）。
- 客户端可控的认证参数。
- 先执行后检查（TOCTOU）。
- 认证逻辑短路。

#### D9.2 可信来源绕过

通过 Grep 搜索基于可伪造条件跳过认证的模式（完整模式列表参见 `resource/logic-audit-rules/authentication-bypass.yaml > risk_indicators.trusted_source_bypass`），然后通过 LSP 确认：

```
Grep: IsCloudOARequest|isInternalIP|isTrustedSource|isLocalRequest|isWhitelisted
Grep: X-Forwarded-For|X-Real-IP|X-Original-Forwarded-For|True-Client-IP
Grep: backdoor|master[_-]?key|super[_-]?admin|god[_-]?mode|debug[_-]?token
```

匹配后：`LSP goToDefinition` -> 读取实现 -> 判断条件是否控制认证绕过路径。置信度评估参见 `resource/logic-audit-rules/authentication-bypass.yaml > confidence_evaluation`。

#### D9.3 竞态条件

> 超出自动化检测能力。需要理解并发模型和事务隔离级别。

**输出级别规则**：
- 当 Grep 命中模式 + `Read` 确认代码中无锁/无事务保护 + 操作涉及金额/库存等关键数据 → `severity: "medium"`，正式 finding
- 当仅 Grep 命中，未深入确认 → `severity: "info"`，`humanReviewRequired: true`，`riskType: "race-condition-suspect"`

需标记的模式：检查后扣减（双重支付）、检查后下单（超卖）、检查后操作（TOCTOU）、检查后读取（符号链接）。

#### D9.4 业务逻辑审计

> 业务逻辑风险 ≠ 越权。它包含一切"代码按设计运行，但设计本身不符合安全预期"的场景。

反模式列表、Grep 关键词、推理维度参见 `resource/logic-audit-rules/business-logic-rules.yaml`。

**流程**：

1. **已知反模式匹配**：按 `known_anti_patterns` 逐项 Grep，命中后 Read 确认是否存在对应防护。
2. **入口点驱动推理**：从 CUD 端点中精选 top-5 敏感端点，按 `reasoning_dimensions` 的五个维度逐端点分析（每端点 ≤ 5 calls，总预算 ≤ 子任务 B 的 40%）。
3. **输出**：遵循 `output_rules`——推理链完整则为正式 finding，仅 Grep 命中则为 `info` + `humanReviewRequired`。
4. **去重**：两种方式的发现合并，重叠保留推理链更完整的版本。

> **反幻觉约束**：所有发现必须有 Read/Grep/LSP 工具输出作为证据。不得基于推测创建 finding。

#### D9.5 支付逻辑审计

反模式列表、Grep 关键词参见 `resource/logic-audit-rules/payment-logic-rules.yaml`。

**流程**：按 `known_anti_patterns` 逐项 Grep，命中后 Read 确认服务端是否有对应校验。输出级别遵循 `output_rules`。

#### D9.6 云安全问题

当 `cloudServices` 表明使用云服务时：

| 问题 | 检查方式 | 严重性 |
|-------|-------|----------|
| IMDS 无限制 | SSRF 防御是否阻断内网？ | Critical |
| IAM 过度授权 | IAM 策略是否使用 `*` 通配符？ | High |
| 公开存储桶 | 存储 ACL/Policy 是否允许公开访问？ | High |
| 硬编码云凭证 | 源码中是否存在 AK/SK？ | Critical |

#### D9.7 潜在 0day

**输出级别规则**：
- 当 Grep 命中 + `Read` 确认存在自定义实现且无安全防护 + 推理出具体攻击路径 → `severity: "medium"`，正式 finding
- 当仅 Grep 命中，推理链不完整 → `severity: "info"`，`humanReviewRequired: true`，`riskType: "potential-0day"`

模式：自定义序列化/反序列化（未使用成熟库）、自定义加密/签名、复杂多步状态机、服务间调用缺少认证且依赖网络隔离。

---

## 反隧道视野规则（完整）

防止 Agent 在单一方向过度深入，确保广度覆盖。

### 1. 单文件工具调用上限

同一文件的分析不得消耗超过 **15 次工具调用**（Read + LSP + Grep 合计）。超过后：
- 记录已发现的 findings
- 标记该文件为 `analysisDepth: "partial"`
- 立即转向下一个文件

### 2. 同模式合并

当同一 `RiskType` 在 **≥3 个文件**中出现相同模式时（如同一 SQL 拼接模式在多个 DAO 文件中出现）：
- 合并为 **1 个代表性 finding** + `affectedFiles[]` 列表
- 不逐文件重复 LSP 追踪
- 代表性 finding 选择攻击链最完整的那个

### 3. 广度优先约束

- **步骤 0（Fast Exclusion）+ 步骤 1（Sink 发现）** 的 Grep/LSP 调用合计不得超过总预算的 **30%**
- **步骤 1.5（Source-Driven 补盲）** 条件触发时不得超过总预算的 **10%**
- 必须先完成步骤 1（+ 1.5 如触发）后，再进入深度 LSP 追踪（步骤 2-6）
- 如果发现阶段已消耗 40% 预算，立即进入深度追踪阶段，对已发现的 Sink 按严重性排序处理

### 4. 维度均衡

单一漏洞维度（如 SQL 注入）的分析不得消耗超过总工具调用预算的 **40%**。超过后记录当前进度，转向其他维度。

---

## 增量写入策略（完整）

> 遵循 `references/contracts/incremental-write-contract.md`。每完成 1 个 finding 后立即写入。

**StreamTimeout 防护**：deep-scan 必须在开始分析前立即写入初始输出文件（含 `agent`, `status: "in_progress"`, `findings: []`, `writeCount: 0`），确保即使后续发生 StreamTimeout，也有产物落盘供编排器检测。每完成 1 个 finding 后，必须立即追加到 `findings[]` 并递增 `writeCount`。**禁止**将所有 findings 积攒到最后一次性写入。

---

## 上下文与 Turn 预算（完整）

> 遵循 `references/contracts/context-budget-contract.md`。本 agent：max_turns = 35，Turn 预留 = 最后 5 轮，totalCalls 收尾阈值 = 130。

补充规则：
- 额外检查时机：每完成 3 个 finding 后、开始新子任务前调用 `context_budget.py`
- LSP 结果复用：同一方法的 `incomingCalls`/`outgoingCalls` 结果在本次审计中有效，不重复调用
- 特殊收尾：对正在分析中的 finding，记录当前进度（已完成步骤）并写入

### 子任务预算硬分配（强制）

子任务 A 和子任务 B 独立分配预算，防止漏洞审计挤占授权/业务逻辑审计。

| 子任务 | 预算占比 | 预算 calls（基于 130） | 说明 |
|--------|---------|---------------------|------|
| 步骤 0（Fast Exclusion） | 5% | ~7 | 一次性 Grep 探针 |
| 步骤 1+1.5（发现阶段） | 20% | ~26 | Sink 发现 + Source-Driven 补盲 |
| 步骤 2-6（LSP 追踪） | 30% | ~39 | 深度数据流追踪 |
| **子任务 B（授权+逻辑）** | **35%** | **~45** | D3 授权审计 + D9 业务逻辑审计 |
| 增量写入 | 10% | ~13 | Read + Write 开销 |

**强制切换规则**：
- 当子任务 A（步骤 0 + 步骤 1/1.5 + 步骤 2-6）累计消耗达到 **totalCalls 的 55%**（即 ~72 calls）时，**立即停止子任务 A**，将未完成的 Sink 标记为 `analysisDepth: "partial"`，切换到子任务 B
- 子任务 B 启动前检查剩余预算，如果低于 30 calls 则仅执行 D3 授权审计（优先级最高），跳过 D9 中低优先级检测
- 子任务 B 的预算保底不低于 totalCalls 的 **30%**（即 ~39 calls）
