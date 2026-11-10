# YYC3 P0-架构-项目初始化

## 阶段信息

- **阶段编号**: P0-01
- **优先级**: P0-Critical
- **复杂度**: 中等
- **预计时间**: 30分钟

---

## 阶段目标

初始化 YYC3 AI Code 项目，搭建基础架构，配置开发环境，确保项目可以正常启动和运行。

## 前置条件

- Node.js 20.11.0+
- pnpm 8.x+
- Git
- VS Code (推荐)

## 技术栈

- React 18.3.1
- TypeScript 5.3.3
- Vite 5.0.12
- Tauri (Latest)
- Lucide React 0.312.0

## 项目结构

```
{{PROJECT_NAME}}/
├── packages/
│   ├── core/          # Core business logic
│   ├── ui/            # UI components
│   └── shared/        # Shared utilities
├── src/
│   ├── main.tsx       # Entry point
│   ├── App.tsx        # Root component
│   ├── app/           # Application logic
│   └── components/    # Shared components
├── public/            # Static assets
├── docs/              # Documentation
├── tests/             # Test files
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
├── vite.config.ts
└── tauri.conf.json
```

## 必要任务

### 1. 初始化项目

```bash
mkdir {{PROJECT_NAME}}
cd {{PROJECT_NAME}}
git init
pnpm init
```

### 2. 安装核心依赖

```bash
pnpm add react@18.3.1 react-dom@18.3.1
pnpm add -D @types/react @types/react-dom
pnpm add -D vite@5.0.12 @vitejs/plugin-react@4.2.1
pnpm add -D @tauri-apps/cli@1.5.0
pnpm add @tauri-apps/api@1.5.0
pnpm add -D typescript@5.3.3
pnpm add lucide-react@0.312.0
```

### 3. 创建入口文件

```typescript
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### 4. 创建根组件

```typescript
// src/App.tsx
import React from 'react';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>{{PROJECT_NAME}}</h1>
        <p>{{BRAND_SLOGAN}}</p>
      </header>
      <main className="app-main">
        <p>Application initialized successfully!</p>
      </main>
    </div>
  );
}

export default App;
```

## 验证步骤

1. `pnpm install` - 依赖安装无错误
2. `pnpm dev` - 开发服务器在 http://localhost:{{PORT}} 正常启动
3. `pnpm tauri:dev` - Tauri 窗口正常打开
4. `pnpm typecheck` - 无 TypeScript 错误
5. `pnpm lint` - 无 ESLint 错误

## 验收标准

- 所有必需文件已创建
- 项目结构匹配规范
- 开发服务器正常启动
- Tauri 应用正常打开
- 无 TypeScript/ESLint 错误

## 下一步

1. P0-02: 架构-目录结构
2. P0-03: 架构-类型定义
3. P0-04: 架构-构建配置
