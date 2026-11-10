//! Runner API 处理器 (P2.1)
//!
//! 处理 Runner 注册、心跳和状态查询
//! 兼容 common::messages 定义的消息格式

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Json},
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tracing::{debug, error, info};
use uuid::Uuid;

use sqlx::Row;

use crate::{
    auth::middleware::AuthContext,
    config::RunnerDockerEffectiveConfig,
    error::{AppError, Result},
    middleware::AppState,
    services::audit_service::AuditLogParams,
};

/// Runner 注册请求
/// 兼容 common::messages::RunnerRegistrationMessage 格式
#[derive(Debug, Deserialize)]
pub struct RunnerRegistrationRequest {
    /// Runner 名称
    pub name: String,

    /// 能力标签（node, java, rust, frontend, docker, general）
    pub capabilities: Vec<String>,

    /// 是否支持 Docker
    pub docker_supported: bool,

    /// 最大并发数
    pub max_concurrent_jobs: usize,

    /// 出站白名单（统一格式，兼容 common 库的 outbound_allowlist）
    #[serde(alias = "outbound_allowlist")]
    #[serde(default)]
    pub outbound_allowlist_domains: Vec<String>,

    /// 出站白名单（IP CIDR）- 可选，用于兼容旧格式
    #[serde(default)]
    pub outbound_allowlist_ips: Vec<String>,

    /// 操作系统
    pub os: String,

    /// 架构
    pub arch: String,

    /// Runner 版本
    pub version: String,

    /// 主机名
    pub hostname: String,

    /// IP 地址
    pub ip: Vec<String>,

    /// 时间戳（common 库有此字段，可选）
    #[serde(default)]
    pub timestamp: Option<chrono::DateTime<chrono::Utc>>,
}

impl RunnerRegistrationRequest {
    /// 获取合并后的出站白名单（域名 + IP）
    pub fn get_outbound_allowlist(&self) -> Vec<String> {
        let mut result = self.outbound_allowlist_domains.clone();
        result.extend(self.outbound_allowlist_ips.iter().cloned());
        result
    }
}

/// Runner 注册响应
#[derive(Debug, Serialize)]
pub struct RunnerRegistrationResponse {
    /// Runner ID
    pub runner_id: Uuid,

    /// 心跳间隔（秒）
    pub heartbeat_interval_secs: i32,

    /// RabbitMQ 配置
    pub rabbitmq: RunnerRabbitMqConfig,

    /// Docker 配置（如果 Runner 支持且控制面配置了）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub docker: Option<RunnerDockerConfiguration>,

    /// 当前服务器时间戳
    pub server_timestamp: chrono::DateTime<chrono::Utc>,
}

/// Docker 配置（发送给 Runner）
#[derive(Debug, Serialize)]
pub struct RunnerDockerConfiguration {
    /// 是否启用 Docker 执行
    pub enabled: bool,

    /// 默认 Docker 镜像
    pub default_image: String,

    /// 按构建类型指定的镜像
    #[serde(skip_serializing_if = "std::collections::HashMap::is_empty")]
    pub images_by_type: std::collections::HashMap<String, String>,

    /// 资源限制
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memory_limit_gb: Option<i64>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub cpu_shares: Option<i64>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub pids_limit: Option<i64>,

    /// 默认超时（秒）
    pub default_timeout_secs: u64,
}

/// RabbitMQ 配置（返回给 Runner）
#[derive(Debug, Serialize)]
pub struct RunnerRabbitMqConfig {
    /// 交换机
    pub exchange: String,

    /// 路由键模式
    pub routing_key_pattern: String,

    /// 队列名称
    pub queue_name: String,
}

/// Runner 心跳请求
/// 兼容 common::messages::RunnerHeartbeatMessage 格式
#[derive(Debug, Deserialize)]
pub struct RunnerHeartbeatRequest {
    /// Runner 名称
    pub name: String,

    /// 状态（兼容枚举格式和字符串格式）
    #[serde(deserialize_with = "deserialize_status")]
    pub status: String,

    /// 当前执行的任务数
    pub current_jobs: usize,

    /// 最后错误
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_error: Option<String>,

    /// 系统信息
    pub system: SystemInfoUpdate,

    /// 时间戳（common 库有此字段，可选）
    #[serde(default)]
    pub timestamp: Option<chrono::DateTime<chrono::Utc>>,
}

