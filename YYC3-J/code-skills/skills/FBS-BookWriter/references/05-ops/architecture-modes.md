# 架构模式：单智能体 vs 多成员并行

**版本**：1.59D

## 模式

| 模式 | `project-config.json` | 说明 |
|------|----------------------|------|
| **单会话串行** | `multiAgentMode` 可视为单 Writer | 默认推荐多数场景（见 SKILL §3 指针） |
| **多 Writer 并行** | `parallel_writing` | 须维护 `.fbs/chapter-status.md`、依赖图、心跳 |

## 话术与编排

- [`workbuddy-agent-briefings.md`](../01-core/workbuddy-agent-briefings.md)  
- [`coordinator-arbiter-briefs.md`](../01-core/coordinator-arbiter-briefs.md)

## 审计提示

多智能体「零横向通信」风险：依赖 **磁盘真相源** + `send_message` / 主编调度，勿信口头「都写完了」。
