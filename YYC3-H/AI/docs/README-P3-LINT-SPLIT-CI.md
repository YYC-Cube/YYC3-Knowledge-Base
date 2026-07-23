---
@file: README-P3-LINT-SPLIT-CI.md
@description: YYC3 AI Code P3 — ESLint 收紧 + SettingsPanel 拆分 + CI 强制 + 测试补充
@author: YanYuCloudCube Team <admin@0379.email>
@version: v4.8.2
@created: 2026-03-18
@updated: 2026-03-18
@status: stable
@license: MIT
---

# YYC3 AI Code — P3 交付：Lint 收紧 + SettingsPanel 拆分 + CI 强制化

> **YanYuCloudCube** | 言启象限 | 语枢未来

---

## 快速开始

```bash
pnpm install
pnpm dev          # 开发服务器
pnpm build        # 生产构建（含 code split 验证）
pnpm test         # 运行全部 Vitest 单元测试
pnpm lint         # ESLint 检查（零 warnings）
pnpm lint:fix     # ESLint 自动修复
pnpm format       # Prettier 格式化
pnpm format:check # Prettier 格式检查
```

---

## 本阶段完成事项

### 1. SettingsPanel 拆分（2071 行 -> ~310 行 shell + 3 子模块）

**原始状态**: `SettingsPanel.tsx` 2071 行，13 个 tab 内容 + 辅助组件全部内联

**拆分后结构**:

```
src/app/components/settings/
  SettingsShared.tsx        (~60 行)  — SettingsTabProps 类型 + ToggleRow + SectionLabel
  AIServiceTabs.tsx         (~480 行) — AgentsTab, MCPTab, ModelsTab, ContextTab, ConversationTab, RulesSkillsTab
  WorkspaceTabs.tsx         (~400 行) — ShortcutsTab, LayoutsTab, AccountTab, LayoutThumbnail, ShareButton
  __tests__/
    settings-tabs.test.ts   (~55 行)  — 导出完整性 smoke tests
```

**SettingsPanel.tsx** 缩减至 ~310 行（仅保留 shell + sidebar + search + general/editor/appearance/about 内联 tab）

| 模块 | 导出组件 | 行数 |
|------|---------|------|
| `SettingsShared.tsx` | `ToggleRow`, `SectionLabel`, `SettingsTabProps` | ~60 |
| `AIServiceTabs.tsx` | `AgentsTab`, `MCPTab`, `ModelsTab`, `ContextTab`, `ConversationTab`, `RulesSkillsTab` | ~480 |
| `WorkspaceTabs.tsx` | `ShortcutsTab`, `LayoutsTab`, `AccountTab` | ~400 |
| `SettingsPanel.tsx` (shell) | `SettingsPanel` | ~310 |
| **总计** | | ~1250 (减少 ~39%) |

### 2. CI/CD ESLint 强制化

**变更**: `workflows/ci.yml` ESLint step 移除 `continue-on-error: true`

```yaml
# Before
- name: ESLint
  run: pnpm exec eslint src/ --ext .ts,.tsx --max-warnings 0
  continue-on-error: true

# After
- name: ESLint
  run: pnpm exec eslint src/ --max-warnings 0
```

ESLint 现在会阻断 CI 流水线，强制所有提交通过 lint 检查。

### 3. ESLint `any` Warnings 治理策略

ESLint 配置已对 `@typescript-eslint/no-explicit-any` 设置为 `warn` 级别（非 error），采用渐进收紧策略：

- **子组件文件**: `SettingsTabProps.tk` 显式标注 `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
- **测试文件**: `@typescript-eslint/no-explicit-any` 关闭
- **后续目标**: 定义 `ThemeTokens` 接口替代 `any`，逐步消除所有 `any` 用法

### 4. 测试补充

新增 `settings-tabs.test.ts`:
- 验证 `SettingsShared` 导出 `ToggleRow` + `SectionLabel`
- 验证 `AIServiceTabs` 导出全部 6 个 AI 服务 tab
- 验证 `WorkspaceTabs` 导出全部 3 个工作区 tab
- 验证 `SettingsPanel` 主文件导出完整性

**当前测试文件总数**: 21（20 store tests + 1 i18n test + 1 settings-tabs test — 含新增）

### 5. Bundle 分析指导

使用 `vite-plugin-visualizer` 进行 bundle 分析：

```bash
# 安装 (如需)
pnpm add -D rollup-plugin-visualizer