/// 反序列化状态（兼容枚举格式）
fn deserialize_status<'de, D>(deserializer: D) -> std::result::Result<String, D::Error>
where
    D: serde::Deserializer<'de>,
{
    // 先尝试作为字符串
    let s = String::deserialize(deserializer)?;
    Ok(match s.as_str() {
        "online" | "active" => "active".to_string(),
        "maintenance" => "maintenance".to_string(),
        "offline" => "offline".to_string(),
        _other => s,
    })
}

/// Runner 心跳响应
#[derive(Debug, Serialize)]
pub struct RunnerHeartbeatResponse {
    /// Docker 配置更新（如果有变更）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub docker: Option<RunnerDockerConfiguration>,

    /// 配置版本号（用于检测配置变更）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub config_version: Option<i64>,

    /// 服务器时间戳
    pub server_timestamp: chrono::DateTime<chrono::Utc>,
}

/// 系统信息更新
#[derive(Debug, Deserialize, Serialize)]
pub struct SystemInfoUpdate {
    /// CPU 使用率（0-100）
    pub cpu_usage_percent: f32,

    /// 内存使用率（0-100）
    pub memory_usage_percent: f32,

    /// 磁盘使用率（0-100）
    pub disk_usage_percent: f32,

    /// 可用内存（MB）
    pub available_memory_mb: u64,

    /// 可用磁盘（GB）
    pub available_disk_gb: f64,
}

/// Runner 状态响应
#[derive(Debug, Serialize)]
pub struct RunnerStatusResponse {
    /// Runner ID
    pub id: Uuid,

    /// Runner 名称
    pub name: String,

    /// 能力标签
    pub capabilities: Vec<String>,

    /// 是否支持 Docker
    pub docker_supported: bool,

    /// 最大并发数
    pub max_concurrent_jobs: i32,

    /// 当前任务数
    pub current_jobs: i32,

    /// 状态
    pub status: String,

    /// 最后心跳时间
    pub last_heartbeat: Option<chrono::DateTime<chrono::Utc>>,

    /// 系统信息
    pub system: Option<SystemInfoUpdate>,

    /// 创建时间
    pub created_at: chrono::DateTime<chrono::Utc>,

    /// 更新时间
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

/// Runner 列表响应
#[derive(Debug, Serialize)]
pub struct RunnerListResponse {
    /// Runners
    pub runners: Vec<RunnerStatusResponse>,

