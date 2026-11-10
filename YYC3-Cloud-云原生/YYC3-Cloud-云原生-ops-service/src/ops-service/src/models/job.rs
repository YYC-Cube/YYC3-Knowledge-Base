//! Job domain models
//! P2 阶段：作业系统（SSH 执行）

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::Json;
use uuid::Uuid;

/// 作业类型
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "job_type", rename_all = "snake_case")]
pub enum JobType {
    /// 命令作业
    Command,
    /// 脚本作业
    Script,
    /// 构建作业
    Build,
}

/// 作业状态
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "job_status", rename_all = "snake_case")]
pub enum JobStatus {
    /// 待执行
    Pending,
    /// 执行中
    Running,
    /// 已完成
    Completed,
    /// 已失败
    Failed,
    /// 已取消
    Cancelled,
    /// 部分成功（部分任务成功，部分失败）
    PartiallySucceeded,
}

impl std::fmt::Display for JobStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            JobStatus::Pending => write!(f, "pending"),
            JobStatus::Running => write!(f, "running"),
            JobStatus::Completed => write!(f, "completed"),
            JobStatus::Failed => write!(f, "failed"),
            JobStatus::Cancelled => write!(f, "cancelled"),
            JobStatus::PartiallySucceeded => write!(f, "partially_succeeded"),
        }
    }
}

/// 任务状态（单个主机执行状态）
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "task_status", rename_all = "snake_case")]
pub enum TaskStatus {
    /// 待执行
    Pending,
    /// 执行中
    Running,
    /// 成功
    Succeeded,
    /// 失败
    Failed,
    /// 超时
    Timeout,
    /// 已取消
    Cancelled,
}

impl std::fmt::Display for TaskStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TaskStatus::Pending => write!(f, "pending"),
            TaskStatus::Running => write!(f, "running"),
            TaskStatus::Succeeded => write!(f, "succeeded"),
            TaskStatus::Failed => write!(f, "failed"),
            TaskStatus::Timeout => write!(f, "timeout"),
            TaskStatus::Cancelled => write!(f, "cancelled"),
        }
    }
}

/// 失败原因分类
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "failure_reason", rename_all = "snake_case")]
pub enum FailureReason {
    /// 网络错误
    NetworkError,
    /// 认证失败
    AuthFailed,
    /// 连接超时
    ConnectionTimeout,
    /// 握手超时
    HandshakeTimeout,
    /// 命令超时
    CommandTimeout,
    /// 命令执行失败（非零退出码）
    CommandFailed,
    /// 未知错误
    Unknown,
}

/// 作业 - 顶层概念，代表批量执行任务
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Job {
    pub id: Uuid,
    pub job_type: JobType,
    pub name: String,
    pub description: Option<String>,
    pub status: JobStatus,

    // 目标集信息
    pub target_hosts: Json<Vec<Uuid>>,  // 固化的目标主机ID列表
    pub target_groups: Json<Vec<Uuid>>, // 目标分组ID列表

    // 执行参数
    pub command: Option<String>,     // 命令作业的命令
    pub script: Option<String>,      // 脚本作业的脚本内容
    pub script_path: Option<String>, // 脚本路径（如适用）

    // 执行配置
    pub concurrent_limit: Option<i32>, // 并发上限
    pub timeout_secs: Option<i32>,     // 超时时间（秒）
    pub retry_times: Option<i32>,      // 重试次数
    pub execute_user: Option<String>,  // 执行用户

    // 幂等性控制
    pub idempotency_key: Option<String>, // 幂等键

    // 结果统计
    pub total_tasks: i32,
    pub succeeded_tasks: i32,
    pub failed_tasks: i32,
    pub timeout_tasks: i32,
    pub cancelled_tasks: i32,

    // 审计字段
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,

    // 元数据
    pub tags: Json<Vec<String>>,
}

/// 创建命令作业请求
#[derive(Debug, Deserialize, validator::Validate)]
pub struct CreateCommandJobRequest {
    pub name: String,
    pub description: Option<String>,
    pub target_hosts: Vec<Uuid>,
    pub target_groups: Vec<Uuid>,
    pub command: String,
    pub concurrent_limit: Option<i32>,
    pub timeout_secs: Option<i32>,
    pub retry_times: Option<i32>,
    pub execute_user: Option<String>,
    pub idempotency_key: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
}

