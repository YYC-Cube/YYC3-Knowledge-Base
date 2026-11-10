#!/bin/bash
# 数据库迁移管理脚本
# 用于简化数据库迁移的操作

set -euo pipefail

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[✓]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATIONS_DIR="$PROJECT_ROOT/migrations"

# 从环境变量或默认值获取数据库连接信息
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-ops_service}"
DB_USER="${DB_USER:-postgres}"

# 检查密码
if [ -z "${DB_PASSWORD:-}" ]; then
    # 尝试从 .env 文件读取
    if [ -f "$PROJECT_ROOT/.env" ]; then
        source "$PROJECT_ROOT/.env"
    fi

    # 如果还是没有，尝试从环境变量解析 OPS_DATABASE__URL
    if [ -n "${OPS_DATABASE__URL:-}" ]; then
        # 解析 postgresql://user:pass@host:port/db
        DB_URL="$OPS_DATABASE__URL"
        DB_USER=$(echo "$DB_URL" | sed -n 's|postgresql://\([^:]*\):.*@\([^:]*\):\([0-9]*\)/\(.*\)|\1|p')
        DB_HOST=$(echo "$DB_URL" | sed -n 's|postgresql://\([^:]*\):.*@\([^:]*\):\([0-9]*\)/\(.*\)|\2|p')
        DB_PORT=$(echo "$DB_URL" | sed -n 's|postgresql://\([^:]*\):.*@\([^:]*\):\([0-9]*\)/\(.*\)|\3|p')
        DB_NAME=$(echo "$DB_URL" | sed -n 's|postgresql://\([^:]*\):.*@\([^:]*\):\([0-9]*\)/\(.*\)|\4|p')
        DB_PASSWORD=$(echo "$DB_URL" | sed -n 's|postgresql://[^:]*:\([^@]*\)@.*|\1|p')
    fi
fi

# 如果还是没有密码，提示用户
if [ -z "${DB_PASSWORD:-}" ]; then
    echo -n "Enter database password for user '$DB_USER': "
    read -s DB_PASSWORD
    echo
fi

# 设置 PGPASSWORD 环境变量
export PGPASSWORD="$DB_PASSWORD"

# 构建数据库连接字符串
DB_CONN="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# 显示帮助信息
show_help() {
    cat << EOF
数据库迁移管理工具

用法: $0 [COMMAND]

命令:
  status      查看迁移状态
  migrate     运行所有未执行的迁移
  rollback    回滚最后一次迁移
  create NAME 创建新的迁移文件
  reset       重置数据库（删除所有表并重新迁移）
  seed        运行种子数据脚本
  backup      备份数据库
  restore FILE   恢复数据库
  shell       进入 psql 交互式 shell

环境变量:
  DB_HOST     数据库主机 (默认: localhost)
  DB_PORT     数据库端口 (默认: 5432)
  DB_NAME     数据库名称 (默认: ops_service)
  DB_USER     数据库用户 (默认: postgres)
  DB_PASSWORD 数据库密码
  OPS_DATABASE__URL  完整的数据库连接 URL

示例:
  # 查看迁移状态
  $0 status

  # 运行迁移
  $0 migrate

  # 创建新迁移
  $0 create add_user_preferences

  # 重置数据库
  $0 reset

  # 进入数据库 shell
  $0 shell

EOF
}

# 检查 sqlx-cli 是否安装
check_sqlx() {
    if ! command -v sqlx &> /dev/null; then
        log_error "sqlx-cli 未安装"
        log_info "安装方法: cargo install sqlx-cli --no-default-features --features rustls,postgres"
        exit 1
    fi
}

# 检查 psql 是否安装
check_psql() {
    if ! command -v psql &> /dev/null; then
        log_error "psql 未安装"
        log_info "安装方法: sudo apt-get install postgresql-client"
        exit 1
    fi
}

# 测试数据库连接
test_connection() {
    log_info "测试数据库连接..."
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
        log_success "数据库连接成功"
        return 0
    else
        log_error "数据库连接失败"
        log_error "请检查数据库配置和网络连接"
        return 1
    fi
}

