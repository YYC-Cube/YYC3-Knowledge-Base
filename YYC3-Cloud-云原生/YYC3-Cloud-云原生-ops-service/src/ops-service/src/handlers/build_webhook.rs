//! 构建状态和日志 Webhook 处理器 (P2.1)
//!
//! 接收 Runner 回传的构建状态、步骤状态和日志更新

use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use chrono::Utc;
use std::sync::Arc;
use tracing::{debug, error, info, warn};

use common::messages::{
    BuildArtifact, BuildLogMessage, BuildStatus, BuildStatusMessage, StepStatus, StepStatusUpdate,
};
use sqlx::Row;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    middleware::AppState,
    realtime::RealtimeEvent,
};

/// 合法状态迁移表
/// 返回 true 表示允许从当前状态迁移到新状态
fn is_valid_status_transition(current: Option<&str>, new: &str) -> bool {
    match (current, new) {
        // 新建作业可以从任何状态开始
        (None, _) => true,
        // pending -> running/completed/failed/cancelled
        (Some("pending"), "running" | "completed" | "failed" | "cancelled") => true,
        (Some("pending"), _) => false,
        // running -> completed/failed/cancelled
        (Some("running"), "completed" | "failed" | "cancelled") => true,
        (Some("running"), _) => false,
        // completed/failed/cancelled 是终态，不允许迁移
        (Some("completed"), _) => false,
        (Some("failed"), "running") => true, // 允许重试
        (Some("failed"), _) => false,
        (Some("cancelled"), "running") => true, // 允许重试
        (Some("cancelled"), _) => false,
        // 未知状态默认拒绝
        _ => false,
    }
}

/// 接收构建状态更新
pub async fn build_status_webhook(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<BuildStatusMessage>,
) -> Result<impl IntoResponse> {
    debug!(
        task_id = %payload.task_id,
        job_id = %payload.job_id,
        runner = %payload.runner_name,
        status = ?payload.status,
        "Received build status update"
    );

    // 检查构建作业是否存在，同时获取当前状态用于迁移校验
    let job_row = sqlx::query("SELECT id, status::text FROM build_jobs WHERE id = $1")
        .bind(payload.job_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| {
            error!(error = %e, job_id = %payload.job_id, "Failed to check build job");
            AppError::database("Failed to check build job")
        })?;

    let (current_status_opt, job_exists) = match job_row {
        Some(row) => (
            row.try_get::<String, _>("status").ok(),
            true,
        ),
        None => (None, false),
    };

    if !job_exists {
        warn!(
            job_id = %payload.job_id,
            "Build job not found for status update"
        );
        return Ok(StatusCode::ACCEPTED);
    }

    // 更新构建作业状态
    let status_str = match payload.status {
        BuildStatus::Received => "pending",
        BuildStatus::Preparing => "pending",
        BuildStatus::Running => "running",
        BuildStatus::Succeeded => "completed",
        BuildStatus::Failed => "failed",
        BuildStatus::Timeout => "failed",
        BuildStatus::Cancelled => "cancelled",
    };

    // 状态迁移校验：拒绝非法迁移
    if !is_valid_status_transition(current_status_opt.as_deref(), status_str) {
        warn!(
            job_id = %payload.job_id,
            current_status = ?current_status_opt,
            new_status = %status_str,
            "Invalid status transition, ignoring"
        );
        return Ok(StatusCode::ACCEPTED);
    }

    // 幂等性保护：如果新旧状态相同且不是终态，跳过更新
    if current_status_opt.as_deref() == Some(status_str) {
        debug!(
            job_id = %payload.job_id,
            status = %status_str,
            "Status unchanged, skipping update"
        );
        return Ok(StatusCode::ACCEPTED);
    }

    // 根据状态更新时间戳
    let (started_at, completed_at) = match payload.status {
        BuildStatus::Running | BuildStatus::Preparing => (Some(Utc::now()), None),
        BuildStatus::Succeeded
        | BuildStatus::Failed
        | BuildStatus::Timeout
        | BuildStatus::Cancelled => {
            // 获取当前 started_at（如果有）
            let current: Option<chrono::DateTime<chrono::Utc>> =
                sqlx::query("SELECT started_at FROM build_jobs WHERE id = $1")
                    .bind(payload.job_id)
                    .fetch_optional(&state.db)
                    .await?
                    .and_then(|row| row.get("started_at"));
            (current, Some(Utc::now()))
        }
        _ => (None, None),
    };

    let mut query = String::from("UPDATE build_jobs SET status = CAST($1 AS job_status)");
    let mut param_idx = 2;

    if let Some(_start) = started_at {
        query.push_str(&format!(", started_at = ${}", param_idx));
        param_idx += 1;
    }
    if let Some(_end) = completed_at {
        query.push_str(&format!(", completed_at = ${}", param_idx));
        param_idx += 1;
    }

    query.push_str(&format!(", updated_at = NOW() WHERE id = ${}", param_idx));

    // 执行更新
    let mut query_builder = sqlx::query(&query).bind(status_str);
    if let Some(start) = started_at {
        query_builder = query_builder.bind(start);
    }
    if let Some(end) = completed_at {
        query_builder = query_builder.bind(end);
    }
    query_builder = query_builder.bind(payload.job_id);

    query_builder.execute(&state.db).await.map_err(|e| {
        error!(error = %e, job_id = %payload.job_id, "Failed to update build job status");
        AppError::database("Failed to update build job")
    })?;

    // 如果有步骤状态更新，处理步骤状态
    if let Some(ref step_update) = payload.step_status {
        let uploaded_by = lookup_runner_id(&state, &payload.runner_name).await;
        if let Err(e) =
            update_step_status_with_uploader(&state, &payload, step_update, uploaded_by).await
        {
            error!(error = ?e, "Failed to update step status");
        }
    }

    // 发布实时事件 (SSE)
    let _ = state.event_bus.publish(RealtimeEvent::JobStatusChanged {
        job_id: payload.job_id,
        old_status: current_status_opt.unwrap_or_default(),
        new_status: status_str.to_string(),
    });

    debug!(
        job_id = %payload.job_id,
        status = %status_str,
        "Build status updated"
    );

    Ok(StatusCode::ACCEPTED)
}

