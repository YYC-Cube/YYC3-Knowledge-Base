//! 健康检查处理器
//! 提供 /health、/ready 和 /system/concurrency 端点

use axum::{extract::State, Json};
use serde::Serialize;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::{concurrency, db, middleware::AppState};

/// 存活探针响应
#[derive(Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
    pub uptime_secs: u64,
}

/// 就绪探针响应
#[derive(Serialize)]
pub struct ReadinessResponse {
    pub ready: bool,
    pub checks: Vec<HealthCheck>,
}

/// 健康检查项
#[derive(Serialize)]
pub struct HealthCheck {
    pub name: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

/// 系统状态响应
#[derive(Serialize)]
pub struct SystemStatusResponse {
    pub concurrency: concurrency::ConcurrencyStats,
}

/// 应用启动时间（需要在 main.rs 中设置）
static mut APP_START_TIME: Option<u64> = None;

/// 设置应用启动时间
pub fn set_start_time() {
    unsafe {
        APP_START_TIME = Some(
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        );
    }
}

/// 获取应用运行时间（秒）
pub fn get_uptime() -> u64 {
    unsafe {
        APP_START_TIME.map_or(0, |start| {
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs()
                - start
        })
    }
}

/// 存活探针
/// 快速响应，不检查依赖
pub async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        uptime_secs: get_uptime(),
    })
}

/// 就绪探针
/// 检查数据库和 RabbitMQ 等依赖
pub async fn readiness_check(State(state): State<Arc<AppState>>) -> Json<ReadinessResponse> {
    let mut checks = Vec::new();

    // 数据库检查
    let db_health = db::health_check(&state.db).await;
    checks.push(HealthCheck {
        name: "database".to_string(),
        status: match &db_health {
            db::HealthStatus::Healthy => "healthy".to_string(),
            db::HealthStatus::Unhealthy(_) => "unhealthy".to_string(),
        },
        message: match db_health {
            db::HealthStatus::Healthy => None,
            db::HealthStatus::Unhealthy(msg) => Some(msg),
        },
    });

    // RabbitMQ 连通性检查
    let rabbitmq_status = match state.rabbitmq_publisher.get().await {
        Ok(_) => ("healthy".to_string(), None),
        Err(e) => ("unhealthy".to_string(), Some(format!("RabbitMQ: {}", e))),
    };
    checks.push(HealthCheck {
        name: "rabbitmq".to_string(),
        status: rabbitmq_status.0,
        message: rabbitmq_status.1,
    });

    let all_healthy = checks.iter().all(|c| c.status == "healthy");

    Json(ReadinessResponse {
        ready: all_healthy,
        checks,
    })
}

/// 获取并发状态
/// 返回当前并发使用情况，用于监控和告警
pub async fn get_concurrency_status(
    State(state): State<Arc<AppState>>,
) -> Json<SystemStatusResponse> {
    let stats = state.concurrency_controller.get_stats().await;
    Json(SystemStatusResponse { concurrency: stats })
}
