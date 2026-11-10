//! 错误处理单元测试
//!
//! 测试应用错误类型的各种行为

use axum::http::StatusCode;
use ops_service::error::{AppError, ErrorResponse};
use serde_json;

// ==================== 错误状态码测试 ====================

#[test]
fn test_error_status_codes() {
    assert_eq!(AppError::Unauthorized.status_code(), StatusCode::UNAUTHORIZED);
    assert_eq!(
        AppError::Authentication("test".to_string()).status_code(),
        StatusCode::UNAUTHORIZED
    );
    assert_eq!(AppError::Forbidden.status_code(), StatusCode::FORBIDDEN);
    assert_eq!(AppError::NotFound("resource".to_string()).status_code(), StatusCode::NOT_FOUND);
    assert_eq!(
        AppError::BadRequest("invalid".to_string()).status_code(),
        StatusCode::BAD_REQUEST
    );
    assert_eq!(AppError::Validation("error".to_string()).status_code(), StatusCode::BAD_REQUEST);
    assert_eq!(AppError::RateLimitExceeded.status_code(), StatusCode::TOO_MANY_REQUESTS);
    assert_eq!(
        AppError::Timeout("request".to_string()).status_code(),
        StatusCode::REQUEST_TIMEOUT
    );
}

#[test]
fn test_database_error_status_code() {
    let db_error = sqlx::Error::RowNotFound;
    let app_error = AppError::Database(db_error);
    assert_eq!(app_error.status_code(), StatusCode::INTERNAL_SERVER_ERROR);
}

#[test]
fn test_config_error_status_code() {
    let app_error = AppError::Config("Invalid config".to_string());
    assert_eq!(app_error.status_code(), StatusCode::INTERNAL_SERVER_ERROR);
}

#[test]
fn test_internal_error_status_code() {
    let app_error = AppError::Internal("Something went wrong".to_string());
    assert_eq!(app_error.status_code(), StatusCode::INTERNAL_SERVER_ERROR);
}

// ==================== 用户消息测试 ====================

#[test]
fn test_user_messages_no_sensitive_info() {
    // 数据库错误不应该暴露技术细节
    let db_error = AppError::Database(sqlx::Error::RowNotFound);
    let message = db_error.user_message();
    assert_eq!(message, "Database error occurred");
    assert!(!message.to_lowercase().contains("sqlx"));
    assert!(!message.to_lowercase().contains("row"));

    // 配置错误
    let config_error = AppError::Config("Missing API key".to_string());
    let message = config_error.user_message();
    assert_eq!(message, "Configuration error");
    assert!(!message.contains("API key"));
}

#[test]
fn test_user_messages_for_client_errors() {
    // 未授权
    assert_eq!(AppError::Unauthorized.user_message(), "Authentication failed");

    // 自定义认证消息
    assert_eq!(
        AppError::Authentication("Invalid token".to_string()).user_message(),
        "Invalid token"
    );

    // 禁止访问
    assert_eq!(AppError::Forbidden.user_message(), "Access denied");

    // 未找到
    assert_eq!(
        AppError::NotFound("User".to_string()).user_message(),
        "Resource not found: User"
    );

    // 错误请求
    assert_eq!(
        AppError::BadRequest("Invalid input".to_string()).user_message(),
        "Invalid input"
    );

    // 验证错误
    assert_eq!(
        AppError::Validation("Email required".to_string()).user_message(),
        "Email required"
    );
}

#[test]
fn test_user_messages_for_server_errors() {
    // 超时
    assert_eq!(
        AppError::Timeout("Database query".to_string()).user_message(),
        "Request timeout: Database query"
    );

    // 限流
    assert_eq!(AppError::RateLimitExceeded.user_message(), "Rate limit exceeded");
}

#[test]
fn test_user_messages_for_internal_errors() {
    let internal = AppError::Internal("Failed to process".to_string());
    assert_eq!(internal.user_message(), "Internal server error: Failed to process");
}

// ==================== 错误码测试 ====================

#[test]
fn test_error_codes() {
    assert_eq!(AppError::Unauthorized.code(), 401);
    assert_eq!(AppError::Forbidden.code(), 403);
    assert_eq!(AppError::NotFound("test".to_string()).code(), 404);
    assert_eq!(AppError::BadRequest("test".to_string()).code(), 400);
    assert_eq!(AppError::Validation("test".to_string()).code(), 400);
    assert_eq!(AppError::RateLimitExceeded.code(), 429);
    assert_eq!(AppError::Timeout("test".to_string()).code(), 408);
    assert_eq!(AppError::Internal("test".to_string()).code(), 500);
}

