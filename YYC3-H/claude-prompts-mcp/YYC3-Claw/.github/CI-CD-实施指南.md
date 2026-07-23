# YYC3 Family AI - CI/CD 实施指南

## 项目概述

YYC³（YanYuCloudCube）Family AI 是一个基于 React/TypeScript 的多联式低码智能编程平台，本指南详细说明了如何为该项目配置和实施完整的 CI/CD 系统，实现自动化构建、测试、质量检查和部署到 GitHub Pages。

**项目信息：**
- **仓库名称**: YYC-Cube/YYC3-Family-AI
- **部署域名**: https://code.yyccube.xin
- **技术栈**: React 18 + TypeScript 5.8 + Vite 6.3
- **包管理器**: pnpm 8+

## CI/CD 系统架构

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                   GitHub Actions                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │         build-and-test Job                     │  │
│  │  - Checkout                                 │  │
│  │  - Setup Node.js + pnpm                     │  │
│  │  - Install Dependencies                      │  │
│  │  - Run Lint                                │  │
│  │  - Run Type Check                           │  │
│  │  - Run Tests                                │  │
│  │  - Generate Coverage                         │  │
│  │  - Generate Reports                          │  │
│  │  - Build Project                           │  │
│  └──────────────────────────────────────────────────┘  │
│                      ↓                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │         deploy Job (needs build-and-test)      │  │
│  │  - Deploy to GitHub Pages                   │  │
│  │  - URL: https://code.yyccube.xin          │  │
│  └──────────────────────────────────────────────────┘  │
│                      ↓                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │    pr-comment Job (if PR)                    │  │
│  │  - Download Reports                         │  │
│  │  - Comment on PR                           │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Workflow 文件说明

我们提供了三个版本的 CI/CD workflow，根据项目需求选择合适的版本：

#### 1. 基础版 ([ci-cd-basic.yml](.github/workflows/ci-cd-basic.yml))

**适用场景：**
- 项目初期
- 简单的 CI/CD 需求
- 快速验证和部署

**核心功能：**
- ✅ 自动化构建和测试
- ✅ Lint 和类型检查
- ✅ GitHub Pages 自动部署
- ✅ 基础质量保障

**触发条件：**
- Push 到 `main` 或 `develop` 分支
- Pull Request 到 `main` 或 `develop` 分支
- 手动触发

#### 2. 增强版 ([ci-cd-enhanced.yml](.github/workflows/ci-cd-enhanced.yml))

**适用场景：**
- 需要质量报告
- 团队协作项目
- 需要质量可见性

**核心功能：**
- ✅ 基础版所有功能
- ✅ 测试覆盖率生成
- ✅ Markdown 和 CSV 报告
- ✅ PR 自动评论
- ✅ 构建信息追踪

**额外特性：**
- 详细的测试摘要
- 质量指标记录
- 构建产物上传

#### 3. 高级版 ([ci-cd-advanced.yml](.github/workflows/ci-cd-advanced.yml))

**适用场景：**
- 代码质量要求高
- 需要实时反馈
- 大型团队项目

**核心功能：**
- ✅ 增强版所有功能
- ✅ ESLint 错误注释（reviewdog）
- ✅ 测试结果注释（dorny/test-reporter）
- ✅ GitHub Checks API 集成
- ✅ 持续质量监控

**额外特性：**
- 错误直接显示在 PR diff 中
- 测试结果可视化
- 质量门槛机制

#### 4. 智能版 ([ci-cd-intelligent.yml](.github/workflows/ci-cd-intelligent.yml))

**适用场景：**
- 追求智能化
- 需要数据分析
- 持续改进的团队

**核心功能：**
- ✅ 高级版所有功能
- ✅ 质量趋势分析
- ✅ Mermaid 趋势图
- ✅ CSV 统计数据
- ✅ 优化建议生成

**额外特性：**
- 质量趋势可视化
- 智能优化建议
- 数据分析支持

## 实施步骤

