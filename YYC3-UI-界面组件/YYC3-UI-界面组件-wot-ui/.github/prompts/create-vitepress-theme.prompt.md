---
description: "按目标风格与改造范围执行 VitePress 主题改造。适用于首页改版、插槽增强、主题变量调整、主题入口重构。"
name: "Create VitePress Theme"
argument-hint: "输入：目标风格 + 改造范围 + 是否覆盖内部组件"
agent: "agent"
---

Related skill: `create-vitepress-theme`.
Load and follow the skill before making changes.

## Input Contract

Parse user input into:
- Style target: visual direction, tone, brand constraints
- Refactor scope: pages/slots/components/files to change
- Override policy: whether to use Vite alias to replace internal theme components

If any part is missing, infer from the repo defaults and state assumptions briefly.

## Execution Workflow

1. Read [Skill](../../.agents/skills/create-vitepress-theme/SKILL.md) and apply its process.
2. Check current theme entry and config first:
- [Theme Entry](../../docs/.vitepress/theme/index.ts)
- [VitePress Config](../../docs/.vitepress/config.mts)
3. If scaffolding is needed, bootstrap from skill assets:
- [Theme Index Template](../../.agents/skills/create-vitepress-theme/assets/theme-index.ts)
- [Layout Template](../../.agents/skills/create-vitepress-theme/assets/Layout.vue)
- [Vars Template](../../.agents/skills/create-vitepress-theme/assets/styles-vars.css)
- [Custom Style Template](../../.agents/skills/create-vitepress-theme/assets/styles-custom.css)
4. Implement with minimal diff and preserve existing conventions.
5. Validate with docs run/build commands when possible.
6. Return:
- changed files
- key decisions (slot-based vs alias override)
- follow-up checklist

## Quality Gates

- Keep SSR-safe browser API usage.
- Prefer extending default theme.
- Avoid unnecessary internal component overrides.
- Keep style tokens centralized and avoid hard-coded scattered colors.
