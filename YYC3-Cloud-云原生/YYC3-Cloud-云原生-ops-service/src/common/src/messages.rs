//! RabbitMQ 消息协议定义
//!
//! 定义 Runner 和控制面之间的通信协议

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

/// 构建任务消息（控制面 -> Runner）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildTaskMessage {
    /// 任务 ID
    pub task_id: Uuid,

    /// 构建作业 ID
    pub job_id: Uuid,

    /// 项目信息
    pub project: ProjectInfo,

    /// 构建参数
    pub build: BuildParameters,

    /// 构建步骤
    pub steps: Vec<BuildStep>,

    /// 发布目标（可选）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub publish_target: Option<PublishTarget>,
}

/// 项目信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectInfo {
    /// 项目名称
    pub name: String,

    /// 仓库 URL
    pub repository_url: String,

    /// 分支
    pub branch: String,

    /// Commit SHA
    pub commit: String,

    /// 触发者
    pub triggered_by: Uuid,
}

/// 构建参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildParameters {
    /// 构建类型
    pub build_type: String,

    /// 环境变量
    #[serde(default)]
    pub env_vars: HashMap<String, String>,

    /// 构建参数
    #[serde(default)]
    pub parameters: HashMap<String, serde_json::Value>,
}

/// 构建步骤
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildStep {
    /// 步骤 ID
    pub id: String,

    /// 步骤名称
    pub name: String,

    /// 步骤类型
    pub step_type: StepType,

    /// 命令（对于 command 类型）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub command: Option<String>,

    /// 脚本内容（对于 script 类型）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub script: Option<String>,

    /// 工作目录（相对路径）
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

    /// 指定的 Docker 镜像（可选）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub docker_image: Option<String>,
}

/// 步骤类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StepType {
    /// 命令执行
    Command,
    /// 脚本执行
    Script,
    /// 依赖安装
    Install,
    /// 构建
    Build,
    /// 测试
    Test,
    /// 打包
    Package,
    /// 发布
    Publish,
    /// 自定义
    Custom(String),
}

/// 发布目标
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublishTarget {
    /// 目标类型
    pub target_type: String,

    /// 目标地址
    pub url: String,

    /// 认证信息
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auth: Option<AuthInfo>,
}

/// 认证信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthInfo {
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

/// 构建状态更新消息（Runner -> 控制面）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildStatusMessage {
    /// 任务 ID
    pub task_id: Uuid,

    /// 构建作业 ID
    pub job_id: Uuid,

    /// Runner 名称
    pub runner_name: String,

    /// 尝试 ID（同一作业的多次重试有不同的 attempt_id）
    #[serde(default)]
    pub attempt_id: Option<Uuid>,

    /// 状态
    pub status: BuildStatus,

    /// 步骤状态
    #[serde(skip_serializing_if = "Option::is_none")]
    pub step_status: Option<StepStatusUpdate>,

    /// 错误信息
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,

    /// 错误分类
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_category: Option<ErrorCategory>,

    /// 时间戳
    pub timestamp: DateTime<Utc>,
}

/// 构建状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum BuildStatus {
    /// 已接收
    Received,
    /// 准备中
    Preparing,
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

/// 步骤状态更新
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StepStatusUpdate {
    /// 步骤 ID
    pub step_id: String,

    /// 状态
    pub status: StepStatus,

    /// 开始时间
    pub started_at: DateTime<Utc>,

    /// 结束时间
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<DateTime<Utc>>,

    /// 退出码
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exit_code: Option<i32>,

    /// 是否产生产物
    #[serde(skip_serializing_if = "Option::is_none")]
    pub artifact: Option<BuildArtifact>,
}

/// 步骤状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum StepStatus {
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
    /// 跳过
    Skipped,
}

/// 构建产物
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildArtifact {
    /// 产物路径
    pub path: String,

    /// 产物名称
    pub name: String,

    /// 产物类型
    pub artifact_type: String,

    /// 文件大小（字节）
    pub size: u64,

    /// SHA256 哈希
    pub sha256: String,

    /// 版本
    pub version: String,
}