### 阶段一：环境准备（1-2 天）

#### 1.1 GitHub 仓库配置

1. **启用 GitHub Pages**
   - 进入仓库 Settings → Pages
   - Source 选择 "GitHub Actions"
   - 保存配置

2. **配置域名**
   - 在仓库根目录创建 `public/CNAME` 文件
   - 内容：`code.yyccube.xin`
   - DNS 配置：添加 CNAME 记录指向 `YYC-Cube.github.io`

3. **设置权限**
   - Settings → Actions → General
   - Workflow permissions: "Read and write permissions"
   - 启用 "Allow GitHub Actions to create and approve pull requests"

#### 1.2 本地环境配置

1. **安装依赖**
```bash
# 确保 Node.js 版本 >= 18
node --version

# 安装 pnpm（如果未安装）
npm install -g pnpm

# 安装项目依赖
pnpm install
```

2. **验证配置**
```bash
# 运行类型检查
pnpm typecheck

# 运行 lint
pnpm lint

# 运行测试
pnpm test

# 构建项目
pnpm build
```

### 阶段二：基础 CI/CD 部署（2-3 天）

#### 2.1 选择 Workflow 版本

根据项目需求选择合适的 workflow：

- **小型项目/初期**: 使用 `ci-cd-basic.yml`
- **中型项目/团队协作**: 使用 `ci-cd-enhanced.yml`
- **大型项目/质量要求高**: 使用 `ci-cd-advanced.yml`
- **追求智能化/数据分析**: 使用 `ci-cd-intelligent.yml`

#### 2.2 部署 Workflow

1. **复制 workflow 文件**
```bash
# 确保文件存在于 .github/workflows/ 目录
ls -la .github/workflows/
```

2. **推送到 GitHub**
```bash
git add .github/workflows/
git commit -m "feat: add CI/CD workflow"
git push origin main
```

3. **验证 Workflow**
   - 进入仓库 Actions 标签页
   - 查看最新 workflow 运行状态
   - 检查是否成功完成

#### 2.3 验证部署

1. **检查构建状态**
   - Actions 标签页 → 选择 workflow run
   - 查看各个 job 的执行情况

2. **访问部署站点**
   - 等待 deploy job 完成
   - 访问 https://code.yyccube.xin
   - 验证站点正常运行

### 阶段三：质量保障增强（3-5 天）

#### 3.1 配置质量检查

1. **启用 ESLint 注释**（高级版和智能版）
   - 确保仓库有 `checks: write` 权限
   - reviewdog 会自动注释 lint 错误

2. **配置测试报告**
   - dorny/test-reporter 会生成可视化测试报告
   - 在 PR 中查看测试结果

3. **设置质量门槛**
   - 根据团队标准调整通过率要求
   - 建议测试通过率 >= 95%

#### 3.2 配置 PR 评论

1. **启用自动评论**
   - marocchino/sticky-pull-request-comment 会自动更新评论
   - 评论会显示测试摘要和质量报告

2. **配置评论内容**
   - 根据需要修改报告模板
   - 添加自定义指标和说明

### 阶段四：监控和优化（持续进行）

#### 4.1 监控指标

**关键指标：**
- Workflow 成功率：目标 >= 95%
- 构建时间：目标 <= 5 分钟
- 测试通过率：目标 >= 97%
- 部署成功率：目标 >= 99%

**监控工具：**
- GitHub Actions Dashboard
- GitHub Insights
- 自定义监控脚本

#### 4.2 持续优化

**优化方向：**
- 构建时间优化：缓存依赖、并行执行
- 测试优化：提高覆盖率、减少执行时间
- 报告优化：增强可读性、添加更多指标

## 配置文件说明

### 核心配置文件

#### 1. [package.json](package.json)

