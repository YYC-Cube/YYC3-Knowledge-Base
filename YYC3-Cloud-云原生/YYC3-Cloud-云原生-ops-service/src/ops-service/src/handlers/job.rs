//! Job API handlers
//! P2 阶段：作业相关的API端点

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    auth::middleware::AuthContext, error::Result, middleware::AppState, models::job::*,
    services::audit_service::AuditAction,
};

/// 创建命令作业（带权限检查和作用域验证）
pub async fn create_command_job(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
    Json(request): Json<CreateCommandJobRequest>,
) -> Result<impl IntoResponse> {
    // 检查执行权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "job", "execute", None, None)
        .await?;

    // 验证用户是否有权限在目标主机/分组上执行作业
    validate_target_hosts_access(
        &state,
        auth_context.user_id,
        &request.target_hosts,
        &request.target_groups,
    )
    .await?;

    let host_count = request.target_hosts.len();
    let job = state
        .job_service
        .create_command_job(request, auth_context.user_id)
        .await?;

    // 审计日志
    state
        .audit_service
        .log_action_simple(
            auth_context.user_id,
            AuditAction::JobCreate,
            Some("job"),
            Some(job.id),
            Some(&format!("Created command job on {} hosts", host_count)),
            None,
        )
        .await?;

    Ok((StatusCode::CREATED, Json(job)))
}

/// 创建脚本作业（带权限检查和作用域验证）
pub async fn create_script_job(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
    Json(request): Json<CreateScriptJobRequest>,
) -> Result<impl IntoResponse> {
    // 检查执行权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "job", "execute", None, None)
        .await?;

    // 验证用户是否有权限在目标主机/分组上执行作业
    validate_target_hosts_access(
        &state,
        auth_context.user_id,
        &request.target_hosts,
        &request.target_groups,
    )
    .await?;

    let host_count = request.target_hosts.len();
    let job = state
        .job_service
        .create_script_job(request, auth_context.user_id)
        .await?;

    // 审计日志
    state
        .audit_service
        .log_action_simple(
            auth_context.user_id,
            AuditAction::JobCreate,
            Some("job"),
            Some(job.id),
            Some(&format!("Created script job on {} hosts", host_count)),
            None,
        )
        .await?;

    Ok((StatusCode::CREATED, Json(job)))
}

/// 查询作业详情（带作用域检查和反枚举）
pub async fn get_job(
    State(state): State<Arc<AppState>>,
    Path(job_id): Path<Uuid>,
    auth_context: AuthContext,
) -> Result<impl IntoResponse> {
    // 检查查看权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "job", "read", None, None)
        .await?;

    // 尝试获取作业，如果不存在则返回 404（反枚举）
    let job = match state.job_service.get_job(job_id).await {
        Ok(j) => j,
        Err(_) => {
            return Err(crate::error::AppError::not_found("Job not found"));
        }
    };

    // 检查用户是否有权限查看该作业（作用域检查 + 反枚举）
    let can_view = check_job_access(&state, auth_context.user_id, &job).await?;
    if !can_view {
        return Err(crate::error::AppError::not_found("Job not found"));
    }

    Ok(Json(job))
}

/// 查询作业列表（带作用域过滤）
pub async fn list_jobs(
    State(state): State<Arc<AppState>>,
    Query(filters): Query<JobListFilters>,
    auth_context: AuthContext,
) -> Result<impl IntoResponse> {
    // 检查查看权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "job", "read", None, None)
        .await?;

    // 获取用户的访问作用域
    let is_admin = state
        .permission_service
        .is_admin(auth_context.user_id)
        .await?;

    let can_read_all = state
        .permission_service
        .check_permission(auth_context.user_id, "job", "read_all", None, None)
        .await
        .unwrap_or(false);

    // 获取用户可访问的 group/environment 列表
    let allowed_groups = if is_admin || can_read_all {
        vec!["*".to_string()] // 全局访问
    } else {
        state
            .permission_service
            .filter_resources_by_scope(auth_context.user_id, "group")
            .await
            .unwrap_or_default()
    };

    let allowed_environments = if is_admin || can_read_all {
        vec!["*".to_string()]
    } else {
        state
            .permission_service
            .filter_resources_by_scope(auth_context.user_id, "environment")
            .await
            .unwrap_or_default()
    };

    // 调用服务层获取作业列表，传入用户的访问作用域
    let jobs = state
        .job_service
        .list_jobs_with_scope(
            filters,
            auth_context.user_id,
            is_admin || can_read_all,
            allowed_groups,
            allowed_environments,
        )
        .await?;

    Ok(Json(jobs))
}

