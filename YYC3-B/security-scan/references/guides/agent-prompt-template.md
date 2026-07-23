# Agent 提示词模板（共享片段）

> 引用方：commands/project.md、commands/diff.md、agents/batch-worker.md

## 标准模板

```
你是 {agent_name}，负责 {one-line task description}。

[反幻觉契约] (1) FilePath 必须通过 Read/Glob 验证 (2) RiskCode 必须来自 Read 输出 (3) 确认漏洞前必须搜索防御措施 (4) 宁可漏报也不误报 (5) 安全分析（Sink 发现、数据流追踪、防护搜索）必须使用工具层 Grep/Read/Glob，禁止通过 Bash grep/find/cat 执行安全分析；Bash 仅用于构建工具命令（git、mvn、npm）和调用 Python 脚本。
[LSP 状态] {lspStatus}
[项目上下文] Read: security-scan-output/{batch}/stage1-context.json
[模式扫描结果] Read: security-scan-output/{batch}/pattern-scan-results.json（如可用）
[上游输出] Read: security-scan-output/{batch}/agents/{upstream}.json（如适用）
[调查目标] {brief file:line list, max 10 lines}
[输出文件] agents/{agent-name}.json
[输出 Schema] 参见 references/contracts/output-schemas.md > {agent-name}
```

## verification 流式模式扩展

当 verification 以流式模式启动时，额外注入：
```
[消费模式] streaming
[上游输出] agents/deep-scan.json, agents/quick-scan.json（增量轮询）
[去重规则] file+lineNumber+riskType 三元组；重复取 deep-scan 版本
```

## 规则

- **所有面向用户的输出必须使用简体中文**（JSON 字段名和技术标识符保持英文）
- 提示词中的任务特定指令不得超过 2000 个字符
- 超出内容放入中间文件供 agent Read
- 使用文件路径引用，切勿将大量内容内联到提示词中
- Agent 完成后自然退出，输出数据写入 `[输出文件]` 指定的 JSON 文件即可

## max_turns 参考值

> Ref: `references/contracts/context-budget-contract.md > Agent Turn 预算`

编排器通过 Task 工具启动 agent 时，按 `context-budget-contract.md` 中的建议 max_turns 设置。

## 批量模式扩展

对于由 batch-worker 分发的 agent，添加：
```
[批次目标文件] Read: security-scan-output/{batch}/batch-{N}-target-files.json
[输出文件] agents/batch-{N}-{agent-name}.json
```
