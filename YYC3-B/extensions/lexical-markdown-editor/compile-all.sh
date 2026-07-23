#!/bin/bash

# Lexical Markdown Editor 完整编译脚本
# 编译扩展主体 + webview

set -e  # 遇到错误立即退出

echo "🔨 开始完整编译 Lexical Markdown Editor..."
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 编译扩展主体
echo "📦 [1/2] 编译扩展主体 (TypeScript -> JavaScript)..."
npm run compile

echo ""

# 编译 webview
echo "🎨 [2/2] 编译 webview (React + Lexical)..."
cd webview
npm run build
cd ..

echo ""
echo "✅ 完整编译完成！"
echo ""
echo "📁 输出目录："
echo "   - 扩展主体: ./out/"
echo "   - Webview:  ./webview/dist/"
echo ""
echo "💡 重启 VS Code 调试会话以加载最新代码"
