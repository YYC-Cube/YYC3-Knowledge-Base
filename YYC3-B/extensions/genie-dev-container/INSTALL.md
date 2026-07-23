# CodeBuddy Dev Containers 安装说明

由于此插件使用了 VSCode Proposed API (resolvers)，需要特殊配置才能使用。

## 快速安装（推荐）

### 步骤 1: 安装 VSIX 文件

在 VSCode 中：
1. 打开扩展面板 (Cmd+Shift+X 或 Ctrl+Shift+X)
2. 点击右上角的 "..." 菜单
3. 选择 "从 VSIX 安装..."
4. 选择 `codebuddy-dev-containers-0.0.1.vsix` 文件

### 步骤 2: 启用 Proposed API

运行项目根目录下的脚本：

```bash
./enable-proposed-api.sh
```

### 步骤 3: 重启 VSCode

完全退出 VSCode（确保所有窗口都关闭），然后重新启动。

插件现在应该可以正常工作了！

---

## 替代方法

如果上述方法不起作用，可以使用以下替代方法：

### 方法 1: 使用命令行参数（每次启动）

每次启动 VSCode 时使用：

```bash
code --enable-proposed-api CodeBuddy.codebuddy-dev-containers
```

### 方法 2: 创建启动别名（macOS/Linux）

添加到 `~/.bashrc` 或 `~/.zshrc`：

```bash
alias code='code --enable-proposed-api CodeBuddy.codebuddy-dev-containers'
```

### 方法 3: 手动修改 product.json

**macOS:**
```bash
sudo nano /Applications/Visual\ Studio\ Code.app/Contents/Resources/app/product.json
```

**Linux:**
```bash
sudo nano /usr/share/code/resources/app/product.json
```

添加或修改以下内容：

```json
{
  "extensionEnabledApiProposals": {
    "CodeBuddy.codebuddy-dev-containers": ["resolvers", "contribViewsRemote"]
  }
}
```

---

## 常见问题

### Q: VSCode 更新后插件无法使用

A: VSCode 更新会重置 `product.json`，需要重新运行 `enable-proposed-api.sh` 脚本。

### Q: 脚本执行失败

A: 
1. 确保有 Python 3 环境
2. 尝试使用 sudo 权限运行脚本
3. 使用替代方法 1（命令行参数）

### Q: 插件安装后看不到任何功能

A: 
1. 确保已正确启用 Proposed API
2. 打开开发者工具（帮助 > 切换开发人员工具）查看控制台错误
3. 完全重启 VSCode

---

## 验证安装

安装并配置后，应该能在以下位置看到插件功能：

1. **侧边栏**: Remote Explorer 视图中会显示 "Dev Containers (CodeBuddy)"
2. **命令面板**: 搜索 "Dev Containers" 可以看到相关命令
3. **输出面板**: 选择 "CodeBuddy Remote" 频道可以看到日志

---

## 技术说明

本插件使用了 VSCode 的 Proposed API，这些 API 默认只在开发模式下可用。通过修改 `product.json` 或使用命令行参数，可以在生产环境中启用这些 API。

使用的 Proposed APIs:
- `resolvers`: 用于实现远程开发容器连接
- `contribViewsRemote`: 用于在 Remote Explorer 中显示视图
