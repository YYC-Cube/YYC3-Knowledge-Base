//! 资产管理的 HTTP 处理器

use crate::{
    auth::middleware::AuthContext, error::AppError, middleware::AppState, models::asset::*,
    services::audit_service::AuditAction,
};
use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::json;
use std::sync::Arc;

use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct ListQuery {
    pub environment: Option<String>,
    #[serde(default = "default_limit")]
    pub limit: i64,
    #[serde(default)]
    pub offset: i64,
}

fn default_limit() -> i64 {
    50
}

// ==================== Asset Groups ====================

/// 列出资产组（带作用域过滤）
pub async fn list_groups(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
    Query(query): Query<ListQuery>,
) -> Result<impl IntoResponse, AppError> {
    // 检查基本权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "asset", "read", None, None)
        .await?;

    // 获取用户的环境作用域
    let allowed_environments = state
        .permission_service
        .filter_resources_by_scope(auth_context.user_id, "environment")
        .await?;

    let repo = crate::repository::AssetRepository::new(state.db.clone());
    let all_groups = repo.list_groups(query.environment.as_deref()).await?;

    // 应用作用域过滤
    let filtered_groups: Vec<_> = if allowed_environments.contains(&"*".to_string()) {
        // 用户有全局权限
        all_groups
    } else {
        // 只返回用户有权限的环境
        all_groups
            .into_iter()
            .filter(|g| allowed_environments.contains(&g.environment))
            .collect()
    };

    Ok(Json(json!({
        "groups": filtered_groups,
        "count": filtered_groups.len()
    })))
}

/// 创建资产组
pub async fn create_group(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
    Json(req): Json<CreateGroupRequest>,
) -> Result<impl IntoResponse, AppError> {
    // 检查权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "asset", "write", None, None)
        .await?;

    let repo = crate::repository::AssetRepository::new(state.db.clone());
    let group = repo.create_group(&req, auth_context.user_id).await?;

    // 审计日志
    state
        .audit_service
        .log_action_simple(
            auth_context.user_id,
            AuditAction::AssetGroupCreate,
            Some("asset_group"),
            Some(group.id),
            Some(&format!("Created asset group: {} in {}", group.name, group.environment)),
            None,
        )
        .await?;

    Ok(Json(json!({
        "message": "资产组创建成功",
        "group": group
    })))
}

/// 获取资产组详情（带作用域检查）
pub async fn get_group(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    // 检查基本权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "asset", "read", None, None)
        .await?;

    let repo = crate::repository::AssetRepository::new(state.db.clone());
    let group = repo
        .get_group(id)
        .await?
        .ok_or_else(|| AppError::not_found("Resource not found"))?;

    // 检查作用域权限
    let allowed_environments = state
        .permission_service
        .filter_resources_by_scope(auth_context.user_id, "environment")
        .await?;

    // 如果用户没有全局权限且资产组的环境不在允许列表中，返回 404
    if !allowed_environments.contains(&"*".to_string())
        && !allowed_environments.contains(&group.environment)
    {
        return Err(AppError::not_found("Resource not found"));
    }

    Ok(Json(group))
}

/// 更新资产组
pub async fn update_group(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateGroupRequest>,
) -> Result<impl IntoResponse, AppError> {
    // 检查权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "asset", "write", None, None)
        .await?;

    let repo = crate::repository::AssetRepository::new(state.db.clone());
    let group = repo
        .update_group(id, &req)
        .await?
        .ok_or_else(|| AppError::not_found("Resource not found"))?;

    // 审计日志
    state
        .audit_service
        .log_action_simple(
            auth_context.user_id,
            AuditAction::AssetGroupUpdate,
            Some("asset_group"),
            Some(group.id),
            Some(&format!("Updated asset group: {}", group.name)),
            None,
        )
        .await?;

    Ok(Json(json!({
        "message": "资产组更新成功",
        "group": group
    })))
}

/// 删除资产组
pub async fn delete_group(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    // 检查权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "asset", "write", None, None)
        .await?;

    // 先获取组信息用于审计日志
    let repo = crate::repository::AssetRepository::new(state.db.clone());
    let group = repo
        .get_group(id)
        .await?
        .ok_or_else(|| AppError::not_found("Resource not found"))?;

    let group_name = group.name.clone();

    repo.delete_group(id).await?;

    // 审计日志
    state
        .audit_service
        .log_action_simple(
            auth_context.user_id,
            AuditAction::AssetGroupDelete,
            Some("asset_group"),
            Some(id),
            Some(&format!("Deleted asset group: {}", group_name)),
            None,
        )
        .await?;

    Ok(Json(json!({
        "message": "资产组删除成功"
    })))
}

// ==================== Hosts ====================

#[derive(Debug, Deserialize)]
pub struct HostListQuery {
    pub group_id: Option<Uuid>,
    pub environment: Option<String>,
    pub status: Option<String>,
    pub tags: Option<Vec<String>>,
    pub search: Option<String>,
    #[serde(default = "default_limit")]
    pub limit: i64,
    #[serde(default)]
    pub offset: i64,
}

