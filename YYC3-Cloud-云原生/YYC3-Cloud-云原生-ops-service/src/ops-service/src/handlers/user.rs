//! 用户管理的 HTTP 处理器

use crate::{
    auth::middleware::AuthContext, auth::password::PasswordHasher, error::AppError,
    middleware::AppState, models::user::*, services::audit_service::AuditAction,
};
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

/// 列出用户
pub async fn list_users(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
) -> Result<impl IntoResponse, AppError> {
    // 检查权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "user", "read", None, None)
        .await?;

    let repo = crate::repository::UserRepository::new(state.db.clone());
    let users = repo.list(50, 0).await?;

    let user_responses: Vec<UserResponse> = users.into_iter().map(|u| u.into()).collect();

    Ok(Json(json!({
        "users": user_responses,
        "count": user_responses.len()
    })))
}

/// 创建用户
pub async fn create_user(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
    Json(req): Json<CreateUserRequest>,
) -> Result<impl IntoResponse, AppError> {
    // 检查权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "user", "write", None, None)
        .await?;

    // 验证密码策略
    PasswordHasher::validate_password_policy(&req.password, &state.config)?;

    // 哈希密码
    let hasher = PasswordHasher::new();
    let password_hash = hasher.hash(&req.password)?;

    let repo = crate::repository::UserRepository::new(state.db.clone());
    let user = repo
        .create(&req, &password_hash, auth_context.user_id)
        .await?;

    // 审计日志
    state
        .audit_service
        .log_action_simple(
            auth_context.user_id,
            AuditAction::UserCreate,
            Some("user"),
            Some(user.id),
            Some(&format!("Created user: {}", user.username)),
            None,
        )
        .await?;

    Ok(Json(json!({
        "message": "用户创建成功",
        "user": UserResponse::from(user)
    })))
}

/// 获取用户详情
pub async fn get_user(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    // 检查权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "user", "read", None, None)
        .await?;

    let repo = crate::repository::UserRepository::new(state.db.clone());
    let user = repo
        .find_by_id(&id)
        .await?
        .ok_or_else(|| AppError::not_found("User not found"))?;

    Ok(Json(UserResponse::from(user)))
}

/// 更新用户
pub async fn update_user(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateUserRequest>,
) -> Result<impl IntoResponse, AppError> {
    // 检查权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "user", "write", None, None)
        .await?;

    let repo = crate::repository::UserRepository::new(state.db.clone());
    let user = repo
        .update(id, &req)
        .await?
        .ok_or_else(|| AppError::not_found("User not found"))?;

    // 审计日志
    state
        .audit_service
        .log_action_simple(
            auth_context.user_id,
            AuditAction::UserUpdate,
            Some("user"),
            Some(user.id),
            Some(&format!("Updated user: {}", user.username)),
            None,
        )
        .await?;

    Ok(Json(json!({
        "message": "用户更新成功",
        "user": UserResponse::from(user)
    })))
}

/// 删除用户
pub async fn delete_user(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    // 检查权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "user", "write", None, None)
        .await?;

    // 不允许删除自己
    if id == auth_context.user_id {
        return Err(AppError::BadRequest("不能删除自己的账户".to_string()));
    }

    // 先获取用户信息用于审计日志
    let repo = crate::repository::UserRepository::new(state.db.clone());
    let user = repo
        .find_by_id(&id)
        .await?
        .ok_or_else(|| AppError::not_found("User not found"))?;

    let username = user.username.clone();

    repo.delete(id).await?;

    // 审计日志
    state
        .audit_service
        .log_action_simple(
            auth_context.user_id,
            AuditAction::UserDelete,
            Some("user"),
            Some(id),
            Some(&format!("Deleted user: {}", username)),
            None,
        )
        .await?;

    Ok(Json(json!({
        "message": "用户删除成功"
    })))
}

/// 修改密码
pub async fn change_password(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
    Json(req): Json<ChangePasswordRequest>,
) -> Result<impl IntoResponse, AppError> {
    let repo = crate::repository::UserRepository::new(state.db.clone());
    let user = repo
        .find_by_id(&auth_context.user_id)
        .await?
        .ok_or_else(|| AppError::not_found("User not found"))?;

    let hasher = PasswordHasher::new();
    hasher.verify(&req.old_password, &user.password_hash)?;

    // 验证新密码策略
    PasswordHasher::validate_password_policy(&req.new_password, &state.config)?;

    // 哈希新密码
    let new_password_hash = hasher.hash(&req.new_password)?;

    // 更新密码
    repo.update_password(auth_context.user_id, &new_password_hash, false)
        .await?;

    // 审计日志
    state
        .audit_service
        .log_action_simple(
            auth_context.user_id,
            AuditAction::UserPasswordChange,
            Some("user"),
            Some(auth_context.user_id),
            Some("User changed their password"),
            None,
        )
        .await?;

    Ok(Json(json!({
        "message": "密码修改成功"
    })))
}