/// 创建脚本作业请求
#[derive(Debug, Deserialize, validator::Validate)]
pub struct CreateScriptJobRequest {
    pub name: String,
    pub description: Option<String>,
    pub target_hosts: Vec<Uuid>,
    pub target_groups: Vec<Uuid>,
    pub script: String,
    pub script_path: Option<String>,
    pub concurrent_limit: Option<i32>,
    pub timeout_secs: Option<i32>,
    pub retry_times: Option<i32>,
    pub execute_user: Option<String>,
    pub idempotency_key: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
}

/// 任务 - 作业的执行单元，对应单个主机
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Task {
    pub id: Uuid,
    pub job_id: Uuid,
    pub host_id: Uuid,

    // 状态信息
    pub status: TaskStatus,
    pub failure_reason: Option<FailureReason>,
    pub failure_message: Option<String>, // 详细错误信息

    // 执行信息
    pub exit_code: Option<i32>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub duration_secs: Option<i64>, // 执行时长（秒）

    // 输出存档
    pub output_summary: Option<String>, // 输出摘要（用于列表展示，限制长度）
    pub output_detail: Option<String>,  // 完整输出（用于详细查询）

    // 重试信息
    pub retry_count: i32,
    pub max_retries: i32,

    // 审计字段
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 作业查询过滤器
#[derive(Debug, Deserialize, validator::Validate)]
pub struct JobListFilters {
    pub job_type: Option<JobType>,
    pub status: Option<JobStatus>,
    pub created_by: Option<Uuid>,
    pub tags: Option<Vec<String>>,
    pub search: Option<String>, // 搜索name/description
    pub date_from: Option<DateTime<Utc>>,
    pub date_to: Option<DateTime<Utc>>,
}

/// 作业列表响应（包含摘要信息）
#[derive(Debug, Serialize, Deserialize)]
pub struct JobSummary {
    pub id: Uuid,
    pub job_type: JobType,
    pub name: String,
    pub description: Option<String>,
    pub status: JobStatus,
    pub target_count: i32, // 目标主机数
    pub succeeded_tasks: i32,
    pub failed_tasks: i32,
    pub timeout_tasks: i32,
    pub cancelled_tasks: i32,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub duration_secs: Option<i64>, // 总执行时长
    pub tags: Vec<String>,
}

/// 任务列表响应
#[derive(Debug, Serialize, Deserialize)]
pub struct TaskResponse {
    #[serde(flatten)]
    pub task: Task,
    pub host_identifier: String,
    pub host_address: String,
    pub host_display_name: Option<String>,
}

/// 任务摘要响应（不包含完整输出，用于无 output_detail 权限时）
/// 只包含任务状态和输出摘要，不包含 output_detail 完整内容
#[derive(Debug, Serialize, Deserialize)]
pub struct TaskSummary {
    pub id: Uuid,
    pub job_id: Uuid,
    pub host_id: Uuid,
    pub status: TaskStatus,
    pub failure_reason: Option<FailureReason>,
    pub exit_code: Option<i32>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub duration_secs: Option<i64>,
    pub output_summary: Option<String>,
    // 注意：不包含 output_detail 完整内容
    pub output_detail_truncated: bool, // 指示输出是否被截断
    pub host_identifier: String,
    pub host_address: String,
    pub host_display_name: Option<String>,
}

/// 任务列表响应（可以是完整响应或摘要）
/// 根据 output_detail 权限返回不同类型的数据
#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum TaskListResponse {
    /// 完整响应（包含 output_detail）
    Full(Vec<TaskResponse>),
    /// 摘要响应（不包含 output_detail）
    Summary(Vec<TaskSummary>),
}

/// 取消作业请求
#[derive(Debug, Deserialize, validator::Validate)]
pub struct CancelJobRequest {
    pub reason: Option<String>,
}

/// 重试作业请求
#[derive(Debug, Deserialize, validator::Validate)]
pub struct RetryJobRequest {
    /// 只重试失败的任务
    #[serde(default)]
    pub failed_only: bool,
    /// 任务ID列表（如果指定，只重试这些任务）
    pub task_ids: Option<Vec<Uuid>>,
}

/// 作业执行统计
#[derive(Debug, Serialize)]
pub struct JobStatistics {
    pub job_id: Uuid,
    pub total_tasks: i32,
    pub succeeded_tasks: i32,
    pub failed_tasks: i32,
    pub timeout_tasks: i32,
    pub cancelled_tasks: i32,
    pub pending_tasks: i32,
    pub running_tasks: i32,
    pub success_rate: f64,              // 成功率
    pub avg_duration_secs: Option<f64>, // 平均执行时长
    // 失败原因分类统计（P2）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub failure_reason_stats: Option<FailureReasonStats>,
}

