#!/bin/bash
# agent-browser setup script
# Checks if agent-browser is installed and installs it if needed

set -e

INIT_FLAG="${CODEBUDDY_PLUGIN_ROOT}/.initialized"

# Check if Windows (via MSYSTEM or OS env var)
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ -n "$WINDIR" ]]; then
    echo "⚠️ agent-browser 目前不支持 Windows 系统"
    echo "请使用 macOS 或 Linux"
    exit 0
fi

# Check if already initialized
if [ -f "$INIT_FLAG" ]; then
    exit 0
fi

# Check if agent-browser is installed
if command -v agent-browser &> /dev/null; then
    echo "✅ agent-browser 已安装"
    touch "$INIT_FLAG"
    exit 0
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ 未找到 npm，请先安装 Node.js"
    echo "安装地址: https://nodejs.org/"
    exit 0
fi

echo "🔧 正在安装 agent-browser..."
echo ""

# Install agent-browser globally
npm install -g agent-browser

if [ $? -eq 0 ]; then
    echo ""
    echo "📦 正在下载 Chromium..."
    agent-browser install
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ agent-browser 安装完成！"
        touch "$INIT_FLAG"
    else
        echo "❌ Chromium 下载失败，请手动执行: agent-browser install"
    fi
else
    echo "❌ agent-browser 安装失败"
    echo "请手动执行: npm install -g agent-browser && agent-browser install"
fi