/// 构建日志消息（Runner -> 控制面）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildLogMessage {
    /// 任务 ID
    pub task_id: Uuid,

    /// 构建作业 ID
    pub job_id: Uuid,

    /// 步骤 ID
    pub step_id: String,

    /// Runner 名称
    pub runner_name: String,

    /// 尝试 ID（同一作业的多次重试有不同的 attempt_id）
    #[serde(default)]
    pub attempt_id: Option<Uuid>,

    /// 日志级别
    #[serde(default)]
    pub level: LogLevel,

    /// 日志内容（支持增量）
    pub content: String,

    /// 字节偏移量（用于增量日志拼接）
    pub offset: u64,

    /// 块序号（用于乱序检测和重排序）
    #[serde(default)]
    pub chunk_index: u64,

    /// 是否为最后一条日志
    #[serde(default)]
    pub is_final: bool,

    /// 时间戳
    pub timestamp: DateTime<Utc>,
}

/// 日志级别
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    Debug,
    #[default]
    Info,
    Warn,
    Error,
}

/// 错误分类
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ErrorCategory {
    /// 网络错误
    Network,
    /// 认证失败
    Auth,
    /// 依赖安装失败
    Dependency,
    /// 构建失败
    Build,
    /// 测试失败
    Test,
    /// 超时
    Timeout,
    /// 资源不足
    Resource,
    /// 权限错误
    Permission,
    /// 未知错误
    Unknown,
}

/// Runner 注册消息（Runner -> 控制面）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunnerRegistrationMessage {
    /// Runner 名称
    pub name: String,

    /// 能力标签
    pub capabilities: Vec<String>,

    /// 是否支持 Docker
    pub docker_supported: bool,

    /// 最大并发数
    pub max_concurrent_jobs: usize,

    /// 出站白名单
    pub outbound_allowlist: Vec<String>,

    /// 操作系统
    pub os: String,

    /// 架构
    pub arch: String,

    /// Runner 版本
    pub version: String,

    /// 主机名
    pub hostname: String,

    /// IP 地址
    pub ip: Vec<String>,

    /// 时间戳
    pub timestamp: DateTime<Utc>,
}

/// Docker 配置（控制面 -> Runner）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunnerDockerConfig {
    /// 是否启用 Docker 执行
    pub enabled: bool,

    /// 默认 Docker 镜像
    pub default_image: String,

    /// 按构建类型指定的镜像
    #[serde(default)]
    pub images_by_type: HashMap<String, String>,

    /// 内存限制（GB）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memory_limit_gb: Option<i64>,

    /// CPU 份额
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cpu_shares: Option<i64>,

    /// 最大进程数
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pids_limit: Option<i64>,

    /// 默认超时（秒）
    pub default_timeout_secs: u64,
}

/// Runner 心跳消息（Runner -> 控制面）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunnerHeartbeatMessage {
    /// Runner 名称
    pub name: String,

    /// 状态
    pub status: RunnerStatus,

    /// 当前执行的任务数
    pub current_jobs: usize,

    /// 最后错误
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_error: Option<String>,

    /// 系统信息
    pub system: SystemInfo,

    /// 时间戳
    pub timestamp: DateTime<Utc>,
}

/// Runner 状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RunnerStatus {
    /// 在线
    Online,
    /// 活跃
    Active,
    /// 维护中
    Maintenance,
    /// 离线
    Offline,
}

/// 系统信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    /// CPU 使用率（0-100）
    pub cpu_usage_percent: f32,

    /// 内存使用率（0-100）
    pub memory_usage_percent: f32,

    /// 磁盘使用率（0-100）
    pub disk_usage_percent: f32,

    /// 可用内存（MB）
    pub available_memory_mb: u64,

    /// 可用磁盘（GB）
    pub available_disk_gb: f64,
}

/// Routing keys for RabbitMQ
pub struct RoutingKeys;

impl RoutingKeys {
    /// 构建任务路由
    pub const BUILD_TASK: &'static str = "build.task";

    /// 构建状态路由
    pub const BUILD_STATUS: &'static str = "build.status";

    /// 构建日志路由
    pub const BUILD_LOG: &'static str = "build.log";

    /// Runner 注册路由
    pub const RUNNER_REGISTER: &'static str = "runner.register";

