//! 构建作业 API 处理器 (P2.1)
//!
//! 提供构建作业的创建、查询、取消、重试等功能

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Json},
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{error, info, warn};
use uuid::Uuid;

use common::messages::*;

use crate::{
    auth::AuthContext,
    error::{AppError, Result},
    middleware::AppState,
};

use crate::services::audit_service::AuditLogParams;
use sqlx::Row;

/// 创建构建作业请求
#[derive(Debug, Deserialize)]
pub struct CreateBuildJobRequest {
    /// 项目名称
    pub project_name: String,

    /// 仓库 URL
    pub repository_url: String,

    /// 分支
    pub branch: String,

    /// Commit SHA (可选，默认使用最新)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub commit: Option<String>,

    /// 构建类型
    pub build_type: String,

    /// 环境变量
    #[serde(default)]
    pub env_vars: std::collections::HashMap<String, String>,

    /// 构建参数
    #[serde(default)]
    pub parameters: std::collections::HashMap<String, serde_json::Value>,

    /// 构建步骤
    pub steps: Vec<BuildStepRequest>,

    /// 发布目标（可选）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub publish_target: Option<PublishTargetRequest>,

    /// 超时时间（秒）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timeout_secs: Option<i32>,

    /// 标签
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
}

/// 构建步骤请求
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct BuildStepRequest {
    /// 步骤 ID
    pub id: String,

    /// 步骤名称
    pub name: String,

    /// 步骤类型
    pub step_type: String,

    /// 命令
    #[serde(skip_serializing_if = "Option::is_none")]
    pub command: Option<String>,

    /// 脚本内容
    #[serde(skip_serializing_if = "Option::is_none")]
    pub script: Option<String>,

    /// 工作目录
    #[serde(skip_serializing_if = "Option::is_none")]
    pub working_dir: Option<String>,

    /// 超时（秒）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timeout_secs: Option<u64>,

    /// 失败后是否继续
    #[serde(default)]
    pub continue_on_failure: bool,

    /// 是否产生产物
    #[serde(default)]
    pub produces_artifact: bool,

    /// Docker 镜像
    #[serde(skip_serializing_if = "Option::is_none")]
    pub docker_image: Option<String>,
}

/// 发布目标请求
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PublishTargetRequest {
    /// 目标类型
    pub target_type: String,

    /// 目标地址
    pub url: String,

    /// 认证信息
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auth: Option<AuthInfoRequest>,
}

/// 认证信息请求
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AuthInfoRequest {
    /// 认证类型
    pub auth_type: String,

    /// 用户名
    #[serde(skip_serializing_if = "Option::is_none")]
    pub username: Option<String>,

    /// 密码/Token
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token: Option<String>,

    /// API Key
    #[serde(skip_serializing_if = "Option::is_none")]
    pub api_key: Option<String>,
}

/// 构建作业响应
#[derive(Debug, Serialize)]
pub struct BuildJobResponse {
    /// 构建作业 ID
    pub id: Uuid,

    /// 项目名称
    pub project_name: String,

    /// 仓库 URL
    pub repository_url: String,

    /// 分支
    pub branch: String,

    /// Commit SHA
    pub commit: String,

    /// 构建类型
    pub build_type: String,

    /// 状态
    pub status: String,

    /// 步骤状态
    pub steps: Vec<BuildStepResponse>,

    /// 创建时间
    pub created_at: chrono::DateTime<chrono::Utc>,

    /// 开始时间
    #[serde(skip_serializing_if = "Option::is_none")]
    pub started_at: Option<chrono::DateTime<chrono::Utc>>,

    /// 完成时间
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<chrono::DateTime<chrono::Utc>>,

    /// 创建者
    pub created_by: Uuid,

    /// 标签
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
}

/// 构建步骤响应
#[derive(Debug, Serialize)]
pub struct BuildStepResponse {
    /// 步骤 ID
    pub id: String,

    /// 步骤名称
    pub name: String,

    /// 状态
    pub status: String,

    /// 开始时间
    #[serde(skip_serializing_if = "Option::is_none")]
    pub started_at: Option<chrono::DateTime<chrono::Utc>>,

    /// 完成时间
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<chrono::DateTime<chrono::Utc>>,

    /// 退出码
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exit_code: Option<i32>,

    /// 错误信息
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// 构建作业列表响应
#[derive(Debug, Serialize)]
pub struct BuildJobListResponse {
    /// 构建作业列表
    pub jobs: Vec<BuildJobSummary>,

