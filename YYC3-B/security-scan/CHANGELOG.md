# 更新日志

本文档记录 security-scan 插件的版本变更。

---


## v2.3.6（2026-03-17）

### 变更

**quick-scan Turn 预算扩容**

- quick-scan (Deep) max_turns 从 20 提升至 30，totalCalls 收尾阈值从 65 提升至 100，提升大项目扫描覆盖率

**报告字段精简**

- 移除报告中「扫描文件数」(totalFiles) 指标卡片及相关 JSON 字段，减少数据歧义
- 移除 summary 和 JSON 报告中的 `totalFiles` 字段传递链路

**报告交互优化**

- 页面加载时默认筛选高置信度风险不再触发自动滚动，改善首屏体验
- `filterRiskTable()` 新增 `scroll` 参数，支持控制是否滚动到风险列表区域

**优化lsp安装引导流程**

- 支持记录path检测和安装引导

---


## v2.3.5（2026-03-17）

### 新增

**Critical 风险级别支持**

- 新增 Critical（严重）风险等级，与 High 分离为独立级别
- 报告 metrics 新增「严重风险」卡片，详细风险列表新增「🔴 严重风险」分组
- 风险列表新增按级别筛选按钮（严重/高危/中危/低危），点击 metrics 卡片可直接跳转过滤

**quick-scan 混合格式支持**

- quick-scan 支持混合格式输出（camelCase + PascalCase），自动合并两种提取结果

### 变更

**报告优化**

- 风险类型分布表格默认按严重程度 + 数量降序排列
- 移除 metrics 区域「高置信度」统计卡片
- 攻击链节点统一字符串化处理，兼容 str 和 dict 两种格式

---


## v2.3.4（2026-03-16）

### 新增

**报告风险列表置信度筛选**

- 风险列表新增「高置信度」/「全部」筛选 tag，默认显示高置信度（>=90）风险
- 新增 CSS 样式（`.filter-tag` 系列）和 JavaScript 筛选函数 `filterRiskTable()`
- 每条风险行添加 `data-confidence` 属性，页面加载时自动过滤

**verification 分级执行策略**

- verification Agent Phase B 根据 finding 的 severity 分级执行：Critical/High 完整执行、Medium 精简（B1+B3+B6）、Low 最小化（B1+B6）

---


## v2.3.3（2026-03-16）

### 变更
- lsp安装引导修复：修复插件安装未带有插件市场导致的安装失败
- 优化参考目录：将合约强化，避免agent按照参考选择读取
- 用户体验优化： 优化等待提示词，统一风格，减少冗余描述



## v2.3.2（2026-03-16）

### 变更

**verification Agent 输出格式规范**

- 新增强制嵌套输出结构（`validatedFindings` 数组，每个 finding 包含 `antiHallucination`、`verification`、`confidence` 子对象）
- 新增 `summary` 统计摘要字段

**LSP 可用性检查强化**

- LSP 预热失败时强制执行诊断流程（检查二进制文件 + 插件列表），禁止直接跳过设置 `lspStatus: "unavailable"`


---

## v2.3.1（2026-03-16）

### 新增

**报告增强**

- metrics 卡片新增「扫描文件数」，位于「风险文件数」前；JSON `summary` 同步新增 `totalFiles` 字段
- 漏洞详情新增「调用链路」区块，可视化展示 `source → propagation → sink` 数据流路径，标注追踪方式

---

## v2.3.0（2026-03-11）

### 新增

**分级扫描策略（Tiered Scan Strategy）**

- 引入三级扫描模式：Light（<=15 文件）/ Standard（16-80 文件）/ Deep（>80 文件），编排器在阶段 1 完成后根据项目规模自动选择
- 新增 `--scan-level light|standard|deep` 参数，允许用户覆盖自动决策
- 新增共享策略定义文件 `references/scan-level-strategy.md`，统一阈值、参数和级别间差异


### 变更

**编排器规则优化**

- 轮询协议超时保护从精确数值规则改为原则导向描述（"文件状态优先于 Task 返回"），提升 LLM 遵循率
- 新增分级扫描级别播报格式（含行数信息、升级原因、大文件预警）
- 产物完整性检查新增 Light 模式和 Standard 模式的说明

---

## v2.2.2


- 混合调度架构：6 Agent + 流水线编排
- 完整语义分析：LSP 跨文件数据流追踪
- 五阶段交叉验证：反幻觉 + 攻击路径 + 红队挑战 + 可验证性 + 置信度
- 三层上下文控制：Read 约束 + 增量写入 + 预算感知
- 8 大类 40 个标准风险类型
- HTML 报告导出 + 审计结果上报
- 自动修复（高置信度 >= 90）
- 支持 7 种编程语言的 LSP