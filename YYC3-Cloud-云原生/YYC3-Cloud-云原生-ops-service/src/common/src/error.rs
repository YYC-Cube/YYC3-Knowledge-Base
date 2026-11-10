//! 统一错误模型
//! 定义所有错误类型和错误响应格式
//!
//! 此模块提供的错误类型可被 ops-service 和 ops-runner 共享使用

/// 应用错误类型 - 简化版本，不依赖 Axum
/// ops-service 可以使用 AppError 包装为 HTTP 响应
#[derive(Debug, Clone, thiserror::Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(String),

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

    #[error("Network error: {0}")]
    NetworkError(String),

    #[error("IO error: {0}")]
    IoError(String),
}

impl AppError {
    /// 获取 HTTP 状态码（作为数字）
    pub fn status_code(&self) -> u16 {
        match self {
            AppError::Unauthorized => 401,
            AppError::Authentication(_) => 401,
            AppError::Forbidden => 403,
            AppError::NotFound(_) => 404,
            AppError::BadRequest(_) => 400,
            AppError::Validation(_) => 400,
            AppError::RateLimitExceeded => 429,
            AppError::Timeout(_) => 408,
            AppError::SshConnectionError(_)
            | AppError::SshAuthenticationError(_)
            | AppError::SshExecutionError(_)
            | AppError::Database(_)
            | AppError::Config(_)
            | AppError::Internal(_)
            | AppError::NetworkError(_)
            | AppError::IoError(_) => 500,
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
            AppError::NetworkError(msg) => format!("Network error: {}", msg),
            AppError::IoError(msg) => format!("IO error: {}", msg),
        }
    }

    /// 获取错误码
    pub fn code(&self) -> u16 {
        self.status_code()
    }

    // 便捷方法
    pub fn not_found(msg: &str) -> Self {
        AppError::NotFound(msg.to_string())
    }

    pub fn validation(msg: &str) -> Self {
        AppError::Validation(msg.to_string())
    }

    pub fn database(msg: &str) -> Self {
        AppError::Database(msg.to_string())
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

    pub fn network(msg: &str) -> Self {
        AppError::NetworkError(msg.to_string())
    }

    pub fn io_error(msg: &str) -> Self {
        AppError::IoError(msg.to_string())
    }
}

/// 结果类型别名
pub type Result<T> = std::result::Result<T, AppError>;

/// 从 String 转换为 AppError::Config
impl From<String> for AppError {
    fn from(s: String) -> Self {
        AppError::Config(s)
    }
}

/// 从 &str 转换为 AppError
impl From<&str> for AppError {
    fn from(s: &str) -> Self {
        AppError::Config(s.to_string())
    }
}

/// 从 std::io::Error 转换
impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        AppError::IoError(e.to_string())
    }
}

/// 错误响应 DTO
#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct ErrorResponse {
    pub error: ErrorDetail,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct ErrorDetail {
    pub code: u16,
    pub message: String,
    pub request_id: String,
}

impl ErrorResponse {
    pub fn from_app_error(error: &AppError) -> Self {
        Self {
            error: ErrorDetail {
                code: error.code(),
                message: error.user_message(),
                request_id: uuid::Uuid::new_v4().to_string(),
            },
        }
    }

    pub fn new(code: u16, message: String) -> Self {
        Self {
            error: ErrorDetail {
                code,
                message,
                request_id: uuid::Uuid::new_v4().to_string(),
            },
        }
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
        let error = AppError::Database("connection failed".to_string());
        let message = error.user_message();
        assert_eq!(message, "Database error occurred");
        assert!(!message.contains("connection"));
    }

    #[test]
    fn test_convenience_methods() {
        assert_eq!(AppError::not_found("test").code(), 404);
        assert_eq!(AppError::validation("test").code(), 400);
        assert_eq!(AppError::database("test").code(), 500);
        assert_eq!(AppError::authentication("test").code(), 401);
        assert_eq!(AppError::internal_error("test").code(), 500);
        assert_eq!(AppError::timeout("test").code(), 408);
        assert_eq!(AppError::network("test").code(), 500);
        assert_eq!(AppError::io_error("test").code(), 500);
    }

    #[test]
    fn test_error_response_from_app_error() {
        let app_error = AppError::NotFound("user not found".to_string());
        let error_response = ErrorResponse::from_app_error(&app_error);

        assert_eq!(error_response.error.code, 404);
        assert_eq!(error_response.error.message, "Resource not found: user not found");
        assert!(!error_response.error.request_id.is_empty());
    }

    #[test]
    fn test_error_response_new() {
        let error_response = ErrorResponse::new(400, "Bad request".to_string());

        assert_eq!(error_response.error.code, 400);
        assert_eq!(error_response.error.message, "Bad request");
        assert!(!error_response.error.request_id.is_empty());
    }

    #[test]
    fn test_string_conversion() {
        let error: AppError = "test error".into();
        assert!(matches!(error, AppError::Config(_)));
    }

    #[test]
    fn test_io_error_conversion() {
        let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
        let app_error: AppError = io_err.into();
        assert!(matches!(app_error, AppError::IoError(_)));
    }
}