    /// 总数
    pub total: i64,

    /// 分页信息
    pub page: i64,
    pub per_page: i64,
}

/// 构建作业摘要
#[derive(Debug, Serialize)]
pub struct BuildJobSummary {
    /// 构建作业 ID
    pub id: Uuid,

    /// 项目名称
    pub project_name: String,

    /// 仓库 URL
    pub repository_url: String,

    /// 分支
    pub branch: String,

    /// Commit SHA
    pub commit: String,

    /// 构建类型
    pub build_type: String,

    /// 状态
    pub status: String,

    /// 创建时间
    pub created_at: chrono::DateTime<chrono::Utc>,

    /// 开始时间
    #[serde(skip_serializing_if = "Option::is_none")]
    pub started_at: Option<chrono::DateTime<chrono::Utc>>,

    /// 完成时间
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<chrono::DateTime<chrono::Utc>>,

    /// 创建者
    pub created_by: Uuid,
}

// ==================== 构建作业 API ====================

/// 创建构建作业
pub async fn create_build_job(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Json(request): Json<CreateBuildJobRequest>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "build", "execute", None, None)
        .await?;

    // 验证请求
    if request.steps.is_empty() {
        return Err(AppError::validation("Build job must have at least one step"));
    }

    let job_id = Uuid::new_v4();
    let commit = request.commit.filter(|c| !c.is_empty()).unwrap_or_else(|| "".to_string());
    let now = Utc::now();

    // 将步骤序列化用于 build_parameters
    let build_params = serde_json::to_value(&request.steps)
        .map_err(|e| AppError::internal_error(&format!("Failed to serialize steps: {}", e)))?;

    // 插入构建作业记录
    // 注意: build_jobs 表需要先有一个 parent jobs 记录
    let parent_job_id = Uuid::new_v4();
    
    // 先创建 parent jobs 记录
    sqlx::query(
        "INSERT INTO jobs (id, job_type, name, description, status, target_hosts, target_groups, \
         total_tasks, created_by, tags)
         VALUES ($1, 'build'::job_type, $2, $3, 'pending'::job_status, '{}'::jsonb, '{}'::jsonb, 1, $4, $5)",
    )
    .bind(parent_job_id)
    .bind(&request.project_name)
    .bind(&format!("Build: {}", request.project_name))
    .bind(auth.user_id)
    .bind(serde_json::to_value(&request.tags).unwrap_or(serde_json::json!([])))
    .execute(&state.db)
    .await
    .map_err(|e| {
        error!(error = %e, "Failed to create parent job record");
        AppError::database("Failed to create parent job")
    })?;

    // 插入 build_jobs 记录
    sqlx::query(
        "INSERT INTO build_jobs (id, job_id, repository, branch, commit_hash, build_type, \
         build_parameters, runner_capability, status, triggered_by, tags)
         VALUES ($1, $2, $3, $4, $5, CAST($6 AS build_type), $7, CAST($8 AS runner_capability), CAST($9 AS job_status), $10, $11)",
    )
    .bind(job_id)
    .bind(parent_job_id)
    .bind(&request.repository_url)
    .bind(&request.branch)
    .bind(&commit)
    .bind(&request.build_type)
    .bind(serde_json::json!({
        "steps": build_params,
        "parameters": request.parameters,
        "env_vars": request.env_vars,
    }))
    .bind(&request.build_type) // runner_capability mirrors build_type for now
    .bind("pending")
    .bind(auth.user_id)
    .bind(serde_json::to_value(&request.tags).unwrap_or(serde_json::json!([])))
    .execute(&state.db)
    .await
    .map_err(|e| {
        error!(error = %e, "Failed to create build job");
        AppError::database("Failed to create build job")
    })?;

    // 记录审计日志
    let _ = state
        .audit_service
        .log_action(AuditLogParams {
            subject_id: auth.user_id,
            subject_type: "user",
            subject_name: None,
            action: crate::services::audit_service::AuditAction::BuildCreate.as_str(),
            resource_type: "build",
            resource_id: Some(job_id),
            resource_name: Some(&request.project_name),
            changes: Some(serde_json::json!({
                "branch": request.branch,
                "build_type": request.build_type,
            })),
            changes_summary: None,
            source_ip: None,
            user_agent: None,
            trace_id: None,
            result: "success",
            error_message: None,
        })
        .await;

    info!(
        job_id = %job_id,
        project = %request.project_name,
        branch = %request.branch,
        "Build job created"
    );

