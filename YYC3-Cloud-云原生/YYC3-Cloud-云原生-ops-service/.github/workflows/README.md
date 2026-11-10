# GitHub Actions 工作流说明

本目录包含项目的 CI/CD 工作流配置。

## 工作流文件

### 1. ci.yml - 持续集成

**触发条件**:
- Push 到 `main` 或 `develop` 分支
- 针对 `main` 或 `develop` 的 Pull Request

**任务**:
- `fmt` - 代码格式检查
- `clippy` - Rust linter 检查
- `test` - 运行所有测试（包括单元测试和集成测试）
- `build` - 构建并打包项目

**输出产物**:
- `ops-system-binary` - 编译后的二进制文件
- `ops-system-package` - 完整的构建包（保留7天）

### 2. release.yml - 发布构建

**触发条件**:
- 推送 tag（格式：`v*.*.*`，例如 `v1.0.0`）
- 手动触发（workflow_dispatch）

**任务**:
- `build-x86_64` - 为 Linux x86_64 平台构建包
- `build-arm64` - 为 Linux ARM64 平台构建包（使用交叉编译）
- `create-release` - 创建 GitHub Release 并上传发布包

**输出产物**:
- `ops-system-linux-x86_64` - x86_64 平台包（保留30天）
- `ops-system-linux-arm64` - ARM64 平台包（保留30天）
- GitHub Release（包含 tar.gz 归档和 SHA256 校验和）

### 3. tests.yml - 测试工作流

独立的测试工作流，用于更详细的测试验证。

### 4. test.yml - 测试工作流

额外的测试工作流配置。

## 使用方法

### 日常开发

每次 push 或创建 PR 时，CI 会自动运行：

```bash
git add .
git commit -m "feat: add new feature"
git push origin feature-branch
```

CI 会自动：
1. 检查代码格式
2. 运行 Clippy 检查
3. 运行所有测试
4. 构建并验证包

### 创建发布版本

#### 方法 1：通过 Git Tag

```bash
# 创建版本 tag
git tag v1.0.0

# 推送 tag 到远程
git push origin v1.0.0
```

这会自动触发 release.yml 工作流，构建所有平台的发布包并创建 GitHub Release。

#### 方法 2：手动触发

1. 访问 GitHub 仓库
2. 点击 "Actions" 标签
3. 选择 "Release Build" 工作流
4. 点击 "Run workflow"
5. 选择分支
6. 勾选 "Create GitHub Release"（可选）
7. 点击 "Run workflow"

## 构建平台支持

### x86_64 (原生编译)

- 运行环境：`ubuntu-latest`
- 目标平台：`x86_64-unknown-linux-gnu`
- 构建方式：原生编译
- 构建时间：约 5-10 分钟

### ARM64 (交叉编译)

- 运行环境：`ubuntu-latest`
- 目标平台：`aarch64-unknown-linux-gnu`
- 构建方式：交叉编译（使用 `gcc-aarch64-linux-gnu`）
- 构建时间：约 10-15 分钟

## 下载构建产物

### 从 CI 工作流下载

1. 进入 GitHub Actions 页面
2. 选择对应的工作流运行
3. 滚动到页面底部的 "Artifacts" 部分
4. 下载所需的构建产物

### 从 Release 下载

1. 访问仓库的 Releases 页面
2. 选择对应的版本
3. 下载对应平台的 tar.gz 文件
4. 验证 SHA256 校验和

```bash
# 下载并验证
wget https://github.com/xxx/ops-system/releases/download/v1.0.0/ops-system-1.0.0-linux-x86_64.tar.gz
wget https://github.com/xxx/ops-system/releases/download/v1.0.0/ops-system-1.0.0-linux-x86_64.tar.gz.sha256

# 验证校验和
sha256sum -c ops-system-1.0.0-linux-x86_64.tar.gz.sha256
```

## 性能优化

工作流使用了以下优化策略：

1. **依赖缓存**
   - Cargo registry 缓存
   - Cargo git 依赖缓存
   - Target 目录缓存

2. **并行构建**
   - x86_64 和 ARM64 并行构建
   - 互不影响，提高效率

3. **条件执行**
   - CI 每次都运行
   - Release 仅在 tag 或手动触发时运行

## 故障排查

### CI 构建失败

**问题**：格式检查失败
```bash
# 本地运行格式化
cargo fmt
```

**问题**：Clippy 检查失败
```bash
# 本地运行 clippy
cargo clippy -- -D warnings
```

**问题**：测试失败
```bash
# 本地运行测试
make test-all
```

**问题**：包构建失败
```bash
# 本地尝试构建
make package-x86_64
make package-validate
```

### Release 构建失败

**问题**：ARM64 交叉编译失败
- 检查 `.cargo/config.toml` 配置
- 确保工具链版本兼容

**问题**：创建 Release 失败
- 检查 tag 格式（必须是 `v*.*.*`）
- 确保 GitHub Token 有足够权限

## 本地测试

在推送前，可以在本地模拟 CI 流程：

```bash
# 运行完整的 CI 检查
make ci

# 构建包
make package

# 验证包
make package-validate

# 创建发布归档
make dist-all
```

## 配置修改

### 修改触发条件

编辑 `.github/workflows/ci.yml` 或 `release.yml` 中的 `on:` 部分。

### 修改构建平台

1. 在 `release.yml` 中添加新的 job
2. 复制现有的 `build-x86_64` job
3. 修改目标平台和工具链

### 添加新的构建步骤

在对应的 job 中添加新的 `- name:` 步骤。

## 相关文档

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [项目 README](../../README.md)
- [构建脚本文档](../../scripts/build/README.md)