**关键脚本：**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  }
}
```

**重要依赖：**
- React 18.3.1
- TypeScript 5.8
- Vite 6.3
- Vitest 4.0
- Zustand 5.0

#### 2. [vite.config.ts](vite.config.ts)

**关键配置：**
```typescript
export default defineConfig({
  build: {
    outDir: 'dist',  // GitHub Pages 需要的输出目录
    sourcemap: true,
  },
  server: {
    port: 3000,
  },
})
```

#### 3. [tsconfig.json](tsconfig.json)

**路径别名：**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@ide/*": ["./src/components/ide/*"]
    }
  }
}
```

#### 4. [.eslintrc.cjs](.eslintrc.cjs)

**关键规则：**
```javascript
{
  rules: {
    'react-refresh/only-export-components': ['warn'],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn']
  }
}
```

#### 5. [public/CNAME](public/CNAME)

**域名配置：**
```
code.yyccube.xin
```

### GitHub Actions 配置

#### Workflow 权限

```yaml
permissions:
  contents: read        # 读取代码
  pages: write         # 写入 GitHub Pages
  id-token: write      # OIDC 认证
  checks: write        # 写入 Checks（高级版和智能版）
```

#### 并发控制

```yaml
concurrency:
  group: "pages"
  cancel-in-progress: false  # 不取消正在进行的部署
```

## 域名配置

### DNS 配置

1. **添加 CNAME 记录**
   - 类型: CNAME
   - 名称: code
   - 值: YYC-Cube.github.io
   - TTL: 3600

2. **验证 DNS**
```bash
# 检查 DNS 解析
dig code.yyccube.xin

# 检查 HTTPS 证书
curl -I https://code.yyccube.xin
```

### GitHub Pages 配置

1. **在仓库中创建 CNAME 文件**
   - 路径: `public/CNAME`
   - 内容: `code.yyccube.xin`

2. **在 GitHub 设置中配置**
   - Settings → Pages
   - Custom domain: `code.yyccube.xin`
   - Enforce HTTPS: ✅

### HTTPS 配置

GitHub Pages 会自动为自定义域名提供 SSL 证书：

1. **等待证书生成**
   - 通常需要 24-48 小时
   - 在 Pages 设置中查看状态

2. **验证 HTTPS**
   - 访问 https://code.yyccube.xin
   - 检查浏览器地址栏的锁图标

## 常见问题

### Q1: Workflow 失败怎么办？

**排查步骤：**
1. 查看 Actions 日志中的错误信息
2. 检查依赖是否正确安装
3. 验证测试是否本地通过
4. 检查构建配置是否正确

**常见错误：**
- 依赖安装失败：检查 package.json
- 测试失败：运行 `pnpm test` 本地调试
- 构建失败：检查 TypeScript 错误

### Q2: 部署后无法访问域名？

**解决方法：**
1. 检查 DNS 配置是否正确
2. 等待 DNS 传播（最多 48 小时）
3. 验证 CNAME 文件内容
4. 检查 GitHub Pages 设置

### Q3: 如何自定义 Workflow？

**修改位置：**
- Workflow 文件: `.github/workflows/*.yml`
- 报告模板: 在 workflow 的 `run` 步骤中修改
- 构建配置: `vite.config.ts`

**注意事项：**
- 修改后需要推送到 GitHub
- 可以先在 fork 仓库中测试
- 使用 `workflow_dispatch` 手动触发测试

### Q4: 如何添加新的质量检查？

**添加步骤：**
1. 在 `build-and-test` job 中添加新的 step
2. 使用 `continue-on-error: true` 避免阻塞
3. 生成相应的报告
4. 上传到 artifacts

**示例：**
```yaml
- name: Run security scan
  run: npm audit
  continue-on-error: true
```

### Q5: 如何优化构建时间？

**优化策略：**
1. 启用依赖缓存
2. 并行执行独立任务
3. 使用 `pnpm` 加速依赖安装
4. 减少不必要的检查

**缓存配置：**
```yaml
- name: Cache pnpm modules
  uses: actions/cache@v3
  with:
    path: ~/.pnpm-store
    key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
```

## 最佳实践

### 开发流程

1. **创建功能分支**
```bash
git checkout -b feature/amazing-feature
```

