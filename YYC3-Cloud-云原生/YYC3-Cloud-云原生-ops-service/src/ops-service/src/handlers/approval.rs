//! Approval handlers
//! P3 阶段：审批流相关API处理器

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    auth::middleware::AuthContext,
    error::{AppError, Result},
    middleware::AppState,
    models::approval::*,
    services::audit_service::AuditAction,
};

/// 创建审批请求
pub async fn create_approval_request(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Json(request): Json<CreateApprovalRequestRequest>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "approval", "read", None, None)
        .await?;

    let approval = state
        .approval_service
        .create_approval_request(request, auth.user_id)
        .await?;

    // 审计日志
    let _ = state
        .audit_service
        .log_action_simple(
            auth.user_id,
            AuditAction::ApprovalCreate,
            Some("approval"),
            Some(approval.id),
            Some("Created approval request"),
            None,
        )
        .await;

    Ok((StatusCode::CREATED, Json(approval)))
}

/// 获取审批请求详情
pub async fn get_approval_request(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "approval", "read", None, None)
        .await?;

    let approval = state.approval_service.get_approval_request(id).await?;
    Ok(Json(approval))
}

/// 查询审批请求列表
pub async fn list_approval_requests(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Json(filters): Json<ApprovalListFilters>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "approval", "read", None, None)
        .await?;

    let approvals = state
        .approval_service
        .list_approval_requests(filters)
        .await?;
    Ok(Json(approvals))
}

/// 审批请求（批准或拒绝）
pub async fn approve_request(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    Json(request): Json<ApproveRequestRequest>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "approval", "approve", None, None)
        .await?;

    let is_approve = request.decision == crate::models::approval::ApprovalStatus::Approved;
    state
        .approval_service
        .approve_request(id, auth.user_id, auth.username.clone(), request)
        .await?;

    // 审计日志
    let action = if is_approve {
        AuditAction::ApprovalApprove
    } else {
        AuditAction::ApprovalReject
    };
    let summary = if is_approve {
        "Approved request"
    } else {
        "Rejected request"
    };
    let _ = state
        .audit_service
        .log_action_simple(auth.user_id, action, Some("approval"), Some(id), Some(summary), None)
        .await;

    Ok(StatusCode::NO_CONTENT)
}

/// 取消审批请求
pub async fn cancel_approval_request(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "approval", "read", None, None)
        .await?;

    state
        .approval_service
        .cancel_approval_request(id, auth.user_id)
        .await?;

    // 审计日志
    let _ = state
        .audit_service
        .log_action_simple(
            auth.user_id,
            AuditAction::ApprovalCancel,
            Some("approval"),
            Some(id),
            Some("Cancelled approval request"),
            None,
        )
        .await;

    Ok(StatusCode::NO_CONTENT)
}

/// 创建审批组
pub async fn create_approval_group(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Json(request): Json<CreateApprovalGroupRequest>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "approval", "approve", None, None)
        .await?;

    let group = state
        .approval_service
        .create_approval_group(request, auth.user_id)
        .await?;

    // 审计日志
    let _ = state
        .audit_service
        .log_action_simple(
            auth.user_id,
            AuditAction::ApprovalGroupCreate,
            Some("approval_group"),
            Some(group.id),
            Some("Created approval group"),
            None,
        )
        .await;

    Ok((StatusCode::CREATED, Json(group)))
}

/// 获取审批统计
pub async fn get_approval_statistics(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "approval", "read", None, None)
        .await?;

    let stats = state.approval_service.get_approval_statistics().await?;
    Ok(Json(stats))
}

/// 订阅审批事件流（SSE）
pub async fn subscribe_approval_events(State(state): State<Arc<AppState>>) -> Result<Response> {
    // 创建SSE流
    let stream = state
        .event_bus
        .subscribe_to_approvals()
        .to_sse_stream()
        .await?;

    // 转换为axum响应
    let body = axum::body::Body::from_stream(stream);

    Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "text/event-stream")
        .header("Cache-Control", "no-cache")
        .header("Connection", "keep-alive")
        .header("X-Accel-Buffering", "no") // 禁用nginx缓冲
        .body(body)
        .map_err(|e| AppError::internal_error(&format!("Failed to create SSE response: {}", e)))
}

/// 订阅作业事件流（SSE）
pub async fn subscribe_job_events(
    State(state): State<Arc<AppState>>,
    Path(job_id): Path<Uuid>,
) -> Result<Response> {
    // 创建SSE流
    let stream = state
        .event_bus
        .subscribe_to_job(job_id)
        .to_sse_stream()
        .await?;

    // 转换为axum响应
    let body = axum::body::Body::from_stream(stream);

    Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "text/event-stream")
        .header("Cache-Control", "no-cache")
        .header("Connection", "keep-alive")
        .header("X-Accel-Buffering", "no")
        .body(body)
        .map_err(|e| AppError::internal_error(&format!("Failed to create SSE response: {}", e)))
}

/// 创建作业模板
pub async fn create_job_template(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Json(request): Json<CreateJobTemplateRequest>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "job", "execute", None, None)
        .await?;

    let template = state
        .job_service
        .create_job_template(request, auth.user_id)
        .await?;
    Ok((StatusCode::CREATED, Json(template)))
}

/// 获取作业模板详情
pub async fn get_job_template(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "job", "read", None, None)
        .await?;

    let template = state.job_service.get_job_template(id).await?;
    Ok(Json(template))
}

/// 查询作业模板列表
pub async fn list_job_templates(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "job", "read", None, None)
        .await?;

    let templates = state.job_service.list_job_templates().await?;
    Ok(Json(templates))
}

/// 更新作业模板
pub async fn update_job_template(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    Json(request): Json<UpdateJobTemplateRequest>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "job", "execute", None, None)
        .await?;

    let template = state
        .job_service
        .update_job_template(id, request, auth.user_id)
        .await?;
    Ok(Json(template))
}

/// 删除作业模板
pub async fn delete_job_template(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "job", "execute", None, None)
        .await?;

    state
        .job_service
        .delete_job_template(id, auth.user_id)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

/// 执行模板化作业
pub async fn execute_template_job(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Json(request): Json<ExecuteTemplateJobRequest>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "job", "execute", None, None)
        .await?;

    let job = state
        .job_service
        .create_job_from_template(request, auth.user_id)
        .await?;
    Ok((StatusCode::CREATED, Json(job)))
}
