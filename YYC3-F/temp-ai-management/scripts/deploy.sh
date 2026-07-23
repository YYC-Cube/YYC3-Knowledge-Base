#!/bin/bash

set -e

# 配置变量
ENVIRONMENT=${1:-development}
PROJECT_NAME="yanyu-cloud"
DOCKER_COMPOSE_FILE="docker-compose.${ENVIRONMENT}.yml"
BACKUP_DIR="/opt/backups"
LOG_FILE="/var/log/${PROJECT_NAME}-deploy.log"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 日志函数
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

# 检查环境
check_environment() {
    log "检查部署环境: $ENVIRONMENT"
    
    if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
        error "无效的环境参数。请使用: development, staging, 或 production"
    fi
    
    if [ ! -f "scripts/$DOCKER_COMPOSE_FILE" ]; then
        error "找不到配置文件: scripts/$DOCKER_COMPOSE_FILE"
    fi
    
    # 检查Docker和Docker Compose
    if ! command -v docker &> /dev/null; then
        error "Docker 未安装"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose 未安装"
    fi
}

# 备份数据库
backup_database() {
    if [ "$ENVIRONMENT" = "production" ]; then
        log "创建数据库备份..."
        
        mkdir -p "$BACKUP_DIR"
        BACKUP_FILE="$BACKUP_DIR/${PROJECT_NAME}-$(date +%Y%m%d-%H%M%S).sql"
        
        docker-compose -f "scripts/$DOCKER_COMPOSE_FILE" exec -T postgres \
            pg_dump -U postgres yanyu_cloud > "$BACKUP_FILE"
        
        if [ $? -eq 0 ]; then
            log "数据库备份成功: $BACKUP_FILE"
        else
            error "数据库备份失败"
        fi
        
        # 保留最近7天的备份
        find "$BACKUP_DIR" -name "${PROJECT_NAME}-*.sql" -mtime +7 -delete
    fi
}

# 拉取最新代码
pull_code() {
    log "拉取最新代码..."
    
    if [ -d ".git" ]; then
        git fetch origin
        
        if [ "$ENVIRONMENT" = "production" ]; then
            git checkout main
            git pull origin main
        else
            git checkout develop
            git pull origin develop
        fi
    else
        warn "不是Git仓库，跳过代码拉取"
    fi
}

# 构建和部署
deploy() {
    log "开始部署到 $ENVIRONMENT 环境..."
    
    # 停止现有服务
    log "停止现有服务..."
    docker-compose -f "scripts/$DOCKER_COMPOSE_FILE" down
    
    # 拉取最新镜像
    log "拉取最新镜像..."
    docker-compose -f "scripts/$DOCKER_COMPOSE_FILE" pull
    
    # 构建镜像
    log "构建应用镜像..."
    docker-compose -f "scripts/$DOCKER_COMPOSE_FILE" build --no-cache
    
    # 启动服务
    log "启动服务..."
    docker-compose -f "scripts/$DOCKER_COMPOSE_FILE" up -d
    
    # 等待服务启动
    log "等待服务启动..."
    sleep 30
    
    # 健康检查
    health_check
}

# 健康检查
health_check() {
    log "执行健康检查..."
    
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:3000/api/health &> /dev/null; then
            log "健康检查通过"
            return 0
        fi
        
        warn "健康检查失败，尝试 $attempt/$max_attempts"
        sleep 10
        ((attempt++))
    done
    
    error "健康检查失败，部署可能有问题"
}

# 回滚
rollback() {
    log "执行回滚..."
    
    if [ -f "$BACKUP_DIR/last-working-compose.yml" ]; then
        docker-compose -f "$BACKUP_DIR/last-working-compose.yml" up -d
        log "回滚完成"
    else
        error "找不到回滚配置文件"
    fi
}

# 清理
cleanup() {
    log "清理未使用的Docker资源..."
    docker system prune -f
    docker volume prune -f
}

# 主函数
main() {
    log "开始部署流程..."
    
    check_environment
    
    # 生产环境需要备份
    if [ "$ENVIRONMENT" = "production" ]; then
        backup_database
    fi
    
    pull_code
    deploy
    cleanup
    
    log "部署完成！"
    log "访问地址: http://localhost:3000"
    
    if [ "$ENVIRONMENT" = "production" ]; then
        log "监控面板: http://localhost:3001"
        log "指标监控: http://localhost:9090"
    fi
}

# 处理命令行参数
case "${2:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        rollback
        ;;
    "health")
        health_check
        ;;
    "backup")
        backup_database
        ;;
    *)
        echo "用法: $0 <environment> [deploy|rollback|health|backup]"
        echo "环境: development, staging, production"
        exit 1
        ;;
esac