    /// 总数
    pub total: i64,
}

// ==================== Helper Functions ====================

/// 从数据库获取 Runner Docker 配置
/// 如果数据库中没有配置，回退到环境变量配置
async fn get_runner_docker_config(
    state: &Arc<AppState>,
    runner_name: &str,
    capabilities: &[String],
) -> RunnerDockerEffectiveConfig {
    // 首先尝试从数据库加载配置
    let db_config = sqlx::query(
        "SELECT enabled, default_image, default_timeout_secs,
                memory_limit_gb, cpu_shares, pids_limit, images_by_type,
                per_capability, per_runner
         FROM runner_docker_configs
         WHERE name = 'default'",
    )
    .fetch_optional(&state.db)
    .await;

    if let Ok(Some(row)) = db_config {
        use crate::config::{RunnerDockerConfig as Config, RunnerDockerOverride};

        let enabled: bool = row.get("enabled");
        let default_image: String = row.get("default_image");
        let default_timeout_secs: i32 = row.get("default_timeout_secs");
        let memory_limit_gb: Option<i64> = row.get("memory_limit_gb");
        let cpu_shares: Option<i64> = row.get("cpu_shares");
        let pids_limit: Option<i64> = row.get("pids_limit");

        let images_by_type_json: sqlx::types::Json<serde_json::Value> = row.get("images_by_type");
        let per_capability_json: sqlx::types::Json<serde_json::Value> = row.get("per_capability");
        let per_runner_json: sqlx::types::Json<serde_json::Value> = row.get("per_runner");

        let images_by_type: HashMap<String, String> =
            serde_json::from_value(images_by_type_json.0).unwrap_or_default();
        let per_capability: HashMap<String, RunnerDockerOverride> =
            serde_json::from_value(per_capability_json.0).unwrap_or_default();
        let per_runner: HashMap<String, RunnerDockerOverride> =
            serde_json::from_value(per_runner_json.0).unwrap_or_default();

        let db_cfg = Config {
            enabled,
            default_image,
            images_by_type,
            memory_limit_gb,
            cpu_shares,
            pids_limit,
            default_timeout_secs: default_timeout_secs as u64,
            per_runner,
            per_capability,
        };

        return db_cfg.get_config_for_runner(runner_name, capabilities);
    }

    // 回退到环境变量配置
    state
        .config
        .runner_docker
        .get_config_for_runner(runner_name, capabilities)
}

// ==================== Runner API ====================

/// Runner 注册
pub async fn register_runner(
    State(state): State<Arc<AppState>>,
    Json(request): Json<RunnerRegistrationRequest>,
) -> Result<impl IntoResponse> {
    // 获取合并后的出站白名单
    let outbound_allowlist = request.get_outbound_allowlist();

    // 检查 Runner 名称是否已存在
    let existing = sqlx::query("SELECT id FROM runners WHERE name = $1")
        .bind(&request.name)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to check runner existence");
            AppError::database("Failed to check runner")
        })?;

    let (runner_id, is_new) = if let Some(row) = existing {
        // Runner 已存在，更新信息
        let id: Uuid = row.get("id");

        sqlx::query(
            "UPDATE runners
             SET capabilities = $1, docker_supported = $2, max_concurrent_jobs = $3,
                 allowed_domains = $4, allowed_ips = $5, status = 'active',
                 last_heartbeat = NOW(), updated_at = NOW()
             WHERE id = $6",
        )
        .bind(serde_json::to_value(&request.capabilities).unwrap_or(serde_json::json!([])))
        .bind(request.docker_supported)
        .bind(request.max_concurrent_jobs as i32)
        .bind(serde_json::to_value(&outbound_allowlist).unwrap_or(serde_json::json!([])))
        .bind(serde_json::json!([])) // IPs 现在合并在 domains 中
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to update runner");
            AppError::database("Failed to update runner")
        })?;

        info!(runner_id = %id, name = %request.name, "Runner re-registered");

        (id, false)
    } else {
        // 新 Runner，创建记录
        let id = Uuid::new_v4();

        sqlx::query(
            "INSERT INTO runners (id, name, capabilities, docker_supported, max_concurrent_jobs,
                                 allowed_domains, allowed_ips, status, last_heartbeat)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW())",
        )
        .bind(id)
        .bind(&request.name)
        .bind(serde_json::to_value(&request.capabilities).unwrap_or(serde_json::json!([])))
        .bind(request.docker_supported)
        .bind(request.max_concurrent_jobs as i32)
        .bind(serde_json::to_value(&outbound_allowlist).unwrap_or(serde_json::json!([])))
        .bind(serde_json::json!([])) // IPs 现在合并在 domains 中
        .execute(&state.db)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to register runner");
            AppError::database("Failed to register runner")
        })?;

        info!(runner_id = %id, name = %request.name, "Runner registered");

        (id, true)
    };

    // 记录审计日志（Runner 注册/重新注册）
    let action = if is_new {
        crate::services::audit_service::AuditAction::RunnerRegister.as_str()
    } else {
        crate::services::audit_service::AuditAction::RunnerReregister.as_str()
    };
    let changes_summary = if is_new {
        format!("Runner registered: {}", request.name)
    } else {
        format!("Runner re-registered: {}", request.name)
    };
    let _ = state
        .audit_service
        .log_action(AuditLogParams {
            subject_id: runner_id, // 使用 runner_id 作为 subject_id
            subject_type: "runner",
            subject_name: Some(&request.name),
            action,
            resource_type: "runner",
            resource_id: Some(runner_id),
            resource_name: Some(&request.name),
            changes: Some(serde_json::json!({
                "capabilities": request.capabilities,
                "docker_supported": request.docker_supported,
                "max_concurrent_jobs": request.max_concurrent_jobs,
                "hostname": request.hostname,
                "ip": request.ip,
                "os": request.os,
                "arch": request.arch,
                "version": request.version,
            })),
            changes_summary: Some(changes_summary.as_str()),
            source_ip: None,
            user_agent: Some(&request.version),
            trace_id: None,
            result: "success",
            error_message: None,
        })
        .await;

    // 心跳间隔：30 秒
    let heartbeat_interval_secs = 30;

    // 构建 RabbitMQ 配置
    let rabbitmq_config = RunnerRabbitMqConfig {
        exchange: state.config.rabbitmq.build_exchange.clone(),
        routing_key_pattern: format!("build.{{{}}}", request.name),
        queue_name: format!("runner.{}.queue", request.name),
    };

    // 构建 Docker 配置（动态配置，考虑 Runner 名称和能力标签）
    let docker_config = if request.docker_supported {
        let effective =
            get_runner_docker_config(&state, &request.name, &request.capabilities).await;

        Some(RunnerDockerConfiguration {
            enabled: effective.enabled,
            default_image: effective.default_image,
            images_by_type: state.config.runner_docker.images_by_type.clone(),
            memory_limit_gb: effective.memory_limit_gb,
            cpu_shares: effective.cpu_shares,
            pids_limit: effective.pids_limit,
            default_timeout_secs: effective.default_timeout_secs,
        })
    } else {
        None
    };

    let response = RunnerRegistrationResponse {
        runner_id,
        heartbeat_interval_secs,
        rabbitmq: rabbitmq_config,
        docker: docker_config,
        server_timestamp: Utc::now(),
    };

    Ok((StatusCode::OK, Json(response)))
}

