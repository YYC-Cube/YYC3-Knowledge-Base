#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# clean-dsstore.sh — 5 级目录递归检索并删除 .DS_Store 文件
# 用法: ./clean-dsstore.sh [目标目录]（默认当前目录）
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

TARGET="${1:-.}"
COUNT=0

echo "═════════════════════════════════════════════"
echo "  .DS_Store 清理工具 · 5 级目录深度检索"
echo "  目标: $TARGET"
echo "═════════════════════════════════════════════"
echo ""

# 逐级检索（1~5 级），跳过 .git 目录
for depth in 1 2 3 4 5; do
  echo "▶ 第 ${depth} 级目录检索中..."
  while IFS= read -r -d '' file; do
    rm -f "$file"
    COUNT=$((COUNT + 1))
    echo "  ✗ 已删除: $file"
  done < <(find "$TARGET" -maxdepth "$depth" -mindepth "$depth" -name ".DS_Store" -not -path "*/.git/*" -print0 2>/dev/null)
done

echo ""
echo "═════════════════════════════════════════════"
echo "  完成: 共删除 $COUNT 个 .DS_Store 文件"
echo "═════════════════════════════════════════════"
