#!/bin/bash
# 在远程 SSH 主机上运行此脚本来诊断容器终端问题
# Usage: bash check-container-tty.sh <container-id>

CONTAINER_ID="${1:-0809892220b1fc3aec521efc4f603c3fdeefc6ba8db6c282daf35fc53b63810e}"

echo "========================================="
echo "检查容器 TTY 和终端配置"
echo "Container: $CONTAINER_ID"
echo "========================================="
echo ""

echo "1. 检查容器是否在运行："
docker ps --filter "id=$CONTAINER_ID" --format "table {{.ID}}\t{{.Status}}\t{{.Command}}"
echo ""

echo "2. 检查容器的 TTY 配置："
docker inspect "$CONTAINER_ID" --format '{"Tty": {{.Config.Tty}}, "OpenStdin": {{.Config.OpenStdin}}, "StdinOnce": {{.Config.StdinOnce}}}'
echo ""

echo "3. 检查容器的完整启动命令："
docker inspect "$CONTAINER_ID" --format 'Cmd: {{.Config.Cmd}}'
docker inspect "$CONTAINER_ID" --format 'Entrypoint: {{.Config.Entrypoint}}'
echo ""

echo "4. 检查容器主进程："
docker inspect "$CONTAINER_ID" --format 'PID: {{.State.Pid}}'
docker exec "$CONTAINER_ID" ps aux | head -20
echo ""

echo "5. 测试是否可以在容器中执行命令："
if docker exec "$CONTAINER_ID" sh -c 'echo "Command execution works"' 2>&1; then
    echo "✓ 可以执行命令"
else
    echo "✗ 无法执行命令"
fi
echo ""

echo "6. 测试是否可以分配 TTY："
if docker exec -it "$CONTAINER_ID" sh -c 'echo "TTY works" && tty' 2>&1; then
    echo "✓ TTY 可用"
else
    echo "✗ TTY 不可用"
fi
echo ""

echo "7. 检查容器中是否有 shell："
echo "Available shells:"
docker exec "$CONTAINER_ID" sh -c 'cat /etc/shells 2>/dev/null || echo "No /etc/shells file"'
echo ""

echo "8. 检查容器的 devcontainer 标签："
docker inspect "$CONTAINER_ID" --format '{{range $k,$v := .Config.Labels}}{{if or (eq $k "devcontainer.local_folder") (eq $k "devcontainer.config_file")}}{{$k}}: {{$v}}{{"\n"}}{{end}}{{end}}'
echo ""

echo "========================================="
echo "诊断完成"
echo "========================================="
echo ""

echo "常见问题和解决方案："
echo ""
echo "问题 1: Tty: false - 容器没有分配 TTY"
echo "  原因: devcontainer 启动时没有使用 -t 标志"
echo "  影响: VS Code 终端无法工作"
echo "  解决: 检查 devcontainer.json 是否有 'init': true 或自定义 runArgs"
echo ""
echo "问题 2: Cmd 是一次性命令 (如 'echo')"
echo "  原因: 镜像的 ENTRYPOINT 或 CMD 不是持久运行的进程"
echo "  影响: 容器可能立即退出"
echo "  解决: 在 devcontainer.json 添加 'overrideCommand': false"
echo ""
echo "问题 3: OpenStdin: false"
echo "  原因: 容器启动时没有使用 -i 标志"
echo "  影响: 无法与容器交互"
echo "  解决: 确保 devcontainer 配置正确"
echo ""

# 提供修复建议的 devcontainer.json 示例
echo "推荐的 devcontainer.json 配置："
cat << 'EOFCONFIG'
{
  "name": "nitro-boost-dev",
  "image": "mirrors.tencent.com/nitro_boost/ci:latest",
  
  // 重要: 不要覆盖容器的默认命令
  "overrideCommand": false,
  
  // 如果镜像没有持久运行的进程，添加这个
  // "postStartCommand": "sleep infinity",
  
  // 或者使用 runArgs 来确保容器持续运行
  // "runArgs": ["--init"],
  
  "customizations": {
    "vscode": {
      "extensions": [...],
      "settings": {...}
    }
  },
  "workspaceMount": "source=${localWorkspaceFolder},target=${localWorkspaceFolder},type=bind",
  "workspaceFolder": "${localWorkspaceFolder}"
}
EOFCONFIG
