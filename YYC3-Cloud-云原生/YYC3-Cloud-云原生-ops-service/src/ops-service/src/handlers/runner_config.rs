//! Runner Docker 配置管理 API
//! 支持通过 Web 界面动态配置 Runner 的 Docker 执行环境

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Json},
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::Row;
use std::sync::Arc;
use tracing::{debug, error, info, warn};
use uuid::Uuid;

use crate::{
    auth::middleware::AuthContext,
    error::{AppError, Result},
    middleware::AppState,
    models::runner_config::{
        RunnerConfigHistory, RunnerConfigHistoryResponse, RunnerConfigOverride, RunnerDockerConfig,
        RunnerDockerConfigListResponse, RunnerDockerConfigRequest, RunnerDockerConfigResponse,
    },
    services::audit_service::AuditAction,
};

// ==================== Request/Response ====================

/// 更新配置请求
#[derive(Debug, Deserialize)]
pub struct UpdateRunnerDockerConfigRequest {
    /// 是否启用 Docker 执行
    #[serde(default)]
    pub enabled: Option<bool>,

    /// 默认 Docker 镜像
    pub default_image: Option<String>,

    /// 默认超时（秒）
    pub default_timeout_secs: Option<i64>,

    /// 内存限制（GB）
    pub memory_limit_gb: Option<i64>,

    /// CPU 份额
    pub cpu_shares: Option<i64>,

    /// 最大进程数
    pub pids_limit: Option<i64>,

    /// 按构建类型指定的镜像
    pub images_by_type: Option<std::collections::HashMap<String, String>>,

    /// 按能力标签的配置覆盖
    pub per_capability: Option<std::collections::HashMap<String, RunnerConfigOverride>>,

    /// 按 Runner 名称的配置覆盖
    pub per_runner: Option<std::collections::HashMap<String, RunnerConfigOverride>>,

    /// 描述
    pub description: Option<String>,

    /// 变更原因（用于审计）
    pub change_reason: Option<String>,
}

/// 设置活跃配置请求
#[derive(Debug, Deserialize)]
pub struct SetActiveConfigRequest {
    /// 配置 ID
    pub config_id: Uuid,
}

// ==================== Handler Functions ====================

/// 获取所有 Runner Docker 配置
pub async fn list_runner_configs(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "runner", "read", None, None)
        .await?;

    let rows = sqlx::query_as::<_, RunnerDockerConfig>(
        "SELECT id, name, enabled, default_image, default_timeout_secs,
                memory_limit_gb, cpu_shares, pids_limit, images_by_type,
                per_capability, per_runner, description, created_at, updated_at
         FROM runner_docker_configs
         ORDER BY name ASC",
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        error!(error = %e, "Failed to list runner configs");
        AppError::database("Failed to list runner configs")
    })?;

    let configs: Vec<RunnerDockerConfigResponse> = rows.into_iter().map(|c| c.into()).collect();
    let total = configs.len() as i64;

    debug!(total = total, "Listed runner configs");

    Ok(Json(RunnerDockerConfigListResponse { configs, total }))
}

/// 获取单个 Runner Docker 配置
pub async fn get_runner_config(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "runner", "read", None, None)
        .await?;

    let config = sqlx::query_as::<_, RunnerDockerConfig>(
        "SELECT id, name, enabled, default_image, default_timeout_secs,
                memory_limit_gb, cpu_shares, pids_limit, images_by_type,
                per_capability, per_runner, description, created_at, updated_at
         FROM runner_docker_configs
         WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        error!(error = %e, config_id = %id, "Failed to get runner config");
        AppError::database("Failed to get runner config")
    })?
    .ok_or_else(|| AppError::not_found("Runner config not found"))?;

    Ok(Json::<RunnerDockerConfigResponse>(config.into()))
}