/// 获取作业的任务列表（带权限检查和反枚举）
/// 这是一个敏感接口，因为它返回任务的详细输出，需要更严格的权限控制
/// 返回类型根据用户权限决定：有 output_detail 权限返回完整响应，否则返回摘要
pub async fn get_job_tasks(
    State(state): State<Arc<AppState>>,
    Path(job_id): Path<Uuid>,
    auth_context: AuthContext,
) -> Result<impl IntoResponse> {
    // 首先检查基本的作业读取权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "job", "read", None, None)
        .await?;

    // 尝试获取作业，如果不存在则返回 404（反枚举）
    let job = match state.job_service.get_job(job_id).await {
        Ok(j) => j,
        Err(_e) => {
            // 统一返回 404，不区分是不存在还是无权限
            return Err(crate::error::AppError::not_found("Job not found"));
        }
    };

    // 检查用户是否有权限查看该作业（作用域检查）
    let can_view = check_job_access(&state, auth_context.user_id, &job).await?;
    if !can_view {
        // 返回 404 而不是 403，防止枚举
        return Err(crate::error::AppError::not_found("Job not found"));
    }

    // 检查是否有权限查看输出明细（更严格的权限）
    let can_view_output = state
        .permission_service
        .check_permission(auth_context.user_id, "job", "output_detail", None, None)
        .await
        .unwrap_or(false);

    if !can_view_output {
        // 用户可以查看任务列表但不能看到详细输出
        // 返回被脱敏的任务列表（只有摘要，无完整输出）
        let tasks = state.job_service.get_job_tasks_summary(job_id).await?;
        state
            .audit_service
            .log_action_simple(
                auth_context.user_id,
                crate::services::audit_service::AuditAction::JobOutputView,
                Some("job"),
                Some(job_id),
                Some(&format!(
                    "Viewed task summary for {} tasks (output detail redacted)",
                    tasks.len()
                )),
                None,
            )
            .await?;
        return Ok(Json(crate::models::job::TaskListResponse::Summary(tasks)));
    }

    let tasks = state.job_service.get_job_tasks(job_id).await?;

    // 记录输出查看审计
    state
        .audit_service
        .log_action_simple(
            auth_context.user_id,
            crate::services::audit_service::AuditAction::JobOutputView,
            Some("job"),
            Some(job_id),
            Some(&format!("Viewed output detail for {} tasks", tasks.len())),
            None,
        )
        .await?;

    Ok(Json(crate::models::job::TaskListResponse::Full(tasks)))
}

/// 取消作业（带作用域检查和反枚举）
pub async fn cancel_job(
    State(state): State<Arc<AppState>>,
    Path(job_id): Path<Uuid>,
    auth_context: AuthContext,
    Json(request): Json<CancelJobRequest>,
) -> Result<impl IntoResponse> {
    // 检查基本的作业执行权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "job", "execute", None, None)
        .await?;

    // 尝试获取作业，如果不存在则返回 404（反枚举）
    let job = match state.job_service.get_job(job_id).await {
        Ok(j) => j,
        Err(_) => {
            return Err(crate::error::AppError::not_found("Job not found"));
        }
    };

    // 检查用户是否有权限操作该作业（作用域检查 + 反枚举）
    let can_access = check_job_access(&state, auth_context.user_id, &job).await?;
    if !can_access {
        return Err(crate::error::AppError::not_found("Job not found"));
    }

    let reason = request.reason.clone();
    state
        .job_service
        .cancel_job(job_id, auth_context.user_id, reason.clone())
        .await?;

    // 审计日志
    state
        .audit_service
        .log_action_simple(
            auth_context.user_id,
            AuditAction::JobCancel,
            Some("job"),
            Some(job_id),
            Some(&format!("Cancelled job, reason: {}", reason.unwrap_or_default())),
            None,
        )
        .await?;

    Ok(StatusCode::NO_CONTENT)
}

