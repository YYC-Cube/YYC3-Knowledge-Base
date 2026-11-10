# agent-browser Plugin

Browser automation plugin for CodeBuddy Code using [Vercel's agent-browser](https://github.com/vercel-labs/agent-browser) CLI.

## Features

- **Auto-install**: Automatically installs agent-browser on first session start
- **Browser Skill**: Teaches CodeBuddy to use agent-browser for web interactions
- **Manual Install Command**: `/agent-browser:install` for manual installation

## System Requirements

- **macOS** or **Linux** (Windows not supported)
- **Node.js** 18+ with npm
- ~500MB disk space for Chromium

## Usage

Once installed, CodeBuddy will automatically use agent-browser when you ask to:

- Open or browse websites
- Take screenshots of web pages
- Fill forms or click buttons
- Extract content from web pages
- Perform browser automation tasks

### Example prompts:

- "打开 https://example.com 并截图"
- "访问网站并提取页面内容"
- "帮我填写登录表单"
- "查看这个网页的内容"

## Manual Installation

If auto-install fails, run:

```
/agent-browser:install
```

Or manually in terminal:

```bash
npm install -g agent-browser
agent-browser install
```

## How it Works

1. **SessionStart Hook**: On each session start, checks if agent-browser is installed
2. **Auto-install**: If not installed, automatically runs `npm install -g agent-browser && agent-browser install`
3. **Skill**: Provides guidance on using agent-browser commands

## agent-browser Commands

| Command | Description |
|---------|-------------|
| `agent-browser launch` | Start browser |
| `agent-browser open <url>` | Navigate to URL |
| `agent-browser snapshot` | Get page content |
| `agent-browser screenshot` | Take screenshot |
| `agent-browser click <sel>` | Click element |
| `agent-browser type <sel> <text>` | Type text |
| `agent-browser close` | Close browser |

## Troubleshooting

### Linux missing dependencies

```bash
agent-browser install --with-deps
```

### Command not found after install

Restart your terminal or run:
```bash
source ~/.bashrc  # or ~/.zshrc
```

## License

MIT