/// 创建 Runner Docker 配置
pub async fn create_runner_config(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Json(request): Json<RunnerDockerConfigRequest>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "runner", "write", None, None)
        .await?;

    // 验证请求
    request.validate().map_err(|e| AppError::validation(&e))?;

    // 检查名称是否已存在
    let existing = sqlx::query("SELECT id FROM runner_docker_configs WHERE name = $1")
        .bind(&request.name)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| {
            error!(error = %e, name = %request.name, "Failed to check config name");
            AppError::database("Failed to check config name")
        })?;

    if existing.is_some() {
        return Err(AppError::validation("Config name already exists"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let images_by_type_json = serde_json::to_value(request.images_by_type.unwrap_or_default())
        .unwrap_or(serde_json::json!({}));
    let per_capability_json = serde_json::to_value(request.per_capability.unwrap_or_default())
        .unwrap_or(serde_json::json!({}));
    let per_runner_json = serde_json::to_value(request.per_runner.unwrap_or_default())
        .unwrap_or(serde_json::json!({}));

    sqlx::query(
        "INSERT INTO runner_docker_configs
         (id, name, enabled, default_image, default_timeout_secs,
          memory_limit_gb, cpu_shares, pids_limit, images_by_type,
          per_capability, per_runner, description, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)",
    )
    .bind(id)
    .bind(&request.name)
    .bind(request.enabled)
    .bind(&request.default_image)
    .bind(request.default_timeout_secs)
    .bind(request.memory_limit_gb)
    .bind(request.cpu_shares)
    .bind(request.pids_limit)
    .bind(sqlx::types::Json(images_by_type_json))
    .bind(sqlx::types::Json(per_capability_json))
    .bind(sqlx::types::Json(per_runner_json))
    .bind(&request.description)
    .bind(now)
    .bind(now)
    .execute(&state.db)
    .await
    .map_err(|e| {
        error!(error = %e, name = %request.name, "Failed to create runner config");
        AppError::database("Failed to create runner config")
    })?;

    info!(config_id = %id, name = %request.name, "Runner config created");

    // 获取并返回创建的配置
    let config = sqlx::query_as::<_, RunnerDockerConfig>(
        "SELECT id, name, enabled, default_image, default_timeout_secs,
                memory_limit_gb, cpu_shares, pids_limit, images_by_type,
                per_capability, per_runner, description, created_at, updated_at
         FROM runner_docker_configs
         WHERE id = $1",
    )
    .bind(id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        error!(error = %e, config_id = %id, "Failed to fetch created config");
        AppError::database("Failed to fetch created config")
    })?;

    // 审计日志
    let _ = state
        .audit_service
        .log_action_simple(
            auth.user_id,
            AuditAction::RunnerConfigCreate,
            Some("runner_config"),
            Some(id),
            Some(&format!("Created runner config: {}", request.name)),
            None,
        )
        .await;

    state.runner_config_version.fetch_add(1, std::sync::atomic::Ordering::Relaxed);

    Ok((StatusCode::CREATED, Json::<RunnerDockerConfigResponse>(config.into())))
}

/// 更新 Runner Docker 配置
pub async fn update_runner_config(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    Json(request): Json<UpdateRunnerDockerConfigRequest>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "runner", "write", None, None)
        .await?;

    // 获取当前配置
    let current = sqlx::query_as::<_, RunnerDockerConfig>(
        "SELECT id, name, enabled, default_image, default_timeout_secs,
                memory_limit_gb, cpu_shares, pids_limit, images_by_type,
                per_capability, per_runner, description, created_at, updated_at
         FROM runner_docker_configs
         WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        error!(error = %e, config_id = %id, "Failed to get current config");
        AppError::database("Failed to get current config")
    })?
    .ok_or_else(|| AppError::not_found("Runner config not found"))?;

    // 构建更新查询
    let mut updates = Vec::new();
    let mut param_idx = 2; // $1 是 id

    if request.enabled.is_some() {
        updates.push(format!("enabled = ${}", param_idx));
        param_idx += 1;
    }
    if request.default_image.is_some() {
        updates.push(format!("default_image = ${}", param_idx));
        param_idx += 1;
    }
    if request.default_timeout_secs.is_some() {
        updates.push(format!("default_timeout_secs = ${}", param_idx));
        param_idx += 1;
    }
    if request.memory_limit_gb.is_some() {
        updates.push(format!("memory_limit_gb = ${}", param_idx));
        param_idx += 1;
    }
    if request.cpu_shares.is_some() {
        updates.push(format!("cpu_shares = ${}", param_idx));
        param_idx += 1;
    }
    if request.pids_limit.is_some() {
        updates.push(format!("pids_limit = ${}", param_idx));
        param_idx += 1;
    }
    if request.images_by_type.is_some() {
        updates.push(format!("images_by_type = ${}", param_idx));
        param_idx += 1;
    }
    if request.per_capability.is_some() {
        updates.push(format!("per_capability = ${}", param_idx));
        param_idx += 1;
    }
    if request.per_runner.is_some() {
        updates.push(format!("per_runner = ${}", param_idx));
        param_idx += 1;
    }
    if request.description.is_some() {
        updates.push(format!("description = ${}", param_idx));
        // param_idx 在这里递增，但编译器认为如果 updates 为空则不会使用
        // 实际上如果有 description 更新，updates 必然不为空
        let _ = param_idx + 1; // 占位，表示 param_idx 已递增
    }

    // 检查是否有更新
    if updates.is_empty() {
        // 没有更新，直接返回当前配置
        return Ok(Json::<RunnerDockerConfigResponse>(current.into()));
    }

    updates.push("updated_at = NOW()".to_string());

    let query_str =
        format!("UPDATE runner_docker_configs SET {} WHERE id = $1", updates.join(", "));

    let mut query = sqlx::query(&query_str).bind(id);

    if let Some(enabled) = request.enabled {
        query = query.bind(enabled);
    }
    if let Some(ref image) = request.default_image {
        query = query.bind(image);
    }
    if let Some(timeout) = request.default_timeout_secs {
        // 验证超时值
        if !(60..=86400).contains(&timeout) {
            return Err(AppError::validation("Timeout must be between 60 and 86400 seconds"));
        }
        query = query.bind(timeout);
    }
    if let Some(memory) = request.memory_limit_gb {
        if !(1..=128).contains(&memory) {
            return Err(AppError::validation("Memory limit must be between 1 and 128 GB"));
        }
        query = query.bind(memory);
    }
    if let Some(cpu) = request.cpu_shares {
        if !(128..=4096).contains(&cpu) {
            return Err(AppError::validation("CPU shares must be between 128 and 4096"));
        }
        query = query.bind(cpu);
    }
    if let Some(pids) = request.pids_limit {
        if !(64..=65536).contains(&pids) {
            return Err(AppError::validation("PIDs limit must be between 64 and 65536"));
        }
        query = query.bind(pids);
    }
    if let Some(ref images) = request.images_by_type {
        let json = serde_json::to_value(images).unwrap_or(serde_json::json!({}));
        query = query.bind(sqlx::types::Json(json));
    }
    if let Some(ref capability) = request.per_capability {
        let json = serde_json::to_value(capability).unwrap_or(serde_json::json!({}));
        query = query.bind(sqlx::types::Json(json));
    }
    if let Some(ref runner) = request.per_runner {
        let json = serde_json::to_value(runner).unwrap_or(serde_json::json!({}));
        query = query.bind(sqlx::types::Json(json));
    }
    if let Some(ref desc) = request.description {
        query = query.bind(desc);
    }

    query.execute(&state.db).await.map_err(|e| {
        error!(error = %e, config_id = %id, "Failed to update runner config");
        AppError::database("Failed to update runner config")
    })?;

    // 记录历史
    let old_config_json = serde_json::to_value(&current).unwrap_or(serde_json::json!({}));
    let new_config = sqlx::query_as::<_, RunnerDockerConfig>(
        "SELECT id, name, enabled, default_image, default_timeout_secs,
                memory_limit_gb, cpu_shares, pids_limit, images_by_type,
                per_capability, per_runner, description, created_at, updated_at
         FROM runner_docker_configs
         WHERE id = $1",
    )
    .bind(id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        error!(error = %e, config_id = %id, "Failed to fetch updated config");
        AppError::database("Failed to fetch updated config")
    })?;
    let new_config_json = serde_json::to_value(&new_config).unwrap_or(serde_json::json!({}));

    let _ = sqlx::query(
        "INSERT INTO runner_config_history
         (config_id, old_config, new_config, change_reason, created_at)
         VALUES ($1, $2, $3, $4, NOW())",
    )
    .bind(id)
    .bind(sqlx::types::Json(old_config_json))
    .bind(sqlx::types::Json(new_config_json))
    .bind(&request.change_reason)
    .execute(&state.db)
    .await
    .map_err(|e| {
        warn!(error = %e, config_id = %id, "Failed to record config history");
    });

    info!(
        config_id = %id,
        name = %current.name,
        reason = ?request.change_reason,
        "Runner config updated"
    );

    // 审计日志
    let _ = state
        .audit_service
        .log_action_simple(
            auth.user_id,
            AuditAction::RunnerConfigUpdate,
            Some("runner_config"),
            Some(id),
            Some(&format!(
                "Updated runner config: {}, reason: {}",
                current.name,
                request.change_reason.as_deref().unwrap_or("N/A")
            )),
            None,
        )
        .await;

    state.runner_config_version.fetch_add(1, std::sync::atomic::Ordering::Relaxed);

    Ok(Json::<RunnerDockerConfigResponse>(new_config.into()))
}

