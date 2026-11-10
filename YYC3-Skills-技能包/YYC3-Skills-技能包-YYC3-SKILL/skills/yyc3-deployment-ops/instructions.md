# YYC3部署运维指南

> **万象归元于云枢 | 深栈智启新纪元**

## 部署平台

### 阿里云ECS

- 服务器：8.130.127.121
- 操作系统：Ubuntu 22.04 LTS
- Docker：已安装
- Nginx：反向代理

### NAS存储

- 路径：/volume1/www
- 用途：静态文件、备份
- 同步：rsync

### 内网穿透

- 工具：FRP
- 用途：本地开发环境访问

## CI/CD流程

### GitHub Actions

```yaml
name: YYC3 CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Run tests
        run: bun test

      - name: Build
        run: bun run build

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Aliyun ECS
        run: |
          docker build -t yyc3/app .
          docker save yyc3/app | ssh user@8.130.127.121 "docker load"
          ssh user@8.130.127.121 "docker-compose up -d"
```

## 部署命令

### Vercel

```bash
yyc3 deploy vercel --prod
```

### 阿里云ECS

```bash
yyc3 deploy ecs --server=8.130.127.121
```

### NAS

```bash
yyc3 deploy nas --target=/volume1/www
```

## 监控告警

### Prometheus配置

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'yyc3-api'
    static_configs:
      - targets: ['localhost:3000']

  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
```

### Grafana仪表板

- CPU使用率 < 70%
- 内存使用率 < 80%
- 响应时间 < 200ms
- 错误率 < 0.1%
- 可用性 > 99.9%

## 常见操作

### 查看日志

```bash
# Docker容器日志
docker logs -f yyc3-api

# Nginx日志
tail -f /var/log/nginx/access.log

# 应用日志
tail -f /var/log/yyc3/app.log
```

### 重启服务

```bash
# Docker Compose
docker-compose restart

# 单个服务
docker restart yyc3-api

# Nginx
sudo systemctl restart nginx
```

### 备份恢复

```bash
# 数据库备份
pg_dump yyc3 > backup_$(date +%Y%m%d).sql

# 恢复
psql yyc3 < backup_20260129.sql

# 文件同步
rsync -avz /local/path/ user@nas:/volume1/www/
```

## 故障排查

### 服务无法启动

1. 检查端口占用
2. 查看错误日志
3. 验证配置文件
4. 检查依赖服务

### 性能问题

1. CPU分析：`top`、`htop`
2. 内存分析：`free -h`
3. 磁盘IO：`iostat`
4. 网络状态：`netstat`
