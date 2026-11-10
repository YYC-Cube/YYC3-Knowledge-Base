.PHONY: help fmt clippy build ci docker-up docker-down package package-all package-x86_64 package-arm64 package-clean package-validate dist-x86_64 dist-arm64 dist-all

help:
	@echo "运维系统 - 构建命令"
	@echo ""
	@echo "可用命令:"
	@echo "  make fmt                - 格式化代码"
	@echo "  make clippy             - 运行 clippy 检查"
	@echo "  make build              - 构建项目"
	@echo "  make ci                 - 运行完整 CI 检查"
	@echo "  make docker-up          - 启动 Docker 环境"
	@echo "  make docker-down        - 停止 Docker 环境"
	@echo ""
	@echo "构建与打包命令:"
	@echo "  make package            - 创建当前平台包 (x86_64)"
	@echo "  make package-all        - 创建所有平台包"
	@echo "  make package-x86_64     - 创建 Linux x86_64 包"
	@echo "  make package-arm64      - 创建 Linux ARM64 包"
	@echo "  make package-validate   - 验证包内容"
	@echo "  make package-clean      - 清理构建目录"
	@echo "  make dist-all           - 创建所有平台的发布包"
	@echo "  make dist-x86_64        - 创建 x86_64 发布包"
	@echo "  make dist-arm64         - 创建 ARM64 发布包"
	@echo ""

fmt:
	@echo "🎨 格式化代码..."
	@cargo fmt --all

clippy:
	@echo "🔍 运行 Clippy 检查..."
	@cargo clippy --workspace -- -D warnings

build:
	@echo "🔨 构建项目..."
	@cargo build --release --workspace

ci: fmt clippy
	@echo "✅ CI 检查完成!"

docker-up:
	@echo "🐳 启动 Docker 环境..."
	@docker compose -f docker-compose.dev.yml up -d
	@echo "✓ Docker 环境已启动"
	@echo "数据库: 请查看 docker-compose.dev.yml"

docker-down:
	@echo "🐳 停止 Docker 环境..."
	@docker compose -f docker-compose.dev.yml down
	@echo "✓ Docker 环境已停止"

# ========== 构建与打包 ==========

package: package-x86_64
	@echo "✓ 包已创建"

package-all: package-x86_64 package-arm64
	@echo "✓ 所有平台的包已创建"

package-x86_64:
	@echo "📦 正在创建 Linux x86_64 包..."
	@./scripts/build/package.sh x86_64

package-arm64:
	@echo "📦 正在创建 Linux ARM64 包..."
	@./scripts/build/package.sh arm64

package-validate:
	@echo "🔍 验证包内容..."
	@./scripts/build/validate.sh

package-clean:
	@echo "🧹 清理构建目录..."
	@rm -rf build/
	@echo "✓ 构建目录已清理"

# ========== 发布包 ==========

dist-all: dist-x86_64 dist-arm64
	@echo "✓ 所有发布包已创建"

dist-x86_64: package-x86_64
	@echo "📦 正在创建 x86_64 发布归档..."
	@./scripts/build/dist.sh x86_64

dist-arm64: package-arm64
	@echo "📦 正在创建 ARM64 发布归档..."
	@./scripts/build/dist.sh arm64