/// 列出主机（带作用域过滤）
pub async fn list_hosts(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
    Query(query): Query<HostListQuery>,
) -> Result<impl IntoResponse, AppError> {
    // 检查基本权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "asset", "read", None, None)
        .await?;

    // 获取用户的作用域
    let allowed_environments = state
        .permission_service
        .filter_resources_by_scope(auth_context.user_id, "environment")
        .await?;

    let allowed_groups = state
        .permission_service
        .filter_resources_by_scope(auth_context.user_id, "group")
        .await?;

    let repo = crate::repository::AssetRepository::new(state.db.clone());

    let filters = HostListFilters {
        group_id: query.group_id,
        environment: query.environment,
        status: query.status,
        tags: query.tags,
        search: query.search,
    };

    let hosts = repo.list_hosts(&filters, query.limit, query.offset).await?;

    // 应用作用域过滤
    let filtered_hosts: Vec<_> = if allowed_environments.contains(&"*".to_string())
        && allowed_groups.contains(&"*".to_string())
    {
        // 用户有全局权限
        hosts
    } else {
        hosts
            .into_iter()
            .filter(|h| {
                // 检查环境权限
                let env_ok = allowed_environments.contains(&"*".to_string())
                    || allowed_environments.contains(&h.environment);
                // 检查分组权限
                let group_ok = allowed_groups.contains(&"*".to_string())
                    || allowed_groups.contains(&h.group_id.to_string());
                env_ok && group_ok
            })
            .collect()
    };

    let count = filtered_hosts.len() as i64;

    Ok(Json(json!({
        "hosts": filtered_hosts,
        "count": filtered_hosts.len(),
        "total": count
    })))
}

/// 创建主机
pub async fn create_host(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
    Json(req): Json<CreateHostRequest>,
) -> Result<impl IntoResponse, AppError> {
    // 检查权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "asset", "write", None, None)
        .await?;

    let repo = crate::repository::AssetRepository::new(state.db.clone());
    let host = repo.create_host(&req, auth_context.user_id).await?;

    // 审计日志
    state
        .audit_service
        .log_action_simple(
            auth_context.user_id,
            AuditAction::HostCreate,
            Some("host"),
            Some(host.id),
            Some(&format!("Created host: {}", host.identifier)),
            None,
        )
        .await?;

    Ok(Json(json!({
        "message": "主机创建成功",
        "host": host
    })))
}

/// 获取主机详情（带作用域检查）
pub async fn get_host(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    // 检查基本权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "asset", "read", None, None)
        .await?;

    let repo = crate::repository::AssetRepository::new(state.db.clone());
    let host = repo
        .get_host(id)
        .await?
        .ok_or_else(|| AppError::not_found("Resource not found"))?;

    // 检查作用域权限
    let allowed_environments = state
        .permission_service
        .filter_resources_by_scope(auth_context.user_id, "environment")
        .await?;

    let allowed_groups = state
        .permission_service
        .filter_resources_by_scope(auth_context.user_id, "group")
        .await?;

    // 如果用户没有全局权限，检查环境和分组权限
    let env_ok = allowed_environments.contains(&"*".to_string())
        || allowed_environments.contains(&host.environment);

    let group_ok = allowed_groups.contains(&"*".to_string())
        || allowed_groups.contains(&host.group_id.to_string());

    if !env_ok || !group_ok {
        return Err(AppError::not_found("Resource not found"));
    }

    Ok(Json(host))
}

/// 更新主机
pub async fn update_host(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateHostRequest>,
) -> Result<impl IntoResponse, AppError> {
    // 检查权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "asset", "write", None, None)
        .await?;

    let repo = crate::repository::AssetRepository::new(state.db.clone());
    let host = repo
        .update_host(id, &req, auth_context.user_id)
        .await?
        .ok_or_else(|| AppError::not_found("Resource not found"))?;

    // 审计日志
    state
        .audit_service
        .log_action_simple(
            auth_context.user_id,
            AuditAction::HostUpdate,
            Some("host"),
            Some(host.id),
            Some(&format!("Updated host: {}", host.identifier)),
            None,
        )
        .await?;

    Ok(Json(json!({
        "message": "主机更新成功",
        "host": host
    })))
}

/// 删除主机
pub async fn delete_host(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    // 检查权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "asset", "write", None, None)
        .await?;

    // 先获取主机信息用于审计日志
    let repo = crate::repository::AssetRepository::new(state.db.clone());
    let host = repo
        .get_host(id)
        .await?
        .ok_or_else(|| AppError::not_found("Resource not found"))?;

    let host_info = host.identifier.clone();

    repo.delete_host(id).await?;

    // 审计日志
    state
        .audit_service
        .log_action_simple(
            auth_context.user_id,
            AuditAction::HostDelete,
            Some("host"),
            Some(id),
            Some(&format!("Deleted host: {}", host_info)),
            None,
        )
        .await?;

    Ok(Json(json!({
        "message": "主机删除成功"
    })))
}
