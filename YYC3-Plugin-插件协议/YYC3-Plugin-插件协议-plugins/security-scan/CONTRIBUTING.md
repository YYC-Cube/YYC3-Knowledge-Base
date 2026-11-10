# 贡献指南

本文档说明如何为 security-scan 插件添加新功能或修改现有功能。

---

## 如何新增一个 Agent

以新增 `my-audit` agent 为例，需依次修改以下文件：

1. **创建 `agents/my-audit.md`** — 定义 agent 的角色、工具、任务指令。文件头部使用 YAML front-matter 声明 name、description、tools，正文编写具体任务说明（参照已有 agent 格式）
2. **编辑 `references/contracts/output-schemas.md`** — 添加该 agent 的输出字段表格
3. **编辑 `references/strategies/orchestrator-rules.md`** — 注册到对应阶段的编排流程，明确所属阶段、启动依赖、LSP 使用策略
4. **编辑 `references/strategies/post-audit-workflow.md`** — 如该 agent 影响审计后流程，更新相关引用
5. **编辑 `.codebuddy-plugin/plugin.json`** — 更新 `features` 中的 agent 数量描述

---

## 如何新增一个安全规则类别

1. **在 `resource/rule-details/` 创建 YAML 文件**（如 `xxe.yaml`），定义该漏洞类型的参考数据（绕过技术、检测模式等纯数据，不包含 LLM 思维教程）
2. **编辑 `resource/default-rules.yaml`** — 在规则目录注释区添加索引行：
   ```yaml
   # resource/rule-details/xxe.yaml -- XXE 分析
   ```
3. **更新相关 agent prompt** — 在 `agents/deep-scan.md` 等相关 agent 中提及新规则类别，使其按需 Read 该文件

---

## 如何修改现有 Agent 的输出合约

1. **编辑 `references/contracts/output-schemas.md`** — 修改该 agent 的输出字段表格
2. **编辑 `agents/{agent-name}.md`** — 确保任务说明与新合约一致
3. **验证下游消费者** — 检查以下文件中对该字段的引用：
   - `references/strategies/orchestrator-rules.md`（编排器传递的字段）
   - 下游 agent 定义文件（依赖该字段的 agent）
   - `scripts/generate_report.py`（报告生成脚本）
4. 如影响最终汇总，同步更新 `references/contracts/output-schemas.md` 中的摘要格式

---

## 本地测试变更

### 运行插件

1. 确保插件已通过 CodeBuddy 插件市场安装，或符号链接到开发目录
2. 执行命令测试：`/security-scan:project`（全项目）或 `/security-scan:diff`（变更文件）
3. 检查 `security-scan-output/{batch}/` 下的中间产物和最终结果

### 验证 Agent 输出

1. 运行完整审计流程后，逐一检查 `agents/{agent-name}.json`
2. 确认输出字段与 `references/contracts/output-schemas.md` 中的合约定义一致
3. 确认 `findingId` 引用链完整（如 finding-validator → vulnerability-audit）
4. 确认 `summary.json` 的 `executionMetrics` 中各 agent 均有记录

---

## Code Review 清单

提交 PR 时，请确认以下事项：

- [ ] **合约一致性**：`agents/*.md` 与 `references/contracts/output-schemas.md` 字段匹配
- [ ] **编排完整性**：agent 已在 `references/strategies/orchestrator-rules.md` 正确注册
- [ ] **风险类型同步**：新增风险类型已在 `resource/risk-type-taxonomy.yaml` 中登记
- [ ] **规则索引同步**：新规则文件已在 `default-rules.yaml` 索引中登记
- [ ] **反幻觉合约兼容**：新 agent 的 prompt 包含反幻觉合约引用注入
- [ ] **LSP 降级兼容**：使用 LSP 的 agent 有 Grep + Read 降级方案
- [ ] **产物目录更新**：`references/contracts/output-schemas.md` 的目录树反映最新结构

---

## 设计决策记录

> 以下内容仅供人类开发者了解架构设计背景，不影响 Agent 执行逻辑。

### 为什么引入分级扫描

不同规模的项目有截然不同的最优扫描策略。对于 15 文件以下的微型项目，5 个 Agent 的完整流水线有 ~60% 的时间花在 Agent 间通信和等待上。分级后：
- **Light**（≤15 文件）：单 Agent 25t 完成全部工作，耗时降低约 70%
- **Standard**（16-80 文件）：内联侦察 + 3 Agent 并行，耗时降低约 35-47%
- **Deep**（>80 文件）：完整流水线不变，仅微调优化

复合指标判定（文件数 + 总代码行数 + 大文件预警）防止了"文件少但代码量大"的误判。

### 为什么 Standard 模式侦察采用内联执行

Standard 模式（16-80 文件）的侦察不值得启动独立 recon-deep Agent：
- 编排器内联执行精简版（5-8t），仅保留入口点枚举和精简端点矩阵
- 跳过攻击面映射、云服务检测、完整依赖树解析
- 不污染编排器上下文——仅读取配置文件和 LSP 元数据，不读取源码内容

### 为什么拆分侦察为 recon-lite + recon-deep

quick-scan 只需要 `fileList` 即可启动，无需等待完整侦察。拆分后：
- **recon-lite**（5t）：仅产出 fileList + projectInfo + 代码行数统计 → quick-scan 可立即启动
- **recon-deep**（18t）：完成端点矩阵等 → deep-scan 在其完成后启动
- 两者并行执行 quick-scan，总侦察时间不变但 quick-scan 提前产出结果

### 为什么 remediation 采用内联执行

- 上下文消耗小（Read 漏洞位置 + 生成修复代码）
- 不使用 LSP，工具依赖简单（Read + Edit + Write）
- 待修复 findings 通常 ≤ 10 个（高置信度门控 ≥90 过滤了大部分）
- 节省 1 个 200k 上下文窗口，降低总资源消耗

### 为什么 Deep 模式实现流式验证 pipeline

- verification 在 deep-scan 产出第 1 个 finding 后就开始工作
- 与 deep-scan 重叠执行约 18 turns
- 消除串行等待瓶颈，降低关键路径耗时

### 为什么 Standard 模式使用批量验证

与 Deep 模式的流式验证不同，Standard 模式等扫描完再一次性验证：
- findings 数量通常 < 20，流式轮询的开销和去重复杂度不值得
- 批量模式 18t 即可完成全部验证，总体更高效

### 为什么用 Markdown 定义合约

agent 定义和 skill 均使用 Markdown 格式。LLM 可直接读取并理解 Markdown 内容，无需额外的解析层。这使得合约对人类开发者和 LLM 都是可读的，降低了维护成本。

### 为什么用文件做 Agent 间通信

agent 间通过 JSON 文件（如 `stage1-context.json`、`pattern-scan-results.json`）传递数据，而非直接在 prompt 中嵌入全量数据。好处：
- **节省 token**：各 agent 按需 Read 所需字段
- **可追溯**：中间产物持久化到磁盘
- **解耦**：agent 间通过 `findingId` 引用
- **流式支持**：verification 可轮询增量读取上游 agent 输出

### 为什么用 LSP 进行审计

LSP 提供精确的代码语义能力（调用链追踪、符号定位、类型推断），是纯 Grep 模式匹配无法替代的。当 LSP 不可用时，所有 agent 自动降级为 Grep + Read 模式。
