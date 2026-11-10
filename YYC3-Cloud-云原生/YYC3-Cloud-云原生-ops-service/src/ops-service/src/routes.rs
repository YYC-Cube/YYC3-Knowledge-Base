//! 路由注册
//! 创建所有 API 路由并应用中间件
//!
//! 注意：create_router 仅负责路由装配，所有服务实例由 main 统一创建并通过 AppState 传入。
//! 不再在此处重复创建服务实例，确保单例语义与状态来源单一。

use axum::{
    routing::{delete, get, post, put},
    Router,
};
use std::sync::Arc;

use crate::{
    handlers,
    middleware::AppState,
};

use crate::middleware::runner_auth_middleware;

/// 创建应用路由
/// state 由 main 统一装配，包含所有服务实例
pub fn create_router(state: Arc<AppState>) -> Router {
    // 公开端点（健康检查）
    let public_routes = Router::new()
        .route("/health", get(handlers::health::health_check))
        .route("/ready", get(handlers::health::readiness_check))
        .route("/api/v1/system/concurrency", get(handlers::health::get_concurrency_status));

    // Runner Webhook 路由（使用 Runner API Key 鉴权）
    let runner_routes = Router::new()
        .route(
            "/api/v1/runners/register",
            post(handlers::runner::register_runner)
        )
        .route(
            "/api/v1/webhooks/runner/register",
            post(handlers::runner::register_runner)
        )
        .route(
            "/api/v1/runners/heartbeat",
            post(handlers::runner::runner_heartbeat)
        )
        .route(
            "/api/v1/webhooks/runner/heartbeat",
            post(handlers::runner::runner_heartbeat)
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            runner_auth_middleware,
        ));

    // 构建 Webhook 路由（使用 HMAC 签名鉴权）
    let webhook_routes = Router::new()
        .route(
            "/api/v1/webhooks/build/status",
            post(handlers::build_webhook::build_status_webhook)
        )
        .route(
            "/api/v1/webhooks/build/log",
            post(handlers::build_webhook::build_log_webhook)
        )
        .route(
            "/api/v1/webhooks/build/artifact",
            post(handlers::build_webhook::build_artifact_webhook)
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            crate::middleware::webhook_hmac::build_webhook_hmac_middleware,
        ));

    // 认证路由（无需认证，但应用速率限制）
    let auth_routes = Router::new()
        .route("/api/v1/auth/login", post(handlers::auth::login))
        .route("/api/v1/auth/refresh", post(handlers::auth::refresh_token));

    // 需要认证的路由
    let authenticated_routes = Router::new()
        // 当前用户信息
        .route("/api/v1/auth/me", get(handlers::auth::get_current_user))
        .route("/api/v1/auth/logout", post(handlers::auth::logout))
        .route("/api/v1/auth/logout-all", post(handlers::auth::logout_all))

        // 用户管理（需要权限）
        .route(
            "/api/v1/users",
            get(handlers::user::list_users)
                .post(handlers::user::create_user)
        )
        .route(
            "/api/v1/users/{id}",
            get(handlers::user::get_user)
                .put(handlers::user::update_user)
                .delete(handlers::user::delete_user)
        )
        .route("/api/v1/users/me/password", put(handlers::user::change_password))

        // 资产组
        .route(
            "/api/v1/groups",
            get(handlers::asset::list_groups)
                .post(handlers::asset::create_group)
        )
        .route(
            "/api/v1/groups/{id}",
            get(handlers::asset::get_group)
                .put(handlers::asset::update_group)
                .delete(handlers::asset::delete_group)
        )

        // 主机
        .route(
            "/api/v1/hosts",
            get(handlers::asset::list_hosts)
                .post(handlers::asset::create_host)
        )
        .route(
            "/api/v1/hosts/{id}",
            get(handlers::asset::get_host)
                .put(handlers::asset::update_host)
                .delete(handlers::asset::delete_host)
        )

        // 作业管理
        .route(
            "/api/v1/jobs",
            get(handlers::job::list_jobs)
        )
        .route(
            "/api/v1/jobs/command",
            post(handlers::job::create_command_job)
        )
        .route(
            "/api/v1/jobs/script",
            post(handlers::job::create_script_job)
        )
        .route(
            "/api/v1/jobs/{id}",
            get(handlers::job::get_job)
        )
        .route(
            "/api/v1/jobs/{id}/tasks",
            get(handlers::job::get_job_tasks)
        )
        .route(
            "/api/v1/jobs/{id}/cancel",
            post(handlers::job::cancel_job)
        )
        .route(
            "/api/v1/jobs/{id}/retry",
            post(handlers::job::retry_job)
        )
        .route(
            "/api/v1/jobs/{id}/statistics",
            get(handlers::job::get_job_statistics)
        )

        // 审计日志（需要审计权限）
        .route("/api/v1/audit/logs", get(handlers::audit::list_audit_logs))
        .route("/api/v1/audit/login-events", get(handlers::audit::list_login_events))

        // 角色管理（P1）
        .route(
            "/api/v1/roles",
            get(handlers::role::list_roles)
                .post(handlers::role::create_role)
        )
        .route(
            "/api/v1/roles/{id}",
            get(handlers::role::get_role)
                .put(handlers::role::update_role)
                .delete(handlers::role::delete_role)
        )
        .route(
            "/api/v1/permissions",
            get(handlers::role::list_permissions)
        )
        .route(
            "/api/v1/roles/{id}/permissions",
            get(handlers::role::get_role_permissions)
        )
        .route(
            "/api/v1/role-bindings",
            post(handlers::role::assign_role)
        )
        .route(
            "/api/v1/role-bindings/{id}",
            delete(handlers::role::revoke_role)
        )
        .route(
            "/api/v1/users/{user_id}/roles",
            get(handlers::role::get_user_roles)
        )

        // 审批管理 (P3)
        .route(
            "/api/v1/approvals",
            get(handlers::approval::list_approval_requests)
                .post(handlers::approval::create_approval_request)
        )
        .route(
            "/api/v1/approvals/{id}",
            get(handlers::approval::get_approval_request)
        )
        .route(
            "/api/v1/approvals/{id}/approve",
            post(handlers::approval::approve_request)
        )
        .route(
            "/api/v1/approvals/{id}/cancel",
            post(handlers::approval::cancel_approval_request)
        )
        .route(
            "/api/v1/approval-groups",
            post(handlers::approval::create_approval_group)
        )
        .route(
            "/api/v1/approvals/statistics",
            get(handlers::approval::get_approval_statistics)
        )

        // 作业模板 (P3)
        .route(
            "/api/v1/job-templates",
            get(handlers::approval::list_job_templates)
                .post(handlers::approval::create_job_template)
        )
        .route(
            "/api/v1/job-templates/{id}",
            get(handlers::approval::get_job_template)
                .put(handlers::approval::update_job_template)
                .delete(handlers::approval::delete_job_template)
        )
        .route(
            "/api/v1/job-templates/execute",
            post(handlers::approval::execute_template_job)
        )

        // 实时事件流 (P3 - SSE)
        .route(
            "/api/v1/stream/approvals",
            get(handlers::approval::subscribe_approval_events)
        )
        .route(
            "/api/v1/stream/jobs/{id}",
            get(handlers::approval::subscribe_job_events)
        )

        // 构建作业 (P2.1)
        .route(
            "/api/v1/builds",
            post(handlers::build::create_build_job)
                .get(handlers::build::list_build_jobs)
        )
        .route(
            "/api/v1/builds/{id}",
            get(handlers::build::get_build_job)
        )
        .route(
            "/api/v1/builds/{id}/cancel",
            post(handlers::build::cancel_build_job)
        )
        .route(
            "/api/v1/builds/{id}/retry",
            post(handlers::build::retry_build_job)
        )
        .route(
            "/api/v1/builds/{id}/steps",
            get(handlers::build::get_build_steps)
        )

        // Runner 管理 (P2.1)
        .route(
            "/api/v1/runners",
            get(handlers::runner::list_runners)
        )
        .route(
            "/api/v1/runners/{id}",
            get(handlers::runner::get_runner_status)
                .put(handlers::runner::update_runner_status)
                .delete(handlers::runner::delete_runner)
        )

        // Runner Docker 配置管理 (Web UI)
        .route(
            "/api/v1/runner-docker-configs",
            get(handlers::runner_config::list_runner_configs)
                .post(handlers::runner_config::create_runner_config)
        )
        .route(
            "/api/v1/runner-docker-configs/{id}",
            get(handlers::runner_config::get_runner_config)
                .put(handlers::runner_config::update_runner_config)
                .delete(handlers::runner_config::delete_runner_config)
        )
        .route(
            "/api/v1/runner-docker-configs/{id}/history",
            get(handlers::runner_config::get_config_history)
        )

        // 构建产物 (P2.1)
        .route(
            "/api/v1/artifacts",
            post(handlers::artifact::record_artifact)
                .get(handlers::artifact::list_artifacts)
        )
        .route(
            "/api/v1/artifacts/{id}",
            get(handlers::artifact::get_artifact)
                .put(handlers::artifact::update_artifact)
                .delete(handlers::artifact::delete_artifact)
        )
        .route(
            "/api/v1/artifacts/{id}/download",
            post(handlers::artifact::record_download)
        )
        .route(
            "/api/v1/artifacts/{id}/download-url",
            get(handlers::artifact::generate_download_url)
        )
        .route(
            "/api/v1/artifacts/{id}/downloads",
            get(handlers::artifact::get_download_history)
        )
        .layer(axum::middleware::from_fn_with_state(
            state.jwt_service.clone(),
            crate::auth::middleware::jwt_auth_middleware,
        ));

    // 指标端点（按配置决定是否暴露）
    let metrics_routes = if state.config.metrics.enabled {
        let router = Router::new()
            .route("/metrics", get(handlers::metrics::metrics_export))
            .route("/metrics.json", get(handlers::metrics::metrics_json));

        // 如果配置了 require_whitelist，包裹在 IP 白名单中间件中
        if state.config.metrics.require_whitelist {
            router.layer(axum::middleware::from_fn_with_state(
                state.clone(),
                crate::middleware::ip_whitelist_middleware,
            ))
        } else {
            router
        }
    } else {
        Router::new()
    };

    // 组合所有路由
    Router::new()
        .merge(public_routes)
        .merge(runner_routes)
        .merge(webhook_routes)
        .merge(auth_routes)
        .merge(authenticated_routes)
        .merge(metrics_routes)
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            crate::middleware::ip_whitelist_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            crate::middleware::rate_limit_middleware,
        ))
        .layer(axum::middleware::from_fn(crate::middleware::request_tracking_middleware))
        .with_state(state)
}
