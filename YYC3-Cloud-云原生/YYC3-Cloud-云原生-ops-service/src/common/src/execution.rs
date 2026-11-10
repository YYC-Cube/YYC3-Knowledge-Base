//! 统一执行结果模型
//!
//! 定义命令/脚本执行的通用结果类型，可被 SSH 执行器和 Runner 共享

use serde::{Deserialize, Serialize};

/// 执行结果 - 通用的命令执行结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionResult {
    /// 退出码
    pub exit_code: i32,

    /// 标准输出
    pub stdout: String,

    /// 标准错误
    pub stderr: String,

    /// 执行时长（秒）
    pub duration_secs: f64,

    /// 是否超时
    pub timed_out: bool,
}

impl ExecutionResult {
    /// 创建成功结果
    pub fn success(stdout: String, duration_secs: f64) -> Self {
        Self {
            exit_code: 0,
            stdout,
            stderr: String::new(),
            duration_secs,
            timed_out: false,
        }
    }

    /// 创建失败结果
    pub fn failure(exit_code: i32, stdout: String, stderr: String, duration_secs: f64) -> Self {
        Self {
            exit_code,
            stdout,
            stderr,
            duration_secs,
            timed_out: false,
        }
    }

    /// 创建超时结果
    pub fn timeout(duration_secs: f64) -> Self {
        Self {
            exit_code: 124, // timeout 退出码
            stdout: String::new(),
            stderr: "Execution timed out".to_string(),
            duration_secs,
            timed_out: true,
        }
    }

    /// 判断是否成功
    pub fn is_success(&self) -> bool {
        self.exit_code == 0 && !self.timed_out
    }

    /// 判断是否失败
    pub fn is_failure(&self) -> bool {
        !self.is_success()
    }

    /// 获取完整输出（stdout + stderr）
    pub fn full_output(&self) -> String {
        format!("{}\n{}", self.stdout, self.stderr)
            .trim()
            .to_string()
    }

    /// 获取输出摘要（限制长度）
    pub fn output_summary(&self, max_len: usize) -> String {
        let full = self.full_output();
        if full.len() <= max_len {
            full
        } else {
            format!("{}...", &full[..max_len])
        }
    }
}

impl Default for ExecutionResult {
    fn default() -> Self {
        Self {
            exit_code: -1,
            stdout: String::new(),
            stderr: String::new(),
            duration_secs: 0.0,
            timed_out: false,
        }
    }
}