/// 接收构建日志
pub async fn build_log_webhook(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<BuildLogMessage>,
) -> Result<impl IntoResponse> {
    // 检查构建作业是否存在
    let job_exists = sqlx::query("SELECT id FROM build_jobs WHERE id = $1")
        .bind(payload.job_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| {
            error!(error = %e, job_id = %payload.job_id, "Failed to check build job");
            AppError::database("Failed to check build job")
        })?;

    if job_exists.is_none() {
        warn!(job_id = %payload.job_id, "Build job not found for log");
        return Ok(StatusCode::ACCEPTED);
    }

    // 查找或创建步骤记录，同时获取当前 offset 用于幂等/乱序保护
    let step_row = sqlx::query(
        "SELECT id, COALESCE(log_offset, 0) as log_offset FROM build_steps WHERE job_id = $1 AND step_id = $2",
    )
    .bind(payload.job_id)
    .bind(&payload.step_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        error!(error = %e, "Failed to check build step");
        AppError::database("Failed to check build step")
    })?;

    if let Some(row) = step_row {
        let current_offset: i64 = row.try_get("log_offset").unwrap_or(0);
        let new_offset = payload.offset as i64;

        // 幂等保护：如果 offset 不大于当前，跳过（重复消息）
        if new_offset <= current_offset && !payload.content.is_empty() {
            debug!(
                job_id = %payload.job_id,
                step_id = %payload.step_id,
                current_offset,
                new_offset,
                "Duplicate or out-of-order log message, skipping"
            );
            return Ok(StatusCode::ACCEPTED);
        }

        // 更新步骤日志（追加）+ 更新 offset
        sqlx::query(
            "UPDATE build_steps SET output_detail = COALESCE(output_detail, '') || $1, log_offset = $2, updated_at = NOW() WHERE job_id = $3 AND step_id = $4",
        )
        .bind(&payload.content)
        .bind(new_offset)
        .bind(payload.job_id)
        .bind(&payload.step_id)
        .execute(&state.db)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to update build step log");
            AppError::database("Failed to update build step")
        })?;
    } else {
        // 创建新步骤
        sqlx::query(
            "INSERT INTO build_steps (job_id, step_id, step_name, status, output_detail, log_offset, created_at, updated_at)
             VALUES ($1, $2, $3, 'running', $4, $5, NOW(), NOW())",
        )
        .bind(payload.job_id)
        .bind(&payload.step_id)
        .bind(&payload.step_id)
        .bind(&payload.content)
        .bind(payload.offset as i64)
        .execute(&state.db)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to create build step");
            AppError::database("Failed to create build step")
        })?;
    }

    debug!(
        job_id = %payload.job_id,
        step_id = %payload.step_id,
        "Build log received"
    );

    Ok(StatusCode::ACCEPTED)
}

