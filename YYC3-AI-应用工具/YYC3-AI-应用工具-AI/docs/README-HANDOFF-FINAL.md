---
@file: README-HANDOFF-FINAL.md
@description: YYC3 AI Code 最终本地衔接开发完整指南 — 含测试、CI/CD、组件拆分状态
@author: YanYuCloudCube Team <admin@0379.email>
@version: v4.8.1
@created: 2026-03-18
@updated: 2026-03-18
@status: stable
@license: MIT
@tags: readme,handoff,final,tests,ci-cd
---

# YYC3 AI Code — 最终本地衔接开发指南 v4.8.1

> **YanYuCloudCube** | 言启象限 | 语枢未来

---

## 快速开始

```bash
git clone https://github.com/YY-Nexus/YanYuCloud.git
cd YanYuCloud
pnpm install
pnpm dev          # 开发服务器
pnpm build        # 生产构建
pnpm test         # 运行 Vitest 单元测试
pnpm tsc --noEmit # TypeScript 类型检查
```

---

## 本阶段完成事项

### 1. 测试补充 (task-store v2.0.0)

`store/__tests__/task-store.test.ts` 从 ~230 行扩展到 ~430 行，新增 12 个 describe 块：

| 测试组 | 用例数 | 说明 |
|--------|--------|------|
| Subtasks | 4 | 添加/切换/删除/隔离 |
| Dependencies | 4 | 添加/反向引用/自依赖防御/删除 |
| Reminders | 5 | 添加/触发/已读/计数/级联删除 |
| Archive | 2 | 归档/取消归档 |
| AI Inference | 4 | inferTasksFromChat/失败回退/inferTasksFromCode/importInferredTasks |
| Stats | 3 | 计数正确性/归档排除/blocked |
| Migration | 1 | v2.0.0 字段向后兼容 |
| **总计** | **23 新用例** | + 原有 ~30 用例 = **~53 用例** |

所有 20 个 Store 均有对应测试文件（`store/__tests__/*.test.ts`）。

### 2. CI/CD 路径修正

```
/workflows/ci.yml → /.github/workflows/ci.yml  (GitHub Actions 标准路径)
```

5 阶段流水线: Lint → Test → E2E → Build (Win/Mac/Linux) → Tauri Build → Release

### 3. IDEHeader 提取

```
IDEMode.tsx (~1900行) → IDEHeader.tsx (~230行独立组件)
```

- 顶部导航栏 (Logo + 右侧操作按钮)
- 第二工具栏 (AI/工具/视图切换/数据库/插件/安全)
- IDEMode 减少 ~185 行

### 4. AI 推理对接真实 model-store

```tsx
// IDELeftPanel.tsx TaskManagerMiniPanel
const { sendToActiveModel } = useModelStore();
const results = await inferTasksFromChat(chatHistory, sendToActiveModel);
// 失败自动 Fallback 到演示数据
```

### 5. 全局搜索增强

GlobalSearchMiniPanel 支持三种搜索模式 (文件/内容/符号)，对接 VFS 文件列表。

---

## 当前项目结构

```
src/app/
├── components/          # 48 个 React 组件 (新增 IDEHeader)
│   ├── IDEMode.tsx      # ~1715 行 (从 1900 减少)
│   ├── IDEHeader.tsx    # ★ 顶部导航 + 工具栏
│   ├── IDELeftPanel.tsx # ★ 6 子面板导航 + AI 推理
│   ├── IDEStatusBar.tsx # ★ 底部状态栏
│   └── ...
├── store/               # 20 个 Store
│   └── __tests__/       # 20 个测试文件
└── i18n/                # 中英双语 (~980+ 键)

.github/workflows/ci.yml  # ★ CI/CD (已移至正确路径)
docs/
├── README-HANDOFF-FINAL.md        # ★ 本文件
├── README-LOCAL-DEV.md            # 通用开发指南
└── YYC3-P5-Closing-Review-Summary.md  # 十二类收尾报告
```

---

## 测试覆盖状态

| Store | 测试文件 | 用例数 | 覆盖 v2.0.0 |
|-------|----------|--------|-------------|
| task-store | ✅ | ~53 | ✅ 完整 |
| theme-store | ✅ | ~35+ | - |
| settings-store | ✅ | ~25+ | - |
| quick-actions-store | ✅ | ~20+ | - |
| file-store | ✅ | ~15+ | - |
| ide-store | ✅ | ~15+ | - |
| model-store | ✅ | ~15+ | - |
| 其余 13 个 | ✅ | ~10+ 每个 | - |
| **总计** | **20/20** | **~250+** | - |

---

## 组件拆分进度

| 原组件 | 提取的子组件 | 减少行数 | 状态 |
|--------|-------------|---------|------|
| IDEMode (~2100) | IDEStatusBar | -130 | ✅ |
| IDEMode | IDELeftPanel | -20 (调用替换) | ✅ |
| IDEMode | **IDEHeader** | **-185** | ✅ 本阶段 |
| IDEMode 当前 | - | ~1715 行 | - |
| SettingsPanel (~2000+) | 待拆分 | - | P1 待办 |

---

## P0 本地开发验证步骤

```bash
# 1. 类型检查
pnpm tsc --noEmit

# 2. 运行测试
pnpm test

# 3. 开发预览
pnpm dev

# 4. 生产构建
pnpm build
```

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| `logo.png` 找不到 | 确认 `src/app/assets/logo.png` 存在 |
| ModelStore Context 报错 | 确认 `<ModelProvider>` 包裹在 App 外层 |
| 测试 localStorage mock | 测试文件已自带 mock，直接运行即可 |

---

## 下一步优先建议

### P0 — 立即执行

1. **运行 `pnpm tsc --noEmit`** 验证所有类型正确
2. **运行 `pnpm test`** 验证所有 250+ 测试通过
3. **推送代码** 验证 GitHub Actions CI 流水线运行

### P1 — 短期计划

1. **SettingsPanel 拆分** → 多个 SettingsTabs 子组件 (~2000 行)
2. **IDEMode Terminal 提取** → IDETerminal.tsx (~125 行)
3. **消除 `any` 类型** (IDELeftPanel 的 `recentFiles.map`)
4. **真实 xterm.js 终端** 替换模拟终端

### P2 — 中期计划

1. **React.lazy 代码分割** (IDEMode / SettingsPanel)
2. **真实 y.js 协作** 替换模拟
3. **Tauri 原生桥接** (fs.* / db.* / backup.*)
4. **ESLint + Prettier** 完整配置

---

## 关键文件速查

| 功能 | 文件 | 行数 |
|------|------|------|
| IDE 主界面 | `components/IDEMode.tsx` | ~1715 |
| 顶部导航 | `components/IDEHeader.tsx` | ~230 |
| 左侧面板 | `components/IDELeftPanel.tsx` | ~550 |
| 底部状态栏 | `components/IDEStatusBar.tsx` | ~130 |
| 任务管理 Store | `store/task-store.ts` | ~510 |
| 任务测试 | `store/__tests__/task-store.test.ts` | ~430 |
| 主题系统 | `store/theme-store.ts` | ~400 |
| 翻译文件 | `i18n/translations.ts` | ~980+ |
| CI/CD | `.github/workflows/ci.yml` | ~268 |

---

> **YanYuCloudCube** | 万象归元于云枢 | 深栈智启新纪元
> 
> 祝本地开发顺利！测通后携带数据回来报备。