/// 删除 Runner Docker 配置
pub async fn delete_runner_config(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "runner", "write", None, None)
        .await?;

    // 检查配置是否存在
    let config = sqlx::query("SELECT name FROM runner_docker_configs WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| {
            error!(error = %e, config_id = %id, "Failed to check config existence");
            AppError::database("Failed to check config existence")
        })?
        .ok_or_else(|| AppError::not_found("Runner config not found"))?;

    let name: String = config.get("name");

    // 不允许删除默认配置
    if name == "default" {
        return Err(AppError::validation("Cannot delete default config"));
    }

    sqlx::query("DELETE FROM runner_docker_configs WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| {
            error!(error = %e, config_id = %id, "Failed to delete runner config");
            AppError::database("Failed to delete runner config")
        })?;

    info!(config_id = %id, name = %name, "Runner config deleted");

    // 审计日志
    let _ = state
        .audit_service
        .log_action_simple(
            auth.user_id,
            AuditAction::RunnerConfigDelete,
            Some("runner_config"),
            Some(id),
            Some(&format!("Deleted runner config: {}", name)),
            None,
        )
        .await;

    Ok(StatusCode::NO_CONTENT)
}

/// 获取配置变更历史
pub async fn get_config_history(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "runner", "read", None, None)
        .await?;

    // 检查配置是否存在
    let _exists = sqlx::query("SELECT id FROM runner_docker_configs WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| {
            error!(error = %e, config_id = %id, "Failed to check config existence");
            AppError::database("Failed to check config existence")
        })?
        .ok_or_else(|| AppError::not_found("Runner config not found"))?;

    let history = sqlx::query_as::<_, RunnerConfigHistory>(
        "SELECT id, config_id, old_config, new_config, change_reason, changed_by, created_at
         FROM runner_config_history
         WHERE config_id = $1
         ORDER BY created_at DESC
         LIMIT 50",
    )
    .bind(id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        error!(error = %e, config_id = %id, "Failed to get config history");
        AppError::database("Failed to get config history")
    })?;

    let response: Vec<RunnerConfigHistoryResponse> =
        history.into_iter().map(|h| h.into()).collect();

    Ok(Json(response))
}

