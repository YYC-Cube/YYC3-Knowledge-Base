# YYC3 P0-架构-目录结构

## 文档信息

| 字段 | 内容 |
|------|------|
| @file | P0-核心架构/YYC3-P0-架构-目录结构.md |
| @description | 项目目录结构定义，基于最佳实践和模块化设计原则 |
| @author | YanYuCloudCube Team <admin@0379.email> |
| @version | v1.0.0 |
| @status | stable |
| @tags | P0,architecture,directory,structure |

---

## 设计原则

1. **模块化**：每个模块职责单一，高内聚低耦合
2. **可扩展性**：易于添加新功能和模块
3. **可维护性**：代码结构清晰，易于理解和修改
4. **一致性**：遵循统一的命名和结构规范
5. **分层架构**：清晰的层次结构

### 命名规范

- **目录名**: kebab-case
- **文件名**: kebab-case
- **组件名**: PascalCase
- **类型名**: PascalCase
- **常量名**: UPPER_SNAKE_CASE
- **函数名**: camelCase

---

## 完整目录结构

```
{{PROJECT_SLUG}}/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── cd.yml
│   │   └── release.yml
│   └── ISSUE_TEMPLATE/
├── .vscode/
│   ├── settings.json
│   ├── extensions.json
│   └── launch.json
├── public/
│   ├── favicon.ico
│   ├── logo.svg
│   └── assets/
├── src/
│   ├── api/
│   │   ├── client.ts
│   │   ├── endpoints/
│   │   └── types.ts
│   ├── assets/
│   │   ├── images/
│   │   ├── icons/
│   │   ├── fonts/
│   │   └── styles/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Modal/
│   │   │   └── index.ts
│   │   ├── layout/
│   │   │   ├── Header/
│   │   │   ├── Sidebar/
│   │   │   └── Footer/
│   │   ├── feedback/
│   │   │   ├── Toast/
│   │   │   └── Alert/
│   │   └── data-display/
│   │       ├── Table/
│   │       └── Card/
│   ├── contexts/
│   │   ├── ThemeContext.tsx
│   │   ├── AuthContext.tsx
│   │   └── LayoutContext.tsx
│   ├── editor/
│   │   ├── TipTapEditor.tsx
│   │   ├── MonacoEditor.tsx
│   │   ├── MarkdownEditor.tsx
│   │   ├── EditorToolbar.tsx
│   │   └── VersionHistory.tsx
│   ├── hooks/
│   │   ├── useDebounce.ts
│   │   ├── useThrottle.ts
│   │   ├── useLocalStorage.ts
│   │   └── useMediaQuery.ts
│   ├── layouts/
│   │   ├── MainLayout.tsx
│   │   ├── AuthLayout.tsx
│   │   └── EditorLayout.tsx
│   ├── pages/
│   │   ├── Home/
│   │   ├── Editor/
│   │   ├── Settings/
│   │   └── Collaboration/
│   ├── router/
│   │   ├── routes.ts
│   │   └── guards.ts
│   ├── services/
│   │   ├── auth/
│   │   ├── user/
│   │   └── project/
│   ├── storage/
│   │   ├── db.ts
│   │   ├── encryption.ts
│   │   ├── sync.ts
│   │   ├── storage-service.ts
│   │   └── cache.ts
│   ├── stores/
│   │   ├── useLayoutStore.ts
│   │   ├── useEditorStore.ts
│   │   ├── useAuthStore.ts
│   │   └── useProjectStore.ts
│   ├── types/
│   │   ├── index.ts
│   │   ├── api.ts
│   │   ├── models.ts
│   │   └── utils.ts
│   ├── utils/
│   │   ├── format.ts
│   │   ├── validation.ts
│   │   ├── date.ts
│   │   └── string.ts
│   ├── styles/
│   │   ├── globals.css
│   │   ├── variables.css
│   │   └── themes/
│   ├── constants/
│   ├── config/
│   ├── i18n/
│   │   ├── locales/
│   │   │   ├── zh-CN.json
│   │   │   └── en-US.json
│   │   └── i18n.ts
│   ├── tests/
│   │   ├── setup.ts
│   │   ├── utils.ts
│   │   └── mocks.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   ├── commands/
│   │   │   ├── mod.rs
│   │   │   ├── fs.rs
│   │   │   ├── dialog.rs
│   │   │   └── notification.rs
│   │   └── utils/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── build.rs
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
├── scripts/
├── .env.example
├── .gitignore
├── .eslintrc.js
├── .prettierrc
├── tsconfig.json
├── vite.config.ts
├── package.json
└── README.md
```

## 文件组织原则

### 推荐：混合组织

```
src/
├── components/       # 通用组件
├── features/         # 功能模块
│   ├── auth/
│   ├── editor/
│   └── collaboration/
├── shared/           # 共享资源
│   ├── hooks/
│   ├── utils/
│   └── types/
└── core/             # 核心配置
    ├── config/
    ├── constants/
    └── styles/
```

### 组件文件结构

```
components/ui/Button/
├── Button.tsx
├── Button.test.tsx
├── Button.stories.tsx
├── Button.types.ts
├── index.ts
└── README.md
```

## 验收标准

- 所有必需目录已创建
- 目录结构清晰合理
- 文件组织符合规范
- 命名规范统一
- 配置文件完整
