//! 角色管理的 HTTP 处理器
//! P1 阶段：提供角色和权限管理的 API 端点，包含审计记录

use crate::{
    auth::middleware::AuthContext, error::AppError, middleware::AppState, models::role::*,
    repository::role_repo::RoleRepository, services::audit_service::AuditAction,
};
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

// ==================== Roles ====================

/// 列出所有角色
pub async fn list_roles(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
) -> Result<impl IntoResponse, AppError> {
    // 检查权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "role", "read", None, None)
        .await?;

    let repo = RoleRepository::new(state.db.clone());
    let roles = repo.list().await?;

    Ok(Json(json!({
        "roles": roles,
        "count": roles.len()
    })))
}

/// 创建角色
pub async fn create_role(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
    Json(req): Json<CreateRoleRequest>,
) -> Result<impl IntoResponse, AppError> {
    // 检查权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "role", "write", None, None)
        .await?;

    let repo = RoleRepository::new(state.db.clone());
    let role = repo.create(&req).await?;

    // 审计日志
    state
        .audit_service
        .log_action_simple(
            auth_context.user_id,
            AuditAction::RoleCreate,
            Some("role"),
            Some(role.id),
            Some(&format!("Created role: {}", role.name)),
            None,
        )
        .await?;

    Ok(Json(json!({
        "message": "角色创建成功",
        "role": role
    })))
}

/// 获取角色详情
pub async fn get_role(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    // 检查权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "role", "read", None, None)
        .await?;

    let repo = RoleRepository::new(state.db.clone());
    let role = repo
        .find_by_id(&id)
        .await?
        .ok_or_else(|| AppError::not_found("Role not found"))?;

    // 获取角色的权限
    let permissions = repo.get_role_permissions(id).await?;

    Ok(Json(json!({
        "role": role,
        "permissions": permissions
    })))
}

/// 更新角色
pub async fn update_role(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateRoleRequest>,
) -> Result<impl IntoResponse, AppError> {
    // 检查权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "role", "write", None, None)
        .await?;

    let repo = RoleRepository::new(state.db.clone());
    let role = repo
        .update(id, &req)
        .await?
        .ok_or_else(|| AppError::not_found("Role not found"))?;

    // 审计日志
    state
        .audit_service
        .log_action_simple(
            auth_context.user_id,
            AuditAction::RoleUpdate,
            Some("role"),
            Some(role.id),
            Some(&format!("Updated role: {}", role.name)),
            None,
        )
        .await?;

    Ok(Json(json!({
        "message": "角色更新成功",
        "role": role
    })))
}

/// 删除角色
pub async fn delete_role(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    // 检查权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "role", "write", None, None)
        .await?;

    // 先获取角色信息用于审计日志
    let repo = RoleRepository::new(state.db.clone());
    let role = repo
        .find_by_id(&id)
        .await?
        .ok_or_else(|| AppError::not_found("Role not found"))?;

    let role_name = role.name.clone();

    repo.delete(id).await?;

    // 审计日志
    state
        .audit_service
        .log_action_simple(
            auth_context.user_id,
            AuditAction::RoleDelete,
            Some("role"),
            Some(id),
            Some(&format!("Deleted role: {}", role_name)),
            None,
        )
        .await?;

    Ok(Json(json!({
        "message": "角色删除成功"
    })))
}

// ==================== Permissions ====================

/// 列出所有权限
pub async fn list_permissions(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
) -> Result<impl IntoResponse, AppError> {
    // 检查权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "role", "read", None, None)
        .await?;

    let repo = RoleRepository::new(state.db.clone());
    let permissions = repo.list_permissions().await?;

    Ok(Json(json!({
        "permissions": permissions,
        "count": permissions.len()
    })))
}

/// 获取角色的权限
pub async fn get_role_permissions(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    // 检查权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "role", "read", None, None)
        .await?;

    let repo = RoleRepository::new(state.db.clone());

    // 验证角色存在
    let _role = repo
        .find_by_id(&id)
        .await?
        .ok_or_else(|| AppError::not_found("Role not found"))?;

    let permissions = repo.get_role_permissions(id).await?;

    Ok(Json(json!({
        "role_id": id,
        "permissions": permissions
    })))
}

// ==================== Role Bindings ====================

/// 为用户分配角色
pub async fn assign_role(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
    Json(req): Json<AssignRoleRequest>,
) -> Result<impl IntoResponse, AppError> {
    // 检查权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "role_binding", "write", None, None)
        .await?;

    let repo = RoleRepository::new(state.db.clone());
    let binding = repo
        .assign_role_to_user(
            req.user_id,
            req.role_id,
            &req.scope_type,
            req.scope_value.as_deref(),
            auth_context.user_id,
        )
        .await?;

    // 审计日志
    state
        .audit_service
        .log_action_simple(
            auth_context.user_id,
            AuditAction::RoleBindingCreate,
            Some("role_binding"),
            Some(binding.id),
            Some(&format!(
                "Assigned role {} to user with scope: {}/{}",
                binding.role_name,
                binding.scope_type,
                binding.scope_value.as_deref().unwrap_or("*")
            )),
            None,
        )
        .await?;

    Ok(Json(json!({
        "message": "角色分配成功",
        "binding": binding
    })))
}

/// 撤销用户的角色
pub async fn revoke_role(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
    Path(binding_id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    // 检查权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "role_binding", "write", None, None)
        .await?;

    let repo = RoleRepository::new(state.db.clone());

    // 先执行撤销操作
    let deleted = repo.revoke_role_from_user(binding_id).await?;
    if !deleted {
        return Err(AppError::not_found("Role binding not found"));
    }

    // 审计日志（简化版，只记录绑定ID）
    state
        .audit_service
        .log_action_simple(
            auth_context.user_id,
            AuditAction::RoleBindingDelete,
            Some("role_binding"),
            Some(binding_id),
            Some(&format!("Revoked role binding: {}", binding_id)),
            None,
        )
        .await?;

    Ok(Json(json!({
        "message": "角色撤销成功"
    })))
}

/// 获取用户的角色绑定
pub async fn get_user_roles(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
    Path(user_id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    // 检查权限（管理员或用户自己可以查看）
    let is_admin = state
        .permission_service
        .is_admin(auth_context.user_id)
        .await
        .unwrap_or(false);

    if !is_admin && auth_context.user_id != user_id {
        return Err(AppError::Forbidden);
    }

    let repo = RoleRepository::new(state.db.clone());
    let bindings = repo.get_user_role_bindings(user_id).await?;

    Ok(Json(json!({
        "user_id": user_id,
        "role_bindings": bindings,
        "count": bindings.len()
    })))
}
