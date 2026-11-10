//! JWT 认证中间件

use crate::{auth::jwt::JwtService, error::AppError};
use axum::{
    extract::{FromRequestParts, Request, State},
    http::HeaderMap,
    middleware::Next,
    response::Response,
};
use std::sync::Arc;
use uuid::Uuid;

/// 认证上下文（附加到请求扩展）
#[derive(Debug, Clone)]
pub struct AuthContext {
    pub user_id: Uuid,
    pub username: String,
    pub roles: Vec<String>,
    pub scopes: Vec<String>,
}

// 实现 FromRequestParts 以便在 handler 中直接提取 AuthContext
impl<S> FromRequestParts<S> for AuthContext
where
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut axum::http::request::Parts,
        _state: &S,
    ) -> Result<Self, Self::Rejection> {
        parts
            .extensions
            .get::<AuthContext>()
            .cloned()
            .ok_or(AppError::Unauthorized)
    }
}

/// 从 Authorization 头提取令牌
pub fn extract_token(headers: &HeaderMap) -> Result<String, AppError> {
    headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer ").map(|t| t.to_string()))
        .ok_or(AppError::Unauthorized)
}

/// JWT 认证中间件 - 必须认证
pub async fn jwt_auth_middleware(
    State(jwt_service): State<Arc<JwtService>>,
    mut req: Request,
    next: Next,
) -> Result<Response, AppError> {
    // 从 Authorization 头提取令牌
    let token = extract_token(req.headers())?;

    // 验证令牌
    let claims = jwt_service.validate_access_token(&token)?;

    // 创建认证上下文
    let user_id = Uuid::parse_str(&claims.sub).map_err(|_| AppError::Unauthorized)?;
    let auth_context = AuthContext {
        user_id,
        username: claims.username,
        roles: claims.roles,
        scopes: claims.scopes,
    };

    // 附加到请求扩展
    req.extensions_mut().insert(auth_context);

    Ok(next.run(req).await)
}

/// 可选认证 - 不强制要求令牌
pub async fn optional_auth_middleware(
    State(jwt_service): State<Arc<JwtService>>,
    mut req: Request,
    next: Next,
) -> Response {
    if let Ok(token) = extract_token(req.headers()) {
        if let Ok(claims) = jwt_service.validate_access_token(&token) {
            if let Ok(user_id) = Uuid::parse_str(&claims.sub) {
                let auth_context = AuthContext {
                    user_id,
                    username: claims.username,
                    roles: claims.roles,
                    scopes: claims.scopes,
                };
                req.extensions_mut().insert(auth_context);
            }
        }
    }

    next.run(req).await
}

/// 从扩展中提取 AuthContext 的辅助函数
pub fn get_auth_context(req: &Request) -> Result<AuthContext, AppError> {
    req.extensions()
        .get::<AuthContext>()
        .cloned()
        .ok_or(AppError::Unauthorized)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_token_valid() {
        let mut headers = HeaderMap::new();
        headers.insert("authorization", "Bearer test_token_123".parse().unwrap());

        let token = extract_token(&headers).unwrap();
        assert_eq!(token, "test_token_123");
    }

    #[test]
    fn test_extract_token_missing() {
        let headers = HeaderMap::new();
        assert!(extract_token(&headers).is_err());
    }

    #[test]
    fn test_extract_token_invalid_format() {
        let mut headers = HeaderMap::new();
        headers.insert("authorization", "InvalidFormat".parse().unwrap());

        assert!(extract_token(&headers).is_err());
    }
}
