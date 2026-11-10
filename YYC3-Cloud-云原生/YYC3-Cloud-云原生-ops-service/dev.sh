#!/bin/bash
set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# 检查 Docker 是否运行
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}错误: Docker 未运行，请先启动 Docker${NC}"
        exit 1
    fi
}

# 启动开发数据库
start_dev_db() {
    echo -e "${BLUE}📦 启动开发数据库...${NC}"
    check_docker

    # 加载环境变量
    if [ -f .env.development ]; then
        export $(cat .env.development | grep -v '^#' | xargs)
    fi

    # 启动 PostgreSQL 容器
    docker compose -f docker-compose.dev.yml up -d postgres

    # 等待数据库就绪
    echo -e "${YELLOW}⏳ 等待数据库就绪...${NC}"
    max_attempts=30
    attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if docker exec ops-postgres-dev pg_isready -U ops_user > /dev/null 2>&1; then
            echo -e "${GREEN}✅ 数据库已就绪${NC}"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done

    echo -e "${RED}❌ 数据库启动超时${NC}"
    return 1
}

# 停止开发数据库
stop_dev_db() {
    echo -e "${BLUE}🛑 停止开发数据库...${NC}"
    docker compose -f docker-compose.dev.yml down
    echo -e "${GREEN}✅ 数据库已停止${NC}"
}

# 清理开发数据库数据
clean_dev_db() {
    echo -e "${YELLOW}⚠️  警告: 此操作将删除所有开发数据库数据${NC}"
    read -p "确定要继续吗? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker compose -f docker-compose.dev.yml down -v
        echo -e "${GREEN}✅ 开发数据库数据已清理${NC}"
    else
        echo -e "${BLUE}取消操作${NC}"
    fi
}

# 运行数据库迁移
run_migrations() {
    echo -e "${BLUE}🔄 运行数据库迁移...${NC}"
    if [ -f .env.development ]; then
        set -a
        source .env.development
        set +a
    fi
    cargo run --bin migrate
    echo -e "${GREEN}✅ 迁移完成${NC}"
}

# 重置开发数据库
reset_dev_db() {
    echo -e "${YELLOW}⚠️  警告: 此操作将重置开发数据库${NC}"
    read -p "确定要继续吗? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        clean_dev_db
        start_dev_db
        run_migrations
        echo -e "${GREEN}✅ 开发数据库已重置${NC}"
    else
        echo -e "${BLUE}取消操作${NC}"
    fi
}

# 查看数据库日志
view_logs() {
    docker compose -f docker-compose.dev.yml logs -f postgres
}

# 进入数据库 shell
db_shell() {
    docker exec -it ops-postgres-dev psql -U ops_user -d ops_service
}

# 显示帮助信息
show_help() {
    cat << EOF
${GREEN}OPS System 开发环境管理脚本${NC}

${BLUE}用法:${NC}
    $ ./dev.sh [命令]

${BLUE}命令:${NC}
    start       启动开发数据库
    stop        停止开发数据库
    restart     重启开发数据库
    clean       清理开发数据库数据
    reset       重置开发数据库（删除数据并重新初始化）
    migrate     运行数据库迁移
    logs        查看数据库日志
    shell       进入 PostgreSQL shell
    help        显示此帮助信息

${BLUE}开发流程:${NC}
    1. 运行 './dev.sh start' 启动数据库
    2. 运行 './dev.sh migrate' 执行数据库迁移
    3. 运行 'cargo run' 启动开发服务器
    4. 使用 './dev.sh logs' 查看数据库日志
    5. 使用 './dev.sh shell' 进入数据库管理

${BLUE}示例:${NC}
    ./dev.sh start          # 启动开发环境
    ./dev.sh migrate        # 运行迁移
    cargo run               # 启动应用
    ./dev.sh stop           # 停止开发环境

EOF
}

# 主函数
main() {
    case "${1:-help}" in
        start)
            start_dev_db
            ;;
        stop)
            stop_dev_db
            ;;
        restart)
            stop_dev_db
            start_dev_db
            ;;
        clean)
            clean_dev_db
            ;;
        reset)
            reset_dev_db
            ;;
        migrate)
            run_migrations
            ;;
        logs)
            view_logs
            ;;
        shell)
            db_shell
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo -e "${RED}错误: 未知命令 '$1'${NC}"
            echo
            show_help
            exit 1
            ;;
    esac
}

main "$@"
