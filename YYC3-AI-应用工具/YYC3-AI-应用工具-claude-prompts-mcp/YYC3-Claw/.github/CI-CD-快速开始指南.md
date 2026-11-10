# YYC3 Family AI - CI/CD 快速开始指南

## 🎯 概述

基于 CI/CD 全链路智能核心落地性指导建议报告，我们为 YYC3 Family AI 项目创建了完整的 CI/CD 系统，支持自动化构建、测试、质量检查和部署到 GitHub Pages（https://code.yyccube.xin）。

## 📦 已创建的文件

### CI/CD Workflow 文件

| 文件 | 功能 | 适用场景 |
|------|------|----------|
| [.github/workflows/ci-cd-basic.yml](.github/workflows/ci-cd-basic.yml) | 基础 CI/CD | 项目初期、简单需求 |
| [.github/workflows/ci-cd-enhanced.yml](.github/workflows/ci-cd-enhanced.yml) | 增强版 + 报告 | 团队协作、质量可见性 |
| [.github/workflows/ci-cd-advanced.yml](.github/workflows/ci-cd-advanced.yml) | 高级版 + 注释 | 质量要求高、大型项目 |
| [.github/workflows/ci-cd-intelligent.yml](.github/workflows/ci-cd-intelligent.yml) | 智能版 + 趋势分析 | 智能化、数据分析 |

### 配置文件

| 文件 | 用途 |
|------|------|
| [package.json](package.json) | 项目依赖和脚本 |
| [vite.config.ts](vite.config.ts) | Vite 构建配置 |
| [tsconfig.json](tsconfig.json) | TypeScript 配置 |
| [tsconfig.node.json](tsconfig.node.json) | Node TypeScript 配置 |
| [.eslintrc.cjs](.eslintrc.cjs) | ESLint 规则 |
| [.prettierrc](.prettierrc) | Prettier 格式化 |
| [.gitignore](.gitignore) | Git 忽略规则 |
| [public/CNAME](public/CNAME) | 自定义域名配置 |

### 文档文件

| 文件 | 内容 |
|------|------|
| [CI-CD-实施指南.md](CI-CD-实施指南.md) | 详细的实施指南 |
| [CI-CD-智能核心落地性指导建议报告.md](CI-CD-智能核心落地性指导建议报告.md) | 深度分析报告 |

## 🚀 快速开始

### 步骤 1：选择 Workflow 版本

根据项目需求选择合适的 workflow：

```bash
# 项目初期 - 使用基础版
.github/workflows/ci-cd-basic.yml

# 团队协作 - 使用增强版
.github/workflows/ci-cd-enhanced.yml

# 质量要求高 - 使用高级版
.github/workflows/ci-cd-advanced.yml

# 追求智能化 - 使用智能版
.github/workflows/ci-cd-intelligent.yml
```

### 步骤 2：推送到 GitHub

```bash
# 添加所有文件
git add .

# 提交更改
git commit -m "feat: add complete CI/CD system for YYC3 Family AI"

# 推送到 GitHub
git push origin main
```

### 步骤 3：配置 GitHub Pages

1. 进入仓库 **Settings** → **Pages**
2. **Source** 选择 "GitHub Actions"
3. **Custom domain** 设置为 `code.yyccube.xin`
4. 等待部署完成（约 2-5 分钟）

### 步骤 4：验证部署

访问 https://code.yyccube.xin 验证站点是否正常运行。

## 🔧 本地开发

### 安装依赖

```bash
# 使用 pnpm 安装依赖
pnpm install
```

### 开发命令

```bash
# 启动开发服务器
pnpm dev

# 运行类型检查
pnpm typecheck

# 运行 lint
pnpm lint

# 运行测试
pnpm test

# 生成覆盖率报告
pnpm test:coverage

# 构建生产版本
pnpm build

# 预览构建结果
pnpm preview
```

## 📊 Workflow 特性对比

### 基础版 (ci-cd-basic.yml)

**核心功能：**
- ✅ 自动化构建和测试
- ✅ Lint 和类型检查
- ✅ GitHub Pages 自动部署
- ✅ 基础质量保障

**适用场景：**
- 项目初期验证
- 简单的 CI/CD 需求
- 快速部署和反馈

