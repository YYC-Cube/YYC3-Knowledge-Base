#!/bin/bash
# ============================================================
#  YYC3 项目清理脚本 v2 - 稳定版 (兼容 bash/zsh)
#  清理范围：当前目录下所有依赖包目录 + .git 仓库
#  用法: cd <目标目录> && ./qlgit.sh
# ============================================================

set -u

# ---- 配置区 ----
MAX_DEPTH=6          # 最大搜索嵌套层级
TARGET_DIRS=(
    "node_modules"
    ".git"
    "__pycache__"
    ".venv"
    "venv"
    ".virtualenv"
    "vendor"
    "dist"
    ".next"
    ".cache"
    ".nuxt"
    ".output"
    ".turbo"
    "build"
    ".svelte-kit"
)

# ---- 颜色 ----
RED='\033[0;31m'; GREEN='\033[0;32m'
YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

# ---- 头部 ----
echo ""
echo -e "${CYAN}======================================================${NC}"
echo -e "${CYAN}  YYC3 项目清理脚本 v2 (稳定版)${NC}"
echo -e "${CYAN}======================================================${NC}"
echo ""
echo -e "  工作目录: ${YELLOW}$(pwd)${NC}"
echo -e "  搜索深度: ${MAX_DEPTH} 级嵌套"
echo -e "  清理目标:"
for d in "${TARGET_DIRS[@]}"; do echo -e "    - $d"; done
echo ""

# ---- 直接执行（无需确认）----
echo -e "  ${YELLOW}自动执行清理，跳过确认${NC}"

# ---- 用临时文件收集目标列表（规避 eval 兼容性问题）----
TMPFILE=$(mktemp /tmp/qlgit_XXXXXX)
trap 'rm -f "$TMPFILE"' EXIT

for target in "${TARGET_DIRS[@]}"; do
    find . -maxdepth "$MAX_DEPTH" -type d -name "$target" >> "$TMPFILE" 2>/dev/null
done

# 去重排序
sort -u "$TMPFILE" -o "$TMPFILE"

TOTAL=$(wc -l < "$TMPFILE" | tr -d ' ')

echo ""
echo -e "${CYAN}[1/3] 扫描完成${NC}"

if [ "$TOTAL" -eq 0 ]; then
    echo -e "  ${GREEN}未发现需要清理的目录${NC}\n"; exit 0
fi

echo -e "  发现 ${RED}${TOTAL}${NC} 个目标目录，准备删除..."
echo ""
echo -e "${CYAN}[2/3] 执行删除...${NC}"

# ---- 逐项删除 ----
DELETED=0; FAILED=0; FAILED_LIST=""

while IFS= read -r dir; do
    [ -z "$dir" ] && continue

    # 跳过根 .git（保护自身仓库）
    if [ "$dir" = "./.git" ] || [ "$dir" = ".git" ]; then
        echo -e "  ${YELLOW}! 跳过根 .git${NC}"
        continue
    fi

    project_name=$(echo "$dir" | sed 's|^\./||' | cut -d'/' -f1)
    target_name=$(basename "$dir")
    echo -ne "  删除 ${CYAN}$project_name${NC}/${RED}$target_name${NC} ... "

    if rm -rf "$dir" 2>/dev/null; then
        echo -e "${GREEN}OK${NC}"
        DELETED=$((DELETED + 1))
    else
        echo -e "${GREEN}FAIL${NC}"
        FAILED=$((FAILED + 1))
        FAILED_LIST="${FAILED_LIST}  - $dir
"
    fi
done < "$TMPFILE"

# ---- 验证残留 ----
echo ""
echo -e "${CYAN}[3/3] 验证残留...${NC}"

TMPFILE2=$(mktemp /tmp/qlgit_XXXXXX)
for target in "${TARGET_DIRS[@]}"; do
    find . -maxdepth "$MAX_DEPTH" -type d -name "$target" >> "$TMPFILE2" 2>/dev/null
done
sort -u "$TMPFILE2" -o "$TMPFILE2"
REMAINING=$(wc -l < "$TMPFILE2" | tr -d ' ')
rm -f "$TMPFILE2"

# ---- 汇总 ----
echo ""
echo -e "${CYAN}======================================================${NC}"
echo -e "  清理完成！汇总报告:${NC}"
echo -e "${CYAN}======================================================${NC}"
echo -e "  目标总数:   $TOTAL"
echo -e "  成功删除:   ${GREEN}$DELETED${NC}"
echo -e "  删除失败:   ${RED}$FAILED${NC}"
echo -e "  残留数量:   $REMAINING"

if [ "$FAILED" -gt 0 ]; then
    echo -e "\n  ${RED}失败列表:${NC}\n$FAILED_LIST"
fi

if [ "$REMAINING" -gt 0 ]; then
    echo -e "\n  ${YELLOW}残留目录:${NC}"
else
    echo -e "\n  ${GREEN}零残留，全部清理干净${NC}"
fi

echo -e "${CYAN}======================================================${NC}\n"