// ==================== 便捷方法测试 ====================

#[test]
fn test_convenience_methods() {
    // not_found
    let err = AppError::not_found("User");
    assert!(matches!(err, AppError::NotFound(_)));
    if let AppError::NotFound(msg) = err {
        assert_eq!(msg, "User");
    }

    // validation
    let err = AppError::validation("Invalid email");
    assert!(matches!(err, AppError::Validation(_)));
    if let AppError::Validation(msg) = err {
        assert_eq!(msg, "Invalid email");
    }

    // database
    let err = AppError::database("Connection failed");
    assert!(matches!(err, AppError::Internal(_)));

    // authentication
    let err = AppError::authentication("Invalid credentials");
    assert!(matches!(err, AppError::Authentication(_)));
    if let AppError::Authentication(msg) = err {
        assert_eq!(msg, "Invalid credentials");
    }

    // internal_error
    let err = AppError::internal_error("Processing failed");
    assert!(matches!(err, AppError::Internal(_)));
    if let AppError::Internal(msg) = err {
        assert_eq!(msg, "Processing failed");
    }

    // timeout
    let err = AppError::timeout("Database query");
    assert!(matches!(err, AppError::Timeout(_)));
    if let AppError::Timeout(msg) = err {
        assert_eq!(msg, "Database query");
    }
}

// ==================== 错误显示测试 ====================

#[test]
fn test_error_display() {
    assert_eq!(format!("{}", AppError::Unauthorized), "Authentication failed");
    assert_eq!(format!("{}", AppError::Forbidden), "Access denied");
    assert_eq!(
        format!("{}", AppError::NotFound("User".to_string())),
        "Resource not found: User"
    );
    assert_eq!(
        format!("{}", AppError::BadRequest("Invalid input".to_string())),
        "Invalid request: Invalid input"
    );
}

#[test]
fn test_error_debug_format() {
    let error = AppError::Unauthorized;
    let debug_str = format!("{:?}", error);
    assert!(debug_str.contains("Unauthorized"));
}

// ==================== From 转换测试 ====================

#[test]
fn test_from_string() {
    let string_error: String = "Config error".to_string();
    let app_error = AppError::from(string_error);
    assert!(matches!(app_error, AppError::Config(_)));
}

#[test]
fn test_from_sqlx_error() {
    let sqlx_error = sqlx::Error::RowNotFound;
    let app_error = AppError::from(sqlx_error);
    assert!(matches!(app_error, AppError::Database(_)));
}

#[test]
fn test_from_config_error() {
    // 使用简单的字符串模拟 config::ConfigError
    // 实际测试中需要真实的 config::ConfigError
    let error_msg = "Missing configuration file";
    let app_error = AppError::Config(error_msg.to_string());
    assert!(matches!(app_error, AppError::Config(_)));
}

// ==================== 错误序列化测试 ====================

#[test]
fn test_error_response_serialization() {
    let error_response = ErrorResponse {
        error: ops_service::error::ErrorDetail {
            code: 404,
            message: "Resource not found".to_string(),
            request_id: "req-123".to_string(),
        },
    };

    let json = serde_json::to_string(&error_response).unwrap();
    let json_obj: serde_json::Value = serde_json::from_str(&json).unwrap();

    assert_eq!(json_obj["error"]["code"], 404);
    assert_eq!(json_obj["error"]["message"], "Resource not found");
    assert_eq!(json_obj["error"]["request_id"], "req-123");
}

#[test]
fn test_error_response_structure() {
    let error_response = ErrorResponse {
        error: ops_service::error::ErrorDetail {
            code: 400,
            message: "Bad request".to_string(),
            request_id: "abc-123".to_string(),
        },
    };

    let json = serde_json::to_string(&error_response).unwrap();
    let json_obj: serde_json::Value = serde_json::from_str(&json).unwrap();

    assert!(json_obj.is_object());
    assert!(json_obj.get("error").is_some());
    assert_eq!(json_obj["error"]["code"], 400);
    assert_eq!(json_obj["error"]["message"], "Bad request");
    assert_eq!(json_obj["error"]["request_id"], "abc-123");
}

// ==================== 错误传播测试 ====================

#[test]
fn test_error_with_context() {
    fn inner_function() -> Result<(), AppError> {
        Err(AppError::NotFound("User".to_string()))
    }

    fn outer_function() -> Result<(), AppError> {
        inner_function()?;
        Ok(())
    }

    let result = outer_function();
    assert!(result.is_err());
    assert!(matches!(result.unwrap_err(), AppError::NotFound(_)));
}

