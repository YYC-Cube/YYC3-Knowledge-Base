//! 审计日志服务

use crate::{error::AppError, models::audit::*, repository::audit_repo::AuditRepository};
use sqlx::PgPool;
use uuid::Uuid;

/// 审计操作类型
#[derive(Debug, Clone, Copy)]
pub enum AuditAction {
    // 用户相关
    UserCreate,
    UserUpdate,
    UserDelete,
    UserLogin,
    UserLogout,
    UserPasswordChange,

    // 资产相关
    AssetGroupCreate,
    AssetGroupUpdate,
    AssetGroupDelete,
    HostCreate,
    HostUpdate,
    HostDelete,

    // 作业相关
    JobCreate,
    JobCancel,
    JobRetry,
    JobExecute,
    JobOutputView,

    // 构建相关
    BuildCreate,
    BuildExecute,
    BuildCancel,
    BuildRetry,
    ArtifactCreate,
    ArtifactUpdate,
    ArtifactDelete,
    ArtifactDownload,

    // 权限相关
    RoleCreate,
    RoleUpdate,
    RoleDelete,
    RoleBindingCreate,
    RoleBindingDelete,

    // 审批相关 (P3)
    ApprovalCreate,
    ApprovalApprove,
    ApprovalReject,
    ApprovalCancel,
    ApprovalGroupCreate,
    ApprovalGroupUpdate,
    ApprovalGroupDelete,

    // Runner 配置相关
    RunnerConfigCreate,
    RunnerConfigUpdate,
    RunnerConfigDelete,

    // Runner 相关
    RunnerRegister,
    RunnerReregister,
    RunnerUpdate,
    RunnerDelete,

    // 审计查询
    AuditQuery,
}

impl AuditAction {
    pub fn as_str(&self) -> &'static str {
        match self {
            AuditAction::UserCreate => "user.create",
            AuditAction::UserUpdate => "user.update",
            AuditAction::UserDelete => "user.delete",
            AuditAction::UserLogin => "user.login",
            AuditAction::UserLogout => "user.logout",
            AuditAction::UserPasswordChange => "user.password_change",

            AuditAction::AssetGroupCreate => "asset.group.create",
            AuditAction::AssetGroupUpdate => "asset.group.update",
            AuditAction::AssetGroupDelete => "asset.group.delete",
            AuditAction::HostCreate => "asset.host.create",
            AuditAction::HostUpdate => "asset.host.update",
            AuditAction::HostDelete => "asset.host.delete",

            AuditAction::JobCreate => "job.create",
            AuditAction::JobCancel => "job.cancel",
            AuditAction::JobRetry => "job.retry",
            AuditAction::JobExecute => "job.execute",
            AuditAction::JobOutputView => "job.output_view",

            AuditAction::BuildCreate => "build.create",
            AuditAction::BuildExecute => "build.execute",
            AuditAction::BuildCancel => "build.cancel",
            AuditAction::BuildRetry => "build.retry",
            AuditAction::ArtifactCreate => "artifact.create",
            AuditAction::ArtifactUpdate => "artifact.update",
            AuditAction::ArtifactDelete => "artifact.delete",
            AuditAction::ArtifactDownload => "artifact.download",

            AuditAction::RoleCreate => "role.create",
            AuditAction::RoleUpdate => "role.update",
            AuditAction::RoleDelete => "role.delete",
            AuditAction::RoleBindingCreate => "role_binding.create",
            AuditAction::RoleBindingDelete => "role_binding.delete",

            AuditAction::ApprovalCreate => "approval.create",
            AuditAction::ApprovalApprove => "approval.approve",
            AuditAction::ApprovalReject => "approval.reject",
            AuditAction::ApprovalCancel => "approval.cancel",
            AuditAction::ApprovalGroupCreate => "approval_group.create",
            AuditAction::ApprovalGroupUpdate => "approval_group.update",
            AuditAction::ApprovalGroupDelete => "approval_group.delete",

            AuditAction::RunnerConfigCreate => "runner_config.create",
            AuditAction::RunnerConfigUpdate => "runner_config.update",
            AuditAction::RunnerConfigDelete => "runner_config.delete",

            AuditAction::RunnerRegister => "runner.register",
            AuditAction::RunnerReregister => "runner.re_register",
            AuditAction::RunnerUpdate => "runner.update",
            AuditAction::RunnerDelete => "runner.delete",

            AuditAction::AuditQuery => "audit.query",
        }
    }
}

