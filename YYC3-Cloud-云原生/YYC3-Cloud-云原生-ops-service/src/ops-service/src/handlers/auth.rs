//! 认证相关的 HTTP 处理器

use crate::{
    auth::middleware::AuthContext, error::AppError, middleware::AppState, models::auth::*,
    services::audit_service::AuditAction,
};
use axum::{extract::State, http::HeaderMap, response::IntoResponse, Json};
use serde_json::json;
use std::sync::Arc;

/// 登录
pub async fn login(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(req): Json<LoginRequest>,
) -> Result<impl IntoResponse, AppError> {
    let client_ip = headers
        .get("x-forwarded-for")
        .or_else(|| headers.get("x-real-ip"))
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.split(',').next())
        .map(|s| s.trim().to_string());

    // 如果不信任代理，忽略代理头，从 request extensions 获取
    let client_ip = if state.config.security.trust_proxy {
        client_ip
    } else {
        None
    }
    .unwrap_or("unknown".to_string());

    let user_agent = headers
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    let response = state
        .auth_service
        .login(req, &client_ip, user_agent.as_deref())
        .await?;

    Ok(Json(response))
}

/// 刷新令牌
pub async fn refresh_token(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(req): Json<RefreshTokenRequest>,
) -> Result<impl IntoResponse, AppError> {
    let client_ip = get_client_ip_str(&headers, state.config.security.trust_proxy);

    let token_pair = state.auth_service.refresh_token(req, &client_ip).await?;

    Ok(Json(token_pair))
}

/// 登出
pub async fn logout(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
    Json(req): Json<LogoutRequest>,
) -> Result<impl IntoResponse, AppError> {
    state
        .auth_service
        .logout(&req.refresh_token, auth_context.user_id)
        .await?;

    // 审计日志
    state
        .audit_service
        .log_action_simple(
            auth_context.user_id,
            AuditAction::UserLogout,
            Some("session"),
            Some(auth_context.user_id),
            Some("User logged out"),
            None,
        )
        .await?;

    Ok(Json(json!({"message": "已成功登出"})))
}

/// 从所有设备登出
pub async fn logout_all(
    State(state): State<Arc<AppState>>,
    auth_context: AuthContext,
) -> Result<impl IntoResponse, AppError> {
    let revoked_count = state.auth_service.logout_all(auth_context.user_id).await?;

    // 审计日志
    state
        .audit_service
        .log_action_simple(
            auth_context.user_id,
            AuditAction::UserLogout,
            Some("session"),
            Some(auth_context.user_id),
            Some(&format!("Logged out from all devices, revoked {} sessions", revoked_count)),
            None,
        )
        .await?;

    Ok(Json(json!({
        "message": format!("已从 {} 个设备登出", revoked_count)
    })))
}

/// 获取当前用户信息
pub async fn get_current_user(auth_context: AuthContext) -> Result<impl IntoResponse, AppError> {
    Ok(Json(json!({
        "id": auth_context.user_id,
        "username": auth_context.username,
        "roles": auth_context.roles,
        "scopes": auth_context.scopes,
    })))
}

/// 获取客户端 IP 地址字符串（统一版本）
/// 当 trust_proxy 为 false 时忽略代理头，使用默认值
fn get_client_ip_str(headers: &HeaderMap, trust_proxy: bool) -> String {
    if !trust_proxy {
        return "unknown".to_string();
    }

    if let Some(forwarded) = headers.get("x-forwarded-for") {
        if let Ok(forwarded_str) = forwarded.to_str() {
            if let Some(first_ip) = forwarded_str.split(',').next() {
                return first_ip.trim().to_string();
            }
        }
    }

    if let Some(real_ip) = headers.get("x-real-ip") {
        if let Ok(ip_str) = real_ip.to_str() {
            return ip_str.to_string();
        }
    }

    "unknown".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_client_ip_from_x_forwarded_for() {
        let mut headers = HeaderMap::new();
        headers.insert("x-forwarded-for", "192.168.1.1, 10.0.0.1".parse().unwrap());

        let ip = get_client_ip_str(&headers, true);
        assert_eq!(ip, "192.168.1.1");
    }

    #[test]
    fn test_get_client_ip_from_x_real_ip() {
        let mut headers = HeaderMap::new();
        headers.insert("x-real-ip", "192.168.1.2".parse().unwrap());

        let ip = get_client_ip_str(&headers, true);
        assert_eq!(ip, "192.168.1.2");
    }

    #[test]
    fn test_get_client_ip_trust_proxy_false() {
        let mut headers = HeaderMap::new();
        headers.insert("x-forwarded-for", "10.0.0.1".parse().unwrap());

        let ip = get_client_ip_str(&headers, false);
        assert_eq!(ip, "unknown");
    }
}
