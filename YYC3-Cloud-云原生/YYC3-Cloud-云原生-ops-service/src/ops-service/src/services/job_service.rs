//! 作业服务层
//! P2 阶段：提供作业的创建、查询、取消、重试等功能

use sqlx::{Pool, Postgres};
use std::sync::Arc;
use tracing::{error, info, instrument, warn};
use uuid::Uuid;

use crate::concurrency::ConcurrencyController;
use crate::config::SshConfig as AppSshConfig;
use crate::error::{AppError, Result};
use crate::models::asset::Host;
use crate::models::job::*;
use crate::output::OutputArchive;
use crate::realtime::EventBus;
use crate::services::audit_service::{AuditAction, AuditService};
use crate::services::ApprovalService;
use crate::ssh::{HostKeyVerification, SSHClient, SshAuth, SshConfig};
use secrecy::ExposeSecret;

/// 作业服务
pub struct JobService {
    db: Pool<Postgres>,
    concurrency_controller: Arc<ConcurrencyController>,
    audit_service: Arc<AuditService>,
    ssh_config: AppSshConfig,
    event_bus: Arc<EventBus>,
    approval_service: Option<Arc<ApprovalService>>,
}

impl JobService {
    /// 创建新的作业服务
    pub fn new(
        db: Pool<Postgres>,
        concurrency_controller: Arc<ConcurrencyController>,
        audit_service: Arc<AuditService>,
        ssh_config: AppSshConfig,
    ) -> Self {
        Self {
            db,
            concurrency_controller,
            audit_service,
            ssh_config,
            event_bus: Arc::new(EventBus::new(1000)),
            approval_service: None,
        }
    }

    /// 设置事件总线（用于外部注入）
    pub fn with_event_bus(mut self, event_bus: Arc<EventBus>) -> Self {
        self.event_bus = event_bus;
        self
    }

    /// 设置审批服务（用于审批闭环）
    pub fn with_approval_service(mut self, approval_service: Arc<ApprovalService>) -> Self {
        self.approval_service = Some(approval_service);
        self
    }