/// 接收构建产物元数据
pub async fn build_artifact_webhook(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<BuildArtifactWebhook>,
) -> Result<impl IntoResponse> {
    // 检查构建作业是否存在
    let job_exists = sqlx::query("SELECT id FROM build_jobs WHERE id = $1")
        .bind(payload.job_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| {
            error!(error = %e, job_id = %payload.job_id, "Failed to check build job");
            AppError::database("Failed to check build job")
        })?;

    if job_exists.is_none() {
        warn!(job_id = %payload.job_id, "Build job not found for artifact");
        return Ok(StatusCode::ACCEPTED);
    }

    // 检查产物是否已存在（根据版本号和类型）
    let existing =
        sqlx::query("SELECT id FROM build_artifacts WHERE version = $1 AND artifact_type = $2")
            .bind(&payload.artifact.version)
            .bind(&payload.artifact.artifact_type)
            .fetch_optional(&state.db)
            .await
            .map_err(|e| {
                error!(error = %e, "Failed to check existing artifact");
                AppError::database("Failed to check artifact")
            })?;

    if existing.is_some() {
        // 产物已存在，拒绝覆盖上传
        warn!(
            version = %payload.artifact.version,
            artifact_type = %payload.artifact.artifact_type,
            "Artifact already exists, rejecting overwrite"
        );
        return Err(AppError::validation(
            "Artifact with this version already exists. Cannot overwrite.",
        ));
    }

    // 记录产物元数据
    sqlx::query(
        "INSERT INTO build_artifacts (build_job_id, artifact_name, artifact_type, artifact_path,
                                     artifact_size, artifact_hash, version, metadata, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
    )
    .bind(payload.job_id)
    .bind(&payload.artifact.name)
    .bind(&payload.artifact.artifact_type)
    .bind(&payload.artifact.path)
    .bind(payload.artifact.size as i64)
    .bind(&payload.artifact.sha256)
    .bind(&payload.artifact.version)
    .bind(serde_json::to_value(payload.metadata).unwrap_or_default())
    .bind(payload.uploaded_by)
    .execute(&state.db)
    .await
    .map_err(|e| {
        error!(error = %e, "Failed to record artifact");
        AppError::database("Failed to record artifact")
    })?;

    // 更新构建作业的产物统计
    sqlx::query(
        "UPDATE build_jobs SET has_artifacts = TRUE, artifact_count = artifact_count + 1 WHERE id = $1",
    )
    .bind(payload.job_id)
    .execute(&state.db)
    .await
    .map_err(|e| {
        error!(error = %e, "Failed to update build job artifact count");
        AppError::database("Failed to update build job")
    })?;

    info!(
        job_id = %payload.job_id,
        artifact_name = %payload.artifact.name,
        version = %payload.artifact.version,
        "Artifact metadata recorded"
    );

    Ok(StatusCode::CREATED)
}

/// 根据 runner 名称查找其 UUID
async fn lookup_runner_id(state: &AppState, runner_name: &str) -> Option<Uuid> {
    sqlx::query_scalar::<_, Uuid>("SELECT id FROM runners WHERE name = $1")
        .bind(runner_name)
        .fetch_optional(&state.db)
        .await
        .ok()
        .flatten()
}

/// 更新步骤状态
async fn update_step_status(
    state: &AppState,
    status_msg: &BuildStatusMessage,
    step_update: &StepStatusUpdate,
) -> Result<()> {
    update_step_status_with_uploader(state, status_msg, step_update, None).await
}