    // 派发构建任务到 RabbitMQ
    let task_id = Uuid::new_v4();

    // 构建任务消息
    let build_task = BuildTaskMessage {
        task_id,
        job_id,
        project: ProjectInfo {
            name: request.project_name.clone(),
            repository_url: request.repository_url.clone(),
            branch: request.branch.clone(),
            commit: commit.clone(),
            triggered_by: auth.user_id,
        },
        build: BuildParameters {
            build_type: request.build_type.clone(),
            env_vars: request.env_vars.clone(),
            parameters: request.parameters.clone(),
        },
        steps: request
            .steps
            .iter()
            .map(|s| BuildStep {
                id: s.id.clone(),
                name: s.name.clone(),
                step_type: parse_step_type(&s.step_type),
                command: s.command.clone(),
                script: s.script.clone(),
                working_dir: s.working_dir.clone(),
                timeout_secs: s.timeout_secs,
                continue_on_failure: s.continue_on_failure,
                produces_artifact: s.produces_artifact,
                docker_image: s.docker_image.clone(),
            })
            .collect(),
        publish_target: request.publish_target.as_ref().map(|pt| PublishTarget {
            target_type: pt.target_type.clone(),
            url: pt.url.clone(),
            auth: pt.auth.as_ref().map(|a| AuthInfo {
                auth_type: a.auth_type.clone(),
                username: a.username.clone(),
                token: a.token.clone(),
                api_key: a.api_key.clone(),
            }),
        }),
    };

    // 发布到 RabbitMQ
    match state.rabbitmq_publisher.get().await {
        Ok(_) => {
            if let Err(e) = dispatch_build_task(&state, &build_task, &request.build_type).await {
                error!(error = %e, "Failed to dispatch build task to RabbitMQ");
                // 不阻塞响应，但记录错误
            } else {
                info!(
                    job_id = %job_id,
                    task_id = %task_id,
                    "Build task dispatched to RabbitMQ"
                );
            }
        }
        Err(e) => {
            warn!(error = %e, "RabbitMQ publisher not available, build will not be dispatched");
        }
    }

    Ok((
        StatusCode::CREATED,
        Json(BuildJobResponse {
            id: job_id,
            project_name: request.project_name,
            repository_url: request.repository_url,
            branch: request.branch,
            commit,
            build_type: request.build_type,
            status: "pending".to_string(),
            steps: request
                .steps
                .iter()
                .map(|s| BuildStepResponse {
                    id: s.id.clone(),
                    name: s.name.clone(),
                    status: "pending".to_string(),
                    started_at: None,
                    completed_at: None,
                    exit_code: None,
                    error: None,
                })
                .collect(),
            created_at: now,
            started_at: None,
            completed_at: None,
            created_by: auth.user_id,
            tags: request.tags,
        }),
    ))
}

/// 查询构建作业列表
pub async fn list_build_jobs(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "build", "read", None, None)
        .await?;

    let is_admin = state
        .permission_service
        .is_admin(auth.user_id)
        .await
        .unwrap_or(false);

    // 构建查询 — JOIN jobs 表以获取项目名等字段
    let query = if is_admin {
        "SELECT bj.id, j.name AS project_name, bj.repository AS repository_url, \
                bj.branch, bj.commit_hash AS commit, bj.build_type::text, bj.status::text, \
                bj.created_at, bj.started_at, bj.completed_at, bj.triggered_by AS created_by
         FROM build_jobs bj
         JOIN jobs j ON j.id = bj.job_id
         ORDER BY bj.created_at DESC
         LIMIT 100"
            .to_string()
    } else {
        format!(
            "SELECT bj.id, j.name AS project_name, bj.repository AS repository_url, \
                    bj.branch, bj.commit_hash AS commit, bj.build_type::text, bj.status::text, \
                    bj.created_at, bj.started_at, bj.completed_at, bj.triggered_by AS created_by
             FROM build_jobs bj
             JOIN jobs j ON j.id = bj.job_id
             WHERE bj.triggered_by = '{}'
             ORDER BY bj.created_at DESC
             LIMIT 100",
            auth.user_id
        )
    };

    #[derive(sqlx::FromRow)]
    struct BuildJobRow {
        id: Uuid,
        project_name: String,
        repository_url: String,
        branch: String,
        commit: String,
        build_type: String,
        status: String,
        created_at: chrono::DateTime<chrono::Utc>,
        started_at: Option<chrono::DateTime<chrono::Utc>>,
        completed_at: Option<chrono::DateTime<chrono::Utc>>,
        created_by: Uuid,
    }

    let jobs: Vec<BuildJobRow> =
        sqlx::query_as(&query)
            .fetch_all(&state.db)
            .await
            .map_err(|e| {
                error!(error = %e, "Failed to list build jobs");
                AppError::database("Failed to list build jobs")
            })?;

    let total = jobs.len() as i64;

    Ok(Json(BuildJobListResponse {
        jobs: jobs
            .into_iter()
            .map(|row| BuildJobSummary {
                id: row.id,
                project_name: row.project_name,
                repository_url: row.repository_url,
                branch: row.branch,
                commit: row.commit,
                build_type: row.build_type,
                status: row.status,
                created_at: row.created_at,
                started_at: row.started_at,
                completed_at: row.completed_at,
                created_by: row.created_by,
            })
            .collect(),
        total,
        page: 1,
        per_page: 100,
    }))
}

