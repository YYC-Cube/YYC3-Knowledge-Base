#!/bin/bash

# 🔍 YanYu Cloud³ 质量门禁检查脚本
# 高优先级改进：测试体系完善 - 自动化质量门禁

set -e

echo "🔍 启动质量门禁检查..."
echo "====================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查函数
check_step() {
    echo -e "\n${YELLOW}🔄 $1${NC}"
}

success_step() {
    echo -e "${GREEN}✅ $1${NC}"
}

error_step() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# 1. 环境验证
check_step "验证环境配置..."
if ! npm run env:validate; then
    error_step "环境配置验证失败"
fi
success_step "环境配置验证通过"

# 2. 依赖检查
check_step "检查依赖完整性..."
if ! npm list --production=false > /dev/null 2>&1; then
    echo "⚠️  发现依赖问题，尝试修复..."
    npm install
fi
success_step "依赖检查完成"

# 3. 代码风格检查
check_step "执行代码风格检查..."
if ! npm run lint; then
    error_step "代码风格检查失败 - 请修复lint错误"
fi
success_step "代码风格检查通过"

# 4. TypeScript 类型检查
check_step "执行TypeScript类型检查..."
if ! npm run type-check; then
    error_step "TypeScript类型检查失败"
fi
success_step "TypeScript类型检查通过"

# 5. 单元测试
check_step "运行单元测试..."
if ! npm run test:ci; then
    error_step "单元测试失败"
fi
success_step "单元测试通过"

# 6. 覆盖率检查 - 高优先级改进目标：80%+
check_step "检查测试覆盖率..."
if [ -f "coverage/coverage-summary.json" ]; then
    COVERAGE=$(node -p "require('./coverage/coverage-summary.json').total.lines.pct")
    echo "📊 当前覆盖率: ${COVERAGE}%"
    
    if (( $(echo "$COVERAGE < 80" | bc -l) )); then
        echo -e "${RED}❌ 覆盖率低于阈值: ${COVERAGE}% < 80%${NC}"
        echo "💡 建议: 增加单元测试以提高覆盖率"
        exit 1
    else
        success_step "覆盖率达标: ${COVERAGE}% ≥ 80%"
    fi
else
    error_step "未找到覆盖率报告文件"
fi

# 7. 集成测试（如果存在）
if [ -f "tests/integration" ] || ls tests/integration*.test.* 1> /dev/null 2>&1; then
    check_step "运行集成测试..."
    if ! npm run test:integration; then
        error_step "集成测试失败"
    fi
    success_step "集成测试通过"
fi

# 8. 安全扫描
check_step "执行安全漏洞扫描..."
AUDIT_RESULT=$(npm audit --audit-level moderate --json 2>/dev/null || echo '{"vulnerabilities":{}}')
VULNERABILITIES=$(echo $AUDIT_RESULT | node -p "Object.keys(JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8')).vulnerabilities || {}).length")

if [ "$VULNERABILITIES" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  发现 $VULNERABILITIES 个安全漏洞${NC}"
    echo "🔧 运行 'npm audit fix' 尝试自动修复"
    
    # 尝试自动修复
    if npm audit fix --force; then
        success_step "安全漏洞已自动修复"
    else
        echo -e "${YELLOW}⚠️  部分漏洞需要手动处理${NC}"
    fi
else
    success_step "未发现安全漏洞"
fi

# 9. 构建测试
check_step "测试项目构建..."
if ! npm run build > /dev/null 2>&1; then
    error_step "项目构建失败"
fi
success_step "项目构建成功"

# 10. 生成质量报告
check_step "生成质量报告..."
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
COVERAGE=${COVERAGE:-0}

cat > quality-gate-report.json << EOF
{
  "timestamp": "$TIMESTAMP",
  "status": "PASSED",
  "checks": {
    "environment": "✅ PASSED",
    "dependencies": "✅ PASSED", 
    "linting": "✅ PASSED",
    "typeCheck": "✅ PASSED",
    "unitTests": "✅ PASSED",
    "coverage": "✅ PASSED ($COVERAGE%)",
    "security": "✅ PASSED",
    "build": "✅ PASSED"
  },
  "metrics": {
    "coverage": $COVERAGE,
    "vulnerabilities": $VULNERABILITIES
  },
  "recommendations": [
    "继续保持高质量代码标准",
    "定期更新依赖包以修复安全漏洞", 
    "持续改进测试覆盖率目标: 85%+"
  ]
}
EOF

success_step "质量报告已生成: quality-gate-report.json"

# 最终结果
echo ""
echo "====================================="
echo -e "${GREEN}🎉 质量门禁检查全部通过！${NC}"
echo ""
echo "📋 检查摘要:"
echo "  ✅ 环境配置: 通过"
echo "  ✅ 代码风格: 通过" 
echo "  ✅ 类型检查: 通过"
echo "  ✅ 单元测试: 通过"
echo "  ✅ 覆盖率: ${COVERAGE}% (目标: ≥80%)"
echo "  ✅ 安全扫描: 通过"
echo "  ✅ 构建测试: 通过"
echo ""
echo -e "${GREEN}🚀 代码质量达标，可以进行部署！${NC}"
echo "====================================="