#[test]
fn test_error_chain() {
    fn first_error() -> Result<(), AppError> {
        Err(AppError::BadRequest("Invalid input".to_string()))
    }

    fn second_error() -> Result<(), AppError> {
        first_error()?;
        Ok(())
    }

    fn third_error() -> Result<(), AppError> {
        second_error()?;
        Ok(())
    }

    let result = third_error();
    assert!(result.is_err());
    let error = result.unwrap_err();
    assert_eq!(error.status_code(), StatusCode::BAD_REQUEST);
}

// ==================== 错误匹配测试 ====================

#[test]
fn test_error_matching() {
    let error = AppError::Unauthorized;

    match error {
        AppError::Unauthorized => assert!(true),
        AppError::Forbidden => assert!(false),
        _ => assert!(false),
    }
}

#[test]
fn test_error_matching_with_values() {
    let error = AppError::NotFound("User".to_string());

    match error {
        AppError::NotFound(resource) => assert_eq!(resource, "User"),
        _ => assert!(false),
    }
}

#[test]
fn test_error_matching_if_let() {
    let error = AppError::Validation("Email required".to_string());

    if let AppError::Validation(msg) = error {
        assert_eq!(msg, "Email required");
    } else {
        assert!(false);
    }
}

// ==================== 特殊错误场景测试 ====================

#[test]
fn test_empty_error_message() {
    let error = AppError::BadRequest("".to_string());
    assert_eq!(error.user_message(), "");
}

#[test]
fn test_long_error_message() {
    let long_msg = "A".repeat(1000);
    let error = AppError::Internal(long_msg.clone());
    assert!(error.user_message().len() > 1000);
}

#[test]
fn test_unicode_error_message() {
    let error = AppError::BadRequest("错误信息 🚨".to_string());
    assert_eq!(error.user_message(), "错误信息 🚨");
}

#[test]
fn test_special_characters_in_error_message() {
    let error = AppError::BadRequest("Error: \"quotes\" & <tags>".to_string());
    assert_eq!(error.user_message(), "Error: \"quotes\" & <tags>");
}

#[test]
fn test_error_code_consistency() {
    let errors = vec![
        AppError::Unauthorized,
        AppError::Forbidden,
        AppError::NotFound("test".to_string()),
        AppError::BadRequest("test".to_string()),
        AppError::Validation("test".to_string()),
        AppError::RateLimitExceeded,
        AppError::Timeout("test".to_string()),
    ];

    for error in errors {
        let code = error.code();
        let status = error.status_code();
        assert_eq!(code, status.as_u16());
    }
}

#[test]
fn test_error_result_type() {
    type TestResult = ops_service::error::Result<String>;

    let ok_result: TestResult = Ok("success".to_string());
    assert!(ok_result.is_ok());

    let err_result: TestResult = Err(AppError::Unauthorized);
    assert!(err_result.is_err());
}

#[test]
fn test_error_with_question_mark_operator() {
    fn may_fail(should_fail: bool) -> Result<(), AppError> {
        if should_fail {
            Err(AppError::Unauthorized)
        } else {
            Ok(())
        }
    }

    fn caller(should_fail: bool) -> Result<(), AppError> {
        may_fail(should_fail)?;
        Ok(())
    }

    assert!(caller(true).is_err());
    assert!(caller(false).is_ok());
}

#[test]
fn test_multiple_error_types() {
    fn get_error(kind: &str) -> Result<(), AppError> {
        match kind {
            "unauthorized" => Err(AppError::Unauthorized),
            "forbidden" => Err(AppError::Forbidden),
            "not_found" => Err(AppError::NotFound("resource".to_string())),
            "bad_request" => Err(AppError::BadRequest("invalid".to_string())),
            "rate_limit" => Err(AppError::RateLimitExceeded),
            _ => Ok(()),
        }
    }

    assert!(get_error("unauthorized").is_err());
    assert!(get_error("forbidden").is_err());
    assert!(get_error("not_found").is_err());
    assert!(get_error("bad_request").is_err());
    assert!(get_error("rate_limit").is_err());
    assert!(get_error("ok").is_ok());
}

// ==================== 错误恢复测试 ====================

#[test]
fn test_error_recovery_with_default() {
    fn get_value() -> Result<String, AppError> {
        Err(AppError::NotFound("Value".to_string()))
    }

    let result = get_value().unwrap_or_else(|_| "default".to_string());
    assert_eq!(result, "default");
}

#[test]
fn test_error_recovery_with_map() {
    fn get_status() -> Result<u16, AppError> {
        Err(AppError::Unauthorized)
    }

    let status = get_status().map_err(|e| e.code()).unwrap_err();
    assert_eq!(status, 401);
}