/// 重试作业（带作用域检查和反枚举）
pub async fn retry_job(
    State(state): State<Arc<AppState>>,
    Path(job_id): Path<Uuid>,
    auth_context: AuthContext,
    Json(request): Json<RetryJobRequest>,
) -> Result<impl IntoResponse> {
    // 检查基本的作业执行权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "job", "execute", None, None)
        .await?;

    // 尝试获取作业，如果不存在则返回 404（反枚举）
    let job = match state.job_service.get_job(job_id).await {
        Ok(j) => j,
        Err(_) => {
            return Err(crate::error::AppError::not_found("Job not found"));
        }
    };

    // 检查用户是否有权限操作该作业（作用域检查 + 反枚举）
    let can_access = check_job_access(&state, auth_context.user_id, &job).await?;
    if !can_access {
        return Err(crate::error::AppError::not_found("Job not found"));
    }

    let job = state
        .job_service
        .retry_job(job_id, request, auth_context.user_id)
        .await?;

    // 审计日志
    state
        .audit_service
        .log_action_simple(
            auth_context.user_id,
            AuditAction::JobRetry,
            Some("job"),
            Some(job.id),
            Some(&format!("Retried job, new job ID: {}", job.id)),
            None,
        )
        .await?;

    Ok(Json(job))
}

/// 获取作业统计（带权限检查和反枚举）
pub async fn get_job_statistics(
    State(state): State<Arc<AppState>>,
    Path(job_id): Path<Uuid>,
    auth_context: AuthContext,
) -> Result<impl IntoResponse> {
    // 检查基本的作业读取权限
    state
        .permission_service
        .require_permission(auth_context.user_id, "job", "read", None, None)
        .await?;

    // 尝试获取作业，如果不存在则返回 404（反枚举）
    let job = match state.job_service.get_job(job_id).await {
        Ok(j) => j,
        Err(_) => {
            return Err(crate::error::AppError::not_found("Job not found"));
        }
    };

    // 检查用户是否有权限查看该作业（作用域检查）
    let can_view = check_job_access(&state, auth_context.user_id, &job).await?;
    if !can_view {
        return Err(crate::error::AppError::not_found("Job not found"));
    }

    let stats = state.job_service.get_job_statistics(job_id).await?;
    Ok(Json(stats))
}

// ==================== 权限检查辅助函数 ====================

/// 检查用户是否有权限访问指定作业
/// 返回 false 时应返回 404 而不是 403（反枚举）
async fn check_job_access(
    state: &Arc<AppState>,
    user_id: Uuid,
    job: &crate::models::job::Job,
) -> std::result::Result<bool, crate::error::AppError> {
    // 管理员可以访问所有作业
    let is_admin = state
        .permission_service
        .is_admin(user_id)
        .await
        .unwrap_or(false);
    if is_admin {
        return Ok(true);
    }

    // 作业创建者可以访问自己的作业
    if job.created_by == user_id {
        return Ok(true);
    }

    // 检查是否有 read_all 权限
    let can_read_all = state
        .permission_service
        .check_permission(user_id, "job", "read_all", None, None)
        .await
        .unwrap_or(false);
    if can_read_all {
        return Ok(true);
    }

    // 基于作业目标主机的 group/environment 作用域检查
    // 获取用户的访问作用域
    let allowed_groups = state
        .permission_service
        .filter_resources_by_scope(user_id, "group")
        .await
        .unwrap_or_default();
    let allowed_environments = state
        .permission_service
        .filter_resources_by_scope(user_id, "environment")
        .await
        .unwrap_or_default();

    let has_global_groups = allowed_groups.contains(&"*".to_string());
    let has_global_environments = allowed_environments.contains(&"*".to_string());

    // 如果有全局访问权限，允许访问
    if has_global_groups && has_global_environments {
        return Ok(true);
    }

    // 获取作业目标主机的 group 和 environment
    let target_host_ids: Vec<Uuid> = job.target_hosts.0.clone();
    if target_host_ids.is_empty() {
        // 没有目标主机，基于分组检查
        let target_group_ids: Vec<Uuid> = job.target_groups.0.clone();
        for group_id in target_group_ids {
            if has_global_groups || allowed_groups.contains(&group_id.to_string()) {
                // 只要有一个分组在用户作用域内，就允许访问
                return Ok(true);
            }
        }
        return Ok(false);
    }

    // 查询目标主机的 group 和 environment
    #[derive(sqlx::FromRow)]
    struct HostScopeInfo {
        group_id: Uuid,
        environment: String,
    }

    let hosts = sqlx::query_as::<_, HostScopeInfo>(
        "SELECT group_id, environment FROM hosts WHERE id = ANY($1) AND status = 'active'",
    )
    .bind(&target_host_ids)
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, "Failed to fetch hosts for job access check");
        crate::error::AppError::database("Failed to fetch hosts")
    })?;

    // 检查是否有至少一个主机在用户允许的作用域内
    for host in hosts {
        let group_match = has_global_groups || allowed_groups.contains(&host.group_id.to_string());
        let env_match = has_global_environments || allowed_environments.contains(&host.environment);

        if group_match && env_match {
            return Ok(true);
        }
    }

    // 所有主机都不在用户作用域内
    Ok(false)
}