/// Runner 心跳
pub async fn runner_heartbeat(
    State(state): State<Arc<AppState>>,
    Json(request): Json<RunnerHeartbeatRequest>,
) -> Result<impl IntoResponse> {
    // 查找 Runner
    let runner =
        sqlx::query("SELECT id, capabilities, docker_supported FROM runners WHERE name = $1")
            .bind(&request.name)
            .fetch_optional(&state.db)
            .await
            .map_err(|e| {
                error!(error = %e, "Failed to get runner");
                AppError::database("Failed to get runner")
            })?
            .ok_or_else(|| AppError::not_found("Runner not found"))?;

    let runner_id: Uuid = runner.get("id");
    let capabilities_json: serde_json::Value = runner.get("capabilities");
    let docker_supported: bool = runner.get("docker_supported");

    // 解析能力标签
    let capabilities: Vec<String> = serde_json::from_value(capabilities_json).unwrap_or_default();

    // 解析状态
    let status = match request.status.as_str() {
        "online" | "active" => "active",
        "maintenance" => "maintenance",
        "offline" => "offline",
        _ => "active",
    };

    // 更新心跳和状态
    sqlx::query(
        "UPDATE runners
         SET status = $1, current_jobs = $2, last_heartbeat = NOW(), updated_at = NOW()
         WHERE id = $3",
    )
    .bind(status)
    .bind(request.current_jobs as i32)
    .bind(runner_id)
    .execute(&state.db)
    .await
    .map_err(|e| {
        error!(error = %e, "Failed to update runner heartbeat");
        AppError::database("Failed to update heartbeat")
    })?;

    // 构建 Docker 配置（动态配置）
    let docker_config = if docker_supported {
        let effective = get_runner_docker_config(&state, &request.name, &capabilities).await;

        Some(RunnerDockerConfiguration {
            enabled: effective.enabled,
            default_image: effective.default_image,
            images_by_type: state.config.runner_docker.images_by_type.clone(),
            memory_limit_gb: effective.memory_limit_gb,
            cpu_shares: effective.cpu_shares,
            pids_limit: effective.pids_limit,
            default_timeout_secs: effective.default_timeout_secs,
        })
    } else {
        None
    };

    let response = RunnerHeartbeatResponse {
        docker: docker_config,
        config_version: Some(state.runner_config_version.load(std::sync::atomic::Ordering::Relaxed) as i64),
        server_timestamp: Utc::now(),
    };

    debug!(runner_id = %runner_id, "Runner heartbeat updated with config");

    Ok((StatusCode::OK, Json(response)))
}

/// 获取 Runner 状态（内部使用，也可用于监控）
pub async fn get_runner_status(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "runner", "read", None, None)
        .await?;

    let row = sqlx::query(
        "SELECT id, name, capabilities, docker_supported, max_concurrent_jobs,
                current_jobs, status, last_heartbeat, created_at, updated_at
         FROM runners WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        error!(error = %e, "Failed to get runner status");
        AppError::database("Failed to get runner")
    })?
    .ok_or_else(|| AppError::not_found("Runner not found"))?;

    let capabilities: serde_json::Value = row.get("capabilities");
    let capabilities_vec: Vec<String> = serde_json::from_value(capabilities).unwrap_or_default();

    Ok(Json(RunnerStatusResponse {
        id: row.get("id"),
        name: row.get("name"),
        capabilities: capabilities_vec,
        docker_supported: row.get("docker_supported"),
        max_concurrent_jobs: row.get("max_concurrent_jobs"),
        current_jobs: row.get("current_jobs"),
        status: row.get("status"),
        last_heartbeat: row.get("last_heartbeat"),
        system: None, // 系统信息需要额外查询
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }))
}