/// 更新步骤状态（带上传者信息）
async fn update_step_status_with_uploader(
    state: &AppState,
    status_msg: &BuildStatusMessage,
    step_update: &StepStatusUpdate,
    uploaded_by: Option<Uuid>,
) -> Result<()> {
    // 转换状态
    let status_str = match step_update.status {
        StepStatus::Pending => "pending",
        StepStatus::Running => "running",
        StepStatus::Succeeded => "succeeded",
        StepStatus::Failed => "failed",
        StepStatus::Timeout => "timeout",
        StepStatus::Skipped => "skipped",
    };

    // 检查步骤是否存在
    let existing = sqlx::query("SELECT id FROM build_steps WHERE job_id = $1 AND step_id = $2")
        .bind(status_msg.job_id)
        .bind(&step_update.step_id)
        .fetch_optional(&state.db)
        .await?;

    if existing.is_some() {
        // 更新现有步骤
        sqlx::query(
            "UPDATE build_steps
             SET status = $1, started_at = COALESCE($2, started_at),
                 completed_at = COALESCE($3, completed_at),
                 exit_code = $4, updated_at = NOW()
             WHERE job_id = $5 AND step_id = $6",
        )
        .bind(status_str)
        .bind(step_update.started_at)
        .bind(step_update.completed_at)
        .bind(step_update.exit_code)
        .bind(status_msg.job_id)
        .bind(&step_update.step_id)
        .execute(&state.db)
        .await?;
    } else {
        // 创建新步骤记录
        sqlx::query(
            "INSERT INTO build_steps (job_id, step_id, step_name, status, started_at, completed_at, exit_code, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())",
        )
        .bind(status_msg.job_id)
        .bind(&step_update.step_id)
        .bind(&step_update.step_id) // step_name 默认使用 step_id
        .bind(status_str)
        .bind(step_update.started_at)
        .bind(step_update.completed_at)
        .bind(step_update.exit_code)
        .execute(&state.db)
        .await?;
    }

    // 如果有产物，记录产物信息
    if let Some(artifact) = &step_update.artifact {
        sqlx::query(
            "INSERT INTO build_artifacts (build_job_id, artifact_name, artifact_type, artifact_path,
                                         artifact_size, artifact_hash, version, metadata, uploaded_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (version, artifact_type) DO NOTHING",
        )
        .bind(status_msg.job_id)
        .bind(&artifact.name)
        .bind(&artifact.artifact_type)
        .bind(&artifact.path)
        .bind(artifact.size as i64)
        .bind(&artifact.sha256)
        .bind(&artifact.version)
        .bind(serde_json::json!({
            "step_id": step_update.step_id,
            "produced_at": Utc::now(),
        }))
        .bind(uploaded_by.unwrap_or_else(Uuid::new_v4))
        .execute(&state.db)
        .await?;
    }

    Ok(())
}

/// 构建产物 Webhook 请求
#[derive(serde::Deserialize)]
pub struct BuildArtifactWebhook {
    /// 构建作业 ID
    pub job_id: Uuid,
    /// 任务 ID
    pub task_id: Uuid,
    /// 产物信息
    pub artifact: BuildArtifact,
    /// 产物元数据
    #[serde(flatten)]
    pub metadata: serde_json::Value,
    /// 上传者（触发者）
    pub uploaded_by: Uuid,
}

// ==================== RabbitMQ 消费服务 ====================

/// RabbitMQ 构建消息消费服务
/// 用于消费 Runner 回传的状态和日志消息（替代 HTTP webhook）
#[derive(Clone)]
pub struct BuildMessageConsumer {
    state: Arc<AppState>,
}

impl BuildMessageConsumer {
    /// 创建新的消费服务
    pub fn new(state: Arc<AppState>) -> Self {
        Self { state }
    }

    /// 处理状态消息（从 RabbitMQ）
    pub async fn handle_status_message(&self, data: Vec<u8>) -> anyhow::Result<()> {
        let payload: BuildStatusMessage = serde_json::from_slice(&data)
            .map_err(|e| anyhow::anyhow!("Failed to parse status message: {}", e))?;

        debug!(
            task_id = %payload.task_id,
            job_id = %payload.job_id,
            runner = %payload.runner_name,
            status = ?payload.status,
            "Processing build status from RabbitMQ"
        );

        // 获取当前作业状态（用于判断是否需要递减 current_jobs）
        let current_status: Option<String> =
            sqlx::query_scalar::<_, String>("SELECT status::text FROM build_jobs WHERE id = $1")
                .bind(payload.job_id)
                .fetch_optional(&self.state.db)
                .await?;

        if current_status.is_none() {
            warn!(
                job_id = %payload.job_id,
                "Build job not found for status update"
            );
            return Ok(());
        }

        // 更新构建作业状态
        let status_str = match payload.status {
            BuildStatus::Received => "pending",
            BuildStatus::Preparing => "pending",
            BuildStatus::Running => "running",
            BuildStatus::Succeeded => "completed",
            BuildStatus::Failed => "failed",
            BuildStatus::Timeout => "failed",
            BuildStatus::Cancelled => "cancelled",
        };

        // 根据状态更新时间戳
        let (started_at, completed_at) = match payload.status {
            BuildStatus::Running | BuildStatus::Preparing => (Some(Utc::now()), None),
            BuildStatus::Succeeded
            | BuildStatus::Failed
            | BuildStatus::Timeout
            | BuildStatus::Cancelled => {
                let current: Option<chrono::DateTime<chrono::Utc>> =
                    sqlx::query("SELECT started_at FROM build_jobs WHERE id = $1")
                        .bind(payload.job_id)
                        .fetch_optional(&self.state.db)
                        .await?
                        .and_then(|row| row.get("started_at"));
                (current, Some(Utc::now()))
            }
            _ => (None, None),
        };

        let mut query = String::from("UPDATE build_jobs SET status = CAST($1 AS job_status)");
        let mut param_idx = 2;

        if started_at.is_some() {
            query.push_str(&format!(", started_at = ${}", param_idx));
            param_idx += 1;
        }
        if completed_at.is_some() {
            query.push_str(&format!(", completed_at = ${}", param_idx));
            param_idx += 1;
        }

        query.push_str(&format!(", updated_at = NOW() WHERE id = ${}", param_idx));

        let mut query_builder = sqlx::query(&query).bind(status_str);
        if let Some(start) = started_at {
            query_builder = query_builder.bind(start);
        }
        if let Some(end) = completed_at {
            query_builder = query_builder.bind(end);
        }
        query_builder = query_builder.bind(payload.job_id);

        query_builder
            .execute(&self.state.db)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to update build job: {}", e))?;

        // 处理步骤状态
        if let Some(ref step_update) = payload.step_status {
            if let Err(e) = update_step_status(&self.state, &payload, step_update).await {
                error!(error = ?e, "Failed to update step status");
            }
        }

        // 递减 Runner current_jobs（仅在任务从运行状态转为最终状态时）
        // 避免重复递减：只有当前状态是 running/pending 且新状态是最终状态时才递减
        let is_terminal_status = matches!(
            payload.status,
            BuildStatus::Succeeded
                | BuildStatus::Failed
                | BuildStatus::Timeout
                | BuildStatus::Cancelled
        );
        let was_running = matches!(current_status.as_deref(), Some("running") | Some("pending"));

        if is_terminal_status && was_running {
            if let Err(e) = Self::decrement_runner_jobs(&self.state, &payload.runner_name).await {
                error!(error = ?e, runner = %payload.runner_name, "Failed to decrement runner current_jobs");
            } else {
                debug!(runner = %payload.runner_name, job_id = %payload.job_id, "Decremented runner current_jobs");
            }
        }

        debug!(job_id = %payload.job_id, status = %status_str, "Build status updated from RabbitMQ");
        Ok(())
    }

