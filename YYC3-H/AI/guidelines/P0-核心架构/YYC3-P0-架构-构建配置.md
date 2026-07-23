# YYC3 P0-架构-构建配置

## AI 角色定义

You are a senior build engineer and DevOps specialist with deep expertise in modern build tools, bundlers, and CI/CD pipelines.

### Code Standards

All code files must include proper file headers with:
- @file, @description, @author: YanYuCloudCube Team <admin@0379.email>
- @version, @created, @updated, @status, @license, @copyright, @tags

---

## 文档信息

| 字段 | 内容 |
|------|------|
| @file | P0-核心架构/YYC3-P0-架构-构建配置.md |
| @description | Vite 和 Tauri 构建配置，包含开发和生产环境配置 |
| @author | YanYuCloudCube Team <admin@0379.email> |
| @version | v1.0.0 |
| @created | 2026-03-14 |
| @status | stable |
| @tags | P0,architecture,build,vite,tauri |

---

## 配置目标

1. **快速开发**：优化开发体验，提高开发效率
2. **高效构建**：优化构建速度和产物大小
3. **类型安全**：完整的 TypeScript 支持
4. **代码规范**：集成 ESLint 和 Prettier
5. **测试支持**：集成测试框架

---

## Vite 配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: {{PORT}},
    host: true,
    open: true,
    hmr: { overlay: true },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: true, drop_debugger: true },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'editor-vendor': ['@tiptap/react', '@tiptap/starter-kit'],
          'ui-vendor': ['framer-motion', 'lucide-react'],
          'utils-vendor': ['dayjs', 'lodash-es'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@tiptap/react', '@tiptap/starter-kit', 'dayjs', 'zustand'],
  },
});
```

## TypeScript 配置

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## Tauri 配置

```json
{
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "devPath": "http://localhost:{{PORT}}",
    "distDir": "../dist"
  },
  "package": {
    "productName": "{{PROJECT_NAME}}",
    "version": "{{PROJECT_VERSION}}"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": { "all": false, "open": true },
      "dialog": { "all": false, "open": true, "save": true },
      "fs": {
        "all": false,
        "readFile": true, "writeFile": true, "readDir": true,
        "createDir": true, "removeDir": true, "removeFile": true,
        "renameFile": true, "exists": true
      },
      "path": { "all": false, "resolve": true },
      "notification": { "all": false, "send": true }
    },
    "bundle": {
      "active": true,
      "targets": "all",
      "identifier": "com.{{PROJECT_SLUG}}.app"
    },
    "security": { "csp": "default-src 'self'" }
  }
}
```

## ESLint 配置

```javascript
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', '@typescript-eslint', 'react', 'react-hooks'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
};
```

## Prettier 配置

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

## Package.json 脚本

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri dev",
    "tauri:build": "tauri build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx}\"",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "typecheck": "tsc --noEmit"
  }
}
```

## Cargo 配置

```toml
[package]
name = "{{PROJECT_SLUG}}"
version = "{{PROJECT_VERSION}}"
description = "{{PROJECT_DESCRIPTION}}"
authors = ["{{TEAM_NAME}}"]
license = "MIT"
edition = "2021"

[dependencies]
tauri = { version = "1.5", features = ["api-all"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1.0", features = ["full"] }
notify = "6.0"
chrono = "0.4"
sysinfo = "0.30"
arboard = "3.0"

[build-dependencies]
tauri-build = { version = "1.5", features = [] }
```

---

## 验收标准

- Vite 配置正确，开发服务器正常启动
- TypeScript 配置正确，类型检查通过
- Tauri 配置正确，桌面应用正常打包
- ESLint/Prettier 配置正确，代码规范检查通过
- 测试框架配置正确，测试可以运行