/// 获取构建作业详情
pub async fn get_build_job(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "build", "read", None, None)
        .await?;

    // 查询构建作业
    #[derive(sqlx::FromRow)]
    struct BuildJobRow {
        id: Uuid,
        project_name: String,
        repository_url: String,
        branch: String,
        commit: String,
        build_type: String,
        status: String,
        build_parameters: serde_json::Value,
        created_at: chrono::DateTime<chrono::Utc>,
        started_at: Option<chrono::DateTime<chrono::Utc>>,
        completed_at: Option<chrono::DateTime<chrono::Utc>>,
        created_by: Uuid,
        tags: Option<serde_json::Value>,
    }

    let job: BuildJobRow = sqlx::query_as(
        "SELECT bj.id, j.name AS project_name, bj.repository AS repository_url,
                bj.branch, bj.commit_hash AS commit, bj.build_type::text, bj.status::text,
                bj.build_parameters, bj.created_at, bj.started_at, bj.completed_at,
                bj.triggered_by AS created_by, bj.tags
         FROM build_jobs bj
         JOIN jobs j ON j.id = bj.job_id
         WHERE bj.id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        error!(error = %e, "Failed to get build job");
        AppError::database("Failed to get build job")
    })?
    .ok_or_else(|| AppError::not_found("Build job not found"))?;

    // 检查权限
    let is_admin = state
        .permission_service
        .is_admin(auth.user_id)
        .await
        .unwrap_or(false);
    if !is_admin && job.created_by != auth.user_id {
        return Err(AppError::not_found("Build job not found")); // 反枚举：返回 404 而非 403
    }

    // 解析步骤
    let steps_request: Vec<BuildStepRequest> = job
        .build_parameters
        .get("steps")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();

    // 查询步骤状态
    #[derive(sqlx::FromRow)]
    struct StepStatusRow {
        step_id: String,
        status: String,
        started_at: Option<chrono::DateTime<chrono::Utc>>,
        completed_at: Option<chrono::DateTime<chrono::Utc>>,
        exit_code: Option<i32>,
        error: Option<String>,
    }

    let step_statuses: Vec<StepStatusRow> = sqlx::query_as(
        "SELECT step_id, status::text, started_at, completed_at, exit_code, error
         FROM build_steps
         WHERE job_id = $1
         ORDER BY created_at",
    )
    .bind(id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let step_status_map: std::collections::HashMap<String, StepStatusRow> = step_statuses
        .into_iter()
        .map(|s| (s.step_id.clone(), s))
        .collect();

    let steps: Vec<BuildStepResponse> = steps_request
        .iter()
        .map(|s| {
            let status = step_status_map.get(&s.id);
            BuildStepResponse {
                id: s.id.clone(),
                name: s.name.clone(),
                status: status
                    .map(|st| st.status.clone())
                    .unwrap_or_else(|| "pending".to_string()),
                started_at: status.and_then(|st| st.started_at),
                completed_at: status.and_then(|st| st.completed_at),
                exit_code: status.and_then(|st| st.exit_code),
                error: status.and_then(|st| st.error.clone()),
            }
        })
        .collect();

    // 解析标签
    let tags: Option<Vec<String>> = job.tags.and_then(|v| serde_json::from_value(v).ok());

    Ok(Json(BuildJobResponse {
        id: job.id,
        project_name: job.project_name,
        repository_url: job.repository_url,
        branch: job.branch,
        commit: job.commit,
        build_type: job.build_type,
        status: job.status,
        steps,
        created_at: job.created_at,
        started_at: job.started_at,
        completed_at: job.completed_at,
        created_by: job.created_by,
        tags,
    }))
}

