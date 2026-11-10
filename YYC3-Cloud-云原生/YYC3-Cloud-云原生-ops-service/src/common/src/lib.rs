//! Common types and utilities shared between ops-service and ops-runner

pub fn version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

// 导出所有模块
pub mod docker;
pub mod error;
pub mod execution;
pub mod messages;
pub mod ssh;

// 重新导出常用的类型和常量
pub use error::{AppError, ErrorDetail, ErrorResponse, Result as CommonResult};
pub use messages::{
    AuthInfo,
    BuildArtifact,
    BuildLogMessage,
    BuildParameters,
    BuildStatus,
    BuildStatusMessage,
    BuildStep,
    // 消息类型
    BuildTaskMessage,
    ErrorCategory,
    Exchanges,
    LogLevel,
    // 数据结构
    ProjectInfo,
    PublishTarget,
    QueueTypes,
    // 常量
    RoutingKeys,
    RunnerHeartbeatMessage,

    RunnerRegistrationMessage,
    RunnerStatus,

    StepStatus,
    StepStatusUpdate,
    // 枚举
    StepType,
    SystemInfo,
};

pub use execution::{
    ExecutionResult, ExecutionStatistics, FailureReason, FailureReasonStats, StepExecutionStatus,
    TaskExecutionStatus,
};

pub use ssh::{HostKeyVerification, SshAuth, SshConfig, SshConfigSettings, SshExecOptions};

pub use docker::{ContainerResult, DockerConfig, DockerResourceLimits, DockerSecurityConfig};