    /// 根据 runner_name 递减 current_jobs
    async fn decrement_runner_jobs(state: &AppState, runner_name: &str) -> anyhow::Result<()> {
        let row = sqlx::query("SELECT id FROM runners WHERE name = $1")
            .bind(runner_name)
            .fetch_optional(&state.db)
            .await?;

        if let Some(row) = row {
            let runner_id: uuid::Uuid = row.get("id");
            state
                .runner_scheduler
                .decrement_current_jobs(runner_id)
                .await?;
        } else {
            warn!(runner = %runner_name, "Runner not found for decrement");
        }
        Ok(())
    }

    /// 处理日志消息（从 RabbitMQ）
    pub async fn handle_log_message(&self, data: Vec<u8>) -> anyhow::Result<()> {
        let payload: BuildLogMessage = serde_json::from_slice(&data)
            .map_err(|e| anyhow::anyhow!("Failed to parse log message: {}", e))?;

        // 检查构建作业是否存在
        let job_exists = sqlx::query("SELECT id FROM build_jobs WHERE id = $1")
            .bind(payload.job_id)
            .fetch_optional(&self.state.db)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to check build job: {}", e))?;

        if job_exists.is_none() {
            warn!(job_id = %payload.job_id, "Build job not found for log");
            return Ok(());
        }

        // 检查步骤是否存在
        let step_exists =
            sqlx::query("SELECT id FROM build_steps WHERE job_id = $1 AND step_id = $2")
                .bind(payload.job_id)
                .bind(&payload.step_id)
                .fetch_optional(&self.state.db)
                .await
                .map_err(|e| anyhow::anyhow!("Failed to check build step: {}", e))?;

        if step_exists.is_none() {
            sqlx::query(
                "INSERT INTO build_steps (job_id, step_id, step_name, status, output_detail, created_at, updated_at)
                 VALUES ($1, $2, $3, 'running', $4, NOW(), NOW())",
            )
            .bind(payload.job_id)
            .bind(&payload.step_id)
            .bind(&payload.step_id)
            .bind(&payload.content)
            .execute(&self.state.db)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to create build step: {}", e))?;
        } else {
            sqlx::query("UPDATE build_steps SET output_detail = COALESCE(output_detail, '') || $1, updated_at = NOW() WHERE job_id = $2 AND step_id = $3")
                .bind(&payload.content)
                .bind(payload.job_id)
                .bind(&payload.step_id)
                .execute(&self.state.db)
                .await
                .map_err(|e| anyhow::anyhow!("Failed to update build step log: {}", e))?;
        }

        debug!(
            job_id = %payload.job_id,
            step_id = %payload.step_id,
            "Build log processed from RabbitMQ"
        );
        Ok(())
    }
}
