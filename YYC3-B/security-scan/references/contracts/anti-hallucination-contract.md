# 反幻觉合约（共享片段）

> 引用方：所有 agent、commands/project.md、commands/diff.md

## 合约摘要（注入到每个 agent 提示词中）

核心要求：
1. **FilePath** 在报告前必须通过 Read/Glob 验证
2. **RiskCode** 必须来自 Read 工具输出，不得来自 LLM 记忆
3. **防御搜索** 在确认任何漏洞之前是强制性的
4. **宁可漏报也不误报** —— 切勿报告未经验证的风险

## 完整规则

完整合约定义：`resource/anti-hallucination-rules.yaml`

Agent 应按需 Read 该文件的相关部分：
- `agent_contract.mandatory_clauses` —— 对所有 agent 具有约束力的规则
- `validation_rules` —— 按发现类型的具体检查
- `gate_criteria` —— 高置信度门控要求

## 编排器职责

1. 将合约摘要注入到每个 agent 提示词中（上述 4 行，非完整 YAML）
2. 在阶段边界执行检查点（通过脚本）
3. 在 `agents/hallucination-log.json` 中记录所有被移除/降级的发现
