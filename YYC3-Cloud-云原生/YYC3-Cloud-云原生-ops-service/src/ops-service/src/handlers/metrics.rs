//! 指标处理器
//! 提供 /metrics 端点

use axum::{
    extract::State,
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use std::collections::HashMap;
use std::sync::Arc;

use crate::middleware::AppState;

/// 指标响应
#[derive(Serialize)]
pub struct MetricsResponse {
    pub http_requests_total: u64,
    pub http_requests_by_status: HashMap<String, u64>,
    pub http_request_duration_p50_ms: f64,
    pub http_request_duration_p95_ms: f64,
    pub http_request_duration_p99_ms: f64,
    pub db_pool_size: u32,
    pub db_pool_idle: u32,
    pub process_uptime_secs: u64,
    pub jobs_pending_total: i64,
    pub jobs_running_total: i64,
    pub jobs_failed_total: i64,
    pub jobs_completed_total: i64,
    pub jobs_recent_created_total: i64,
    pub jobs_recent_failed_total: i64,
    pub builds_pending_total: i64,
    pub builds_running_total: i64,
    pub builds_failed_total: i64,
    pub builds_completed_total: i64,
    pub builds_recent_created_total: i64,
    pub builds_recent_failed_total: i64,
    pub approvals_pending_total: i64,
    pub approvals_recent_created_total: i64,
    pub approvals_recent_approved_total: i64,
    pub approvals_approved_total: i64,
    pub approvals_rejected_total: i64,
    pub approvals_recent_rejected_total: i64,
    pub approvals_timeout_total: i64,
    pub runners_total: i64,
    pub runners_recent_registrations_total: i64,
    pub runners_healthy_total: i64,
    pub runners_unhealthy_total: i64,
    pub runners_maintenance_total: i64,
    pub runner_heartbeat_max_age_secs: u64,
    pub artifacts_total: i64,
    pub artifacts_public_total: i64,
    pub artifact_download_total: i64,
    pub artifact_downloads_recent_total: i64,
    pub audit_logs_total: i64,
    pub audit_queries_recent_total: i64,
    pub login_events_total: i64,
    pub login_failures_recent_total: i64,
}

async fn collect_metrics_snapshot(state: &Arc<AppState>) -> MetricsResponse {
    let jobs_pending_total =
        count_by_sql(state, "SELECT COUNT(*) FROM jobs WHERE status = 'pending'").await;
    let jobs_running_total =
        count_by_sql(state, "SELECT COUNT(*) FROM jobs WHERE status = 'running'").await;
    let jobs_failed_total = count_by_sql(
        state,
        "SELECT COUNT(*) FROM jobs WHERE status IN ('failed', 'partially_succeeded', 'cancelled')",
    )
    .await;
    let jobs_completed_total = count_by_sql(state, "SELECT COUNT(*) FROM jobs WHERE status = 'completed'").await;
    let jobs_recent_created_total = count_by_sql(
        state,
        "SELECT COUNT(*) FROM jobs WHERE created_at >= NOW() - INTERVAL '15 minutes'",
    )
    .await;
    let jobs_recent_failed_total = count_by_sql(
        state,
        "SELECT COUNT(*) FROM jobs WHERE status IN ('failed', 'partially_succeeded', 'cancelled') AND created_at >= NOW() - INTERVAL '15 minutes'",
    )
    .await;

    let builds_pending_total = count_by_sql(
        state,
        "SELECT COUNT(*) FROM build_jobs WHERE status = 'pending'",
    )
    .await;
    let builds_running_total = count_by_sql(
        state,
        "SELECT COUNT(*) FROM build_jobs WHERE status = 'running'",
    )
    .await;
    let builds_failed_total = count_by_sql(
        state,
        "SELECT COUNT(*) FROM build_jobs WHERE status = 'failed'",
    )
    .await;
    let builds_completed_total = count_by_sql(
        state,
        "SELECT COUNT(*) FROM build_jobs WHERE status = 'completed'",
    )
    .await;
    let builds_recent_created_total = count_by_sql(
        state,
        "SELECT COUNT(*) FROM build_jobs WHERE created_at >= NOW() - INTERVAL '15 minutes'",
    )
    .await;
    let builds_recent_failed_total = count_by_sql(
        state,
        "SELECT COUNT(*) FROM build_jobs WHERE status = 'failed' AND created_at >= NOW() - INTERVAL '15 minutes'",
    )
    .await;

    let approvals_pending_total = count_by_sql(
        state,
        "SELECT COUNT(*) FROM approval_requests WHERE status = 'pending'",
    )
    .await;
    let approvals_recent_created_total = count_by_sql(
        state,
        "SELECT COUNT(*) FROM approval_requests WHERE requested_at >= NOW() - INTERVAL '15 minutes'",
    )
    .await;
    let approvals_recent_approved_total = count_by_sql(
        state,
        "SELECT COUNT(*) FROM approval_requests WHERE status = 'approved' AND updated_at >= NOW() - INTERVAL '15 minutes'",
    )
    .await;
    let approvals_approved_total = count_by_sql(
        state,
        "SELECT COUNT(*) FROM approval_requests WHERE status = 'approved'",
    )
    .await;
    let approvals_rejected_total = count_by_sql(
        state,
        "SELECT COUNT(*) FROM approval_requests WHERE status = 'rejected'",
    )
    .await;
    let approvals_recent_rejected_total = count_by_sql(
        state,
        "SELECT COUNT(*) FROM approval_requests WHERE status = 'rejected' AND updated_at >= NOW() - INTERVAL '15 minutes'",
    )
    .await;
    let approvals_timeout_total = count_by_sql(
        state,
        "SELECT COUNT(*) FROM approval_requests WHERE status = 'timeout'",
    )
    .await;

    let runners_total = count_by_sql(state, "SELECT COUNT(*) FROM runners").await;
    let runners_recent_registrations_total = count_by_sql(
        state,
        "SELECT COUNT(*) FROM runners WHERE created_at >= NOW() - INTERVAL '15 minutes'",
    )
    .await;
    let runners_healthy_total = count_by_sql(
        state,
        "SELECT COUNT(*) FROM runners WHERE COALESCE(last_heartbeat > NOW() - INTERVAL '2 minutes', false)",
    )
    .await;
    let runners_unhealthy_total = runners_total.saturating_sub(runners_healthy_total);
    let runners_maintenance_total = count_by_sql(
        state,
        "SELECT COUNT(*) FROM runners WHERE status = 'maintenance'",
    )
    .await;
    let runner_heartbeat_max_age_secs = max_runner_heartbeat_age_secs(state).await;

    let artifacts_total = count_by_sql(state, "SELECT COUNT(*) FROM build_artifacts").await;
    let artifacts_public_total =
        count_by_sql(state, "SELECT COUNT(*) FROM build_artifacts WHERE is_public = true").await;
    let artifact_download_total = count_by_sql(state, "SELECT COUNT(*) FROM artifact_downloads").await;
    let artifact_downloads_recent_total = count_by_sql(
        state,
        "SELECT COUNT(*) FROM artifact_downloads WHERE downloaded_at >= NOW() - INTERVAL '15 minutes'",
    )
    .await;

    let audit_logs_total = count_by_sql(state, "SELECT COUNT(*) FROM audit_logs").await;
    let audit_queries_recent_total = count_by_sql(
        state,
        "SELECT COUNT(*) FROM audit_logs WHERE action = 'audit.query' AND occurred_at >= NOW() - INTERVAL '15 minutes'",
    )
    .await;
    let login_events_total = count_by_sql(state, "SELECT COUNT(*) FROM login_events").await;
    let login_failures_recent_total = count_by_sql(
        state,
        "SELECT COUNT(*) FROM login_events WHERE event_type = 'login_failure' AND occurred_at >= NOW() - INTERVAL '15 minutes'",
    )
    .await;

    MetricsResponse {
        http_requests_total: 0, // 需要从 metrics crate 获取
        http_requests_by_status: HashMap::new(),
        http_request_duration_p50_ms: 0.0,
        http_request_duration_p95_ms: 0.0,
        http_request_duration_p99_ms: 0.0,
        db_pool_size: state.db.size(),
        db_pool_idle: state.db.num_idle() as u32,
        process_uptime_secs: crate::handlers::health::get_uptime(),
        jobs_pending_total,
        jobs_running_total,
        jobs_failed_total,
        jobs_completed_total,
        jobs_recent_created_total,
        jobs_recent_failed_total,
        builds_pending_total,
        builds_running_total,
        builds_failed_total,
        builds_completed_total,
        builds_recent_created_total,
        builds_recent_failed_total,
        approvals_pending_total,
        approvals_recent_created_total,
        approvals_recent_approved_total,
        approvals_approved_total,
        approvals_rejected_total,
        approvals_recent_rejected_total,
        approvals_timeout_total,
        runners_total,
        runners_recent_registrations_total,
        runners_healthy_total,
        runners_unhealthy_total,
        runners_maintenance_total,
        runner_heartbeat_max_age_secs,
        artifacts_total,
        artifacts_public_total,
        artifact_download_total,
        artifact_downloads_recent_total,
        audit_logs_total,
        audit_queries_recent_total,
        login_events_total,
        login_failures_recent_total,
    }
}

/// Prometheus 文本格式指标端点
pub async fn metrics_export(State(state): State<Arc<AppState>>) -> Response {
    let snapshot = collect_metrics_snapshot(&state).await;

    metrics::gauge!("ops_jobs_pending_total").set(snapshot.jobs_pending_total as f64);
    metrics::gauge!("ops_jobs_running_total").set(snapshot.jobs_running_total as f64);
    metrics::gauge!("ops_jobs_failed_total").set(snapshot.jobs_failed_total as f64);
    metrics::gauge!("ops_jobs_completed_total").set(snapshot.jobs_completed_total as f64);
    metrics::gauge!("ops_jobs_recent_created_total").set(snapshot.jobs_recent_created_total as f64);
    metrics::gauge!("ops_jobs_recent_failed_total").set(snapshot.jobs_recent_failed_total as f64);
    metrics::gauge!("ops_builds_pending_total").set(snapshot.builds_pending_total as f64);
    metrics::gauge!("ops_builds_running_total").set(snapshot.builds_running_total as f64);
    metrics::gauge!("ops_builds_failed_total").set(snapshot.builds_failed_total as f64);
    metrics::gauge!("ops_builds_completed_total").set(snapshot.builds_completed_total as f64);
    metrics::gauge!("ops_builds_recent_created_total").set(snapshot.builds_recent_created_total as f64);
    metrics::gauge!("ops_builds_recent_failed_total").set(snapshot.builds_recent_failed_total as f64);
    metrics::gauge!("ops_approvals_pending_total").set(snapshot.approvals_pending_total as f64);
    metrics::gauge!("ops_approvals_recent_created_total").set(snapshot.approvals_recent_created_total as f64);
    metrics::gauge!("ops_approvals_recent_approved_total").set(snapshot.approvals_recent_approved_total as f64);
    metrics::gauge!("ops_approvals_approved_total").set(snapshot.approvals_approved_total as f64);
    metrics::gauge!("ops_approvals_rejected_total").set(snapshot.approvals_rejected_total as f64);
    metrics::gauge!("ops_approvals_recent_rejected_total").set(snapshot.approvals_recent_rejected_total as f64);
    metrics::gauge!("ops_approvals_timeout_total").set(snapshot.approvals_timeout_total as f64);
    metrics::gauge!("ops_runners_total").set(snapshot.runners_total as f64);
    metrics::gauge!("ops_runners_recent_registrations_total").set(snapshot.runners_recent_registrations_total as f64);
    metrics::gauge!("ops_runners_healthy_total").set(snapshot.runners_healthy_total as f64);
    metrics::gauge!("ops_runners_unhealthy_total").set(snapshot.runners_unhealthy_total as f64);
    metrics::gauge!("ops_runners_maintenance_total").set(snapshot.runners_maintenance_total as f64);
    metrics::gauge!("ops_runner_heartbeat_max_age_secs").set(snapshot.runner_heartbeat_max_age_secs as f64);
    metrics::gauge!("ops_artifacts_total").set(snapshot.artifacts_total as f64);
    metrics::gauge!("ops_artifacts_public_total").set(snapshot.artifacts_public_total as f64);
    metrics::gauge!("ops_artifact_download_total").set(snapshot.artifact_download_total as f64);
    metrics::gauge!("ops_artifact_downloads_recent_total").set(snapshot.artifact_downloads_recent_total as f64);
    metrics::gauge!("ops_audit_logs_total").set(snapshot.audit_logs_total as f64);
    metrics::gauge!("ops_audit_queries_recent_total").set(snapshot.audit_queries_recent_total as f64);
    metrics::gauge!("ops_login_events_total").set(snapshot.login_events_total as f64);
    metrics::gauge!("ops_login_failures_recent_total").set(snapshot.login_failures_recent_total as f64);

    let body = crate::telemetry::prometheus_handle()
        .map(|handle| handle.render())
        .unwrap_or_else(|| "# Prometheus exporter not initialized\n".to_string());

    let mut headers = HeaderMap::new();
    headers.insert(
        header::CONTENT_TYPE,
        "text/plain; version=0.0.4; charset=utf-8".parse().unwrap(),
    );

    (StatusCode::OK, headers, body).into_response()
}

/// JSON 快照指标端点
pub async fn metrics_json(State(state): State<Arc<AppState>>) -> Json<MetricsResponse> {
    Json(collect_metrics_snapshot(&state).await)
}

async fn count_by_sql(state: &Arc<AppState>, sql: &str) -> i64 {
    sqlx::query_scalar::<_, i64>(sql)
        .fetch_one(&state.db)
        .await
        .unwrap_or(0)
}

async fn max_runner_heartbeat_age_secs(state: &Arc<AppState>) -> u64 {
    sqlx::query_scalar::<_, Option<i64>>(
        "SELECT MAX(EXTRACT(EPOCH FROM (NOW() - last_heartbeat))::BIGINT) FROM runners WHERE last_heartbeat IS NOT NULL",
    )
    .fetch_one(&state.db)
    .await
    .ok()
    .flatten()
    .unwrap_or(0)
    .max(0) as u64
}