/// 失败原因统计
#[derive(Debug, Serialize, Default)]
pub struct FailureReasonStats {
    /// 网络错误数量
    pub network_error: i32,
    /// 认证失败数量
    pub auth_failed: i32,
    /// 连接超时数量
    pub connection_timeout: i32,
    /// 握手超时数量
    pub handshake_timeout: i32,
    /// 命令超时数量
    pub command_timeout: i32,
    /// 命令执行失败数量
    pub command_failed: i32,
    /// 未知错误数量
    pub unknown: i32,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use serde_json;

    /// 创建测试用的 Job
    fn create_test_job() -> Job {
        Job {
            id: Uuid::new_v4(),
            job_type: JobType::Command,
            name: "Test Job".to_string(),
            description: Some("A test job".to_string()),
            status: JobStatus::Pending,
            target_hosts: Json(vec![Uuid::new_v4()]),
            target_groups: Json(vec![]),
            command: Some("echo 'hello'".to_string()),
            script: None,
            script_path: None,
            concurrent_limit: Some(5),
            timeout_secs: Some(300),
            retry_times: Some(2),
            execute_user: Some("root".to_string()),
            idempotency_key: Some("test-key-123".to_string()),
            total_tasks: 1,
            succeeded_tasks: 0,
            failed_tasks: 0,
            timeout_tasks: 0,
            cancelled_tasks: 0,
            created_by: Uuid::new_v4(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            started_at: None,
            completed_at: None,
            tags: Json(vec!["test".to_string(), "batch".to_string()]),
        }
    }

    #[test]
    fn test_job_type_serialization() {
        let types = vec![
            (JobType::Command, "Command"),
            (JobType::Script, "Script"),
            (JobType::Build, "Build"),
        ];

        for (job_type, expected) in types {
            let json = serde_json::to_string(&job_type).unwrap();
            assert_eq!(json, format!("\"{}\"", expected));

            let deserialized: JobType = serde_json::from_str(&json).unwrap();
            match (job_type, deserialized) {
                (JobType::Command, JobType::Command) => {}
                (JobType::Script, JobType::Script) => {}
                (JobType::Build, JobType::Build) => {}
                _ => panic!("Job type mismatch"),
            }
        }
    }

    #[test]
    fn test_job_status_serialization() {
        let statuses = vec![
            (JobStatus::Pending, "Pending"),
            (JobStatus::Running, "Running"),
            (JobStatus::Completed, "Completed"),
            (JobStatus::Failed, "Failed"),
            (JobStatus::Cancelled, "Cancelled"),
            (JobStatus::PartiallySucceeded, "PartiallySucceeded"),
        ];

        for (status, expected) in statuses {
            let json = serde_json::to_string(&status).unwrap();
            assert_eq!(json, format!("\"{}\"", expected));

            let deserialized: JobStatus = serde_json::from_str(&json).unwrap();
            match (status, deserialized) {
                (JobStatus::Pending, JobStatus::Pending) => {}
                (JobStatus::Running, JobStatus::Running) => {}
                (JobStatus::Completed, JobStatus::Completed) => {}
                (JobStatus::Failed, JobStatus::Failed) => {}
                (JobStatus::Cancelled, JobStatus::Cancelled) => {}
                (JobStatus::PartiallySucceeded, JobStatus::PartiallySucceeded) => {}
                _ => panic!("Job status mismatch"),
            }
        }
    }

    #[test]
    fn test_task_status_serialization() {
        let statuses = vec![
            (TaskStatus::Pending, "Pending"),
            (TaskStatus::Running, "Running"),
            (TaskStatus::Succeeded, "Succeeded"),
            (TaskStatus::Failed, "Failed"),
            (TaskStatus::Timeout, "Timeout"),
            (TaskStatus::Cancelled, "Cancelled"),
        ];

        for (status, expected) in statuses {
            let json = serde_json::to_string(&status).unwrap();
            assert_eq!(json, format!("\"{}\"", expected));

            let deserialized: TaskStatus = serde_json::from_str(&json).unwrap();
            match (status, deserialized) {
                (TaskStatus::Pending, TaskStatus::Pending) => {}
                (TaskStatus::Running, TaskStatus::Running) => {}
                (TaskStatus::Succeeded, TaskStatus::Succeeded) => {}
                (TaskStatus::Failed, TaskStatus::Failed) => {}
                (TaskStatus::Timeout, TaskStatus::Timeout) => {}
                (TaskStatus::Cancelled, TaskStatus::Cancelled) => {}
                _ => panic!("Task status mismatch"),
            }
        }
    }

    #[test]
    fn test_failure_reason_serialization() {
        let reasons = vec![
            (FailureReason::NetworkError, "NetworkError"),
            (FailureReason::AuthFailed, "AuthFailed"),
            (FailureReason::ConnectionTimeout, "ConnectionTimeout"),
            (FailureReason::HandshakeTimeout, "HandshakeTimeout"),
            (FailureReason::CommandTimeout, "CommandTimeout"),
            (FailureReason::CommandFailed, "CommandFailed"),
            (FailureReason::Unknown, "Unknown"),
        ];

        for (reason, expected) in reasons {
            let json = serde_json::to_string(&reason).unwrap();
            assert_eq!(json, format!("\"{}\"", expected));

            let deserialized: FailureReason = serde_json::from_str(&json).unwrap();
            match (reason, deserialized) {
                (FailureReason::NetworkError, FailureReason::NetworkError) => {}
                (FailureReason::AuthFailed, FailureReason::AuthFailed) => {}
                (FailureReason::ConnectionTimeout, FailureReason::ConnectionTimeout) => {}
                (FailureReason::HandshakeTimeout, FailureReason::HandshakeTimeout) => {}
                (FailureReason::CommandTimeout, FailureReason::CommandTimeout) => {}
                (FailureReason::CommandFailed, FailureReason::CommandFailed) => {}
                (FailureReason::Unknown, FailureReason::Unknown) => {}
                _ => panic!("Failure reason mismatch"),
            }
        }
    }

    #[test]
    fn test_job_creation() {
        let job = create_test_job();

        assert!(!job.id.is_nil());
        assert_eq!(job.name, "Test Job");
        assert_eq!(job.description, Some("A test job".to_string()));
        assert_eq!(job.job_type, JobType::Command);
        assert_eq!(job.status, JobStatus::Pending);
    }

    #[test]
    fn test_job_execution_config() {
        let job = create_test_job();

        assert_eq!(job.command, Some("echo 'hello'".to_string()));
        assert_eq!(job.concurrent_limit, Some(5));
        assert_eq!(job.timeout_secs, Some(300));
        assert_eq!(job.retry_times, Some(2));
        assert_eq!(job.execute_user, Some("root".to_string()));
    }

    #[test]
    fn test_job_tags() {
        let job = create_test_job();

        assert_eq!(job.tags.0.len(), 2);
        assert!(job.tags.0.contains(&"test".to_string()));
        assert!(job.tags.0.contains(&"batch".to_string()));
    }

    #[test]
    fn test_job_serialization() {
        let job = create_test_job();
        let json = serde_json::to_string(&job).unwrap();

        assert!(json.contains("\"name\":\"Test Job\""));
        assert!(json.contains("\"command\":\"echo 'hello'\""));

        let deserialized: Job = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.name, job.name);
        assert_eq!(deserialized.command, job.command);
    }