/// 验证用户是否有权限在目标主机/分组上执行作业
async fn validate_target_hosts_access(
    state: &Arc<AppState>,
    user_id: Uuid,
    target_hosts: &[Uuid],
    target_groups: &[Uuid],
) -> std::result::Result<(), crate::error::AppError> {
    // 管理员可以在任何主机上执行作业
    let is_admin = state
        .permission_service
        .is_admin(user_id)
        .await
        .unwrap_or(false);
    if is_admin {
        return Ok(());
    }

    // 获取用户的访问作用域
    let allowed_groups = state
        .permission_service
        .filter_resources_by_scope(user_id, "group")
        .await
        .unwrap_or_default();
    let allowed_environments = state
        .permission_service
        .filter_resources_by_scope(user_id, "environment")
        .await
        .unwrap_or_default();

    let has_global_groups = allowed_groups.contains(&"*".to_string());
    let has_global_environments = allowed_environments.contains(&"*".to_string());

    // 如果有全局访问权限，直接通过
    if has_global_groups && has_global_environments {
        return Ok(());
    }

    // 验证目标主机是否在用户允许的作用域内
    let all_host_ids: Vec<Uuid> = target_hosts.to_vec();

    // 查询直接指定的主机的 group 和 environment
    if !all_host_ids.is_empty() {
        // 定义一个简单的结构体来接收查询结果
        #[derive(sqlx::FromRow)]
        struct HostScopeInfo {
            id: Uuid,
            group_id: Uuid,
            environment: String,
        }

        let hosts = sqlx::query_as::<_, HostScopeInfo>(
            "SELECT id, group_id, environment FROM hosts WHERE id = ANY($1) AND status = 'active'",
        )
        .bind(&all_host_ids)
        .fetch_all(&state.db)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Failed to fetch hosts for access validation");
            crate::error::AppError::database("Failed to validate host access")
        })?;

        for host in hosts {
            let group_match =
                has_global_groups || allowed_groups.contains(&host.group_id.to_string());
            let env_match =
                has_global_environments || allowed_environments.contains(&host.environment);

            if !group_match || !env_match {
                tracing::warn!(
                    user_id = %user_id,
                    host_id = %host.id,
                    group_id = %host.group_id,
                    environment = %host.environment,
                    "User attempted to create job on host outside their scope"
                );
                return Err(crate::error::AppError::Forbidden);
            }
        }
    }

    // 验证目标分组是否在用户允许的作用域内
    if !target_groups.is_empty() {
        for group_id in target_groups {
            let group_match = has_global_groups || allowed_groups.contains(&group_id.to_string());
            if !group_match {
                tracing::warn!(
                    user_id = %user_id,
                    group_id = %group_id,
                    "User attempted to create job on group outside their scope"
                );
                return Err(crate::error::AppError::Forbidden);
            }
        }
    }

    Ok(())
}
