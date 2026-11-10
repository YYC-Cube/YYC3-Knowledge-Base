//! Build job domain models
//! P2 阶段：构建作业系统

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::Json;
use uuid::Uuid;

use super::job::JobStatus;

/// 构建类型
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "build_type", rename_all = "snake_case")]
pub enum BuildType {
    /// Node.js 构建
    Node,
    /// Java 构建
    Java,
    /// Rust 构建
    Rust,
    /// 前端构建
    Frontend,
    /// 其他
    Other,
}

/// Runner 能力标签
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "runner_capability", rename_all = "snake_case")]
pub enum RunnerCapability {
    /// Node.js 环境
    Node,
    /// Java 环境
    Java,
    /// Rust 环境
    Rust,
    /// 前端构建（包含 Node.js + 额外工具）
    Frontend,
    /// Docker 支持
    Docker,
    /// 通用能力
    General,
}

/// 构建作业
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct BuildJob {
    pub id: Uuid,
    pub job_id: Uuid, // 关联到 Job 表

    // 代码来源
    pub repository: String,                 // 仓库地址
    pub branch: String,                     // 分支
    pub commit_hash: String,                // Commit hash
    pub commit_message: Option<String>,     // Commit 消息
    pub commit_author: Option<String>,      // Commit 作者
    pub commit_time: Option<DateTime<Utc>>, // Commit 时间

    // 构建类型与配置
    pub build_type: BuildType,
    pub build_parameters: Json<serde_json::Value>, // 构建参数（灵活配置）
    pub docker_image: Option<String>,              // 使用的 Docker 镜像
    pub runner_capability: RunnerCapability,       // 需要的 Runner 能力

    // 构建状态
    pub status: JobStatus,

    // 构建输出
    pub build_summary: Option<String>,  // 构建摘要
    pub build_log_path: Option<String>, // 构建日志存储路径

    // 产物信息
    pub has_artifacts: bool, // 是否有产物
    pub artifact_count: i32, // 产物数量

    // 审计字段
    pub triggered_by: Uuid, // 触发者
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,

    // 元数据
    pub tags: Json<Vec<String>>,
}

/// 创建构建作业请求
#[derive(Debug, Deserialize)]
pub struct CreateBuildJobRequest {
    pub name: String,
    pub description: Option<String>,
    pub repository: String,
    pub branch: String,
    pub commit_hash: String,
    pub commit_message: Option<String>,
    pub commit_author: Option<String>,
    pub build_type: BuildType,
    pub build_parameters: Option<serde_json::Value>,
    pub docker_image: Option<String>,
    pub runner_capability: RunnerCapability,
    pub timeout_secs: Option<i32>,
    #[serde(default)]
    pub tags: Vec<String>,
}

/// 构建步骤状态
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "step_status", rename_all = "snake_case")]
pub enum StepStatus {
    Pending,
    Running,
    Succeeded,
    Failed,
    Skipped,
}

/// 构建步骤
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct BuildStep {
    pub id: Uuid,
    pub build_job_id: Uuid,
    pub step_order: i32,   // 步骤顺序
    pub step_name: String, // 步骤名称
    pub step_type: String, // 步骤类型（clone/compile/test/package等）
    pub status: StepStatus,

    // 步骤执行信息
    pub command: Option<String>, // 执行的命令
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub duration_secs: Option<i64>,

    // 输出
    pub output_summary: Option<String>, // 输出摘要
    pub output_detail: Option<String>,  // 完整输出

    // 审计字段
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 构建产物
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct BuildArtifact {
    pub id: Uuid,
    pub build_job_id: Uuid,

    // 产物信息
    pub artifact_name: String,   // 产物名称
    pub artifact_type: String,   // 产物类型（binary/docker_image/archive等）
    pub artifact_path: String,   // 存储路径
    pub artifact_size: i64,      // 大小（字节）
    pub artifact_hash: String,   // Hash（SHA256）
    pub version: Option<String>, // 版本号

    // 产物元数据
    pub metadata: Json<serde_json::Value>, // 额外元数据

    // 安全信息
    pub scanned: bool,                      // 是否已扫描
    pub scan_result: Option<String>,        // 扫描结果摘要
    pub vulnerabilities_count: Option<i32>, // 漏洞数量

    // 访问控制
    pub is_public: bool,     // 是否公开
    pub download_count: i32, // 下载次数

    // 审计字段
    pub created_at: DateTime<Utc>,
    pub uploaded_by: Uuid, // 上传者
}

/// Runner 配置
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Runner {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,

    // Runner 能力
    pub capabilities: Json<Vec<RunnerCapability>>, // 支持的能力列表
    pub docker_supported: bool,                    // 是否支持 Docker

    // 资源限制
    pub max_concurrent_jobs: i32, // 最大并发任务数
    pub current_jobs: i32,        // 当前运行任务数

    // 状态
    pub status: String, // active/maintenance/disabled
    pub last_heartbeat: Option<DateTime<Utc>>,

    // 网络配置
    pub allowed_domains: Option<Vec<String>>, // 出站白名单域名
    pub allowed_ips: Option<Vec<String>>,     // 出站白名单IP段

    // 审计字段
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 创建 Runner 请求
#[derive(Debug, Deserialize)]
pub struct CreateRunnerRequest {
    pub name: String,
    pub description: Option<String>,
    pub capabilities: Vec<RunnerCapability>,
    pub docker_supported: bool,
    pub max_concurrent_jobs: i32,
    pub allowed_domains: Option<Vec<String>>,
    pub allowed_ips: Option<Vec<String>>,
}

/// 构建作业查询过滤器
#[derive(Debug, Deserialize)]
pub struct BuildJobListFilters {
    pub build_type: Option<BuildType>,
    pub status: Option<JobStatus>,
    pub triggered_by: Option<Uuid>,
    pub repository: Option<String>,
    pub branch: Option<String>,
    pub tags: Option<Vec<String>>,
    pub date_from: Option<DateTime<Utc>>,
    pub date_to: Option<DateTime<Utc>>,
}

/// 产物查询过滤器
#[derive(Debug, Deserialize)]
pub struct ArtifactListFilters {
    pub build_job_id: Option<Uuid>,
    pub artifact_type: Option<String>,
    pub version: Option<String>,
    pub is_public: Option<bool>,
    pub date_from: Option<DateTime<Utc>>,
    pub date_to: Option<DateTime<Utc>>,
}

/// 下载记录（审计用）
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ArtifactDownload {
    pub id: Uuid,
    pub artifact_id: Uuid,
    pub downloaded_by: Uuid,
    pub downloaded_at: DateTime<Utc>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
}

/// 构建作业摘要
#[derive(Debug, Serialize)]
pub struct BuildJobSummary {
    pub id: Uuid,
    pub job_id: Uuid,
    pub repository: String,
    pub branch: String,
    pub commit_hash: String,
    pub build_type: BuildType,
    pub status: JobStatus,
    pub artifact_count: i32,
    pub triggered_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub duration_secs: Option<i64>,
    pub tags: Vec<String>,
}

/// 构建产物响应
#[derive(Debug, Serialize)]
pub struct ArtifactResponse {
    #[serde(flatten)]
    pub artifact: BuildArtifact,
    pub build_job_info: BuildJobInfo,
}

/// 构建作业基本信息（用于产物关联）
#[derive(Debug, Serialize)]
pub struct BuildJobInfo {
    pub id: Uuid,
    pub repository: String,
    pub branch: String,
    pub commit_hash: String,
    pub build_type: BuildType,
    pub triggered_by: Uuid,
    pub created_at: DateTime<Utc>,
}