/// 获取构建作业步骤状态
pub async fn get_build_steps(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "build", "output_detail", None, None)
        .await?;

    // 首先检查作业是否存在以及权限
    let job = sqlx::query("SELECT created_by FROM build_jobs WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to get build job");
            AppError::database("Failed to get build job")
        })?
        .ok_or_else(|| AppError::not_found("Build job not found"))?;

    let created_by: Uuid = job.get::<Uuid, _>("created_by");

    let is_admin = state
        .permission_service
        .is_admin(auth.user_id)
        .await
        .unwrap_or(false);
    if !is_admin && created_by != auth.user_id {
        return Err(AppError::not_found("Build job not found")); // 反枚举
    }

    #[derive(sqlx::FromRow, Serialize)]
    struct StepRow {
        step_id: String,
        step_name: String,
        status: String,
        started_at: Option<chrono::DateTime<chrono::Utc>>,
        completed_at: Option<chrono::DateTime<chrono::Utc>>,
        exit_code: Option<i32>,
        error: Option<String>,
        created_at: chrono::DateTime<chrono::Utc>,
    }

    let steps: Vec<StepRow> = sqlx::query_as(
        "SELECT step_id, step_name, status::text, started_at, completed_at, exit_code, error, created_at
         FROM build_steps
         WHERE job_id = $1
         ORDER BY created_at",
    )
    .bind(id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        error!(error = %e, "Failed to get build steps");
        AppError::database("Failed to get build steps")
    })?;

    Ok(Json(serde_json::json!({
        "job_id": id,
        "steps": steps,
    })))
}

/// 取消构建作业
pub async fn cancel_build_job(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "build", "execute", None, None)
        .await?;

    // 查询作业
    let job = sqlx::query("SELECT triggered_by, status::text FROM build_jobs WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to get build job");
            AppError::database("Failed to get build job")
        })?
        .ok_or_else(|| AppError::not_found("Build job not found"))?;

    let created_by: Uuid = job.get::<Uuid, _>("created_by");
    let status: String = job.get::<String, _>("status");

    // 检查权限（反枚举：返回 404 而非 403）
    let is_admin = state
        .permission_service
        .is_admin(auth.user_id)
        .await
        .unwrap_or(false);
    if !is_admin && created_by != auth.user_id {
        return Err(AppError::not_found("Build job not found"));
    }

    // 检查状态
    if matches!(status.as_str(), "completed" | "failed" | "cancelled") {
        return Err(AppError::validation(&format!(
            "Cannot cancel build job in status: {}",
            status
        )));
    }

    // 更新状态
    sqlx::query("UPDATE build_jobs SET status = 'cancelled', completed_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to cancel build job");
            AppError::database("Failed to cancel build job")
        })?;

    // 记录审计日志
    let _ = state
        .audit_service
        .log_action(AuditLogParams {
            subject_id: auth.user_id,
            subject_type: "user",
            subject_name: None,
            action: crate::services::audit_service::AuditAction::BuildCancel.as_str(),
            resource_type: "build",
            resource_id: Some(id),
            resource_name: None,
            changes: None,
            changes_summary: None,
            source_ip: None,
            user_agent: None,
            trace_id: None,
            result: "success",
            error_message: None,
        })
        .await;

    info!(job_id = %id, "Build job cancelled");

    Ok((
        StatusCode::OK,
        Json(serde_json::json!({
            "id": id,
            "status": "cancelled"
        })),
    ))
}

