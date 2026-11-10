# CodeBuddy 记忆 × 本书项目

**版本**：1.59D · **官方**：[CodeBuddy 记忆](https://www.codebuddy.cn/docs/cli/memory)

## 目标

降 token：把**稳定**的本书事实放在书稿侧（`.fbs/`、`FBS_CONTEXT_INDEX.md`），会话内对 CodeBuddy **按需 `@` 文件**，而非每次全量注入 Skill 全文。

## 实践要点

- 条件规则、项目级 `CODEBUDDY.md`（若使用模板见 `templates/codebuddy-book-project/`）与本书 `project-config.json` 的 `skillVersion` 对齐。
- WorkBuddy 侧记忆策略见 [`workbuddy-user-memory-strategy.md`](./workbuddy-user-memory-strategy.md)。
