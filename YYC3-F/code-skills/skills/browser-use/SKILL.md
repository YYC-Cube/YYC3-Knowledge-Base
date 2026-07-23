---
name: browser-use
description: "Browser automation via the browser-use CLI. Navigate websites, click elements, fill forms, take screenshots, extract data, manage cookies, run multi-session browsers, expose tunnels, and automate web workflows. Use when user needs to interact with web pages, scrape data, fill forms, automate workflows, test websites, or control cloud browsers. Install: curl -fsSL https://browser-use.com/cli/install.sh | bash"
description_zh: "浏览器自动化（导航、点击、截图、数据提取、多会话、云浏览器）"
description_en: "Browser automation: navigate, click, screenshot, extract data, multi-session"
version: 2.0.0
allowed-tools: Bash,Read
metadata:
  clawdbot:
    emoji: "🌐"
    requires:
      bins:
        - browser-use
    install:
      - package-manager: curl
        command: "curl -fsSL https://browser-use.com/cli/install.sh | bash"
---

# Browser-Use CLI — 浏览器自动化

通过 `browser-use` 命令行工具控制浏览器，支持持久会话（~50ms 延迟）、多会话并行、云浏览器、本地隧道等功能。

## 安装

```bash
# macOS / Linux
curl -fsSL https://browser-use.com/cli/install.sh | bash

# 安装后验证
browser-use doctor
```

## 标准工作流

浏览器在命令之间持久运行，无需每次重启。

### 1. 打开网页

```bash
browser-use open https://example.com
```

### 2. 查看页面状态（获取可交互元素及索引）

```bash
browser-use state
# 返回 URL、标题、所有可点击元素及其索引号
```

### 3. 交互操作

```bash
# 点击元素（使用 state 返回的索引号）
browser-use click 5

# 在输入框中输入文字（点击 + 输入）
browser-use input 3 "搜索内容"

# 通用打字（输入到当前焦点元素）
browser-use type "Hello World"

# 滚动页面
browser-use scroll down
browser-use scroll up
browser-use scroll down --amount 1000

# 悬停 / 双击 / 右键
browser-use hover 7
browser-use dblclick 4
browser-use rightclick 2

# 键盘按键
browser-use keys Enter
browser-use keys "Control+a"

# 下拉框选择
browser-use select 4 "option-value"

# 上传文件
browser-use upload 6 /path/to/file.pdf
```

### 4. 获取数据

```bash
# 截图
browser-use screenshot page.png
browser-use screenshot --full fullpage.png

# 执行 JavaScript 获取数据
browser-use eval "document.title"
browser-use eval "Array.from(document.querySelectorAll('h2')).map(h=>h.textContent)"

# 获取元素信息
browser-use get title
browser-use get html
browser-use get html --selector "main"
browser-use get text 5
browser-use get value 3
browser-use get attributes 2
browser-use get bbox 4
```

### 5. 等待条件

```bash
browser-use wait selector ".loading" --state hidden
browser-use wait text "Success"
browser-use wait selector "h1" --timeout 5000
```

### 6. 页面导航

```bash
browser-use back
browser-use tab list
browser-use tab new https://example.com
browser-use tab switch 2
browser-use tab close
```

### 7. 结束

```bash
browser-use close
browser-use close --all
```

## 全局选项

| 选项 | 说明 |
|------|------|
| `--headed` | 显示浏览器窗口（默认无头模式） |
| `--profile [NAME]` | 使用真实 Chrome 配置（保留登录态、Cookie） |
| `--connect` | 自动连接已运行的 Chrome |
| `--cdp-url <url>` | 通过 CDP URL 连接浏览器 |
| `--session NAME` | 命名会话（支持多浏览器并行） |
| `--json` | JSON 格式输出 |
| `--mcp` | 以 MCP 服务器模式运行 |

## 使用真实 Chrome 配置

```bash
# 使用 Default 配置，已登录的网站无需重新登录
browser-use --profile open https://mail.google.com

# 使用指定 Chrome 配置
browser-use --profile "Profile 1" open https://example.com
```

## 多会话并行

```bash
# 启动两个独立的浏览器会话
browser-use --session work open https://app.example.com
browser-use --session personal open https://social.example.com

# 分别操作
browser-use --session work click 3
browser-use --session personal type "hello"

# 查看活跃会话
browser-use sessions
```

## Cookie 管理

```bash
browser-use cookies get
browser-use cookies get --url https://example.com
browser-use cookies set token abc123 --domain .example.com --secure
browser-use cookies export cookies.json
browser-use cookies import cookies.json
browser-use cookies clear
```

## Python 自动化脚本

```bash
# 执行 Python（持久会话，变量跨命令保留）
browser-use python "
for i in range(5):
    browser.scroll('down')
    browser.wait(0.5)
"

# 运行 Python 文件
browser-use python --file script.py

# 查看已定义变量
browser-use python --vars
```

## 云浏览器

```bash
# 保存 API key
browser-use cloud login sk-abc123...

# 启动云浏览器
browser-use cloud connect

# 创建自动化任务
browser-use cloud v2 POST /tasks '{"task":"搜索 AI 新闻","url":"https://google.com"}'
```

## 本地隧道（暴露本地服务）

```bash
# 将本地 3000 端口暴露到公网
browser-use tunnel 3000
# → 返回公网 URL，可供云浏览器访问

browser-use tunnel list
browser-use tunnel stop 3000
```

## 典型场景示例

### 网页数据采集

```bash
browser-use open https://news.ycombinator.com
browser-use eval "JSON.stringify([...document.querySelectorAll('.titleline a')].map(a=>({title:a.textContent,href:a.href})).slice(0,10))"
browser-use close
```

### 表单填写

```bash
browser-use open https://example.com/signup
browser-use state                       # 找到表单元素索引
browser-use input 2 "user@example.com"
browser-use input 3 "password123"
browser-use click 5                     # 点击提交
browser-use screenshot result.png
browser-use close
```

### 搜索并截图

```bash
browser-use open https://www.google.com
browser-use state
browser-use input 2 "browser-use github"
browser-use keys Enter
browser-use screenshot search.png
browser-use close
```

## 故障排除

| 问题 | 解决方案 |
|------|---------|
| Chromium not found | `browser-use install` |
| 页面加载超时 | 使用 `wait` 命令或检查网络 |
| 元素索引不对 | 重新运行 `state` 获取最新索引 |
| 需要登录态 | 使用 `--profile` 选项 |
| Windows ARM64 | 安装 x64 版 Python（通过模拟运行） |
| 守护进程错误 | `taskkill /IM python.exe /F`（Windows） |