/// 获取活跃的 Runner Docker 配置（用于 Runner 心跳）
pub async fn get_active_runner_config(
    State(state): State<Arc<AppState>>,
    Path(_name): Path<String>,
) -> Result<impl IntoResponse> {
    // 从数据库获取配置
    let config = sqlx::query(
        "SELECT enabled, default_image, default_timeout_secs,
                memory_limit_gb, cpu_shares, pids_limit, images_by_type
         FROM runner_docker_configs
         WHERE name = 'default'",
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        error!(error = %e, "Failed to get default runner config");
        AppError::database("Failed to get default runner config")
    })?;

    if let Some(row) = config {
        use sqlx::Row;

        let images_by_type_json: sqlx::types::Json<serde_json::Value> = row.get("images_by_type");
        let images_by_type: std::collections::HashMap<String, String> =
            serde_json::from_value(images_by_type_json.0).unwrap_or_default();

        Ok(Json(serde_json::json!({
            "enabled": row.get::<bool, _>("enabled"),
            "default_image": row.get::<String, _>("default_image"),
            "default_timeout_secs": row.get::<i64, _>("default_timeout_secs"),
            "memory_limit_gb": row.get::<Option<i64>, _>("memory_limit_gb"),
            "cpu_shares": row.get::<Option<i64>, _>("cpu_shares"),
            "pids_limit": row.get::<Option<i64>, _>("pids_limit"),
            "images_by_type": images_by_type,
        })))
    } else {
        // 返回默认配置
        Ok(Json(serde_json::json!({
            "enabled": false,
            "default_image": "ubuntu:22.04",
            "default_timeout_secs": 1800,
            "memory_limit_gb": 4i64,
            "cpu_shares": 1024i64,
            "pids_limit": 1024i64,
            "images_by_type": std::collections::HashMap::<String, String>::new(),
        })))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::runner_config::default_enabled;

    #[test]
    fn test_default_enabled() {
        assert_eq!(default_enabled(), true);
    }

    #[test]
    fn test_update_request_with_all_fields() {
        let request = UpdateRunnerDockerConfigRequest {
            enabled: Some(true),
            default_image: Some("ubuntu:22.04".to_string()),
            default_timeout_secs: Some(1800),
            memory_limit_gb: Some(4),
            cpu_shares: Some(1024),
            pids_limit: Some(1024),
            images_by_type: Some(std::collections::HashMap::new()),
            per_capability: Some(std::collections::HashMap::new()),
            per_runner: Some(std::collections::HashMap::new()),
            description: Some("Test".to_string()),
            change_reason: Some("Test update".to_string()),
        };

        assert_eq!(request.enabled, Some(true));
        assert_eq!(request.change_reason, Some("Test update".to_string()));
    }
}
