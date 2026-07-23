# CodeBuddy 本书项目记忆模板

将本目录中文件手动复制到成书项目（或配合 `scripts/init-fbs-multiagent-artifacts.mjs --book-root <目标路径>` 初始化）。

| 文件 | 目标位置 | 说明 |
|------|----------|------|
| `CODEBUDDY.snippet.md` | 本书根目录 `CODEBUDDY.md`（或并入现有文件） | 固定体裁、技能根路径、按需 `@` 指引 |
| `rules/fbs-bookwriter-on-demand.md.template` | 本书 `.codebuddy/rules/fbs-bookwriter-on-demand.md` | 条件规则：`paths` 匹配 Markdown 时注入短提示 |

占位符 **`__FBS_SKILL_ROOT__`** 表示技能包根目录（含 `SKILL.md` 与 `references/`），由脚本替换为 `--skill` 的绝对路径。