/// 审计日志参数结构体
#[derive(Debug, Clone)]
pub struct AuditLogParams<'a> {
    pub subject_id: Uuid,
    pub subject_type: &'a str,
    pub subject_name: Option<&'a str>,
    pub action: &'a str,
    pub resource_type: &'a str,
    pub resource_id: Option<Uuid>,
    pub resource_name: Option<&'a str>,
    pub changes: Option<serde_json::Value>,
    pub changes_summary: Option<&'a str>,
    pub source_ip: Option<&'a str>,
    pub user_agent: Option<&'a str>,
    pub trace_id: Option<&'a str>,
    pub result: &'a str,
    pub error_message: Option<&'a str>,
}

pub struct AuditService {
    db: PgPool,
}

impl AuditService {
    pub fn new(db: PgPool) -> Self {
        Self { db }
    }

    /// 记录审计日志条目
    pub async fn log_action(&self, params: AuditLogParams<'_>) -> Result<(), AppError> {
        let log = AuditLog {
            id: Uuid::new_v4(),
            subject_id: params.subject_id,
            subject_type: params.subject_type.to_string(),
            subject_name: params.subject_name.map(|s| s.to_string()),
            action: params.action.to_string(),
            resource_type: params.resource_type.to_string(),
            resource_id: params.resource_id,
            resource_name: params.resource_name.map(|s| s.to_string()),
            changes: params.changes,
            changes_summary: params.changes_summary.map(|s| s.to_string()),
            source_ip: params.source_ip.map(|s| s.to_string()),
            user_agent: params.user_agent.map(|s| s.to_string()),
            trace_id: params.trace_id.map(|s| s.to_string()),
            request_id: None, // 可以从请求上下文中提取
            result: params.result.to_string(),
            error_message: params.error_message.map(|s| s.to_string()),
            occurred_at: chrono::Utc::now(),
        };

        let repo = AuditRepository::new(self.db.clone());
        repo.insert_audit_log(&log).await?;

        Ok(())
    }

    /// 简化的审计日志记录方法
    pub async fn log_action_simple(
        &self,
        subject_id: Uuid,
        action: AuditAction,
        resource_type: Option<&str>,
        resource_id: Option<Uuid>,
        changes_summary: Option<&str>,
        error_message: Option<&str>,
    ) -> Result<(), AppError> {
        let params = AuditLogParams {
            subject_id,
            subject_type: "user",
            subject_name: None,
            action: action.as_str(),
            resource_type: resource_type.unwrap_or("unknown"),
            resource_id,
            resource_name: None,
            changes: None,
            changes_summary,
            source_ip: None,
            user_agent: None,
            trace_id: None,
            result: if error_message.is_some() {
                "failure"
            } else {
                "success"
            },
            error_message,
        };

        self.log_action(params).await
    }

    /// 查询审计日志
    pub async fn query_logs(
        &self,
        filters: &AuditLogFilters,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<AuditLog>, AppError> {
        let repo = AuditRepository::new(self.db.clone());
        repo.query_audit_logs(filters, limit, offset).await
    }

    /// 查询审计日志数量
    pub async fn count_logs(&self, filters: &AuditLogFilters) -> Result<i64, AppError> {
        let repo = AuditRepository::new(self.db.clone());
        repo.count_audit_logs(filters).await
    }

    /// 查询登录事件
    pub async fn query_login_events(
        &self,
        user_id: Option<Uuid>,
        event_type: Option<&str>,
        start_time: Option<chrono::DateTime<chrono::Utc>>,
        end_time: Option<chrono::DateTime<chrono::Utc>>,
        limit: i64,
    ) -> Result<Vec<LoginEvent>, AppError> {
        let repo = AuditRepository::new(self.db.clone());
        repo.query_login_events(user_id, event_type, start_time, end_time, limit)
            .await
    }
}
