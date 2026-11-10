//! 统一错误模型
//! 定义所有错误类型和错误响应格式

use axum::{
    http::StatusCode,
    response::{IntoResponse, Json, Response},
};
use serde::Serialize;
use thiserror::Error;

/// 结果类型别名
pub type Result<T> = std::result::Result<T, AppError>;

/// 应用错误类型
#[derive(Debug, Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Configuration error: {0}")]
    Config(String),

    #[error("Authentication failed")]
    Unauthorized,

    #[error("Authentication error: {0}")]
    Authentication(String),

    #[error("Access denied")]
    Forbidden,

    #[error("Resource not found: {0}")]
    NotFound(String),

    #[error("Invalid request: {0}")]
    BadRequest(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Rate limit exceeded")]
    RateLimitExceeded,

    #[error("Timeout: {0}")]
    Timeout(String),

    #[error("Internal server error: {0}")]
    Internal(String),

    #[error("SSH connection error: {0}")]
    SshConnectionError(String),

    #[error("SSH authentication failed: {0}")]
    SshAuthenticationError(String),

    #[error("SSH execution error: {0}")]
    SshExecutionError(String),
}

impl AppError {
    /// 获取 HTTP 状态码
    pub fn status_code(&self) -> StatusCode {
        match self {
            AppError::Unauthorized => StatusCode::UNAUTHORIZED,
            AppError::Authentication(_) => StatusCode::UNAUTHORIZED,
            AppError::Forbidden => StatusCode::FORBIDDEN,
            AppError::NotFound(_) => StatusCode::NOT_FOUND,
            AppError::BadRequest(_) => StatusCode::BAD_REQUEST,
            AppError::Validation(_) => StatusCode::BAD_REQUEST,
            AppError::RateLimitExceeded => StatusCode::TOO_MANY_REQUESTS,
            AppError::Timeout(_) => StatusCode::REQUEST_TIMEOUT,
            AppError::SshConnectionError(_)
            | AppError::SshAuthenticationError(_)
            | AppError::SshExecutionError(_)
            | AppError::Database(_)
            | AppError::Config(_)
            | AppError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    /// 获取用户友好的错误消息（不包含敏感信息）
    pub fn user_message(&self) -> String {
        match self {
            AppError::Unauthorized => "Authentication failed".to_string(),
            AppError::Authentication(msg) => msg.clone(),
            AppError::NotFound(msg) => format!("Resource not found: {}", msg),
            AppError::Forbidden => "Access denied".to_string(),
            AppError::BadRequest(msg) => msg.clone(),
            AppError::Validation(msg) => msg.clone(),
            AppError::RateLimitExceeded => "Rate limit exceeded".to_string(),
            AppError::Timeout(msg) => format!("Request timeout: {}", msg),
            AppError::SshConnectionError(_) => "SSH connection failed".to_string(),
            AppError::SshAuthenticationError(_) => "SSH authentication failed".to_string(),
            AppError::SshExecutionError(_) => "SSH command execution failed".to_string(),
            AppError::Database(_) => "Database error occurred".to_string(),
            AppError::Config(_) => "Configuration error".to_string(),
            AppError::Internal(msg) => format!("Internal server error: {}", msg),
        }
    }

    /// 获取错误码
    pub fn code(&self) -> u16 {
        self.status_code().as_u16()
    }

    // 便捷方法
    pub fn not_found(msg: &str) -> Self {
        AppError::NotFound(msg.to_string())
    }

    pub fn validation(msg: &str) -> Self {
        AppError::Validation(msg.to_string())
    }

    pub fn database(msg: &str) -> Self {
        AppError::Internal(format!("Database error: {}", msg))
    }

    pub fn authentication(msg: &str) -> Self {
        AppError::Authentication(msg.to_string())
    }

    pub fn internal_error(msg: &str) -> Self {
        AppError::Internal(msg.to_string())
    }

    pub fn timeout(msg: &str) -> Self {
        AppError::Timeout(msg.to_string())
    }

    /// 将错误转换为 SSH 失败原因分类（用于作业任务）
    pub fn to_ssh_failure_reason(&self) -> crate::models::job::FailureReason {
        match self {
            AppError::SshAuthenticationError(_) => crate::models::job::FailureReason::AuthFailed,
            AppError::SshConnectionError(msg)
                if msg.contains("超时") || msg.contains("timeout") =>
            {
                crate::models::job::FailureReason::ConnectionTimeout
            }
            AppError::Timeout(_) => crate::models::job::FailureReason::ConnectionTimeout,
            AppError::SshConnectionError(_) => crate::models::job::FailureReason::NetworkError,
            AppError::SshExecutionError(_) => crate::models::job::FailureReason::CommandFailed,
            _ => crate::models::job::FailureReason::Unknown,
        }
    }
}

/// 错误响应 DTO
#[derive(Serialize)]
pub struct ErrorResponse {
    pub error: ErrorDetail,
}

#[derive(Serialize)]
pub struct ErrorDetail {
    pub code: u16,
    pub message: String,
    pub request_id: String,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = self.status_code();
        let request_id = uuid::Uuid::new_v4().to_string();

        let error_response = ErrorResponse {
            error: ErrorDetail {
                code: self.code(),
                message: self.user_message(),
                request_id,
            },
        };

        // 记录错误日志
        tracing::error!(
            code = self.code(),
            message = %self,
            request_id = %error_response.error.request_id,
            "Application error"
        );

        (status, Json(error_response)).into_response()
    }
}

/// 从 String 转换为 AppError::Config
impl From<String> for AppError {
    fn from(s: String) -> Self {
        AppError::Config(s)
    }
}

/// 从 config::ConfigError 转换
impl From<config::ConfigError> for AppError {
    fn from(e: config::ConfigError) -> Self {
        AppError::Config(e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_codes() {
        assert_eq!(AppError::Unauthorized.code(), 401);
        assert_eq!(AppError::Forbidden.code(), 403);
        assert_eq!(AppError::NotFound("test".to_string()).code(), 404);
        assert_eq!(AppError::BadRequest("test".to_string()).code(), 400);
        assert_eq!(AppError::RateLimitExceeded.code(), 429);
    }

    #[test]
    fn test_user_message_no_sensitive_info() {
        let error = AppError::Database(sqlx::Error::RowNotFound);
        let message = error.user_message();
        assert_eq!(message, "Database error occurred");
        assert!(!message.contains("sqlx"));
    }
}

/// 从 ConcurrencyError 转换
impl From<crate::concurrency::ConcurrencyError> for AppError {
    fn from(e: crate::concurrency::ConcurrencyError) -> Self {
        match e {
            crate::concurrency::ConcurrencyError::Rejected { .. }
            | crate::concurrency::ConcurrencyError::LimitExceeded { .. } => {
                AppError::RateLimitExceeded
            }
            crate::concurrency::ConcurrencyError::QueueFull { .. } => {
                AppError::Internal("Concurrency queue is full".to_string())
            }
            crate::concurrency::ConcurrencyError::AcquireTimeout { .. } => {
                AppError::Timeout("Acquiring concurrency permit timed out".to_string())
            }
            crate::concurrency::ConcurrencyError::Closed => {
                AppError::Internal("Concurrency controller closed".to_string())
            }
        }
    }
}