/// 步骤执行状态（用于 Runner）
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum StepExecutionStatus {
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

/// 任务执行状态（用于作业/任务）
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TaskExecutionStatus {
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

/// 失败原因分类
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
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

/// 作业执行统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionStatistics {
    /// 总任务数
    pub total_tasks: i32,
    /// 成功任务数
    pub succeeded_tasks: i32,
    /// 失败任务数
    pub failed_tasks: i32,
    /// 超时任务数
    pub timeout_tasks: i32,
    /// 取消任务数
    pub cancelled_tasks: i32,
    /// 待执行任务数
    pub pending_tasks: i32,
    /// 执行中任务数
    pub running_tasks: i32,
    /// 成功率（0.0 - 1.0）
    pub success_rate: f64,
    /// 平均执行时长（秒）
    pub avg_duration_secs: Option<f64>,
}

impl ExecutionStatistics {
    /// 创建空统计
    pub fn new() -> Self {
        Self {
            total_tasks: 0,
            succeeded_tasks: 0,
            failed_tasks: 0,
            timeout_tasks: 0,
            cancelled_tasks: 0,
            pending_tasks: 0,
            running_tasks: 0,
            success_rate: 0.0,
            avg_duration_secs: None,
        }
    }

    /// 计算成功率
    pub fn calculate_success_rate(&mut self) {
        if self.total_tasks > 0 {
            self.success_rate = self.succeeded_tasks as f64 / self.total_tasks as f64;
        }
    }

    /// 检查是否全部完成
    pub fn is_completed(&self) -> bool {
        self.pending_tasks == 0 && self.running_tasks == 0
    }
}

impl Default for ExecutionStatistics {
    fn default() -> Self {
        Self::new()
    }
}

/// 失败原因统计
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
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

impl FailureReasonStats {
    /// 获取总失败数
    pub fn total(&self) -> i32 {
        self.network_error
            + self.auth_failed
            + self.connection_timeout
            + self.handshake_timeout
            + self.command_timeout
            + self.command_failed
            + self.unknown
    }

    /// 记录一个失败原因
    pub fn record(&mut self, reason: &FailureReason) {
        match reason {
            FailureReason::NetworkError => self.network_error += 1,
            FailureReason::AuthFailed => self.auth_failed += 1,
            FailureReason::ConnectionTimeout => self.connection_timeout += 1,
            FailureReason::HandshakeTimeout => self.handshake_timeout += 1,
            FailureReason::CommandTimeout => self.command_timeout += 1,
            FailureReason::CommandFailed => self.command_failed += 1,
            FailureReason::Unknown => self.unknown += 1,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_execution_result_success() {
        let result = ExecutionResult::success("output".to_string(), 1.5);
        assert!(result.is_success());
        assert!(!result.is_failure());
        assert_eq!(result.exit_code, 0);
        assert_eq!(result.stdout, "output");
    }

    #[test]
    fn test_execution_result_failure() {
        let result = ExecutionResult::failure(1, "stdout".to_string(), "stderr".to_string(), 2.0);
        assert!(result.is_failure());
        assert!(!result.is_success());
        assert_eq!(result.exit_code, 1);
    }

    #[test]
    fn test_execution_result_timeout() {
        let result = ExecutionResult::timeout(30.0);
        assert!(result.is_failure());
        assert!(result.timed_out);
        assert_eq!(result.exit_code, 124);
    }

    #[test]
    fn test_execution_result_full_output() {
        let result = ExecutionResult {
            exit_code: 0,
            stdout: "line1\nline2".to_string(),
            stderr: "error".to_string(),
            duration_secs: 1.0,
            timed_out: false,
        };

        let full = result.full_output();
        assert!(full.contains("line1"));
        assert!(full.contains("error"));
    }

    #[test]
    fn test_execution_result_output_summary() {
        let long_output = "a".repeat(200);
        let result = ExecutionResult::success(long_output.clone(), 1.0);

        let summary = result.output_summary(50);
        assert_eq!(summary.len(), 53); // 50 + "..."
        assert!(summary.ends_with("..."));
    }

    #[test]
    fn test_execution_result_default() {
        let result = ExecutionResult::default();
        assert_eq!(result.exit_code, -1);
        assert!(result.stdout.is_empty());
        assert!(result.stderr.is_empty());
    }

    #[test]
    fn test_step_execution_status_serialization() {
        let statuses = vec![
            (StepExecutionStatus::Pending, "pending"),
            (StepExecutionStatus::Running, "running"),
            (StepExecutionStatus::Succeeded, "succeeded"),
            (StepExecutionStatus::Failed, "failed"),
            (StepExecutionStatus::Timeout, "timeout"),
            (StepExecutionStatus::Skipped, "skipped"),
        ];

        for (status, expected) in statuses {
            let json = serde_json::to_string(&status).unwrap();
            assert_eq!(json, format!("\"{}\"", expected));
        }
    }

    #[test]
    fn test_task_execution_status_serialization() {
        let statuses = vec![
            (TaskExecutionStatus::Pending, "pending"),
            (TaskExecutionStatus::Running, "running"),
            (TaskExecutionStatus::Succeeded, "succeeded"),
            (TaskExecutionStatus::Failed, "failed"),
            (TaskExecutionStatus::Timeout, "timeout"),
            (TaskExecutionStatus::Cancelled, "cancelled"),
        ];

        for (status, expected) in statuses {
            let json = serde_json::to_string(&status).unwrap();
            assert_eq!(json, format!("\"{}\"", expected));
        }
    }

    #[test]
    fn test_failure_reason_serialization() {
        let reasons = vec![
            (FailureReason::NetworkError, "network_error"),
            (FailureReason::AuthFailed, "auth_failed"),
            (FailureReason::ConnectionTimeout, "connection_timeout"),
            (FailureReason::HandshakeTimeout, "handshake_timeout"),
            (FailureReason::CommandTimeout, "command_timeout"),
            (FailureReason::CommandFailed, "command_failed"),
            (FailureReason::Unknown, "unknown"),
        ];

        for (reason, expected) in reasons {
            let json = serde_json::to_string(&reason).unwrap();
            assert_eq!(json, format!("\"{}\"", expected));
        }
    }

    #[test]
    fn test_execution_statistics_new() {
        let stats = ExecutionStatistics::new();
        assert_eq!(stats.total_tasks, 0);
        assert_eq!(stats.success_rate, 0.0);
    }

    #[test]
    fn test_execution_statistics_calculate_success_rate() {
        let mut stats = ExecutionStatistics {
            total_tasks: 10,
            succeeded_tasks: 8,
            failed_tasks: 2,
            timeout_tasks: 0,
            cancelled_tasks: 0,
            pending_tasks: 0,
            running_tasks: 0,
            success_rate: 0.0,
            avg_duration_secs: None,
        };

        stats.calculate_success_rate();
        assert_eq!(stats.success_rate, 0.8);
    }

    #[test]
    fn test_execution_statistics_is_completed() {
        let stats = ExecutionStatistics {
            total_tasks: 10,
            succeeded_tasks: 10,
            failed_tasks: 0,
            timeout_tasks: 0,
            cancelled_tasks: 0,
            pending_tasks: 0,
            running_tasks: 0,
            success_rate: 1.0,
            avg_duration_secs: None,
        };

        assert!(stats.is_completed());
    }

    #[test]
    fn test_execution_statistics_not_completed() {
        let stats = ExecutionStatistics {
            total_tasks: 10,
            succeeded_tasks: 5,
            failed_tasks: 2,
            timeout_tasks: 0,
            cancelled_tasks: 0,
            pending_tasks: 2,
            running_tasks: 1,
            success_rate: 0.5,
            avg_duration_secs: None,
        };

        assert!(!stats.is_completed());
    }

    #[test]
    fn test_failure_reason_stats_total() {
        let mut stats = FailureReasonStats::default();
        stats.network_error = 5;
        stats.auth_failed = 2;

        assert_eq!(stats.total(), 7);
    }

    #[test]
    fn test_failure_reason_stats_record() {
        let mut stats = FailureReasonStats::default();
        stats.record(&FailureReason::NetworkError);
        stats.record(&FailureReason::AuthFailed);
        stats.record(&FailureReason::NetworkError);

        assert_eq!(stats.network_error, 2);
        assert_eq!(stats.auth_failed, 1);
        assert_eq!(stats.total(), 3);
    }
}