    /// 创建命令作业
    #[instrument(skip(self, request))]
    pub async fn create_command_job(
        &self,
        request: CreateCommandJobRequest,
        created_by: Uuid,
    ) -> Result<Job> {
        info!(name = %request.name, "Creating command job");

        // 检查幂等键
        if let Some(key) = &request.idempotency_key {
            if let Some(existing) = self.get_by_idempotency_key(key).await? {
                info!(
                    job_id = %existing.id,
                    "Found existing job with same idempotency key"
                );
                return Ok(existing);
            }
        }

        // 验证目标主机
        let target_hosts = self
            .resolve_target_hosts(&request.target_hosts, &request.target_groups)
            .await?;
        if target_hosts.is_empty() {
            return Err(AppError::validation("No valid target hosts found"));
        }

        // 开始事务
        let mut tx = self.db.begin().await.map_err(|e| {
            error!(error = %e, "Failed to begin transaction");
            AppError::database("Failed to begin transaction")
        })?;

        // 创建作业记录
        let job_id = Uuid::new_v4();
        let job = sqlx::query_as::<_, Job>(
            r#"
            INSERT INTO jobs (
                id, job_type, name, description, status,
                target_hosts, target_groups,
                command, concurrent_limit, timeout_secs, retry_times, execute_user,
                idempotency_key,
                total_tasks, created_by, tags
            ) VALUES (
                $1, $2, $3, $4, 'pending',
                $5, $6,
                $7, $8, $9, $10, $11,
                $12,
                $13, $14, $15
            ) RETURNING *
            "#,
        )
        .bind(job_id)
        .bind(JobType::Command)
        .bind(&request.name)
        .bind(&request.description)
        .bind(target_hosts.iter().map(|h| h.id).collect::<Vec<_>>())
        .bind(&request.target_groups)
        .bind(&request.command)
        .bind(request.concurrent_limit)
        .bind(request.timeout_secs)
        .bind(request.retry_times.unwrap_or(0))
        .bind(&request.execute_user)
        .bind(&request.idempotency_key)
        .bind(target_hosts.len() as i32)
        .bind(created_by)
        .bind(&request.tags)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to insert job");
            AppError::database("Failed to create job")
        })?;

        // 创建任务记录
        for host in &target_hosts {
            sqlx::query(
                r#"
                INSERT INTO tasks (
                    id, job_id, host_id, status, max_retries
                ) VALUES ($1, $2, $3, 'pending', $4)
                "#,
            )
            .bind(Uuid::new_v4())
            .bind(job_id)
            .bind(host.id)
            .bind(request.retry_times.unwrap_or(0))
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                error!(error = %e, host_id = %host.id, "Failed to insert task");
                AppError::database("Failed to create task")
            })?;
        }

        // 提交事务
        tx.commit().await.map_err(|e| {
            error!(error = %e, "Failed to commit transaction");
            AppError::database("Failed to commit transaction")
        })?;

        // 记录审计
        self.audit_service
            .log_action_simple(
                created_by,
                AuditAction::JobCreate,
                Some("job"),
                Some(job_id),
                Some("Command job created"),
                None,
            )
            .await?;

        info!(job_id = %job_id, "Command job created successfully");

        // 审批检查：如果需要审批，将作业状态设为 awaiting_approval
        if let Some(ref approval_svc) = self.approval_service {
            if approval_svc.check_job_requires_approval(&job, &target_hosts).await? {
                info!(job_id = %job_id, "Job requires approval, setting status to awaiting_approval");
                sqlx::query("UPDATE jobs SET status = 'awaiting_approval' WHERE id = $1")
                    .bind(job_id)
                    .execute(&self.db)
                    .await
                    .map_err(|e| {
                        error!(error = %e, "Failed to update job status");
                        AppError::database("Failed to update job status")
                    })?;
                return Ok(job);
            }
        }

        // 异步启动作业执行
        let db_clone = self.db.clone();
        let concurrency_clone = self.concurrency_controller.clone();
        let audit_clone = self.audit_service.clone();
        let ssh_config_clone = self.ssh_config.clone();
        let event_bus_clone = self.event_bus.clone();
        tokio::spawn(async move {
            if let Err(e) = Self::execute_job(
                job_id,
                db_clone,
                concurrency_clone,
                audit_clone,
                ssh_config_clone,
                event_bus_clone,
            )
            .await
            {
                error!(error = %e, job_id = %job_id, "Failed to execute job");
            }
        });

        Ok(job)
    }

    /// 创建脚本作业
    #[instrument(skip(self, request))]
    pub async fn create_script_job(
        &self,
        request: CreateScriptJobRequest,
        created_by: Uuid,
    ) -> Result<Job> {
        info!(name = %request.name, "Creating script job");

        // 检查幂等键
        if let Some(key) = &request.idempotency_key {
            if let Some(existing) = self.get_by_idempotency_key(key).await? {
                info!(
                    job_id = %existing.id,
                    "Found existing job with same idempotency key"
                );
                return Ok(existing);
            }
        }

        // 验证目标主机
        let target_hosts = self
            .resolve_target_hosts(&request.target_hosts, &request.target_groups)
            .await?;
        if target_hosts.is_empty() {
            return Err(AppError::validation("No valid target hosts found"));
        }

        // 开始事务
        let mut tx = self.db.begin().await.map_err(|e| {
            error!(error = %e, "Failed to begin transaction");
            AppError::database("Failed to begin transaction")
        })?;

        // 创建作业记录
        let job_id = Uuid::new_v4();
        let job = sqlx::query_as::<_, Job>(
            r#"
            INSERT INTO jobs (
                id, job_type, name, description, status,
                target_hosts, target_groups,
                script, script_path, concurrent_limit, timeout_secs, retry_times, execute_user,
                idempotency_key,
                total_tasks, created_by, tags
            ) VALUES (
                $1, $2, $3, $4, 'pending',
                $5, $6,
                $7, $8, $9, $10, $11, $12,
                $13,
                $14, $15, $16
            ) RETURNING *
            "#,
        )
        .bind(job_id)
        .bind(JobType::Script)
        .bind(&request.name)
        .bind(&request.description)
        .bind(target_hosts.iter().map(|h| h.id).collect::<Vec<_>>())
        .bind(&request.target_groups)
        .bind(&request.script)
        .bind(&request.script_path)
        .bind(request.concurrent_limit)
        .bind(request.timeout_secs)
        .bind(request.retry_times.unwrap_or(0))
        .bind(&request.execute_user)
        .bind(&request.idempotency_key)
        .bind(target_hosts.len() as i32)
        .bind(created_by)
        .bind(&request.tags)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to insert script job");
            AppError::database("Failed to create job")
        })?;

        // 创建任务记录
        for host in &target_hosts {
            sqlx::query(
                r#"
                INSERT INTO tasks (
                    id, job_id, host_id, status, max_retries
                ) VALUES ($1, $2, $3, 'pending', $4)
                "#,
            )
            .bind(Uuid::new_v4())
            .bind(job_id)
            .bind(host.id)
            .bind(request.retry_times.unwrap_or(0))
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                error!(error = %e, host_id = %host.id, "Failed to insert task");
                AppError::database("Failed to create task")
            })?;
        }

        // 提交事务
        tx.commit().await.map_err(|e| {
            error!(error = %e, "Failed to commit transaction");
            AppError::database("Failed to commit transaction")
        })?;

        // 记录审计
        self.audit_service
            .log_action_simple(
                created_by,
                AuditAction::JobCreate,
                Some("job"),
                Some(job_id),
                Some("Script job created"),
                None,
            )
            .await?;

        info!(job_id = %job_id, "Script job created successfully");

        // 审批检查：如果需要审批，将作业状态设为 awaiting_approval
        if let Some(ref approval_svc) = self.approval_service {
            if approval_svc.check_job_requires_approval(&job, &target_hosts).await? {
                info!(job_id = %job_id, "Script job requires approval, setting status to awaiting_approval");
                sqlx::query("UPDATE jobs SET status = 'awaiting_approval' WHERE id = $1")
                    .bind(job_id)
                    .execute(&self.db)
                    .await
                    .map_err(|e| {
                        error!(error = %e, "Failed to update job status");
                        AppError::database("Failed to update job status")
                    })?;
                return Ok(job);
            }
        }

        // 异步启动作业执行
        let db_clone = self.db.clone();
        let concurrency_clone = self.concurrency_controller.clone();
        let audit_clone = self.audit_service.clone();
        let ssh_config_clone = self.ssh_config.clone();
        let event_bus_clone = self.event_bus.clone();
        tokio::spawn(async move {
            if let Err(e) = Self::execute_job(
                job_id,
                db_clone,
                concurrency_clone,
                audit_clone,
                ssh_config_clone,
                event_bus_clone,
            )
            .await
            {
                error!(error = %e, job_id = %job_id, "Failed to execute job");
            }
        });

        Ok(job)
    }

    /// 查询作业详情
    #[instrument(skip(self))]
    pub async fn get_job(&self, job_id: Uuid) -> Result<Job> {
        sqlx::query_as::<_, Job>("SELECT * FROM jobs WHERE id = $1")
            .bind(job_id)
            .fetch_one(&self.db)
            .await
            .map_err(|e| {
                if let sqlx::Error::RowNotFound = e {
                    AppError::not_found("Job not found")
                } else {
                    error!(error = %e, job_id = %job_id, "Failed to fetch job");
                    AppError::database("Failed to fetch job")
                }
            })
    }

    /// 查询作业列表
    #[instrument(skip(self))]
    pub async fn list_jobs(&self, filters: JobListFilters) -> Result<Vec<Job>> {
        let mut query = String::from("SELECT * FROM jobs WHERE 1=1");
        let mut count = 0;

        if filters.job_type.is_some() {
            count += 1;
            query.push_str(&format!(" AND job_type = ${}", count));
        }
        if filters.status.is_some() {
            count += 1;
            query.push_str(&format!(" AND status = ${}", count));
        }
        if filters.created_by.is_some() {
            count += 1;
            query.push_str(&format!(" AND created_by = ${}", count));
        }
        if filters.search.is_some() {
            count += 1;
            query
                .push_str(&format!(" AND (name ILIKE ${} OR description ILIKE ${})", count, count));
        }
        if filters.date_from.is_some() {
            count += 1;
            query.push_str(&format!(" AND created_at >= ${}", count));
        }
        if filters.date_to.is_some() {
            count += 1;
            query.push_str(&format!(" AND created_at <= ${}", count));
        }

        query.push_str(" ORDER BY created_at DESC LIMIT 100");

        // Prepare search pattern outside of bind to avoid lifetime issues
        let search_pattern = filters.search.as_ref().map(|s| format!("%{}%", s));

        let mut q = sqlx::query_as::<_, Job>(&query);

        if let Some(job_type) = filters.job_type {
            q = q.bind(job_type);
        }
        if let Some(status) = filters.status {
            q = q.bind(status);
        }
        if let Some(created_by) = filters.created_by {
            q = q.bind(created_by);
        }
        if let Some(ref pattern) = search_pattern {
            q = q.bind(pattern).bind(pattern);
        }
        if let Some(date_from) = filters.date_from {
            q = q.bind(date_from);
        }
        if let Some(date_to) = filters.date_to {
            q = q.bind(date_to);
        }

        q.fetch_all(&self.db).await.map_err(|e| {
            error!(error = %e, "Failed to fetch jobs");
            AppError::database("Failed to fetch jobs")
        })
    }

    /// 查询作业列表（带作用域过滤）
    /// 根据 user_id、allowed_groups、allowed_environments 过滤作业
    #[instrument(skip(self, allowed_groups, allowed_environments))]
    pub async fn list_jobs_with_scope(
        &self,
        filters: JobListFilters,
        user_id: Uuid,
        has_global_access: bool,
        allowed_groups: Vec<String>,
        allowed_environments: Vec<String>,
    ) -> Result<Vec<Job>> {
        let jobs = self.list_jobs(filters).await?;

        // 如果有全局访问权限，直接返回所有作业
        if has_global_access {
            return Ok(jobs);
        }

        // 否则过滤作业：用户只能看到
        // 1. 自己创建的作业，或
        // 2. 目标主机/分组在用户允许的 group/environment 作用域内的作业
        let mut filtered_jobs = Vec::new();

        for job in jobs {
            // 总是包含用户自己创建的作业
            if job.created_by == user_id {
                filtered_jobs.push(job);
                continue;
            }

            // 检查作业的目标主机是否在用户允许的作用域内
            let has_access = self
                .check_job_scope_access(&job, &allowed_groups, &allowed_environments)
                .await?;
            if has_access {
                filtered_jobs.push(job);
            }
        }

        Ok(filtered_jobs)
    }

    /// 检查作业的目标主机是否在允许的 group/environment 作用域内
    async fn check_job_scope_access(
        &self,
        job: &Job,
        allowed_groups: &[String],
        allowed_environments: &[String],
    ) -> Result<bool> {
        let has_global_groups = allowed_groups.contains(&"*".to_string());
        let has_global_environments = allowed_environments.contains(&"*".to_string());

        // 获取作业目标主机的 group 和 environment
        let target_host_ids: Vec<Uuid> = job.target_hosts.0.clone();
        if target_host_ids.is_empty() {
            return Ok(false);
        }

        // 查询目标主机的 group 和 environment
        let hosts =
            sqlx::query_as::<_, Host>("SELECT group_id, environment FROM hosts WHERE id = ANY($1)")
                .bind(&target_host_ids)
                .fetch_all(&self.db)
                .await
                .map_err(|e| {
                    error!(error = %e, "Failed to fetch hosts for scope check");
                    AppError::database("Failed to fetch hosts")
                })?;

        // 检查是否有至少一个主机在用户允许的作用域内
        for host in hosts {
            let group_match =
                has_global_groups || allowed_groups.contains(&host.group_id.to_string());
            let env_match =
                has_global_environments || allowed_environments.contains(&host.environment);

            if group_match && env_match {
                return Ok(true);
            }
        }

        Ok(false)
    }

    /// 获取作业的任务列表
    #[instrument(skip(self))]
    /// 获取作业的任务列表
    pub async fn get_job_tasks(&self, job_id: Uuid) -> Result<Vec<TaskResponse>> {
        // 验证作业存在
        self.get_job(job_id).await?;

        let tasks =
            sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE job_id = $1 ORDER BY created_at")
                .bind(job_id)
                .fetch_all(&self.db)
                .await
                .map_err(|e| {
                    error!(error = %e, job_id = %job_id, "Failed to fetch tasks");
                    AppError::database("Failed to fetch tasks")
                })?;

        // 为每个任务获取主机信息
        let mut responses = Vec::new();
        for task in tasks {
            let host = sqlx::query_as::<_, Host>("SELECT * FROM hosts WHERE id = $1")
                .bind(task.host_id)
                .fetch_one(&self.db)
                .await
                .map_err(|e| {
                    error!(error = %e, host_id = %task.host_id, "Failed to fetch host");
                    AppError::database("Failed to fetch host")
                })?;

            responses.push(TaskResponse {
                task,
                host_identifier: host.identifier,
                host_address: host.address,
                host_display_name: host.display_name,
            });
        }

        Ok(responses)
    }

    /// 获取作业的任务摘要列表（不包含完整输出）
    /// 用于无 output_detail 权限时的返回
    #[instrument(skip(self))]
    pub async fn get_job_tasks_summary(
        &self,
        job_id: Uuid,
    ) -> Result<Vec<crate::models::job::TaskSummary>> {
        // 验证作业存在
        self.get_job(job_id).await?;

        let tasks =
            sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE job_id = $1 ORDER BY created_at")
                .bind(job_id)
                .fetch_all(&self.db)
                .await
                .map_err(|e| {
                    error!(error = %e, job_id = %job_id, "Failed to fetch tasks");
                    AppError::database("Failed to fetch tasks")
                })?;

        // 为每个任务获取主机信息并构建摘要
        let mut summaries = Vec::new();
        for task in tasks {
            let host = sqlx::query_as::<_, Host>("SELECT * FROM hosts WHERE id = $1")
                .bind(task.host_id)
                .fetch_one(&self.db)
                .await
                .map_err(|e| {
                    error!(error = %e, host_id = %task.host_id, "Failed to fetch host");
                    AppError::database("Failed to fetch host")
                })?;

            summaries.push(crate::models::job::TaskSummary {
                id: task.id,
                job_id: task.job_id,
                host_id: task.host_id,
                status: task.status,
                failure_reason: task.failure_reason,
                exit_code: task.exit_code,
                started_at: task.started_at,
                completed_at: task.completed_at,
                duration_secs: task.duration_secs,
                output_summary: task.output_summary,
                output_detail_truncated: true, // 指示完整输出被截断
                host_identifier: host.identifier,
                host_address: host.address,
                host_display_name: host.display_name,
            });
        }

        Ok(summaries)
    }

    /// 取消作业
    #[instrument(skip(self))]
    pub async fn cancel_job(
        &self,
        job_id: Uuid,
        requested_by: Uuid,
        reason: Option<String>,
    ) -> Result<()> {
        info!(job_id = %job_id, "Cancelling job");

        let mut tx = self.db.begin().await.map_err(|e| {
            error!(error = %e, "Failed to begin transaction");
            AppError::database("Failed to begin transaction")
        })?;

        // 更新作业状态
        let updated = sqlx::query(
            "UPDATE jobs SET status = 'cancelled', completed_at = NOW() WHERE id = $1 AND status IN ('pending', 'running')"
        )
        .bind(job_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to update job status");
            AppError::database("Failed to cancel job")
        })?;

        if updated.rows_affected() == 0 {
            return Err(AppError::validation("Job cannot be cancelled"));
        }

        // 取消所有pending/running的任务
        sqlx::query(
            "UPDATE tasks SET status = 'cancelled', completed_at = NOW() WHERE job_id = $1 AND status IN ('pending', 'running')"
        )
        .bind(job_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to cancel tasks");
            AppError::database("Failed to cancel tasks")
        })?;

        tx.commit().await.map_err(|e| {
            error!(error = %e, "Failed to commit transaction");
            AppError::database("Failed to commit transaction")
        })?;

        // 记录审计
        self.audit_service
            .log_action_simple(
                requested_by,
                AuditAction::JobCancel,
                Some("job"),
                Some(job_id),
                Some("Command failed"),
                None,
            )
            .await?;

        info!(job_id = %job_id, "Job cancelled successfully");
        Ok(())
    }

    /// 重试作业
    #[instrument(skip(self))]
    pub async fn retry_job(
        &self,
        job_id: Uuid,
        request: RetryJobRequest,
        requested_by: Uuid,
    ) -> Result<Job> {
        info!(job_id = %job_id, "Retrying job");

        let job = self.get_job(job_id).await?;

        // 只允许失败、部分成功或已取消的作业重试
        if !matches!(
            job.status,
            JobStatus::Failed | JobStatus::PartiallySucceeded | JobStatus::Cancelled
        ) {
            return Err(AppError::validation("Job cannot be retried"));
        }

        let mut tx = self.db.begin().await.map_err(|e| {
            error!(error = %e, "Failed to begin transaction");
            AppError::database("Failed to begin transaction")
        })?;

        // 确定要重试的任务
        let failed_only = request.failed_only;
        let task_ids = request.task_ids;

        let tasks_to_retry = if let Some(ids) = task_ids {
            // 重试指定的任务
            sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE job_id = $1 AND id = ANY($2)")
                .bind(job_id)
                .bind(&ids)
                .fetch_all(&mut *tx)
                .await
                .map_err(|e| {
                    error!(error = %e, "Failed to fetch tasks to retry");
                    AppError::database("Failed to fetch tasks")
                })?
        } else if failed_only {
            // 只重试失败的任务
            sqlx::query_as::<_, Task>(
                "SELECT * FROM tasks WHERE job_id = $1 AND status IN ('failed', 'timeout')",
            )
            .bind(job_id)
            .fetch_all(&mut *tx)
            .await
            .map_err(|e| {
                error!(error = %e, "Failed to fetch failed tasks");
                AppError::database("Failed to fetch failed tasks")
            })?
        } else {
            // 重试所有任务
            sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE job_id = $1")
                .bind(job_id)
                .fetch_all(&mut *tx)
                .await
                .map_err(|e| {
                    error!(error = %e, "Failed to fetch all tasks");
                    AppError::database("Failed to fetch tasks")
                })?
        };

        if tasks_to_retry.is_empty() {
            return Err(AppError::validation("No tasks to retry"));
        }

        // 重置任务状态
        for task in &tasks_to_retry {
            sqlx::query(
                "UPDATE tasks SET status = 'pending', failure_reason = NULL, failure_message = NULL, started_at = NULL, completed_at = NULL WHERE id = $1"
            )
            .bind(task.id)
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                error!(error = %e, task_id = %task.id, "Failed to reset task");
                AppError::database("Failed to reset task")
            })?;
        }

        // 重置作业状态
        sqlx::query(
            "UPDATE jobs SET status = 'pending', started_at = NULL, completed_at = NULL WHERE id = $1"
        )
        .bind(job_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to reset job");
            AppError::database("Failed to reset job")
        })?;

        tx.commit().await.map_err(|e| {
            error!(error = %e, "Failed to commit transaction");
            AppError::database("Failed to commit transaction")
        })?;

        // 记录审计
        self.audit_service
            .log_action_simple(
                requested_by,
                AuditAction::JobRetry,
                Some("job"),
                Some(job_id),
                Some("Command failed"),
                None,
            )
            .await?;

        info!(job_id = %job_id, tasks_count = tasks_to_retry.len(), "Job retry scheduled");

        // 异步启动作业执行
        let db_clone = self.db.clone();
        let concurrency_clone = self.concurrency_controller.clone();
        let audit_clone = self.audit_service.clone();
        let ssh_config_clone = self.ssh_config.clone();
        let event_bus_clone = self.event_bus.clone();
        tokio::spawn(async move {
            if let Err(e) = Self::execute_job(
                job_id,
                db_clone,
                concurrency_clone,
                audit_clone,
                ssh_config_clone,
                event_bus_clone,
            )
            .await
            {
                error!(error = %e, job_id = %job_id, "Failed to execute job");
            }
        });

        self.get_job(job_id).await
    }

    /// 获取作业统计（包含失败原因分类）
    #[instrument(skip(self))]
    pub async fn get_job_statistics(&self, job_id: Uuid) -> Result<JobStatistics> {
        let job = self.get_job(job_id).await?;

        let pending_tasks = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM tasks WHERE job_id = $1 AND status = 'pending'",
        )
        .bind(job_id)
        .fetch_one(&self.db)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to count pending tasks");
            AppError::database("Failed to count tasks")
        })? as i32;

        let running_tasks = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM tasks WHERE job_id = $1 AND status = 'running'",
        )
        .bind(job_id)
        .fetch_one(&self.db)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to count running tasks");
            AppError::database("Failed to count tasks")
        })? as i32;

        let success_rate = if job.total_tasks > 0 {
            job.succeeded_tasks as f64 / job.total_tasks as f64
        } else {
            0.0
        };

        // 计算已完成任务的平均时长
        let avg_duration = sqlx::query_scalar::<_, Option<f64>>(
            "SELECT AVG(duration_secs) FROM tasks WHERE job_id = $1 AND duration_secs IS NOT NULL",
        )
        .bind(job_id)
        .fetch_one(&self.db)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to calculate average duration");
            AppError::database("Failed to calculate statistics")
        })?;

        // 查询失败原因分类统计（P2）
        let failure_reason_stats = self.get_failure_reason_stats(job_id).await?;

        Ok(JobStatistics {
            job_id,
            total_tasks: job.total_tasks,
            succeeded_tasks: job.succeeded_tasks,
            failed_tasks: job.failed_tasks,
            timeout_tasks: job.timeout_tasks,
            cancelled_tasks: job.cancelled_tasks,
            pending_tasks,
            running_tasks,
            success_rate,
            avg_duration_secs: avg_duration,
            failure_reason_stats: Some(failure_reason_stats),
        })
    }

    /// 获取失败原因统计（P2）
    async fn get_failure_reason_stats(&self, job_id: Uuid) -> Result<FailureReasonStats> {
        use crate::models::job::FailureReason;

        let rows = sqlx::query_as::<_, (Option<FailureReason>, i64)>(
            r#"
            SELECT failure_reason, COUNT(*) as count
            FROM tasks
            WHERE job_id = $1 AND status IN ('failed', 'timeout') AND failure_reason IS NOT NULL
            GROUP BY failure_reason
            "#,
        )
        .bind(job_id)
        .fetch_all(&self.db)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to fetch failure reason stats");
            AppError::database("Failed to fetch failure reason stats")
        })?;

        let mut stats = FailureReasonStats::default();
        for (reason, count) in rows {
            let count = count as i32;
            match reason {
                Some(FailureReason::NetworkError) => stats.network_error = count,
                Some(FailureReason::AuthFailed) => stats.auth_failed = count,
                Some(FailureReason::ConnectionTimeout) => stats.connection_timeout = count,
                Some(FailureReason::HandshakeTimeout) => stats.handshake_timeout = count,
                Some(FailureReason::CommandTimeout) => stats.command_timeout = count,
                Some(FailureReason::CommandFailed) => stats.command_failed = count,
                Some(FailureReason::Unknown) | None => stats.unknown += count,
            }
        }

        Ok(stats)
    }

    // ==================== 私有方法 ====================

    /// 通过幂等键查找作业
    async fn get_by_idempotency_key(&self, key: &str) -> Result<Option<Job>> {
        sqlx::query_as::<_, Job>("SELECT * FROM jobs WHERE idempotency_key = $1")
            .bind(key)
            .fetch_optional(&self.db)
            .await
            .map_err(|e| {
                error!(error = %e, "Failed to fetch job by idempotency key");
                AppError::database("Failed to fetch job")
            })
    }

    /// 解析目标主机（直接指定的 + 分组中的）
    async fn resolve_target_hosts(
        &self,
        host_ids: &[Uuid],
        group_ids: &[Uuid],
    ) -> Result<Vec<Host>> {
        let mut hosts = Vec::new();

        // 获取直接指定的主机
        if !host_ids.is_empty() {
            let direct_hosts = sqlx::query_as::<_, Host>(
                "SELECT * FROM hosts WHERE id = ANY($1) AND status = 'active'",
            )
            .bind(host_ids)
            .fetch_all(&self.db)
            .await
            .map_err(|e| {
                error!(error = %e, "Failed to fetch hosts by ids");
                AppError::database("Failed to fetch hosts")
            })?;
            hosts.extend(direct_hosts);
        }

        // 获取分组中的主机
        if !group_ids.is_empty() {
            let group_hosts = sqlx::query_as::<_, Host>(
                "SELECT DISTINCT h.* FROM hosts h JOIN asset_groups ag ON h.group_id = ag.id WHERE ag.id = ANY($1) AND h.status = 'active'"
            )
            .bind(group_ids)
            .fetch_all(&self.db)
            .await
            .map_err(|e| {
                error!(error = %e, "Failed to fetch hosts by groups");
                AppError::database("Failed to fetch hosts")
            })?;
            hosts.extend(group_hosts);
        }

        // 去重
        hosts.sort_by_key(|h| h.id);
        hosts.dedup_by_key(|h| h.id);

        Ok(hosts)
    }

    /// 执行作业（异步）
    async fn execute_job(
        job_id: Uuid,
        db: Pool<Postgres>,
        concurrency_controller: Arc<ConcurrencyController>,
        audit_service: Arc<AuditService>,
        ssh_config: AppSshConfig,
        event_bus: Arc<EventBus>,
    ) -> Result<()> {
        info!(job_id = %job_id, "Starting job execution");

        // 更新作业状态为running
        sqlx::query("UPDATE jobs SET status = 'running', started_at = NOW() WHERE id = $1")
            .bind(job_id)
            .execute(&db)
            .await
            .map_err(|e| {
                error!(error = %e, "Failed to update job status to running");
                AppError::database("Failed to update job status")
            })?;

        // 发布作业状态变更事件：pending -> running
        let _ = event_bus.publish(crate::realtime::RealtimeEvent::JobStatusChanged {
            job_id,
            old_status: "pending".to_string(),
            new_status: "running".to_string(),
        });

        // 获取作业信息
        let job = sqlx::query_as::<_, Job>("SELECT * FROM jobs WHERE id = $1")
            .bind(job_id)
            .fetch_one(&db)
            .await
            .map_err(|e| {
                error!(error = %e, "Failed to fetch job");
                AppError::database("Failed to fetch job")
            })?;

        // 获取所有待执行的任务
        let tasks = sqlx::query_as::<_, Task>(
            "SELECT * FROM tasks WHERE job_id = $1 AND status = 'pending' ORDER BY created_at",
        )
        .bind(job_id)
        .fetch_all(&db)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to fetch tasks");
            AppError::database("Failed to fetch tasks")
        })?;

        // 并发执行任务
        let semaphore = if let Some(limit) = job.concurrent_limit {
            Arc::new(tokio::sync::Semaphore::new(limit as usize))
        } else {
            Arc::new(tokio::sync::Semaphore::new(10)) // 默认并发10
        };

        let mut task_handles = Vec::new();

        for task in tasks {
            let db_clone = db.clone();
            let concurrency_clone = concurrency_controller.clone();
            let audit_clone = audit_service.clone();
            let semaphore_clone = semaphore.clone();
            let job_clone = job.clone();
            let ssh_config_clone = ssh_config.clone();
            let event_bus_clone = event_bus.clone();

            let handle = tokio::spawn(async move {
                let _permit = semaphore_clone.acquire().await.unwrap_or_else(|_| {
                    tracing::error!("Semaphore closed unexpectedly");
                    std::process::abort();
                });
                Self::execute_task(
                    task,
                    job_clone,
                    db_clone,
                    concurrency_clone,
                    audit_clone,
                    ssh_config_clone,
                    event_bus_clone,
                )
                .await
            });

            task_handles.push(handle);
        }

        // 等待所有任务完成
        let mut succeeded = 0;
        let mut failed = 0;
        let timeout = 0;

        for handle in task_handles {
            match handle.await {
                Ok(Ok(())) => succeeded += 1,
                Ok(Err(_)) => failed += 1,
                Err(_) => failed += 1,
            }
        }

        // 更新作业状态
        let (status, succeeded_tasks, failed_tasks, timeout_tasks) =
            Self::calculate_job_status(succeeded, failed, timeout, job.total_tasks);

        sqlx::query(
            "UPDATE jobs SET status = $1, succeeded_tasks = $2, failed_tasks = $3, timeout_tasks = $4, completed_at = NOW() WHERE id = $5"
        )
        .bind(&status)
        .bind(succeeded_tasks)
        .bind(failed_tasks)
        .bind(timeout_tasks)
        .bind(job_id)
        .execute(&db)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to update job final status");
            AppError::database("Failed to update job status")
        })?;

        // 发布作业状态变更事件：running -> final status
        let _ = event_bus.publish(crate::realtime::RealtimeEvent::JobStatusChanged {
            job_id,
            old_status: "running".to_string(),
            new_status: status.to_string(),
        });

        info!(
            job_id = %job_id,
            status = ?status,
            succeeded = succeeded_tasks,
            failed = failed_tasks,
            "Job execution completed"
        );

        Ok(())
    }

    /// 执行单个任务
    async fn execute_task(
        task: Task,
        job: Job,
        db: Pool<Postgres>,
        concurrency_controller: Arc<ConcurrencyController>,
        _audit_service: Arc<AuditService>,
        ssh_config: AppSshConfig,
        event_bus: Arc<EventBus>,
    ) -> Result<()> {
        info!(
            task_id = %task.id,
            job_id = %job.id,
            host_id = %task.host_id,
            "Executing task"
        );

        // 更新任务状态为running
        sqlx::query("UPDATE tasks SET status = 'running', started_at = NOW() WHERE id = $1")
            .bind(task.id)
            .execute(&db)
            .await
            .map_err(|e| {
                error!(error = %e, "Failed to update task status");
                AppError::database("Failed to update task status")
            })?;

        // 发布任务状态变更事件：pending -> running
        let _ = event_bus.publish(crate::realtime::RealtimeEvent::TaskStatusChanged {
            task_id: task.id,
            job_id: job.id,
            old_status: "pending".to_string(),
            new_status: "running".to_string(),
        });

        // 获取主机信息
        let host = sqlx::query_as::<_, Host>("SELECT * FROM hosts WHERE id = $1")
            .bind(task.host_id)
            .fetch_one(&db)
            .await
            .map_err(|e| {
                error!(error = %e, "Failed to fetch host");
                AppError::database("Failed to fetch host")
            })?;

        // 获取并发许可
        let _permit = concurrency_controller
            .acquire(Some(&host.group_id.to_string()), Some(&host.environment))
            .await
            .map_err(|e| {
                error!(error = %e, "Failed to acquire concurrency permit");
                e
            })?;

        // 创建SSH客户端并执行命令
        // 优先使用主机级凭据，否则回退到全局默认配置

        // 确定用户名：主机级 > 作业指定 > 全局默认
        let username = job
            .execute_user
            .clone()
            .or_else(|| host.ssh_username.clone())
            .unwrap_or_else(|| ssh_config.default_username.clone());

        // 确定认证方式：优先使用主机级私钥，其次主机级密码，再然后全局私钥，最后全局密码
        let auth = if let Some(host_private_key) = &host.ssh_private_key {
            // 主机配置了私钥
            SshAuth::Key {
                private_key: host_private_key.clone(),
                passphrase: host.ssh_key_passphrase.clone(),
            }
        } else if host.ssh_password.is_some() {
            // 主机配置了密码
            SshAuth::Password {
                password: host.ssh_password.clone().unwrap_or_default(),
            }
        } else if let Some(global_private_key) = &ssh_config.default_private_key {
            // 使用全局私钥
            SshAuth::Key {
                private_key: global_private_key.expose_secret().to_string(),
                passphrase: ssh_config
                    .private_key_passphrase
                    .as_ref()
                    .map(|p| p.expose_secret().to_string()),
            }
        } else {
            // 使用全局密码
            SshAuth::Password {
                password: ssh_config.default_password.expose_secret().to_string(),
            }
        };

        // 解析主机级的主机密钥验证策略
        // 优先级：主机级配置 > 全局配置
        let host_key_verification = if let Some(verification_str) = &host.host_key_verification {
            verification_str
                .parse::<HostKeyVerification>()
                .unwrap_or_else(|_| {
                    warn!(
                        host = %host.identifier,
                        verification = %verification_str,
                        "Invalid host_key_verification value, using global default"
                    );
                    // 回退到全局配置
                    Self::parse_global_host_key_verification(&ssh_config.host_key_verification)
                })
        } else {
            // 使用全局配置
            Self::parse_global_host_key_verification(&ssh_config.host_key_verification)
        };

        // 获取 known_hosts 配置
        // 优先级：主机级 known_hosts > 全局 known_hosts 文件 > None
        let known_hosts = if let Some(host_known_hosts) = &host.known_hosts {
            // 主机级配置（JSON 格式）
            Some(host_known_hosts.0.clone())
        } else if let Some(ref file_path) = ssh_config.known_hosts_file {
            // 从文件读取 known_hosts
            JobService::load_known_hosts_file(file_path).await
        } else {
            None
        };

        let ssh_exec_config = SshConfig {
            host: host.address.clone(),
            port: host.port as u16,
            username,
            auth,
            connect_timeout_secs: ssh_config.connect_timeout_secs,
            handshake_timeout_secs: ssh_config.handshake_timeout_secs,
            command_timeout_secs: job
                .timeout_secs
                .unwrap_or(ssh_config.command_timeout_secs as i32)
                as u64,
            host_key_verification,
            known_hosts,
        };

        let client = SSHClient::new(ssh_exec_config);

        // 创建进度回调用于增量输出推送
        let job_id_for_callback = job.id;
        let task_id_for_callback = task.id;
        let event_bus_for_callback = event_bus.clone();

        let progress_callback = std::sync::Arc::new(move |output: String, is_complete: bool| {
            // 脱敏输出
            let masked_output = crate::realtime::DataMasker::mask_output(&output);

            // 发布增量输出更新事件
            let _ =
                event_bus_for_callback.publish(crate::realtime::RealtimeEvent::TaskOutputUpdate {
                    task_id: task_id_for_callback,
                    job_id: job_id_for_callback,
                    output: masked_output,
                    is_complete,
                });
        });

        // 根据作业类型执行不同的命令
        let result = match job.job_type {
            JobType::Command => {
                let command = job
                    .command
                    .as_ref()
                    .ok_or_else(|| AppError::validation("Command job must have a command"))?;
                client
                    .execute_with_progress(command, Some(progress_callback))
                    .await
            }
            JobType::Script => {
                let script = job
                    .script
                    .as_ref()
                    .ok_or_else(|| AppError::validation("Script job must have a script"))?;
                // 对于脚本作业，暂时使用普通的 execute_script（不带进度）
                // TODO: 后续可以为 execute_script 也添加进度回调支持
                client
                    .execute_script(script, job.script_path.as_deref())
                    .await
            }
            JobType::Build => {
                // 构建作业暂不支持 SSH 执行
                Err(AppError::validation("Build jobs are not supported for SSH execution"))
            }
        };

        match result {
            Ok(exec_result) => {
                let (status, failure_reason, failure_message) = if exec_result.timed_out {
                    (
                        TaskStatus::Timeout,
                        Some(FailureReason::CommandTimeout),
                        Some("Command timed out"),
                    )
                } else if exec_result.exit_code == 0 {
                    (TaskStatus::Succeeded, None, None)
                } else {
                    (TaskStatus::Failed, Some(FailureReason::CommandFailed), Some("Command failed"))
                };

                // 使用脱敏模块处理输出
                let output_archive = OutputArchive::default_config();

                // 合并 stdout 和 stderr
                let full_output = if exec_result.stderr.is_empty() {
                    exec_result.stdout.clone()
                } else if exec_result.stdout.is_empty() {
                    exec_result.stderr.clone()
                } else {
                    format!("{}\n{}", exec_result.stdout, exec_result.stderr)
                };

                // 脱敏并生成摘要和明细
                let (output_summary, output_detail) = output_archive.process_output(&full_output);

                sqlx::query(
                    "UPDATE tasks SET status = $1, exit_code = $2, output_summary = $3, output_detail = $4, failure_reason = $5, failure_message = $6, completed_at = NOW(), duration_secs = $7 WHERE id = $8"
                )
                .bind(&status)
                .bind(exec_result.exit_code)
                .bind(&output_summary)
                .bind(&output_detail)
                .bind(&failure_reason)
                .bind(failure_message)
                .bind(exec_result.duration_secs as i64)
                .bind(task.id)
                .execute(&db)
                .await
                .map_err(|e| {
                    error!(error = %e, "Failed to update task result");
                    AppError::database("Failed to update task")
                })?;

                // 发布任务状态变更事件：running -> final status
                let status_str = status.to_string();
                let _ = event_bus.publish(crate::realtime::RealtimeEvent::TaskStatusChanged {
                    task_id: task.id,
                    job_id: job.id,
                    old_status: "running".to_string(),
                    new_status: status_str.clone(),
                });

                // 发布任务输出更新事件
                let _ = event_bus.publish(crate::realtime::RealtimeEvent::TaskOutputUpdate {
                    task_id: task.id,
                    job_id: job.id,
                    output: output_summary.clone(),
                    is_complete: true,
                });

                Ok(())
            }
            Err(e) => {
                error!(error = %e, "Failed to execute command");
                // 根据错误类型分类失败原因
                let failure_reason = e.to_ssh_failure_reason();
                sqlx::query(
                    "UPDATE tasks SET status = 'failed', failure_reason = $1, failure_message = $2, completed_at = NOW() WHERE id = $3"
                )
                .bind(&failure_reason)
                .bind(e.to_string())
                .bind(task.id)
                .execute(&db)
                .await
                .map_err(|e| {
                    error!(error = %e, "Failed to update task failure");
                    AppError::database("Failed to update task")
                })?;

                // 发布任务状态变更事件：running -> failed
                let _ = event_bus.publish(crate::realtime::RealtimeEvent::TaskStatusChanged {
                    task_id: task.id,
                    job_id: job.id,
                    old_status: "running".to_string(),
                    new_status: "failed".to_string(),
                });

                Err(e)
            }
        }
    }

    /// 计算作业最终状态
    fn calculate_job_status(
        succeeded: i32,
        failed: i32,
        timeout: i32,
        total: i32,
    ) -> (JobStatus, i32, i32, i32) {
        if succeeded == total {
            (JobStatus::Completed, succeeded, failed, timeout)
        } else if succeeded > 0 {
            (JobStatus::PartiallySucceeded, succeeded, failed, timeout)
        } else {
            (JobStatus::Failed, succeeded, failed, timeout)
        }
    }

    // ==================== 模板管理 ====================

    /// 创建作业模板
    #[instrument(skip(self, request))]
    pub async fn create_job_template(
        &self,
        request: crate::models::approval::CreateJobTemplateRequest,
        created_by: Uuid,
    ) -> Result<crate::models::approval::JobTemplate> {
        info!(name = %request.name, "Creating job template");

        let template = sqlx::query_as::<_, crate::models::approval::JobTemplate>(
            r#"
            INSERT INTO job_templates (
                id, name, description, template_type,
                template_content, parameters_schema,
                default_timeout_secs, default_retry_times, default_concurrent_limit,
                risk_level, requires_approval,
                applicable_environments, applicable_groups,
                is_active, created_by
            ) VALUES (
                $1, $2, $3, $4,
                $5, $6,
                $7, $8, $9,
                $10, $11,
                $12, $13,
                true, $14
            ) RETURNING *
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(&request.name)
        .bind(&request.description)
        .bind(&request.template_type)
        .bind(&request.template_content)
        .bind(&request.parameters_schema)
        .bind(request.default_timeout_secs)
        .bind(request.default_retry_times)
        .bind(request.default_concurrent_limit)
        .bind(&request.risk_level)
        .bind(request.requires_approval)
        .bind(&request.applicable_environments)
        .bind(&request.applicable_groups)
        .bind(created_by)
        .fetch_one(&self.db)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to create job template");
            AppError::database("Failed to create job template")
        })?;

        // 记录审计
        self.audit_service
            .log_action_simple(
                created_by,
                crate::services::audit_service::AuditAction::JobCreate,
                Some("job_templates"),
                Some(template.id),
                Some(&format!("Job template: {}", request.name)),
                None,
            )
            .await?;

        info!(template_id = %template.id, "Job template created successfully");
        Ok(template)
    }

    /// 获取作业模板详情
    #[instrument(skip(self))]
    pub async fn get_job_template(
        &self,
        template_id: Uuid,
    ) -> Result<crate::models::approval::JobTemplate> {
        sqlx::query_as::<_, crate::models::approval::JobTemplate>(
            "SELECT * FROM job_templates WHERE id = $1 AND is_active = true",
        )
        .bind(template_id)
        .fetch_one(&self.db)
        .await
        .map_err(|e| {
            if let sqlx::Error::RowNotFound = e {
                AppError::not_found("Job template not found")
            } else {
                error!(error = %e, "Failed to fetch job template");
                AppError::database("Failed to fetch job template")
            }
        })
    }

    /// 查询作业模板列表
    #[instrument(skip(self))]
    pub async fn list_job_templates(&self) -> Result<Vec<crate::models::approval::JobTemplate>> {
        sqlx::query_as::<_, crate::models::approval::JobTemplate>(
            "SELECT * FROM job_templates WHERE is_active = true ORDER BY created_at DESC",
        )
        .fetch_all(&self.db)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to fetch job templates");
            AppError::database("Failed to fetch job templates")
        })
    }

    /// 更新作业模板
    #[instrument(skip(self, request))]
    pub async fn update_job_template(
        &self,
        template_id: Uuid,
        request: crate::models::approval::UpdateJobTemplateRequest,
        updated_by: Uuid,
    ) -> Result<crate::models::approval::JobTemplate> {
        info!(template_id = %template_id, "Updating job template");

        // 构建动态更新查询
        let mut updates = Vec::new();
        let mut count = 0;

        if request.name.is_some() {
            count += 1;
            updates.push(format!("name = ${}", count));
        }
        if request.description.is_some() {
            count += 1;
            updates.push(format!("description = ${}", count));
        }
        if request.template_content.is_some() {
            count += 1;
            updates.push(format!("template_content = ${}", count));
        }
        if request.parameters_schema.is_some() {
            count += 1;
            updates.push(format!("parameters_schema = ${}", count));
        }
        if request.default_timeout_secs.is_some() {
            count += 1;
            updates.push(format!("default_timeout_secs = ${}", count));
        }
        if request.default_retry_times.is_some() {
            count += 1;
            updates.push(format!("default_retry_times = ${}", count));
        }
        if request.default_concurrent_limit.is_some() {
            count += 1;
            updates.push(format!("default_concurrent_limit = ${}", count));
        }
        if request.risk_level.is_some() {
            count += 1;
            updates.push(format!("risk_level = ${}", count));
        }
        if request.requires_approval.is_some() {
            count += 1;
            updates.push(format!("requires_approval = ${}", count));
        }
        if request.applicable_environments.is_some() {
            count += 1;
            updates.push(format!("applicable_environments = ${}", count));
        }
        if request.applicable_groups.is_some() {
            count += 1;
            updates.push(format!("applicable_groups = ${}", count));
        }

        updates.push("updated_at = NOW()".to_string());

        let query = format!(
            "UPDATE job_templates SET {} WHERE id = ${} AND is_active = true RETURNING *",
            updates.join(", "),
            count + 1
        );

        let mut q = sqlx::query_as::<_, crate::models::approval::JobTemplate>(&query);

        if let Some(name) = request.name {
            q = q.bind(name);
        }
        if let Some(description) = request.description {
            q = q.bind(description);
        }
        if let Some(template_content) = request.template_content {
            q = q.bind(template_content);
        }
        if let Some(parameters_schema) = request.parameters_schema {
            q = q.bind(parameters_schema);
        }
        if let Some(default_timeout_secs) = request.default_timeout_secs {
            q = q.bind(default_timeout_secs);
        }
        if let Some(default_retry_times) = request.default_retry_times {
            q = q.bind(default_retry_times);
        }
        if let Some(default_concurrent_limit) = request.default_concurrent_limit {
            q = q.bind(default_concurrent_limit);
        }
        if let Some(risk_level) = request.risk_level {
            q = q.bind(risk_level);
        }
        if let Some(requires_approval) = request.requires_approval {
            q = q.bind(requires_approval);
        }
        if let Some(applicable_environments) = request.applicable_environments {
            q = q.bind(applicable_environments);
        }
        if let Some(applicable_groups) = request.applicable_groups {
            q = q.bind(applicable_groups);
        }

        q = q.bind(template_id);

        let template = q.fetch_one(&self.db).await.map_err(|e| {
            if let sqlx::Error::RowNotFound = e {
                AppError::not_found("Job template not found")
            } else {
                error!(error = %e, "Failed to update job template");
                AppError::database("Failed to update job template")
            }
        })?;

        // 记录审计
        self.audit_service
            .log_action_simple(
                updated_by,
                crate::services::audit_service::AuditAction::JobCreate,
                Some("job_templates"),
                Some(template_id),
                Some("Updated job template"),
                None,
            )
            .await?;

        info!(template_id = %template_id, "Job template updated successfully");
        Ok(template)
    }

    /// 删除作业模板（软删除）
    #[instrument(skip(self))]
    pub async fn delete_job_template(&self, template_id: Uuid, deleted_by: Uuid) -> Result<()> {
        info!(template_id = %template_id, "Deleting job template");

        let updated = sqlx::query(
            "UPDATE job_templates SET is_active = false, updated_at = NOW() WHERE id = $1",
        )
        .bind(template_id)
        .execute(&self.db)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to delete job template");
            AppError::database("Failed to delete job template")
        })?;

        if updated.rows_affected() == 0 {
            return Err(AppError::not_found("Job template not found"));
        }

        // 记录审计
        self.audit_service
            .log_action_simple(
                deleted_by,
                crate::services::audit_service::AuditAction::JobCancel,
                Some("job_templates"),
                Some(template_id),
                Some("Deleted job template"),
                None,
            )
            .await?;

        info!(template_id = %template_id, "Job template deleted successfully");
        Ok(())
    }

    /// 基于模板创建作业
    #[instrument(skip(self, request))]
    pub async fn create_job_from_template(
        &self,
        request: crate::models::approval::ExecuteTemplateJobRequest,
        created_by: Uuid,
    ) -> Result<Job> {
        info!(template_id = %request.template_id, "Creating job from template");

        // 获取模板
        let template = self.get_job_template(request.template_id).await?;

        if !template.is_active {
            return Err(AppError::validation("Job template is not active"));
        }

        // 替换模板参数
        let command =
            self.substitute_template_params(&template.template_content, &request.parameters)?;

        // 构建作业请求
        let job_request = CreateCommandJobRequest {
            name: format!("{} (from template)", template.name),
            description: template.description,
            command,
            target_hosts: request.target_hosts,
            target_groups: request.target_groups,
            timeout_secs: template.default_timeout_secs,
            retry_times: template.default_retry_times,
            concurrent_limit: template.default_concurrent_limit,
            execute_user: None,
            idempotency_key: None,
            tags: request.tags,
        };

        // 创建作业
        self.create_command_job(job_request, created_by).await
    }

    /// 替换模板中的参数
    fn substitute_template_params(
        &self,
        template: &str,
        params: &serde_json::Value,
    ) -> Result<String> {
        let mut result = template.to_string();

        if let Some(obj) = params.as_object() {
            for (key, value) in obj {
                let placeholder = format!("{{{{{}}}}}", key);
                let replacement = match value {
                    serde_json::Value::String(s) => s.clone(),
                    serde_json::Value::Number(n) => n.to_string(),
                    serde_json::Value::Bool(b) => b.to_string(),
                    serde_json::Value::Null => String::new(),
                    _ => value.to_string(),
                };
                result = result.replace(&placeholder, &replacement);
            }
        }

        Ok(result)
    }

    // ==================== 实时事件发布 ====================

    /// 发布作业状态变更事件
    pub fn publish_job_status_change(&self, job_id: Uuid, old_status: &str, new_status: &str) {
        use crate::realtime::RealtimeEvent;

        let event = RealtimeEvent::JobStatusChanged {
            job_id,
            old_status: old_status.to_string(),
            new_status: new_status.to_string(),
        };

        // 忽略发布错误
        let _ = self.event_bus.publish(event);
    }

    /// 发布任务状态变更事件
    pub fn publish_task_status_change(
        &self,
        task_id: Uuid,
        job_id: Uuid,
        old_status: &str,
        new_status: &str,
    ) {
        use crate::realtime::RealtimeEvent;

        let event = RealtimeEvent::TaskStatusChanged {
            task_id,
            job_id,
            old_status: old_status.to_string(),
            new_status: new_status.to_string(),
        };

        let _ = self.event_bus.publish(event);
    }

    /// 发布任务输出事件
    pub fn publish_task_output(
        &self,
        task_id: Uuid,
        job_id: Uuid,
        output: &str,
        is_complete: bool,
    ) {
        use crate::realtime::RealtimeEvent;

        // 截断过长的输出以避免消息过大
        let max_output_len = 4096;
        let truncated_output = if output.len() > max_output_len {
            format!("{}...(truncated, {} bytes total)", &output[..max_output_len], output.len())
        } else {
            output.to_string()
        };

        let event = RealtimeEvent::TaskOutputUpdate {
            task_id,
            job_id,
            output: truncated_output,
            is_complete,
        };

        let _ = self.event_bus.publish(event);
    }

    // ==================== SSH 辅助方法 ====================

    /// 从文件加载 known_hosts
    /// 解析 SSH known_hosts 文件格式，返回 HashMap<host_key, fingerprint>
    async fn load_known_hosts_file(
        file_path: &str,
    ) -> Option<std::collections::HashMap<String, String>> {
        use std::collections::HashMap;

        // 读取文件内容
        let content = match tokio::fs::read_to_string(file_path).await {
            Ok(content) => content,
            Err(e) => {
                error!(error = %e, file_path = %file_path, "Failed to read known_hosts file");
                return None;
            }
        };

        let mut known_hosts = HashMap::new();

        // 解析 known_hosts 文件
        for line in content.lines() {
            let line = line.trim();

            // 跳过空行和注释
            if line.is_empty() || line.starts_with('#') {
                continue;
            }

            // known_hosts 格式: host patterns, key type, public key
            // 简化解析：提取 host 和公钥哈希
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 3 {
                let host_pattern = parts[0];
                let public_key_base64 = parts[2];

                // 计算 SHA256 指纹
                if let Ok(hash) = calculate_ssh_fingerprint(public_key_base64) {
                    known_hosts.insert(host_pattern.to_string(), hash);
                }
            }
        }

        if known_hosts.is_empty() {
            warn!(file_path = %file_path, "No valid entries found in known_hosts file");
        } else {
            info!(
                file_path = %file_path,
                count = known_hosts.len(),
                "Loaded known_hosts from file"
            );
        }

        Some(known_hosts)
    }

    /// 解析全局配置的 host_key_verification 字符串
    fn parse_global_host_key_verification(config_str: &str) -> crate::ssh::HostKeyVerification {
        match config_str.to_lowercase().as_str() {
            "strict" => crate::ssh::HostKeyVerification::Strict,
            "disabled" => crate::ssh::HostKeyVerification::Disabled,
            "accept" => crate::ssh::HostKeyVerification::Accept,
            _ => crate::ssh::HostKeyVerification::Accept,
        }
    }
}

/// 计算 SSH 公钥的 SHA256 指纹
fn calculate_ssh_fingerprint(public_key_base64: &str) -> std::result::Result<String, String> {
    use base64::Engine;
    use sha2::Digest;

    // 解码 base64 公钥
    let key_bytes = base64::engine::general_purpose::STANDARD
        .decode(public_key_base64)
        .map_err(|e| format!("Failed to decode public key: {}", e))?;

    // 计算 SHA256 哈希
    let mut hasher = sha2::Sha256::new();
    hasher.update(&key_bytes);
    let hash = hasher.finalize();

    Ok(hex::encode(hash))
}