### 增强版 (ci-cd-enhanced.yml)

**核心功能：**
- ✅ 基础版所有功能
- ✅ 测试覆盖率生成
- ✅ Markdown 和 CSV 报告
- ✅ PR 自动评论
- ✅ 构建信息追踪

**适用场景：**
- 需要质量报告
- 团队协作项目
- 需要质量可见性

### 高级版 (ci-cd-advanced.yml)

**核心功能：**
- ✅ 增强版所有功能
- ✅ ESLint 错误注释（reviewdog）
- ✅ 测试结果注释（dorny/test-reporter）
- ✅ GitHub Checks API 集成
- ✅ 持续质量监控

**适用场景：**
- 代码质量要求高
- 需要实时反馈
- 大型团队项目

### 智能版 (ci-cd-intelligent.yml)

**核心功能：**
- ✅ 高级版所有功能
- ✅ 质量趋势分析
- ✅ Mermaid 趋势图
- ✅ CSV 统计数据
- ✅ 优化建议生成

**适用场景：**
- 追求智能化
- 需要数据分析
- 持续改进的团队

## 🎨 自定义域名配置

### DNS 配置

在域名服务商（如阿里云、腾讯云）添加 CNAME 记录：

```
类型: CNAME
主机记录: code
记录值: YYC-Cube.github.io
TTL: 3600
```

### 验证 DNS

```bash
# 检查 DNS 解析
dig code.yyccube.xin

# 检查 HTTPS 证书
curl -I https://code.yyccube.xin
```

### GitHub Pages 配置

1. 在仓库中创建 `public/CNAME` 文件
2. 内容为：`code.yyccube.xin`
3. 在 GitHub Settings → Pages 中配置自定义域名
4. 等待 HTTPS 证书生成（24-48 小时）

## 📈 质量指标

### 当前项目指标

- **测试文件**: 21 个
- **测试用例**: 585 个
- **通过率**: 97.3%
- **覆盖率**: 85%+
- **TypeScript 文件**: 150+ 个
- **React 组件**: 80+ 个

### 目标指标

- **测试通过率**: >= 97%
- **代码覆盖率**: >= 85%
- **构建时间**: <= 5 分钟
- **部署成功率**: >= 99%

## 🔍 监控和调试

### 查看 Workflow 运行

1. 进入仓库 **Actions** 标签页
2. 选择最新的 workflow run
3. 查看各个 job 的执行情况
4. 点击 job 查看详细日志

### 常见问题

**Q: Workflow 失败怎么办？**
- 查看 Actions 日志中的错误信息
- 检查依赖是否正确安装
- 验证测试是否本地通过
- 检查构建配置是否正确

**Q: 部署后无法访问域名？**
- 检查 DNS 配置是否正确
- 等待 DNS 传播（最多 48 小时）
- 验证 CNAME 文件内容
- 检查 GitHub Pages 设置

**Q: 如何自定义 Workflow？**
- 修改 `.github/workflows/*.yml` 文件
- 推送到 GitHub 触发更新
- 可以使用 `workflow_dispatch` 手动触发

## 📚 相关文档

- [CI-CD-实施指南.md](CI-CD-实施指南.md) - 详细的实施指南
- [CI-CD-智能核心落地性指导建议报告.md](CI-CD-智能核心落地性指导建议报告.md) - 深度分析报告
- [README.md](README.md) - 项目概述和开发指南

## 🤝 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

CI/CD 会自动运行，确保代码质量。

## 📞 技术支持

- **团队**: YanYuCloudCube Team
- **邮箱**: admin@0379.email
- **GitHub**: https://github.com/YYC-Cube/YYC3-Family-AI
- **部署域名**: https://code.yyccube.xin

## 🎉 下一步

1. **选择合适的 workflow 版本**并推送到 GitHub
2. **配置 GitHub Pages**并验证部署
3. **配置自定义域名**的 DNS 记录
4. **监控 CI/CD 运行**并优化流程
5. **根据团队需求**逐步升级 workflow 版本

---

**文档版本**: v1.0
**最后更新**: 2026-03-22
**维护团队**: YanYuCloudCube Team
**项目**: YYC3 Family AI - CI/CD 快速开始指南