    #[test]
    fn test_create_command_job_request() {
        let request = CreateCommandJobRequest {
            name: "Deploy Application".to_string(),
            description: Some("Deploy to production".to_string()),
            target_hosts: vec![Uuid::new_v4()],
            target_groups: vec![],
            command: "kubectl apply -f deployment.yaml".to_string(),
            concurrent_limit: Some(10),
            timeout_secs: Some(600),
            retry_times: Some(1),
            execute_user: Some("ubuntu".to_string()),
            idempotency_key: Some("deploy-prod-001".to_string()),
            tags: vec!["deploy".to_string(), "production".to_string()],
        };

        assert_eq!(request.name, "Deploy Application");
        assert_eq!(request.command, "kubectl apply -f deployment.yaml");
        assert_eq!(request.target_hosts.len(), 1);
        assert_eq!(request.tags.len(), 2);
    }

    #[test]
    fn test_create_script_job_request() {
        let script = r#"#!/bin/bash
echo "Starting deployment..."
kubectl apply -f deployment.yaml
echo "Deployment complete"
"#
        .to_string();

        let request = CreateScriptJobRequest {
            name: "Script Deploy".to_string(),
            description: None,
            target_hosts: vec![],
            target_groups: vec![Uuid::new_v4()],
            script,
            script_path: Some("/deploy/deploy.sh".to_string()),
            concurrent_limit: None,
            timeout_secs: Some(900),
            retry_times: None,
            execute_user: None,
            idempotency_key: None,
            tags: vec![],
        };

        assert_eq!(request.name, "Script Deploy");
        assert!(request.script.contains("kubectl apply"));
        assert_eq!(request.script_path, Some("/deploy/deploy.sh".to_string()));
    }

