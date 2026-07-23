# WeChat Mini Game Preview - WorkBuddy Plugin

[![WorkBuddy Plugin](https://img.shields.io/badge/WorkBuddy-Plugin-purple.svg)](https://github.com/)
[![微信小游戏](https://img.shields.io/badge/微信-小游戏-green.svg)](https://developers.weixin.qq.com/minigame/dev/)
[![MCP Support](https://img.shields.io/badge/MCP-Supported-orange.svg)](https://modelcontextprotocol.io/)

微信小游戏预览、真机测试和发布工具。作为 **WorkBuddy 插件**运行，为 AI Agent 提供小游戏开发能力。

## ✨ 核心特性

### 🎮 小游戏预览
- **浏览器预览**：在本地浏览器中实时运行微信小游戏
- **实时重载**：代码修改后自动检测变更
- **多机型模拟**：iPhone、Android、iPad 等设备尺寸
- **微信 API 兼容**：完整的 `wx` API 模拟层

### 🤖 AI Agent 集成
- **Skill**：`weixin-minigame-helper` — AI 自动在生成代码后启动预览
- **Agent**：`weixin-minigame-helper` — 专用的游戏预览/调试 Agent
- **Commands**：`/weixin-minigame-helper:preview`、`/weixin-minigame-helper:device-test`、`/weixin-minigame-helper:publish`
- **MCP 工具**：5 个工具 — run_game, reload_game, get_logs, real_device_preview, publish
- **Hooks**：自动检测小游戏项目并加载开发技能

### 📱 真机测试
- **二维码生成**：一键生成真机测试二维码
- **配置管理**：通过浏览器 UI 或环境变量配置 AppID 和密钥
- **CI/CD 集成**：支持自动化上传和测试流程

## 🚀 快速开始

### 安装插件

1. **构建插件**
   ```bash
   # 在 ai-minigame-engine 根目录执行
   npm run build:workbuddy
   ```

2. **安装到 WorkBuddy**
   - 打开 WorkBuddy，点击左侧**插件**图标
   - 点击插件市场旁边的 **+** 按钮
   - 将 `dist/workbuddy-marketplace` 目录设置为 marketplace 路径
  - 在插件列表中找到 **weixin-minigame-helper** 并点击安装
   - 重启 CodeBuddy 使插件生效

### 使用方式

安装此插件后，AI 会自动获得小游戏预览能力：

1. **自动检测**：打开小游戏项目目录，AI 会话启动时自动加载 `weixin-minigame-helper` skill
2. **使用斜杠命令**：
   - `/weixin-minigame-helper:preview` — 启动游戏预览
   - `/weixin-minigame-helper:device-test` — 真机测试
   - `/weixin-minigame-helper:publish 1.0.0` — 发布到微信
3. **自然语言交互**："帮我做一个打砖块小游戏"，AI 生成代码后会自动启动预览

## 🔗 MCP 集成

### WorkBuddy 插件自动注册

作为 WorkBuddy 插件安装后，MCP 工具自动可用，无需手动配置。

### 手动配置（其他 AI 工具）

在 AI 工具的 MCP 配置中添加：

```json
{
  "mcpServers": {
    "weixin-minigame-helper": {
      "command": "node",
      "args": ["/path/to/ai-minigame-engine/dist/workbuddy/mcp/index.js"]
    }
  }
}
```

### MCP 工具一览

| 工具 | 功能 | 参数 |
|------|------|------|
| `run_game` | 启动游戏预览 | `workspacePath` |
| `reload_game` | 热重载游戏 | — |
| `get_logs` | 获取游戏日志 | `filter`（可选正则） |
| `real_device_preview` | 真机预览 | `workspacePath` |
| `publish` | 发布到微信 | `workspacePath`, `version`, `desc` |

## 🧩 weixin-minigame-helper Skill

### 触发时机

**预览流程：**
- 用户在开发小游戏/微信小游戏，代码开发完成时
- 用户说"预览小游戏"、"运行小游戏"、"看看效果"等意图

**发布流程：**
- 用户说"真机测试"、"发布小游戏"、"上传体验版"、"上传微信"等意图

### 功能流程

1. **预览流程**
   - 自动校验项目结构（`game.js`、`game.json`、`project.config.json`）
   - 启动本地静态服务器，支持后台运行
   - 自动注入微信 `wx` API 兼容层
   - 实时监听并返回错误信息

2. **发布流程**
   - 调用微信 CI 工具上传代码
   - 智能检测配置问题（AppID、密钥、IP 白名单）
   - 提供详细的配置指引和错误提示

## 🌐 微信小游戏 API 兼容性

本插件提供了完整的微信小游戏 API 兼容层，支持：

### 核心 API
- ✅ `wx.createCanvas()` - Canvas 创建
- ✅ `wx.request()` - 网络请求
- ✅ `wx.getStorageSync()` - 本地存储
- ✅ `wx.createImage()` - 图片处理
- ✅ `wx.createAudioContext()` - 音频处理

### 游戏相关 API
- ✅ `wx.onAccelerometerChange()` - 加速度计
- ✅ `wx.onGyroscopeChange()` - 陀螺仪
- ✅ `wx.vibrateShort()` - 震动反馈
- ✅ `wx.getBatteryInfo()` - 电池信息

### 系统 API
- ✅ `wx.getSystemInfo()` - 系统信息
- ✅ `wx.getNetworkType()` - 网络类型
- ✅ `wx.onMemoryWarning()` - 内存警告

## 🔒 安全考虑

### 密钥管理
- 私钥支持环境变量配置敏感信息
- 建议不要将私钥提交到代码仓库

### 沙箱环境
- 预览运行在隔离的沙箱环境中
- 限制文件系统访问权限
- 防止恶意代码执行

## ❓ 常见问题

**Q: 提示"这不是一个标准的微信小游戏结构"**
A: 确保项目包含以下文件：
- `game.js`（入口文件）
- `game.json`（游戏配置）
- `project.config.json`（项目配置）

**Q: 提示"IP 白名单错误"**
A: 在微信公众平台添加本机 IP：
- 路径：开发 → 开发设置 → IP白名单

**Q: 提示"缺少配置"**
A: 设置环境变量或在 `project.config.json` 中配置 `appid` 字段
---

**Happy Coding!** 🎉

*让微信小游戏开发更加高效和愉快*