# 查看迁移状态
cmd_status() {
    check_psql
    log_info "迁移状态:"
    echo ""

    # 检查是否存在 _sqlx_migrations 表
    TABLE_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '_sqlx_migrations')")

    if [ "$TABLE_EXISTS" != "t" ]; then
        log_warn "迁移表不存在，数据库尚未初始化"
        echo ""
        log_info "运行 '$0 migrate' 初始化数据库"
        return 0
    fi

    # 显示已执行的迁移
    echo "已执行的迁移:"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version, description, installed_on FROM _sqlx_migrations ORDER BY version;"
    echo ""

    # 显示未执行的迁移
    log_info "未执行的迁移文件:"
    for migration in "$MIGRATIONS_DIR"/*.sql; do
        if [ -f "$migration" ]; then
            filename=$(basename "$migration")
            version=$(echo "$filename" | cut -d'_' -f1)
            description=$(echo "$filename" | sed 's/^[0-9]*_//' | sed 's/.sql$//')

            EXECUTED=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM _sqlx_migrations WHERE version = '$version'")
            if [ "$EXECUTED" = "0" ]; then
                echo "  - [$version] $description"
            fi
        fi
    done
    echo ""
}

# 运行迁移
cmd_migrate() {
    check_sqlx
    log_info "开始数据库迁移..."

    export DATABASE_URL="$DB_CONN"
    sqlx migrate run --source "$MIGRATIONS_DIR"

    log_success "迁移完成！"
    echo ""
    log_info "运行 '$0 status' 查看迁移状态"
}

# 创建新迁移
cmd_create() {
    check_sqlx

    if [ -z "${1:-}" ]; then
        log_error "请提供迁移名称"
        echo "示例: $0 create add_user_preferences_table"
        exit 1
    fi

    local migration_name="$1"
    log_info "创建新迁移: $migration_name"

    export DATABASE_URL="$DB_CONN"
    sqlx migrate add "$migration_name" --source "$MIGRATIONS_DIR"

    log_success "迁移文件已创建"
    echo ""
    log_info "请在 $MIGRATIONS_DIR 目录编辑迁移文件"
}

# 回滚迁移
cmd_rollback() {
    check_sqlx
    log_warn "警告: 即将回滚最后一次迁移"
    echo -n "确认继续? [y/N] "
    read -r confirm

    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        log_info "操作已取消"
        return 0
    fi

    export DATABASE_URL="$DB_CONN"
    sqlx migrate revert --source "$MIGRATIONS_DIR"

    log_success "回滚完成"
}

# 重置数据库
cmd_reset() {
    check_psql
    log_warn "警告: 此操作将删除所有表和数据！"
    echo -n "确认继续? [y/N] "
    read -r confirm

    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        log_info "操作已取消"
        return 0
    fi

    log_info "删除所有表..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
    log_success "所有表已删除"

    log_info "重新运行迁移..."
    cmd_migrate
}

# 运行种子数据
cmd_seed() {
    check_psql
    log_info "加载种子数据..."

    if [ ! -f "$MIGRATIONS_DIR/000003_seed_data.sql" ]; then
        log_error "种子数据文件不存在: $MIGRATIONS_DIR/000003_seed_data.sql"
        exit 1
    fi

    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATIONS_DIR/000003_seed_data.sql"

    log_success "种子数据加载完成"
    echo ""
    log_info "默认账户:"
    log_info "  管理员: admin / Admin123!"
    log_info "  演示用户: demo / Demo123!"
}

# 备份数据库
cmd_backup() {
    check_psql
    local backup_file="${1:-backup_$(date +%Y%m%d_%H%M%S).dump}"

    log_info "备份数据库到: $backup_file"

    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F c -f "$backup_file"

    log_success "备份完成: $backup_file"
    log_info "文件大小: $(du -h "$backup_file" | cut -f1)"
}

# 恢复数据库
cmd_restore() {
    check_psql

    if [ -z "${1:-}" ]; then
        log_error "请指定备份文件"
        echo "示例: $0 restore backup_20231201.dump"
        exit 1
    fi

    local backup_file="$1"

    if [ ! -f "$backup_file" ]; then
        log_error "备份文件不存在: $backup_file"
        exit 1
    fi

    log_warn "警告: 此操作将覆盖当前数据库！"
    echo -n "确认恢复? [y/N] "
    read -r confirm

    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        log_info "操作已取消"
        return 0
    fi

    log_info "从备份恢复: $backup_file"

    # 删除现有数据库
    log_info "清理现有数据库..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c "DROP DATABASE IF EXISTS $DB_NAME;"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c "CREATE DATABASE $DB_NAME;"

    # 恢复备份
    log_info "恢复数据..."
    pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" "$backup_file"

    log_success "恢复完成"
}

# 进入 psql shell
cmd_shell() {
    check_psql
    log_info "连接到数据库: $DB_NAME"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"
}

# 主函数
main() {
    local command="${1:-}"

    if [ -z "$command" ]; then
        show_help
        exit 0
    fi

    case "$command" in
        help|--help|-h)
            show_help
            ;;
        status)
            test_connection && cmd_status
            ;;
        migrate|migrate:up)
            test_connection && cmd_migrate
            ;;
        create|migrate:create)
            cmd_create "${2:-}"
            ;;
        rollback|migrate:down)
            test_connection && cmd_rollback
            ;;
        reset)
            test_connection && cmd_reset
            ;;
        seed)
            test_connection && cmd_seed
            ;;
        backup)
            cmd_backup "${2:-}"
            ;;
        restore)
            cmd_restore "${2:-}"
            ;;
        shell|psql)
            test_connection && cmd_shell
            ;;
        *)
            log_error "未知命令: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

main "$@"
