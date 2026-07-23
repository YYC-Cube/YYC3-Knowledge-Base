# Codebuddy 开发容器

开发容器支持插件，让您可以在 Docker 容器中进行开发，享受一致、可复制的开发环境。

## ✨ 功能特性

### 🚀 核心功能

- **📝 配置文件支持** - 使用 `.devcontainer/devcontainer.json` 定义开发环境
- **🔗 容器附加** - 连接到已运行的 Docker 容器
- **📚 历史管理** - 在侧边栏查看和管理容器历史
- **🌐 远程支持** - 支持 SSH、WSL 等远程环境
- **⚙️ 自动配置** - 自动安装服务器和扩展
- **🔄 容器重建** - 支持重建容器镜像并重新打开工作区
- **🔌 端口管理** - 增强的端口转发，与 VS Code 端口面板深度集成

### 🎨 界面特性

- **可视化列表** - 清晰的容器列表视图
- **类型图标** - 区分不同类型的容器
  - 📦 配置容器
  - 🖥️ 附加容器
- **状态指示** - 活动容器显示绿色
- **快捷操作** - 一键打开或删除

## 📋 前置要求

### 必须安装

1. **Docker**
   - [macOS 安装](https://docs.docker.com/desktop/install/mac-install/)
   - [Windows 安装](https://docs.docker.com/desktop/install/windows-install/)
   - [Linux 安装](https://docs.docker.com/engine/install/)

2. **Codebuddy 编辑器**

### 验证安装

```bash
# 检查 Docker 版本
docker --version

# 测试 Docker 运行
docker run hello-world
```

## 🚀 快速开始

### 方法一：使用配置文件

#### 步骤 1：创建配置

在项目根目录创建 `.devcontainer/devcontainer.json`：

```json
{
  "name": "我的开发环境",
  "image": "node:18",
  "workspaceFolder": "/workspace",
  "forwardPorts": [3000]
}
```

#### 步骤 2：打开容器

**快捷方式**：
- 按 `Cmd/Ctrl + Shift + P`
- 输入 "Reopen in Container"
- 回车

**或者**：
- 右键点击 `devcontainer.json`
- 选择 "Open Folder in Container"

### 方法二：附加到容器

#### 步骤 1：运行容器

```bash
docker run -d \
  --name my-container \
  -v $(pwd):/workspace \
  node:18 \
  sleep infinity
```

#### 步骤 2：附加

- 按 `Cmd/Ctrl + Shift + P`
- 输入 "Attach to Running Container"
- 选择容器

### 方法三：重建容器

当您修改了配置或 Dockerfile 后：

#### 步骤 1：修改配置

更新 `Dockerfile` 或 `devcontainer.json`：

```dockerfile
FROM node:18
RUN apt-get update && apt-get install -y git
```

#### 步骤 2：重建

- 按 `Cmd/Ctrl + Shift + P`
- 输入 "Rebuild and Reopen in Container"
- 等待重建完成

**使用场景**：
- 修改了基础镜像
- 添加了新的系统依赖
- 更新了容器配置
- 需要重置容器环境

## 📖 详细使用

### 容器管理视图

#### 查看容器

1. 打开侧边栏
2. 找到 "远程资源管理器"
3. 展开 "Dev Containers (Codebuddy)"

#### 操作容器

- **打开容器**：点击 ➡️ 按钮
- **删除历史**：点击 🗑️ 按钮
- **刷新列表**：点击工具栏刷新按钮

### devcontainer.json 配置详解

#### 基础结构

```json
{
  "name": "项目名称",
  "image": "镜像名:标签",
  "workspaceFolder": "/workspace"
}
```

#### 使用 Dockerfile

```json
{
  "name": "自定义镜像",
  "build": {
    "dockerfile": "Dockerfile",
    "context": "..",
    "args": {
      "NODE_VERSION": "18"
    }
  }
}
```

#### 端口转发

```json
{
  "forwardPorts": [3000, 8080],
  "portsAttributes": {
    "3000": {
      "label": "前端服务",
      "onAutoForward": "notify"
    },
    "8080": {
      "label": "后端服务"
    }
  }
}
```

**增强功能**：
- 🔄 自动从配置文件读取并转发端口
- 📊 与 VS Code 端口面板深度集成
- ✅ 实时显示端口状态和访问地址
- ⚠️ 端口冲突检测和详细错误提示
- 🎛️ 支持手动管理和转发额外端口

#### 扩展安装

```json
{
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "ms-python.python"
      ],
      "settings": {
        "editor.formatOnSave": true
      }
    }
  }
}
```

#### 生命周期钩子

```json
{
  "postCreateCommand": "npm install && npm run build",
  "postStartCommand": "npm run dev",
  "postAttachCommand": "echo '容器已就绪！'"
}
```

#### 挂载本地文件

```json
{
  "mounts": [
    "source=${localWorkspaceFolder}/data,target=/data,type=bind",
    "source=project-cache,target=/root/.cache,type=volume"
  ]
}
```

#### 环境变量

```json
{
  "remoteEnv": {
    "NODE_ENV": "development",
    "DATABASE_URL": "postgresql://localhost/dev",
    "PATH": "${containerEnv:PATH}:/custom/bin"
  }
}
```

#### 完整示例

```json
{
  "name": "全栈开发环境",
  "dockerComposeFile": "docker-compose.yml",
  "service": "app",
  "workspaceFolder": "/workspace",
  "forwardPorts": [3000, 5432, 6379],
  "portsAttributes": {
    "3000": {"label": "Web"},
    "5432": {"label": "PostgreSQL"},
    "6379": {"label": "Redis"}
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "ms-python.python",
        "ms-azuretools.vscode-docker"
      ]
    }
  },
  "postCreateCommand": "npm install && pip install -r requirements.txt",
  "remoteUser": "node"
}
```

## ⚙️ 配置选项

### 服务器下载 URL

配置自定义的服务器下载地址：

```json
{
  "remote.codebuddyDevContainers.serverDownloadUrlTemplate": "https://your-cdn.com/${os}-${arch}/${version}.tar.gz"
}
```

**可用变量**：
- `${quality}` - stable/insider
- `${version}` - 版本号
- `${commit}` - 提交哈希
- `${os}` - linux/darwin
- `${arch}` - x64/arm64/aarch64

### SSH Agent 转发

启用或禁用 SSH Agent 转发：

```json
{
  "remote.codebuddyDevContainers.enableSSHAgentForwarding": true
}
```

### 跳过启动时生命周期命令

控制是否跳过 `postCreateCommand` 和 `postStartCommand`：

```json
{
  "remote.codebuddyDevContainers.skipPostCreate": true
}
```

**说明**：

- **启用（默认）**：容器启动时跳过 `postCreateCommand` 和 `postStartCommand`，只在 VS Code Server 安装后执行 `postAttachCommand`
  - ✅ 更快的连接速度
  - ✅ 可以立即进入容器
  - ✅ 适合大多数开发场景
  
- **禁用**：容器启动时执行所有生命周期命令
  - ⏱️ 需要等待命令执行完成才能连接
  - 🔧 适合需要在连接前完成环境初始化的场景

**最佳实践**：

如果您的 `postCreateCommand` 包含耗时操作（如 `npm install`），建议：

1. 保持 `skipPostCreate: true`（默认）
2. 将这些命令移到 `postAttachCommand`
3. 或者手动在容器终端中执行

**示例**：

```json
{
  // 快速启动模式（推荐）
  "postAttachCommand": "npm install && echo '依赖安装完成！'"
}
```

```json
{
  // 完整初始化模式
  "postCreateCommand": "apt-get update && apt-get install -y build-essential",
  "postStartCommand": "npm install",
  "postAttachCommand": "npm run dev"
}
```

## 🔧 常见问题

### ❌ Docker 找不到

**症状**：
```
Error: Docker executable not found in PATH or common locations
```

**解决方案**：

1. **检查 Docker 是否安装**
   ```bash
   docker --version
   ```

2. **确保 Docker 正在运行**
   - macOS/Windows: 打开 Docker Desktop
   - Linux: `sudo systemctl start docker`

3. **检查 PATH**
   ```bash
   which docker
   echo $PATH
   ```

4. **常见 Docker 位置**
   - macOS: `/usr/local/bin/docker`
   - Linux: `/usr/bin/docker`
   - Homebrew: `/opt/homebrew/bin/docker`

### ❌ 服务器下载失败

**症状**：
```
Error: Failed to download server from URL
curl: (52) Empty reply from server
```

**解决方案**：

1. **检查网络连接**
   ```bash
   curl -I https://codebuddy-server.com
   ```

2. **检查防火墙**
   - 确保允许 HTTPS 连接
   - 检查代理设置

3. **配置镜像源**
   ```json
   {
     "remote.codebuddyDevContainers.serverDownloadUrlTemplate": "https://mirror.example.com/${os}-${arch}/${version}.tar.gz"
   }
   ```

4. **手动下载测试**
   ```bash
   curl -o /tmp/test.tar.gz https://server-url
   ```

### ❌ 容器启动失败

**症状**：
```
Failed to start Dev Container
Container is not running
```

**解决方案**：

1. **检查配置文件**
   ```bash
   # 验证 JSON 格式
   cat .devcontainer/devcontainer.json | jq .
   ```

2. **手动测试镜像**
   ```bash
   docker pull node:18
   docker run -it node:18 bash
   ```

3. **查看容器日志**
   ```bash
   docker ps -a
   docker logs <container-id>
   ```

4. **检查端口冲突**
   ```bash
   # macOS/Linux
   lsof -i :3000
   
   # Windows
   netstat -ano | findstr :3000
   ```

### ❌ 权限问题

**症状**：
```
Permission denied
Cannot create directory
```

**解决方案**：

1. **设置正确的用户**
   ```json
   {
     "remoteUser": "node",
     "containerUser": "node"
   }
   ```

2. **修复文件权限**
   ```bash
   docker exec -u root <container> chown -R node:node /workspace
   ```

### ❌ Root 用户执行问题

**症状**：
```
grep: command not found
Script execution failed with root user
```

**解决方案**：

1. **安装必要工具**
   ```dockerfile
   FROM node:18
   RUN apt-get update && apt-get install -y grep coreutils
   ```

2. **使用非 root 用户**
   ```json
   {
     "remoteUser": "node",
     "containerUser": "node"
   }
   ```

3. **检查最小化镜像**
   - Alpine 等最小化镜像可能缺少基础工具
   - 考虑使用完整版镜像或手动安装工具

### ❌ 端口转发失败

**症状**：
```
Port 3000 is already in use
Failed to forward port
```

**解决方案**：

1. **检查端口占用**
   ```bash
   # macOS/Linux
   lsof -i :3000
   
   # 停止占用进程
   kill -9 <PID>
   ```

2. **查看详细日志**
   - 打开命令面板：`Cmd/Ctrl + Shift + P`
   - 运行 "Dev Containers: Show Log"
   - 查找端口转发相关错误信息

3. **更换端口**
   ```json
   {
     "forwardPorts": [3001, 8081]
   }
   ```

4. **检查防火墙**
   - 确保防火墙允许端口转发
   - 检查 Docker 网络配置

### 📋 查看日志

在 Codebuddy 中：

1. 按 `Cmd/Ctrl + Shift + P`
2. 输入 "Dev Containers: Show Log"
3. 查看详细日志

或者在终端：

```bash
# Docker 日志
docker logs <container-id>

# 容器内的服务器日志
docker exec <container-id> cat ~/.codebuddy-server/.*.log
```

## 📚 配置模板

### Node.js + TypeScript

```json
{
  "name": "Node.js TypeScript",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:18",
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode"
      ]
    }
  },
  "postCreateCommand": "npm install",
  "forwardPorts": [3000]
}
```

### Python + Flask

```json
{
  "name": "Python Flask",
  "image": "mcr.microsoft.com/devcontainers/python:3.11",
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-python.python",
        "ms-python.vscode-pylance"
      ]
    }
  },
  "postCreateCommand": "pip install -r requirements.txt",
  "forwardPorts": [5000]
}
```

### Go + 数据库

```json
{
  "name": "Go with Database",
  "dockerComposeFile": "docker-compose.yml",
  "service": "app",
  "workspaceFolder": "/workspace",
  "customizations": {
    "vscode": {
      "extensions": ["golang.go"]
    }
  },
  "forwardPorts": [8080, 5432]
}
```

对应的 `docker-compose.yml`：

```yaml
version: '3'
services:
  app:
    image: golang:1.21
    volumes:
      - ..:/workspace:cached
    command: sleep infinity
    depends_on:
      - postgres
  
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: mydb
```

### React + Node.js

```json
{
  "name": "React Full Stack",
  "image": "mcr.microsoft.com/devcontainers/javascript-node:18",
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "dsznajder.es7-react-js-snippets"
      ]
    }
  },
  "postCreateCommand": "npm install && cd client && npm install",
  "forwardPorts": [3000, 3001]
}
```

## 🎯 最佳实践

### 1. 版本固定

```json
{
  "image": "node:18.17.0",  // ✅ 好：固定版本
  // "image": "node:latest"  // ❌ 避免：使用 latest
}
```

### 2. 分层构建

```dockerfile
FROM node:18 as base
WORKDIR /app
COPY package*.json ./

FROM base as development
RUN npm install
COPY . .
```

### 3. 缓存优化

```json
{
  "mounts": [
    "source=node-modules-cache,target=/workspace/node_modules,type=volume"
  ]
}
```

### 4. 用户权限

```json
{
  "remoteUser": "node",
  "updateRemoteUserUID": true
}
```

### 5. 环境隔离

```json
{
  "remoteEnv": {
    "NODE_ENV": "development",
    "API_URL": "http://localhost:8080"
  }
}
```

## 🌍 支持平台

| 平台 | 状态 | 说明 |
|------|------|------|
| macOS (Intel) | ✅ | 完全支持 |
| macOS (Apple Silicon) | ✅ | 完全支持 |
| Linux (x64) | ✅ | 完全支持 |
| Linux (ARM64) | ✅ | 完全支持 |
| Windows + WSL 2 | ✅ | 推荐使用 WSL 2 |
| 远程 SSH | ✅ | 完全支持 |

## 📝 命令参考

| 命令 | 快捷键 | 说明 |
|------|--------|------|
| Reopen in Container | - | 在容器中重新打开 |
| Rebuild and Reopen in Container | - | 重建镜像并在容器中重新打开 |
| Open Folder in Container | - | 选择文件夹在容器中打开 |
| Attach to Running Container | - | 附加到运行的容器 |
| Reopen Folder Locally | - | 在本地重新打开 |
| Show Log | - | 显示日志 |
| Refresh | - | 刷新容器列表 |

## 🔍 技术架构

### 容器类型

1. **Config 类型**
   - 基于 `devcontainer.json`
   - 完整环境配置
   - 自动化设置
   - 图标：📦

2. **Container 类型**
   - 附加到现有容器
   - 快速开发
   - 简单配置
   - 图标：🖥️

### 工作流程

```
用户操作
   ↓
读取配置
   ↓
检查 Docker
   ↓
启动/附加容器
   ↓
安装服务器
   ↓
配置转发
   ↓
建立连接
   ↓
开发环境就绪
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

UNLICENSED

## 🔗 相关链接

- [Dev Containers 规范](https://containers.dev/)
- [Docker 文档](https://docs.docker.com/)
- [Codebuddy 官网](https://codebuddy.ai/)

---

**开始您的容器化开发之旅！** 🚀🐳
