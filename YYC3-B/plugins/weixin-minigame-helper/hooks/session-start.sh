#!/bin/bash
# Session start hook for weixin-minigame-helper plugin
# Detects if the current directory is a WeChat Mini Game project
# and injects the minigame-dev skill context if so.

set -euo pipefail

PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILL_FILE="$PLUGIN_ROOT/skills/weixin-minigame-helper/SKILL.md"

# Check if current directory contains a game.js (WeChat Mini Game entry point)
IS_MINIGAME_PROJECT="false"
GAME_DIR=""

if [ -f "game.js" ]; then
  IS_MINIGAME_PROJECT="true"
  GAME_DIR="$(pwd)"
elif [ -f "src/game.js" ]; then
  IS_MINIGAME_PROJECT="true"
  GAME_DIR="$(pwd)/src"
fi

# Also check for project.config.json (WeChat dev tools config)
HAS_PROJECT_CONFIG="false"
if [ -f "project.config.json" ]; then
  HAS_PROJECT_CONFIG="true"
fi

if [ "$IS_MINIGAME_PROJECT" = "true" ]; then
  # Read skill content and JSON-escape it
  if [ -f "$SKILL_FILE" ]; then
    SKILL_CONTENT=$(cat "$SKILL_FILE" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))" 2>/dev/null || echo '""')
  else
    SKILL_CONTENT='""'
  fi

  CONTEXT="检测到微信小游戏项目 (game.js: $GAME_DIR)。已自动加载小游戏开发技能。你可以使用 /weixin-minigame-helper:preview 启动预览，/weixin-minigame-helper:device-test 真机测试，/weixin-minigame-helper:publish 发布。"

  cat <<EOF
{
  "hookSpecificOutput": {
    "additionalContext": "$(echo "$CONTEXT" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read())[1:-1])" 2>/dev/null || echo "$CONTEXT")"
  }
}
EOF
else
  # Not a mini game project — output empty context
  cat <<EOF
{
  "hookSpecificOutput": {}
}
EOF
fi