2. **开发和测试**
```bash
pnpm dev          # 开发
pnpm lint         # 检查代码
pnpm typecheck    # 类型检查
pnpm test         # 运行测试
```

3. **提交代码**
```bash
git add .
git commit -m "feat: add amazing feature"
git push origin feature/amazing-feature
```

4. **创建 PR**
   - 在 GitHub 上创建 Pull Request
   - CI/CD 会自动运行
   - 查看评论中的质量报告

5. **合并代码**
   - 确保 CI/CD 通过
   - 代码审查通过
   - 合并到主分支

### 代码质量

1. **保持高测试覆盖率**
   - 目标: >= 85%
   - 关键路径: 100%

2. **遵循代码规范**
   - 使用 ESLint 和 Prettier
   - 提交前运行 `pnpm lint`
   - 遵循 YYC3 代码规范

3. **及时修复问题**
   - 关注 PR 评论
   - 快速响应 CI 失败
   - 保持主分支稳定

### 团队协作

1. **代码审查**
   - 每个代码变更都需要审查
   - 关注代码质量和安全性
   - 提供建设性反馈

2. **知识分享**
   - 定期分享最佳实践
   - 更新文档和注释
   - 培训新成员

3. **持续改进**
   - 定期回顾 CI/CD 流程
   - 收集团队反馈
   - 优化工作流程

## 监控和维护

### 日常监控

**每日检查：**
- Workflow 运行状态
- 构建成功率
- 测试通过率

**每周回顾：**
- 质量趋势
- 构建时间变化
- 团队反馈

### 定期维护

**每月任务：**
- 更新依赖版本
- 优化构建流程
- 审查安全漏洞

**每季度任务：**
- 评估 CI/CD 策略
- 升级工具和服务
- 优化成本和性能

## 技术支持

### 文档资源

- [GitHub Actions 官方文档](https://docs.github.com/en/actions)
- [Vite 构建文档](https://vitejs.dev/guide/build.html)
- [Vitest 测试文档](https://vitest.dev/guide/)
- [YYC3 开发指南](README-Development-Guide.md)

### 联系方式

- **团队**: YanYuCloudCube Team
- **邮箱**: admin@0379.email
- **GitHub**: https://github.com/YYC-Cube/YYC3-Family-AI

## 附录

### A. Workflow 文件对比

| 特性 | 基础版 | 增强版 | 高级版 | 智能版 |
|------|---------|---------|---------|---------|
| 自动构建测试 | ✅ | ✅ | ✅ | ✅ |
| GitHub Pages 部署 | ✅ | ✅ | ✅ | ✅ |
| 质量报告 | ❌ | ✅ | ✅ | ✅ |
| PR 评论 | ❌ | ✅ | ✅ | ✅ |
| 错误注释 | ❌ | ❌ | ✅ | ✅ |
| 趋势分析 | ❌ | ❌ | ❌ | ✅ |
| 优化建议 | ❌ | ❌ | ❌ | ✅ |
| 复杂度 | 低 | 中 | 高 | 高 |

### B. 快速命令参考

```bash
# 开发
pnpm dev              # 启动开发服务器
pnpm build           # 构建生产版本
pnpm preview         # 预览构建结果

# 质量检查
pnpm lint            # ESLint 检查
pnpm typecheck       # TypeScript 类型检查
pnpm format          # Prettier 格式化

# 测试
pnpm test            # 运行测试
pnpm test:watch      # 监听模式
pnpm test:coverage   # 生成覆盖率
```

### C. 环境变量

**GitHub Secrets:**
- `GITHUB_TOKEN`: 自动提供，用于 API 访问

**本地环境变量:**
- `NODE_ENV`: development/production
- `VITE_API_URL`: API 端点（如需要）

---

**文档版本**: v1.0
**最后更新**: 2026-03-22
**维护团队**: YanYuCloudCube Team
**项目**: YYC3 Family AI - CI/CD 实施指南