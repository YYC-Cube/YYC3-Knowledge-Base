#!/bin/bash

# 此脚本用于修改 VSCode 的 product.json 以启用 CodeBuddy Dev Containers 的 Proposed API

EXTENSION_ID="CodeBuddy.codebuddy-dev-containers"

# 检测操作系统并设置 product.json 路径
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    PRODUCT_JSON="/Applications/Visual Studio Code.app/Contents/Resources/app/product.json"
    VSCODE_BIN="/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    PRODUCT_JSON="/usr/share/code/resources/app/product.json"
    VSCODE_BIN="/usr/bin/code"
else
    echo "❌ 不支持的操作系统: $OSTYPE"
    echo ""
    echo "Windows 用户请参考 INSTALL.md 使用命令行参数方式"
    exit 1
fi

echo "========================================================"
echo "修改 VSCode product.json 启用 Proposed API"
echo "========================================================"
echo ""
echo "Product.json 路径: $PRODUCT_JSON"
echo "扩展 ID: $EXTENSION_ID"
echo ""

# 检查文件是否存在
if [ ! -f "$PRODUCT_JSON" ]; then
    echo "❌ 找不到 product.json 文件"
    echo "   路径: $PRODUCT_JSON"
    exit 1
fi

# 检查是否有权限
if [ ! -w "$PRODUCT_JSON" ]; then
    echo "⚠️  需要管理员权限来修改 product.json"
    echo ""
    echo "正在尝试使用 sudo 修改..."
    echo ""
fi

# 创建 Python 脚本来修改 JSON
cat > /tmp/modify_product_json.py << 'PYTHON'
import json
import sys

product_json_path = sys.argv[1]
extension_id = sys.argv[2]

try:
    # 读取 product.json
    with open(product_json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 确保 extensionEnabledApiProposals 字段存在
    if "extensionEnabledApiProposals" not in data:
        data["extensionEnabledApiProposals"] = {}
    
    # 添加扩展的 API proposals
    if extension_id not in data["extensionEnabledApiProposals"]:
        data["extensionEnabledApiProposals"][extension_id] = ["resolvers", "contribViewsRemote"]
        print(f"✅ 已添加 {extension_id} 的 API proposals: resolvers, contribViewsRemote")
    else:
        current = data["extensionEnabledApiProposals"][extension_id]
        print(f"ℹ️  {extension_id} 已存在，当前配置: {current}")
        # 确保包含所需的 API
        needed_apis = ["resolvers", "contribViewsRemote"]
        updated = False
        for api in needed_apis:
            if api not in current:
                current.append(api)
                updated = True
        if updated:
            data["extensionEnabledApiProposals"][extension_id] = current
            print(f"✅ 已更新配置: {current}")
        else:
            print("✅ 配置已是最新")
            sys.exit(0)
    
    # 写回文件
    with open(product_json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print("")
    print("✅ product.json 修改成功！")
    
except Exception as e:
    print(f"❌ 错误: {e}", file=sys.stderr)
    sys.exit(1)
PYTHON

# 尝试修改文件
if [ -w "$PRODUCT_JSON" ]; then
    python3 /tmp/modify_product_json.py "$PRODUCT_JSON" "$EXTENSION_ID"
else
    sudo python3 /tmp/modify_product_json.py "$PRODUCT_JSON" "$EXTENSION_ID"
fi

EXIT_CODE=$?

# 清理临时文件
rm /tmp/modify_product_json.py

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "========================================================"
    echo "配置完成！"
    echo "========================================================"
    echo ""
    echo "⚠️  重要提示："
    echo "1. 请完全退出 VSCode（确保所有窗口都关闭）"
    echo "2. 重新启动 VSCode"
    echo "3. 插件将自动启用 Proposed API"
    echo ""
    echo "注意：VSCode 更新后需要重新运行此脚本"
    echo ""
else
    echo ""
    echo "❌ 配置失败"
    echo ""
    echo "替代方案：使用命令行参数启动 VSCode"
    echo "  code --enable-proposed-api $EXTENSION_ID"
    echo ""
fi