    #[test]
    fn test_task_creation() {
        let task = Task {
            id: Uuid::new_v4(),
            job_id: Uuid::new_v4(),
            host_id: Uuid::new_v4(),
            status: TaskStatus::Pending,
            failure_reason: None,
            failure_message: None,
            exit_code: None,
            started_at: None,
            completed_at: None,
            duration_secs: None,
            output_summary: None,
            output_detail: None,
            retry_count: 0,
            max_retries: 3,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        assert_eq!(task.status, TaskStatus::Pending);
        assert_eq!(task.max_retries, 3);
        assert_eq!(task.retry_count, 0);
    }

    #[test]
    fn test_task_response() {
        let task = Task {
            id: Uuid::new_v4(),
            job_id: Uuid::new_v4(),
            host_id: Uuid::new_v4(),
            status: TaskStatus::Succeeded,
            failure_reason: None,
            failure_message: None,
            exit_code: Some(0),
            started_at: Some(Utc::now()),
            completed_at: Some(Utc::now()),
            duration_secs: Some(45),
            output_summary: Some("Command succeeded".to_string()),
            output_detail: Some("Full output here...".to_string()),
            retry_count: 0,
            max_retries: 3,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let response = TaskResponse {
            task: task.clone(),
            host_identifier: "web-server-01".to_string(),
            host_address: "192.168.1.100".to_string(),
            host_display_name: Some("Web Server 1".to_string()),
        };

        assert_eq!(response.task.status, TaskStatus::Succeeded);
        assert_eq!(response.host_identifier, "web-server-01");
        assert_eq!(response.host_address, "192.168.1.100");
        assert_eq!(response.host_display_name, Some("Web Server 1".to_string()));
    }

    #[test]
    fn test_job_statistics() {
        let stats = JobStatistics {
            job_id: Uuid::new_v4(),
            total_tasks: 10,
            succeeded_tasks: 8,
            failed_tasks: 1,
            timeout_tasks: 1,
            cancelled_tasks: 0,
            pending_tasks: 0,
            running_tasks: 0,
            success_rate: 0.8,
            avg_duration_secs: Some(120.0),
            failure_reason_stats: Some(FailureReasonStats::default()),
        };

        assert_eq!(stats.total_tasks, 10);
        assert_eq!(stats.succeeded_tasks, 8);
        assert_eq!(stats.failed_tasks, 1);
        assert_eq!(stats.timeout_tasks, 1);
        assert_eq!(stats.success_rate, 0.8);
        assert_eq!(stats.avg_duration_secs, Some(120.0));
    }

    #[test]
    fn test_failure_reason_stats_default() {
        let stats = FailureReasonStats::default();

        assert_eq!(stats.network_error, 0);
        assert_eq!(stats.auth_failed, 0);
        assert_eq!(stats.connection_timeout, 0);
        assert_eq!(stats.handshake_timeout, 0);
        assert_eq!(stats.command_timeout, 0);
        assert_eq!(stats.command_failed, 0);
        assert_eq!(stats.unknown, 0);
    }

    #[test]
    fn test_failure_reason_stats_with_values() {
        let stats = FailureReasonStats {
            network_error: 5,
            auth_failed: 2,
            connection_timeout: 1,
            handshake_timeout: 0,
            command_timeout: 3,
            command_failed: 4,
            unknown: 1,
        };

        assert_eq!(stats.network_error, 5);
        assert_eq!(stats.auth_failed, 2);
        assert_eq!(stats.connection_timeout, 1);
        assert_eq!(stats.handshake_timeout, 0);
        assert_eq!(stats.command_timeout, 3);
        assert_eq!(stats.command_failed, 4);
        assert_eq!(stats.unknown, 1);
    }

    #[test]
    fn test_job_list_filters() {
        let filters = JobListFilters {
            job_type: Some(JobType::Command),
            status: Some(JobStatus::Running),
            created_by: Some(Uuid::new_v4()),
            tags: Some(vec!["urgent".to_string()]),
            search: Some("deploy".to_string()),
            date_from: Some(Utc::now()),
            date_to: Some(Utc::now()),
        };

        assert_eq!(filters.job_type, Some(JobType::Command));
        assert_eq!(filters.status, Some(JobStatus::Running));
        assert!(filters.tags.is_some());
        assert!(filters.search.is_some());
    }

    #[test]
    fn test_cancel_job_request() {
        let request = CancelJobRequest {
            reason: Some("User cancelled".to_string()),
        };

        assert_eq!(request.reason, Some("User cancelled".to_string()));
    }

    #[test]
    fn test_retry_job_request() {
        let request = RetryJobRequest {
            failed_only: true,
            task_ids: None,
        };

        assert!(request.failed_only);
        assert!(request.task_ids.is_none());

        let request2 = RetryJobRequest {
            failed_only: false,
            task_ids: Some(vec![Uuid::new_v4(), Uuid::new_v4()]),
        };

        assert!(!request2.failed_only);
        assert!(request2.task_ids.is_some());
        assert_eq!(request2.task_ids.as_ref().unwrap().len(), 2);
    }

    #[test]
    fn test_job_summary_serialization() {
        let summary = JobSummary {
            id: Uuid::new_v4(),
            job_type: JobType::Script,
            name: "Daily Backup".to_string(),
            description: Some("Run daily backup job".to_string()),
            status: JobStatus::Completed,
            target_count: 5,
            succeeded_tasks: 5,
            failed_tasks: 0,
            timeout_tasks: 0,
            cancelled_tasks: 0,
            created_by: Uuid::new_v4(),
            created_at: Utc::now(),
            started_at: Some(Utc::now()),
            completed_at: Some(Utc::now()),
            duration_secs: Some(300),
            tags: vec!["backup".to_string(), "daily".to_string()],
        };

        let json = serde_json::to_string(&summary).unwrap();
        assert!(json.contains("\"name\":\"Daily Backup\""));
        assert!(json.contains("\"target_count\":5"));

        let deserialized: JobSummary = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.name, "Daily Backup");
        assert_eq!(deserialized.target_count, 5);
    }

    #[test]
    fn test_task_with_failure() {
        let task = Task {
            id: Uuid::new_v4(),
            job_id: Uuid::new_v4(),
            host_id: Uuid::new_v4(),
            status: TaskStatus::Failed,
            failure_reason: Some(FailureReason::CommandFailed),
            failure_message: Some("Command exited with code 1".to_string()),
            exit_code: Some(1),
            started_at: Some(Utc::now()),
            completed_at: Some(Utc::now()),
            duration_secs: Some(10),
            output_summary: Some("Error: command failed".to_string()),
            output_detail: Some("Full error output...".to_string()),
            retry_count: 1,
            max_retries: 3,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        assert_eq!(task.status, TaskStatus::Failed);
        assert_eq!(task.failure_reason, Some(FailureReason::CommandFailed));
        assert!(task.failure_message.is_some());
        assert_eq!(task.exit_code, Some(1));
        assert_eq!(task.retry_count, 1);
    }

    #[test]
    fn test_task_with_timeout() {
        let task = Task {
            id: Uuid::new_v4(),
            job_id: Uuid::new_v4(),
            host_id: Uuid::new_v4(),
            status: TaskStatus::Timeout,
            failure_reason: Some(FailureReason::CommandTimeout),
            failure_message: Some("Command timed out after 300s".to_string()),
            exit_code: None,
            started_at: Some(Utc::now()),
            completed_at: Some(Utc::now()),
            duration_secs: Some(300),
            output_summary: Some("Timeout".to_string()),
            output_detail: None,
            retry_count: 0,
            max_retries: 2,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        assert_eq!(task.status, TaskStatus::Timeout);
        assert_eq!(task.failure_reason, Some(FailureReason::CommandTimeout));
        assert_eq!(task.duration_secs, Some(300));
    }

    #[test]
    fn test_job_with_all_statuses() {
        let statuses = vec![
            JobStatus::Pending,
            JobStatus::Running,
            JobStatus::Completed,
            JobStatus::Failed,
            JobStatus::Cancelled,
            JobStatus::PartiallySucceeded,
        ];

        for status in statuses {
            let mut job = create_test_job();
            job.status = status.clone();
            assert_eq!(job.status, status);
        }
    }

    #[test]
    fn test_json_vec_uuid() {
        let uuids = vec![Uuid::new_v4(), Uuid::new_v4(), Uuid::new_v4()];
        let json_uuids: Json<Vec<Uuid>> = Json(uuids.clone());

        let json = serde_json::to_string(&json_uuids).unwrap();
        let deserialized: Json<Vec<Uuid>> = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.0.len(), 3);
    }
}
