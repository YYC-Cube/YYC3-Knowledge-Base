//! 审计日志的 HTTP 处理器

use crate::{
    auth::middleware::AuthContext, error::AppError, middleware::AppState, models::audit::*,
};
use axum::{
    extract::{Query, State},
    response::IntoResponse,
    Json,
};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use serde_json::json;
use std::sync::Arc;

#[derive(Debug, Deserialize)]
pub struct AuditLogQuery {
    pub subject_id: Option<uuid::Uuid>,
    pub resource_type: Option<String>,
    pub resource_id: Option<uuid::Uuid>,
    pub action: Option<String>,
    pub result: Option<String>,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub trace_id: Option<String>,
    #[serde(default = "default_limit")]
    pub limit: i64,
    #[serde(default)]
    pub offset: i64,
}

fn default_limit() -> i64 {
    50
}

#[derive(Debug, Deserialize)]
pub struct LoginEventQuery {
    pub user_id: Option<uuid::Uuid>,
    pub event_type: Option<String>,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    #[serde(default = "default_limit")]
    pub limit: i64,
}

/// 查询审计日志
pub async fn list_audit_logs(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
    Query(query): Query<AuditLogQuery>,
) -> Result<impl IntoResponse, AppError> {
    // 只有管理员可以访问审计日志
    state
        .permission_service
        .require_permission(auth_context.user_id, "audit", "read", None, None)
        .await?;

    let filters = AuditLogFilters {
        subject_id: query.subject_id,
        resource_type: query.resource_type,
        resource_id: query.resource_id,
        action: query.action,
        result: query.result,
        start_time: query.start_time,
        end_time: query.end_time,
        trace_id: query.trace_id,
    };

    let logs = state
        .audit_service
        .query_logs(&filters, query.limit, query.offset)
        .await?;
    let count = state.audit_service.count_logs(&filters).await?;

    let _ = state
        .audit_service
        .log_action_simple(
            auth_context.user_id,
            crate::services::audit_service::AuditAction::AuditQuery,
            Some("audit"),
            None,
            Some("Queried audit logs"),
            None,
        )
        .await;

    Ok(Json(json!({
        "logs": logs,
        "count": logs.len(),
        "total": count
    })))
}

/// 查询登录事件
pub async fn list_login_events(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
    Query(query): Query<LoginEventQuery>,
) -> Result<impl IntoResponse, AppError> {
    // 只有管理员可以访问登录事件
    state
        .permission_service
        .require_permission(auth_context.user_id, "audit", "read", None, None)
        .await?;

    let events = state
        .audit_service
        .query_login_events(
            query.user_id,
            query.event_type.as_deref(),
            query.start_time,
            query.end_time,
            query.limit,
        )
        .await?;

    let _ = state
        .audit_service
        .log_action_simple(
            auth_context.user_id,
            crate::services::audit_service::AuditAction::AuditQuery,
            Some("audit"),
            None,
            Some("Queried login events"),
            None,
        )
        .await;

    Ok(Json(json!({
        "events": events,
        "count": events.len()
    })))
}