    /// Runner 心跳路由
    pub const RUNNER_HEARTBEAT: &'static str = "runner.heartbeat";
}

/// Exchange names
pub struct Exchanges;

impl Exchanges {
    /// 构建交换机
    pub const BUILD: &'static str = "ops.build";

    /// Runner 交换机
    pub const RUNNER: &'static str = "ops.runner";
}

/// Queue types
pub struct QueueTypes;

impl QueueTypes {
    /// 死信队列后缀
    pub const DEAD_LETTER_SUFFIX: &'static str = ".dlq";

    /// 重试队列后缀
    pub const RETRY_SUFFIX: &'static str = ".retry";
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_log_level_default() {
        assert_eq!(LogLevel::default(), LogLevel::Info);
    }

    #[test]
    fn test_log_level_serialization() {
        assert_eq!(serde_json::to_string(&LogLevel::Debug).unwrap(), "\"debug\"");
        assert_eq!(serde_json::to_string(&LogLevel::Info).unwrap(), "\"info\"");
        assert_eq!(serde_json::to_string(&LogLevel::Warn).unwrap(), "\"warn\"");
        assert_eq!(serde_json::to_string(&LogLevel::Error).unwrap(), "\"error\"");
    }

    #[test]
    fn test_error_category_serialization() {
        let json = serde_json::to_string(&ErrorCategory::Network).unwrap();
        assert_eq!(json, "\"network\"");

        let json = serde_json::to_string(&ErrorCategory::Auth).unwrap();
        assert_eq!(json, "\"auth\"");
    }

    #[test]
    fn test_runner_status_serialization() {
        let statuses = vec![
            (RunnerStatus::Online, "online"),
            (RunnerStatus::Active, "active"),
            (RunnerStatus::Maintenance, "maintenance"),
            (RunnerStatus::Offline, "offline"),
        ];

        for (status, expected) in statuses {
            let json = serde_json::to_string(&status).unwrap();
            assert_eq!(json, format!("\"{}\"", expected));
        }
    }

    #[test]
    fn test_build_status_serialization() {
        let statuses = vec![
            (BuildStatus::Received, "received"),
            (BuildStatus::Preparing, "preparing"),
            (BuildStatus::Running, "running"),
            (BuildStatus::Succeeded, "succeeded"),
            (BuildStatus::Failed, "failed"),
            (BuildStatus::Timeout, "timeout"),
            (BuildStatus::Cancelled, "cancelled"),
        ];

        for (status, expected) in statuses {
            let json = serde_json::to_string(&status).unwrap();
            assert_eq!(json, format!("\"{}\"", expected));
        }
    }

    #[test]
    fn test_routing_keys_constants() {
        assert_eq!(RoutingKeys::BUILD_TASK, "build.task");
        assert_eq!(RoutingKeys::BUILD_STATUS, "build.status");
        assert_eq!(RoutingKeys::BUILD_LOG, "build.log");
        assert_eq!(RoutingKeys::RUNNER_REGISTER, "runner.register");
        assert_eq!(RoutingKeys::RUNNER_HEARTBEAT, "runner.heartbeat");
    }

    #[test]
    fn test_exchanges_constants() {
        assert_eq!(Exchanges::BUILD, "ops.build");
        assert_eq!(Exchanges::RUNNER, "ops.runner");
    }

    #[test]
    fn test_queue_types_constants() {
        assert_eq!(QueueTypes::DEAD_LETTER_SUFFIX, ".dlq");
        assert_eq!(QueueTypes::RETRY_SUFFIX, ".retry");
    }

    #[test]
    fn test_build_artifact() {
        let artifact = BuildArtifact {
            path: "/target/release/app".to_string(),
            name: "app".to_string(),
            artifact_type: "binary".to_string(),
            size: 1024000,
            sha256: "abc123".to_string(),
            version: "1.0.0".to_string(),
        };

        let json = serde_json::to_string(&artifact).unwrap();
        assert!(json.contains("\"size\":1024000"));
        assert!(json.contains("\"sha256\":\"abc123\""));

        let deserialized: BuildArtifact = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.size, 1024000);
    }
}