/// 获取 Runner 列表
pub async fn list_runners(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "runner", "read", None, None)
        .await?;

    let rows = sqlx::query(
        "SELECT id, name, capabilities, docker_supported, max_concurrent_jobs,
                current_jobs, status, last_heartbeat, created_at, updated_at
         FROM runners
         ORDER BY created_at DESC",
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        error!(error = %e, "Failed to list runners");
        AppError::database("Failed to list runners")
    })?;

    let mut runners = Vec::new();
    for row in rows {
        let capabilities: serde_json::Value = row.get("capabilities");
        let capabilities_vec: Vec<String> =
            serde_json::from_value(capabilities).unwrap_or_default();

        runners.push(RunnerStatusResponse {
            id: row.get("id"),
            name: row.get("name"),
            capabilities: capabilities_vec,
            docker_supported: row.get("docker_supported"),
            max_concurrent_jobs: row.get("max_concurrent_jobs"),
            current_jobs: row.get("current_jobs"),
            status: row.get("status"),
            last_heartbeat: row.get("last_heartbeat"),
            system: None,
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        });
    }

    let total = runners.len() as i64;

    Ok(Json(RunnerListResponse { runners, total }))
}

/// 更新 Runner 状态（设置为维护模式或禁用）
pub async fn update_runner_status(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    Json(request): Json<UpdateRunnerStatusRequest>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "runner", "write", None, None)
        .await?;

    // 验证状态值
    let status = match request.status.as_str() {
        "active" => "active",
        "maintenance" => "maintenance",
        "disabled" => "disabled",
        _ => {
            return Err(AppError::validation(
                "Invalid status. Must be: active, maintenance, disabled",
            ))
        }
    };

    // 检查 Runner 是否存在并获取名称
    let runner = sqlx::query("SELECT id, name FROM runners WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to check runner");
            AppError::database("Failed to check runner")
        })?
        .ok_or_else(|| AppError::not_found("Runner not found"))?;

    let runner_name: String = runner.get("name");

    // 更新状态
    sqlx::query("UPDATE runners SET status = $1, updated_at = NOW() WHERE id = $2")
        .bind(status)
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to update runner status");
            AppError::database("Failed to update runner status")
        })?;

    // 记录审计日志
    let _ = state
        .audit_service
        .log_action(AuditLogParams {
            subject_id: auth.user_id,
            subject_type: "user",
            subject_name: None,
            action: crate::services::audit_service::AuditAction::RunnerUpdate.as_str(),
            resource_type: "runner",
            resource_id: Some(id),
            resource_name: Some(&runner_name),
            changes: Some(serde_json::json!({ "status": status })),
            changes_summary: Some(&format!("Status changed to {}", status)),
            source_ip: None,
            user_agent: None,
            trace_id: None,
            result: "success",
            error_message: None,
        })
        .await;

    info!(
        runner_id = %id,
        runner_name = %runner_name,
        new_status = %status,
        "Runner status updated"
    );

    Ok(StatusCode::OK)
}

/// 删除 Runner
pub async fn delete_runner(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "runner", "write", None, None)
        .await?;

    // 检查 Runner 是否存在并获取名称
    let runner = sqlx::query("SELECT id, name FROM runners WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to check runner");
            AppError::database("Failed to check runner")
        })?
        .ok_or_else(|| AppError::not_found("Runner not found"))?;

    let runner_name: String = runner.get("name");

    // 删除 Runner
    sqlx::query("DELETE FROM runners WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to delete runner");
            AppError::database("Failed to delete runner")
        })?;

    // 记录审计日志
    let _ = state
        .audit_service
        .log_action(AuditLogParams {
            subject_id: auth.user_id,
            subject_type: "user",
            subject_name: None,
            action: crate::services::audit_service::AuditAction::RunnerDelete.as_str(),
            resource_type: "runner",
            resource_id: Some(id),
            resource_name: Some(&runner_name),
            changes: None,
            changes_summary: Some(&format!("Deleted runner: {}", runner_name)),
            source_ip: None,
            user_agent: None,
            trace_id: None,
            result: "success",
            error_message: None,
        })
        .await;

    info!(
        runner_id = %id,
        runner_name = %runner_name,
        "Runner deleted"
    );

    Ok(StatusCode::NO_CONTENT)
}

/// 更新 Runner 状态请求
#[derive(Debug, Deserialize)]
pub struct UpdateRunnerStatusRequest {
    /// 新状态（active, maintenance, disabled）
    pub status: String,
}
