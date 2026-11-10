//! Approval workflow models
//! P3 阶段：审批流系统

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::Json;
use uuid::Uuid;

/// 审批状态
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "approval_status", rename_all = "snake_case")]
pub enum ApprovalStatus {
    /// 待审批
    Pending,
    /// 已批准
    Approved,
    /// 已拒绝
    Rejected,
    /// 已取消
    Cancelled,
    /// 已超时
    Timeout,
}

/// 审批触发条件
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "approval_trigger", rename_all = "snake_case")]
pub enum ApprovalTrigger {
    /// 生产环境
    ProductionEnvironment,
    /// 关键分组
    CriticalGroup,
    /// 高风险命令类型
    HighRiskCommand,
    /// 目标数量超过阈值
    TargetCountThreshold,
    /// 自定义规则
    CustomRule,
}

/// 审批请求
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ApprovalRequest {
    pub id: Uuid,
    pub job_id: Option<Uuid>,        // 关联的作业ID
    pub request_type: String,        // 请求类型（job_execution/build_deployment等）
    pub title: String,               // 审批标题
    pub description: Option<String>, // 审批描述

    // 触发条件
    pub triggers: Json<Vec<ApprovalTrigger>>, // 触发条件列表

    // 审批配置
    pub required_approvers: i32,         // 需要的审批人数
    pub approval_group_id: Option<Uuid>, // 审批组ID（如果使用组审批）

    // 状态
    pub status: ApprovalStatus,
    pub current_approvals: i32, // 当前已批准数量

    // 申请信息
    pub requested_by: Uuid, // 申请人
    pub requested_at: DateTime<Utc>,

    // 审批窗口
    pub timeout_mins: Option<i32>,         // 超时时间（分钟）
    pub expires_at: Option<DateTime<Utc>>, // 过期时间

    // 审计字段
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,

    // 元数据
    pub metadata: Json<serde_json::Value>, // 额外元数据（环境、风险等级等）
}

/// 审批记录
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ApprovalRecord {
    pub id: Uuid,
    pub approval_request_id: Uuid,
    pub approver_id: Uuid,     // 审批人ID
    pub approver_name: String, // 审批人姓名（冗余，便于查询）

    // 审批决策
    pub decision: ApprovalStatus, // 批准/拒绝
    pub comment: Option<String>,  // 审批意见

    // 时间戳
    pub approved_at: DateTime<Utc>,

    // 审计字段
    pub created_at: DateTime<Utc>,
}

/// 审批组
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ApprovalGroup {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,

    // 成员配置
    pub member_ids: Json<Vec<Uuid>>, // 审批组成员ID列表
    pub required_approvals: i32,     // 需要的审批数量

    // 适用范围
    pub scope: Option<String>, // 作用域（环境/分组/命令类型等）
    pub priority: i32,         // 优先级（数字越大优先级越高）

    // 状态
    pub is_active: bool, // 是否启用

    // 审计字段
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 作业模板
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct JobTemplate {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub template_type: String, // 模板类型（command/script/build）

    // 模板内容
    pub template_content: String, // 模板内容（支持参数化）
    pub parameters_schema: Json<serde_json::Value>, // 参数定义（JSON Schema）

    // 默认配置
    pub default_timeout_secs: Option<i32>,
    pub default_retry_times: Option<i32>,
    pub default_concurrent_limit: Option<i32>,

    // 风险等级
    pub risk_level: String,      // 风险等级（low/medium/high/critical）
    pub requires_approval: bool, // 是否需要审批

    // 适用范围
    pub applicable_environments: Json<Vec<String>>, // 适用环境
    pub applicable_groups: Json<Vec<Uuid>>,         // 适用分组

    // 状态
    pub is_active: bool,

    // 审计字段
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 创建审批请求
#[derive(Debug, Deserialize, validator::Validate)]
pub struct CreateApprovalRequestRequest {
    pub job_id: Option<Uuid>,
    pub request_type: String,
    pub title: String,
    pub description: Option<String>,
    pub triggers: Vec<ApprovalTrigger>,
    pub required_approvers: i32,
    pub approval_group_id: Option<Uuid>,
    pub timeout_mins: Option<i32>,
    pub metadata: serde_json::Value,
}

/// 审批决策请求
#[derive(Debug, Deserialize, validator::Validate)]
pub struct ApproveRequestRequest {
    pub decision: ApprovalStatus,
    pub comment: Option<String>,
}

/// 审批查询过滤器
#[derive(Debug, Deserialize, validator::Validate)]
pub struct ApprovalListFilters {
    pub status: Option<ApprovalStatus>,
    pub requested_by: Option<Uuid>,
    pub date_from: Option<DateTime<Utc>>,
    pub date_to: Option<DateTime<Utc>>,
}

/// 创建作业模板请求
#[derive(Debug, Deserialize, validator::Validate)]
pub struct CreateJobTemplateRequest {
    pub name: String,
    pub description: Option<String>,
    pub template_type: String,
    pub template_content: String,
    pub parameters_schema: serde_json::Value,
    pub default_timeout_secs: Option<i32>,
    pub default_retry_times: Option<i32>,
    pub default_concurrent_limit: Option<i32>,
    pub risk_level: String,
    pub requires_approval: bool,
    pub applicable_environments: Vec<String>,
    pub applicable_groups: Vec<Uuid>,
}

/// 执行模板化作业请求
#[derive(Debug, Deserialize, validator::Validate)]
pub struct ExecuteTemplateJobRequest {
    pub template_id: Uuid,
    pub parameters: serde_json::Value,
    pub target_hosts: Vec<Uuid>,
    pub target_groups: Vec<Uuid>,
    #[serde(default)]
    pub tags: Vec<String>,
}

/// 更新作业模板请求
#[derive(Debug, Deserialize, validator::Validate)]
pub struct UpdateJobTemplateRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub template_content: Option<String>,
    pub parameters_schema: Option<serde_json::Value>,
    pub default_timeout_secs: Option<i32>,
    pub default_retry_times: Option<i32>,
    pub default_concurrent_limit: Option<i32>,
    pub risk_level: Option<String>,
    pub requires_approval: Option<bool>,
    pub applicable_environments: Option<Vec<String>>,
    pub applicable_groups: Option<Vec<Uuid>>,
}

/// 创建审批组请求
#[derive(Debug, Deserialize, validator::Validate)]
pub struct CreateApprovalGroupRequest {
    pub name: String,
    pub description: Option<String>,
    pub member_ids: Vec<Uuid>,
    pub required_approvals: i32,
    pub scope: Option<String>,
    pub priority: Option<i32>,
}

/// 审批统计
#[derive(Debug, Serialize)]
pub struct ApprovalStatistics {
    pub total_requests: i64,
    pub pending_requests: i64,
    pub approved_requests: i64,
    pub rejected_requests: i64,
    pub timeout_requests: i64,
    pub avg_approval_time_mins: Option<f64>,
}