/// 重试构建作业
pub async fn retry_build_job(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "build", "execute", None, None)
        .await?;

    // 查询原作业
    #[derive(sqlx::FromRow)]
    struct OriginalJob {
        project_name: String,
        repository_url: String,
        branch: String,
        commit: String,
        build_type: String,
        env_vars: serde_json::Value,
        parameters: serde_json::Value,
        steps: serde_json::Value,
        created_by: Uuid,
        tags: Option<serde_json::Value>,
    }

    let original: OriginalJob = sqlx::query_as(
        "SELECT project_name, repository_url, branch, commit, build_type, env_vars, parameters, steps, created_by, tags
         FROM build_jobs
         WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        error!(error = %e, "Failed to get build job");
        AppError::database("Failed to get build job")
    })?
    .ok_or_else(|| AppError::not_found("Build job not found"))?;

    // 检查权限（反枚举：返回 404 而非 403）
    let is_admin = state
        .permission_service
        .is_admin(auth.user_id)
        .await
        .unwrap_or(false);
    if !is_admin && original.created_by != auth.user_id {
        return Err(AppError::not_found("Build job not found"));
    }

    // 创建新的构建作业
    let new_job_id = Uuid::new_v4();
    let now = Utc::now();

    sqlx::query(
        "INSERT INTO build_jobs (id, project_name, repository_url, branch, commit, build_type, \
         env_vars, parameters, steps, status, created_by, created_at, retry_of, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)"
    )
    .bind(new_job_id)
    .bind(&original.project_name)
    .bind(&original.repository_url)
    .bind(&original.branch)
    .bind(&original.commit)
    .bind(&original.build_type)
    .bind(&original.env_vars)
    .bind(&original.parameters)
    .bind(&original.steps)
    .bind("pending")
    .bind(auth.user_id)
    .bind(now)
    .bind(id)  // retry_of 指向原作业
    .bind(&original.tags)
    .execute(&state.db)
    .await
    .map_err(|e| {
        error!(error = %e, "Failed to create retry build job");
        AppError::database("Failed to create retry build job")
    })?;

    // 记录审计日志
    let _ = state
        .audit_service
        .log_action(AuditLogParams {
            subject_id: auth.user_id,
            subject_type: "user",
            subject_name: None,
            action: crate::services::audit_service::AuditAction::BuildRetry.as_str(),
            resource_type: "build",
            resource_id: Some(new_job_id),
            resource_name: None,
            changes: Some(serde_json::json!({"original_job_id": id})),
            changes_summary: None,
            source_ip: None,
            user_agent: None,
            trace_id: None,
            result: "success",
            error_message: None,
        })
        .await;

    info!(
        original_job_id = %id,
        new_job_id = %new_job_id,
        "Build job retry created"
    );

    Ok((
        StatusCode::CREATED,
        Json(serde_json::json!({
            "id": new_job_id,
            "status": "pending",
            "retry_of": id
        })),
    ))
}

// ==================== 辅助函数 ====================

/// 解析步骤类型
fn parse_step_type(step_type: &str) -> StepType {
    match step_type.to_lowercase().as_str() {
        "command" => StepType::Command,
        "script" => StepType::Script,
        "install" => StepType::Install,
        "build" => StepType::Build,
        "test" => StepType::Test,
        "package" => StepType::Package,
        "publish" => StepType::Publish,
        custom => StepType::Custom(custom.to_string()),
    }
}

/// 派发构建任务到 RabbitMQ
///
/// 使用 RunnerScheduler 选择合适的 Runner，然后派发任务到 RabbitMQ
async fn dispatch_build_task(
    state: &Arc<AppState>,
    task: &BuildTaskMessage,
    build_type: &str,
) -> Result<()> {
    // 使用 RunnerScheduler 选择合适的 Runner
    let schedule_result = state
        .runner_scheduler
        .schedule_build(build_type, &[])
        .await
        .map_err(|e| {
            error!(error = %e, build_type = %build_type, "Failed to schedule build task");
            AppError::internal_error(&format!("Failed to schedule build: {}", e))
        })?;

    info!(
        runner_id = %schedule_result.runner_id,
        runner_name = %schedule_result.runner_name,
        routing_key = %schedule_result.routing_key,
        job_id = %task.job_id,
        "Build task scheduled"
    );

    let payload = serde_json::to_vec(task).map_err(|e| {
        error!(error = %e, "Failed to serialize build task");
        AppError::internal_error("Failed to serialize build task")
    })?;

    // 获取发布器
    let publisher = state.rabbitmq_publisher.get().await.map_err(|e| {
        error!(error = %e, "Failed to get RabbitMQ publisher");
        AppError::internal_error("Failed to get RabbitMQ publisher")
    })?;

    // 使用调度返回的 runner_name 发布任务（定向派发）
    // 路由键：build.<type>.<runner_name>，只有目标 runner 会收到
    publisher
        .publish_build_task(build_type, Some(&schedule_result.runner_name), &payload)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to publish build task");
            AppError::internal_error("Failed to publish build task")
        })?;

    // 增加 Runner 的当前任务计数
    if let Err(e) = state
        .runner_scheduler
        .increment_current_jobs(schedule_result.runner_id)
        .await
    {
        warn!(
            error = %e,
            runner_id = %schedule_result.runner_id,
            "Failed to increment runner current jobs"
        );
    }

    Ok(())
}