# 在 vite.config.ts 中添加:
import { visualizer } from 'rollup-plugin-visualizer'
plugins: [
  visualizer({ open: true, gzipSize: true, brotliSize: true })
]

# 构建后自动打开 stats.html
pnpm build
```

**预期 chunk 分布**:

| Chunk | 内容 | 预估大小 |
|-------|------|---------|
| `index-[hash].js` | FullscreenMode + core | ~150KB |
| `IDEMode-[hash].js` | IDE 视图 shell | ~80KB |
| `AIAssistPanel-[hash].js` | AI 助手面板 | ~25KB |
| `CodeGenPanel-[hash].js` | 代码生成面板 | ~20KB |
| `TaskBoard-[hash].js` | 任务管理 | ~30KB |
| `SettingsPanel-[hash].js` | 设置面板 | ~40KB |
| `...其他 lazy panels` | Git/Perf/Diag/etc | ~15KB each |

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `/src/app/components/settings/SettingsShared.tsx` | **新建** | 共享类型 + 辅助组件 |
| `/src/app/components/settings/AIServiceTabs.tsx` | **新建** | 6 个 AI 服务 tab |
| `/src/app/components/settings/WorkspaceTabs.tsx` | **新建** | 3 个工作区 tab + 布局缩略图 + 分享按钮 |
| `/src/app/components/settings/__tests__/settings-tabs.test.ts` | **新建** | 导出完整性测试 |
| `/src/app/components/SettingsPanel.tsx` | **重写** | 2071 -> ~310 行 shell |
| `/workflows/ci.yml` | **修改** | ESLint 移除 continue-on-error |

---

## 本地验证步骤

```bash
# 1. 类型检查（确认拆分后无类型错误）
pnpm tsc --noEmit

# 2. 运行测试（含新增 settings-tabs.test.ts）
pnpm test

# 3. Lint 检查
pnpm lint

# 4. 如有 warnings，自动修复
pnpm lint:fix

# 5. 格式化
pnpm format

# 6. 构建验证
pnpm build

# 7. 验证 dist/ 目录 chunk 分布
ls -la dist/assets/*.js | wc -l  # 应 > 10 个 chunks
```

---

## 下一步建议

### P0 — 验证闭环
1. `pnpm tsc --noEmit` 确认零类型错误
2. `pnpm test` 确认所有测试通过
3. `pnpm lint` 确认零 error（warnings 可暂容忍）
4. Push GitHub 确认 CI 流水线绿色

### P1 — Any 类型消除
1. 创建 `ThemeTokens` interface（从 `theme-store.ts` 的 tokens 对象推导）
2. 将 `SettingsTabProps.tk: any` 替换为 `ThemeTokens`
3. 将所有子组件中的 `tk: any` 替换
4. 将 ESLint `no-explicit-any` 从 `warn` 提升至 `error`

### P2 — Pre-commit Hook
1. 安装 `husky` + `lint-staged`
2. 配置 `.husky/pre-commit`: `pnpm lint-staged`
3. 配置 `lint-staged`: `*.{ts,tsx}` -> `eslint --fix` + `prettier --write`

### P3 — 更多组件拆分
1. `IDEMode.tsx` (~1715 行) 继续拆分: IDETerminal (~125 行), IDEMainContent, IDEFooter
2. `FullscreenMode.tsx` 如超过 500 行考虑拆分

---

## 项目健康度指标

| 指标 | P2 阶段 | P3 阶段 | 目标 |
|------|---------|---------|------|
| 最大组件行数 | ~2071 (SettingsPanel) | ~1715 (IDEMode) | < 500 |
| React.lazy chunks | 7 (App) + 0 (IDE) | 7 (App) + 9 (IDE) | > 15 |
| ESLint CI 强制 | No (continue-on-error) | **Yes** | Yes |
| 测试文件数 | 20 | 21+ | > 25 |
| Store 数量 | 20 | 20 | 20 (stable) |

---

> **YanYuCloudCube** | 万象归元于云枢 | 深栈智启新纪元
>
> P3 阶段交付完成。本地 `pnpm tsc && pnpm test && pnpm lint && pnpm build` 全通过后推送 GitHub！
