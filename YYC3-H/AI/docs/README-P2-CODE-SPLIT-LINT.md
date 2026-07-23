---
@file: README-P2-CODE-SPLIT-LINT.md
@description: YYC3 AI Code P2 阶段交付 — React.lazy 代码分割 + ESLint/Prettier 完整配置
@author: YanYuCloudCube Team <admin@0379.email>
@version: v4.8.2
@created: 2026-03-18
@updated: 2026-03-18
@status: stable
@license: MIT
---

# YYC3 AI Code — P2 交付：代码分割 + Lint/Format

> **YanYuCloudCube** | 言启象限 | 语枢未来

---

## 快速开始

```bash
pnpm install
pnpm dev          # 开发服务器
pnpm build        # 生产构建
pnpm test         # 运行 Vitest 单元测试
pnpm lint         # ESLint 检查
pnpm lint:fix     # ESLint 自动修复
pnpm format       # Prettier 格式化
pnpm format:check # Prettier 检查
```

---

## 本阶段完成事项

### 1. React.lazy 代码分割

#### App.tsx 级别（全局路由视图）

| 组件 | 加载方式 | 说明 |
|------|---------|------|
| `FullscreenMode` | **Eager** | 首屏默认视图，必须立即加载 |
| `ModelSettings` | **Eager** | 全局覆盖层，轻量 |
| `IDEMode` | **Lazy** | ~1715 行最大组件，仅 IDE 模式时加载 |
| `FloatingWidget` | **Lazy** | 仅 Widget 模式时加载 |
| `CommandPalette` | **Lazy** | 按需加载 |
| `SettingsPanel` | **Lazy** | 按需加载 |
| `NotificationCenter` | **Lazy** | 按需加载 |
| `GlobalSearch` | **Lazy** | 按需加载 |
| `ShortcutCheatSheet` | **Lazy** | 按需加载 |

#### IDEMode.tsx 内部（覆盖面板）

9 个重量级 overlay panels 全部改为 `React.lazy`：

| 组件 | 原加载方式 | 现加载方式 |
|------|-----------|-----------|
| `AIAssistPanel` | Eager | **Lazy** |
| `CodeGenPanel` | Eager | **Lazy** |
| `CollabPanel` | Eager | **Lazy** |
| `GitPanel` | Eager | **Lazy** |
| `PerformanceDashboard` | Eager | **Lazy** |
| `DiagnosticsPanel` | Eager | **Lazy** |
| `TaskBoard` | Eager | **Lazy** |
| `SnippetManager` | Eager | **Lazy** |
| `ActivityLog` | Eager | **Lazy** |

**预估首屏加载减少**: ~40-50% JS bundle（IDEMode + 9 overlay panels 延迟加载）

### 2. ESLint 完整配置

**文件**: `/eslint.config.mjs`（ESLint v10 flat config）

插件栈:
- `@eslint/js` — 基础 JS 规则
- `typescript-eslint` — TypeScript 类型感知规则
- `eslint-plugin-react-hooks` — Hooks 规则验证
- `eslint-plugin-react-refresh` — Vite HMR 兼容检查
- `eslint-config-prettier` — 关闭与 Prettier 冲突的规则

关键规则:
```
@typescript-eslint/no-explicit-any  → warn (渐进收紧)
@typescript-eslint/no-unused-vars   → warn (忽略 _ 前缀)
no-console                          → warn (允许 warn/error)
prefer-const                        → warn
```

测试文件特殊规则:
```
@typescript-eslint/no-explicit-any  → off
no-console                          → off
```

### 3. Prettier 完整配置

**文件**: `/.prettierrc`

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 120,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

**忽略文件**: `/.prettierignore` — dist/, node_modules/, coverage/, *.md

### 4. package.json 新增 Scripts

```json
{
  "lint": "eslint src/ --max-warnings 0",
  "lint:fix": "eslint src/ --fix",
  "format": "prettier --write \"src/**/*.{ts,tsx,css,json}\"",
  "format:check": "prettier --check \"src/**/*.{ts,tsx,css,json}\""
}
```

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `/eslint.config.mjs` | **新建** | ESLint v10 flat config |
| `/.prettierrc` | **新建** | Prettier 配置 |
| `/.prettierignore` | **新建** | Prettier 忽略规则 |
| `/package.json` | **修改** | 新增 lint/format scripts + 安装依赖 |
| `/src/app/App.tsx` | **修改** | IDEMode/FloatingWidget 改 React.lazy |
| `/src/app/components/IDEMode.tsx` | **修改** | 9 个 overlay panels 改 React.lazy + Suspense |

---

## CI/CD 集成

`.github/workflows/ci.yml` 已包含 lint 步骤:

```yaml
- name: ESLint
  run: pnpm exec eslint src/ --ext .ts,.tsx --max-warnings 0
  continue-on-error: true  # 渐进收紧，初期允许失败
```

建议后续将 `continue-on-error` 改为 `false` 以强制 lint 通过。

---

## 本地验证步骤

```bash
# 1. 类型检查
pnpm tsc --noEmit

# 2. Lint 检查（首次可能有大量 warnings）
pnpm lint

# 3. 自动修复可修复的问题
pnpm lint:fix

# 4. 格式化全部代码
pnpm format

# 5. 运行测试
pnpm test

# 6. 构建验证（含 tree-shaking + code split）
pnpm build
```

构建完成后检查 `dist/assets/` 目录:
- 应可看到多个 chunk 文件（IDEMode-xxx.js, AIAssistPanel-xxx.js 等）
- 主 bundle 大小应显著减小

---

## 下一步建议

### P0 — 验证

1. 运行 `pnpm lint` 统计当前 warning/error 数量，建立 baseline
2. 运行 `pnpm build` 确认 code split chunks 正确生成
3. 检查 `pnpm dev` 切换到 IDE 模式时网络面板显示 lazy chunk 加载

### P1 — 渐进收紧

1. 逐文件修复 `@typescript-eslint/no-explicit-any` warnings
2. 将 CI 中 `continue-on-error: true` 改为 `false`
3. 添加 `husky` + `lint-staged` 实现 pre-commit 自动检查

### P2 — 性能优化

1. 添加 `@loadable/component` 或 `React.startTransition` 优化 lazy 加载体验
2. 分析 `vite-plugin-visualizer` 输出，识别剩余大 chunk
3. SettingsPanel (~2000 行) 进一步拆分为子组件

---

> **YanYuCloudCube** | 万象归元于云枢 | 深栈智启新纪元
>
> P2 阶段交付完成。本地测通后携带构建报告回来报备！
