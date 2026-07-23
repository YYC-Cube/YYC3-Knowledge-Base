# 静默心跳与长任务可见性

**版本**：1.59D · **与** [`SKILL.md`](../../SKILL.md)「执行约定」、`section-6-tech.md` §6.5 对齐

## 约定

- **15s 级心跳**：单次工具调用或连续静默预计 **≥30s** 时，**每约 15s** 输出一行可读进度（与对话心跳一致）。
- **60s 级成员巡检**：多成员并行时，`.fbs/member-heartbeats.json` 中 `lastHeartbeat` 建议 **≤60s** 更新（见 `search-policy` 与 `workbuddy-agent-briefings`）。
- **勿混淆**：`15000ms` 多为页面拉取超时（`searchAccessPolicy.singlePageTimeoutMs`）；**15s** 为对用户可见进度，二者不同指标。

## WorkBuddy / 宿主

宿主若仅展示「失败 unknown」，以 **磁盘文件** 与 `verify-expected-artifacts.mjs` 为准，见 SKILL「宿主误报失败与磁盘真值」。
