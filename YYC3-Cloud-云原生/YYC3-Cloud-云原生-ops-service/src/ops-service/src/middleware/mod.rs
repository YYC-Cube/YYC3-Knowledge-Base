//! HTTP 中间件
//! 请求追踪、速率限制、IP 白名单、webhook HMAC 鉴权

pub mod webhook_hmac;

use axum::{
    extract::{Request, State},
    http::HeaderMap,
    middleware::Next,
    response::Response,
};
use dashmap::DashMap;
use secrecy::ExposeSecret;
use std::collections::VecDeque;
use std::net::IpAddr;
use std::num::NonZeroU32;
use std::sync::atomic::AtomicU64;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use tracing::Instrument;
use uuid::Uuid;

/// 统一请求上下文
///
/// 包含请求级别的追踪信息，贯通中间件、handler、错误响应和审计日志
#[derive(Debug, Clone)]
pub struct RequestContext {
    pub request_id: String,
    pub trace_id: String,
    pub client_ip: Option<IpAddr>,
    pub user_agent: Option<String>,
    pub auth_subject: Option<String>,
}

/// 应用状态
///
/// AppState 内部使用 Arc 包装服务,这样:
/// 1. 多个请求可以共享服务实例
/// 2. 服务可以包含内部的可变状态(如果需要)
/// 3. Clone 成本低廉(Arc 是指针拷贝)
///
#[derive(Clone)]
pub struct AppState {
    pub config: crate::config::AppConfig,
    pub db: sqlx::PgPool,
    // 服务使用 Arc 包装,因为服务内部可能包含 Arc 或其他共享状态
    pub auth_service: Arc<crate::services::AuthService>,
    pub permission_service: Arc<crate::services::PermissionService>,
    pub audit_service: Arc<crate::services::AuditService>,
    pub jwt_service: Arc<crate::auth::jwt::JwtService>,
    pub job_service: Arc<crate::services::JobService>,
    pub approval_service: Arc<crate::services::ApprovalService>,
    pub event_bus: Arc<crate::realtime::EventBus>,
    /// 并发控制器
    pub concurrency_controller: Arc<crate::concurrency::ConcurrencyController>,
    /// IP 限流器
    pub rate_limiter: Arc<IpRateLimiter>,
    /// RabbitMQ 发布器池 (P2.1)
    pub rabbitmq_publisher: Arc<crate::rabbitmq::RabbitMqPublisherPool>,
    /// Runner Docker 配置缓存 (运行时可重新加载)
    pub runner_docker_config_cache: Arc<RwLock<crate::config::RunnerDockerConfig>>,
    /// Runner 调度服务 (P2.1)
    pub runner_scheduler: Arc<crate::services::RunnerScheduler>,
    /// 存储服务 (P2.1)
    pub storage_service: Arc<crate::services::StorageService>,
    /// Webhook Nonce 防重放存储
    pub webhook_nonce_store: Option<Arc<webhook_hmac::NonceStore>>,
    /// Runner 配置版本号（单调递增，供 Runner 检测配置变更）
    pub runner_config_version: Arc<AtomicU64>,
}

/// 请求追踪中间件
/// 为每个请求生成 trace_id 和 request_id，并记录指标
pub async fn request_tracking_middleware(mut req: Request, next: Next) -> Response {
    let trace_id = extract_or_generate_trace_id(req.headers());
    let request_id = Uuid::new_v4().to_string();

    let method = req.method().to_string();
    let _method_static = method.as_str();
    let method_for_metrics = req.method().to_string();
    let uri = req.uri().to_string();

    // 提取 User-Agent
    let user_agent = req
        .headers()
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    // 创建 RequestContext 并注入 extensions
    let request_context = RequestContext {
        request_id: request_id.clone(),
        trace_id: trace_id.clone(),
        client_ip: None,
        user_agent,
        auth_subject: None,
    };
    req.extensions_mut().insert(request_context);

    let span = tracing::info_span!(
        "http_request",
        trace_id = %trace_id,
        request_id = %request_id,
        method = %method,
        uri = %uri,
    );

    async move {
        let start = Instant::now();

        let response = next.run(req).await;

        let elapsed = start.elapsed();

        // 记录指标 - 使用静态字符串
        let status = response.status().as_u16();
        let method_name = match method_for_metrics.as_str() {
            "GET" => "GET",
            "POST" => "POST",
            "PUT" => "PUT",
            "DELETE" => "DELETE",
            "PATCH" => "PATCH",
            _ => "UNKNOWN",
        };
        let status_code = match status {
            200 => "200",
            201 => "201",
            204 => "204",
            400 => "400",
            401 => "401",
            403 => "403",
            404 => "404",
            500 => "500",
            _ => "other",
        };

        let _ = metrics::counter!("http_requests_total", "method" => method_name, "status" => status_code);
        metrics::histogram!("http_request_duration_seconds").record(elapsed.as_secs_f64());

        // 记录日志
        tracing::info!(
            method = %method,
            uri = %uri,
            status = status,
            elapsed_ms = elapsed.as_millis(),
            "Request completed"
        );

        // 在响应头中添加 trace_id
        let mut response = response;
        if let Ok(v) = trace_id.parse() {
            response.headers_mut().insert("x-trace-id", v);
        }
        if let Ok(v) = request_id.parse() {
            response.headers_mut().insert("x-request-id", v);
        }

        response
    }
    .instrument(span)
    .await
}

/// 从请求头中提取或生成 trace_id
fn extract_or_generate_trace_id(headers: &HeaderMap) -> String {
    headers
        .get("x-trace-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| Uuid::new_v4().to_string())
}

/// 速率限制中间件（基于 Governor 的真实实现）
/// 使用 IP 地址作为限流键
pub async fn rate_limit_middleware(
    State(state): State<Arc<AppState>>,
    mut req: Request,
    next: Next,
) -> Result<Response, crate::error::AppError> {
    // 获取客户端 IP
    let client_ip = get_client_ip_with_addr(&req, state.config.security.trust_proxy)?;

    // 从扩展中获取限流器
    let rate_limiter = state.rate_limiter.clone();

    // 检查是否超过限制
    let allowed = rate_limiter
        .check_rate_limit(&client_ip)
        .await
        .map_err(|_| crate::error::AppError::RateLimitExceeded)?;

    if !allowed {
        tracing::warn!(
            client_ip = %client_ip,
            uri = %req.uri().path(),
            "Rate limit exceeded"
        );
        return Err(crate::error::AppError::RateLimitExceeded);
    }

    tracing::debug!(
        client_ip = %client_ip,
        uri = %req.uri().path(),
        "Rate limit check passed"
    );

    // 将 IP 添加到请求扩展，以便后续使用
    req.extensions_mut().insert(client_ip);

    // 同时更新 RequestContext 中的 client_ip
    if let Some(ctx) = req.extensions_mut().get_mut::<RequestContext>() {
        ctx.client_ip = Some(client_ip);
    }

    Ok(next.run(req).await)
}

/// IP 白名单中间件
pub async fn ip_whitelist_middleware(
    State(state): State<Arc<AppState>>,
    req: Request,
    next: Next,
) -> Result<Response, crate::error::AppError> {
    if let Some(allowed_ips) = &state.config.security.allowed_ips {
        let client_ip = get_client_ip_with_addr(&req, state.config.security.trust_proxy)?;
        let client_ip_str = client_ip.to_string();

        if !allowed_ips.contains(&client_ip_str) {
            tracing::warn!(
                client_ip = %client_ip_str,
                "IP not in whitelist"
            );
            return Err(crate::error::AppError::Forbidden);
        }

        tracing::debug!(client_ip = %client_ip_str, "IP allowed by whitelist");
    }

    Ok(next.run(req).await)
}

/// 获取客户端 IP 地址（返回字符串）
#[allow(dead_code)]
pub fn get_client_ip(req: &Request, trust_proxy: bool) -> Result<String, crate::error::AppError> {
    get_client_ip_with_addr(req, trust_proxy).map(|ip| ip.to_string())
}

/// 获取客户端 IP 地址（返回 IpAddr）
/// 支持从代理头和连接信息获取真实 IP
pub fn get_client_ip_with_addr(
    req: &Request,
    trust_proxy: bool,
) -> Result<IpAddr, crate::error::AppError> {
    let headers = req.headers();

    // 如果信任代理，优先从代理头获取
    if trust_proxy {
        // 1. 尝试 X-Forwarded-For（可能包含多个 IP，取第一个）
        if let Some(forwarded_for) = headers.get("x-forwarded-for") {
            if let Ok(forwarded_str) = forwarded_for.to_str() {
                if let Some(first_ip) = forwarded_str.split(',').next() {
                    let ip_str = first_ip.trim();
                    if let Ok(addr) = ip_str.parse::<IpAddr>() {
                        tracing::debug!(client_ip = %addr, "Got IP from X-Forwarded-For");
                        return Ok(addr);
                    }
                }
            }
        }

        // 2. 尝试 X-Real-IP
        if let Some(real_ip) = headers.get("x-real-ip") {
            if let Ok(ip_str) = real_ip.to_str() {
                if let Ok(addr) = ip_str.parse::<IpAddr>() {
                    tracing::debug!(client_ip = %addr, "Got IP from X-Real-IP");
                    return Ok(addr);
                }
            }
        }

        // 3. 尝试 CF-Connecting-IP（Cloudflare）
        if let Some(cf_ip) = headers.get("cf-connecting-ip") {
            if let Ok(ip_str) = cf_ip.to_str() {
                if let Ok(addr) = ip_str.parse::<IpAddr>() {
                    tracing::debug!(client_ip = %addr, "Got IP from CF-Connecting-IP");
                    return Ok(addr);
                }
            }
        }

        // 4. 尝试 X-Original-Forwarded-For
        if let Some(original_ip) = headers.get("x-original-forwarded-for") {
            if let Ok(ip_str) = original_ip.to_str() {
                if let Ok(addr) = ip_str.parse::<IpAddr>() {
                    tracing::debug!(client_ip = %addr, "Got IP from X-Original-Forwarded-For");
                    return Ok(addr);
                }
            }
        }
    }

    // 5. 尝试从 ConnectInfo 获取对端 IP（由 axum::serve 注入的连接信息）
    if let Some(connect_info) = req
        .extensions()
        .get::<axum::extract::ConnectInfo<std::net::SocketAddr>>()
    {
        let addr = connect_info.0;
        tracing::debug!(client_ip = %addr.ip(), "Got IP from ConnectInfo");
        return Ok(addr.ip());
    }

    // 6. 尝试从请求扩展中获取（由 rate_limit_middleware 设置）
    if let Some(ip) = req.extensions().get::<IpAddr>() {
        tracing::debug!(client_ip = %ip, "Got IP from request extensions");
        return Ok(*ip);
    }

    // 7. 无法获取真实 IP，返回本地回环地址（仅用于测试环境）
    tracing::warn!("Could not determine client IP, using loopback address");
    Ok(IpAddr::V4(std::net::Ipv4Addr::new(127, 0, 0, 1)))
}

// ==================== 限流服务 ====================

/// IP 级别的速率限制器
/// 使用滑动窗口算法实现
#[derive(Clone)]
pub struct IpRateLimiter {
    /// 每个 IP 地址的请求记录
    limiters: Arc<DashMap<IpAddr, Arc<IpLimiterState>>>,
    /// 全局配置
    config: RateLimitConfig,
}

/// 单个 IP 的限流状态
struct IpLimiterState {
    /// 请求时间戳队列（滑动窗口）
    requests: Arc<std::sync::Mutex<VecDeque<Instant>>>,
    /// 时间窗口长度
    window_duration: Duration,
    /// 最大请求数
    max_requests: usize,
}

/// 限流配置
#[derive(Debug, Clone)]
pub struct RateLimitConfig {
    /// 时间窗口内的最大请求数
    pub max_requests: NonZeroU32,
    /// 时间窗口（秒）
    pub window_secs: NonZeroU32,
    /// 登录接口的更严格限制
    pub login_max_requests: NonZeroU32,
    pub login_window_secs: NonZeroU32,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            max_requests: NonZeroU32::new(100).unwrap_or(NonZeroU32::MIN),
            window_secs: NonZeroU32::new(60).unwrap_or(NonZeroU32::MIN),
            login_max_requests: NonZeroU32::new(10).unwrap_or(NonZeroU32::MIN),
            login_window_secs: NonZeroU32::new(300).unwrap_or(NonZeroU32::MIN),
        }
    }
}

impl RateLimitConfig {
    /// 从安全配置构造限流配置
    pub fn from_security_config(security: &crate::config::SecurityConfig) -> Self {
        let rps = security.rate_limit_rps.max(1);
        Self {
            max_requests: NonZeroU32::new((rps * 60) as u32).unwrap_or(NonZeroU32::MIN),
            window_secs: NonZeroU32::new(60).unwrap_or(NonZeroU32::MIN),
            login_max_requests: NonZeroU32::new(10).unwrap_or(NonZeroU32::MIN),
            login_window_secs: NonZeroU32::new(300).unwrap_or(NonZeroU32::MIN),
        }
    }
}

impl IpRateLimiter {
    /// 创建新的限流器
    pub fn new(config: RateLimitConfig) -> Self {
        Self {
            limiters: Arc::new(DashMap::new()),
            config,
        }
    }

    /// 检查是否允许请求
    pub async fn check_rate_limit(&self, ip: &IpAddr) -> Result<bool, crate::error::AppError> {
        let limiter = self.get_or_create_limiter(
            ip,
            self.config.max_requests.get() as usize,
            self.config.window_secs.get() as u64,
        );
        Ok(limiter.check())
    }

    /// 检查登录请求的限流
    pub async fn check_login_rate_limit(
        &self,
        ip: &IpAddr,
    ) -> Result<bool, crate::error::AppError> {
        let limiter = self.get_or_create_limiter(
            ip,
            self.config.login_max_requests.get() as usize,
            self.config.login_window_secs.get() as u64,
        );
        Ok(limiter.check())
    }

    /// 获取或创建指定 IP 的限流器
    fn get_or_create_limiter(
        &self,
        ip: &IpAddr,
        max_requests: usize,
        window_secs: u64,
    ) -> Arc<IpLimiterState> {
        self.limiters
            .entry(*ip)
            .or_insert_with(|| {
                Arc::new(IpLimiterState {
                    requests: Arc::new(std::sync::Mutex::new(VecDeque::new())),
                    window_duration: Duration::from_secs(window_secs),
                    max_requests,
                })
            })
            .clone()
    }

    /// 清理过期的限流器
    pub async fn cleanup_expired(&self, _older_than_secs: u64) {
        if self.limiters.len() > 10000 {
            let keys: Vec<_> = self.limiters.iter().take(5000).map(|e| *e.key()).collect();
            for key in keys {
                self.limiters.remove(&key);
            }
        }
    }

    /// 获取当前统计
    pub async fn get_stats(&self) -> RateLimiterStats {
        RateLimiterStats {
            total_tracked_ips: self.limiters.len(),
            config_max_requests: self.config.max_requests.get(),
            config_window_secs: self.config.window_secs.get(),
        }
    }
}

impl IpLimiterState {
    /// 检查是否允许请求
    fn check(&self) -> bool {
        let mut requests = self.requests.lock().unwrap();
        let now = Instant::now();

        // 清理过期的请求记录
        while let Some(&front) = requests.front() {
            if now.duration_since(front) < self.window_duration {
                break;
            }
            requests.pop_front();
        }

        // 检查是否超过限制
        if requests.len() < self.max_requests {
            requests.push_back(now);
            true
        } else {
            false
        }
    }
}

/// 限流器统计
#[derive(Debug, Clone, serde::Serialize)]
pub struct RateLimiterStats {
    pub total_tracked_ips: usize,
    pub config_max_requests: u32,
    pub config_window_secs: u32,
}

// ==================== 客户端 IP 提取器 ====================

/// Axum 提取器：从请求中获取客户端 IP
/// 可以在处理器中直接使用
pub struct ClientIp(pub IpAddr);

impl axum::extract::FromRequestParts<()> for ClientIp {
    type Rejection = crate::error::AppError;

    async fn from_request_parts(
        parts: &mut axum::http::request::Parts,
        _state: &(),
    ) -> Result<Self, Self::Rejection> {
        // 尝试从扩展中获取（由限流中间件设置）
        if let Some(ip) = parts.extensions.get::<IpAddr>() {
            return Ok(ClientIp(*ip));
        }

        // 从头部解析
        let headers = &parts.headers;

        // 尝试各种代理头
        if let Some(forwarded) = headers.get("x-forwarded-for") {
            if let Ok(s) = forwarded.to_str() {
                if let Some(first) = s.split(',').next() {
                    if let Ok(ip) = first.trim().parse::<IpAddr>() {
                        return Ok(ClientIp(ip));
                    }
                }
            }
        }

        if let Some(real_ip) = headers.get("x-real-ip") {
            if let Ok(s) = real_ip.to_str() {
                if let Ok(ip) = s.parse::<IpAddr>() {
                    return Ok(ClientIp(ip));
                }
            }
        }

        // 默认返回本地回环
        Ok(ClientIp(IpAddr::V4(std::net::Ipv4Addr::new(127, 0, 0, 1))))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_or_generate_trace_id() {
        let mut headers = HeaderMap::new();
        headers.insert("x-trace-id", "test-trace-123".parse().unwrap());

        let trace_id = extract_or_generate_trace_id(&headers);
        assert_eq!(trace_id, "test-trace-123");

        let headers = HeaderMap::new();
        let trace_id = extract_or_generate_trace_id(&headers);
        assert!(!trace_id.is_empty());
        assert_ne!(trace_id, "test-trace-123");
    }

    #[test]
    fn test_rate_limit_config_default() {
        let config = RateLimitConfig::default();
        assert_eq!(config.max_requests.get(), 100);
        assert_eq!(config.window_secs.get(), 60);
    }

    #[tokio::test]
    async fn test_ip_rate_limiter() {
        let config = RateLimitConfig {
            max_requests: NonZeroU32::new(5).unwrap(),
            window_secs: NonZeroU32::new(60).unwrap(),
            login_max_requests: NonZeroU32::new(3).unwrap(),
            login_window_secs: NonZeroU32::new(60).unwrap(),
        };

        let limiter = IpRateLimiter::new(config);
        let ip = IpAddr::V4(std::net::Ipv4Addr::new(192, 168, 1, 1));

        // 前 5 个请求应该通过
        for _ in 0..5 {
            assert!(limiter.check_rate_limit(&ip).await.unwrap());
        }

        // 第 6 个请求应该被限流
        assert!(!limiter.check_rate_limit(&ip).await.unwrap());
    }
}

// ==================== Runner API Key 鉴权 ====================

/// Runner API Key 鉴权中间件
/// 验证 Runner 注册和心跳请求中的 API Key
pub async fn runner_auth_middleware(
    State(state): State<Arc<AppState>>,
    req: Request,
    next: Next,
) -> Result<Response, crate::error::AppError> {
    // 如果配置中未设置 runner_api_key，则跳过鉴权（用于开发/测试环境）
    let expected_key = match &state.config.security.runner_api_key {
        Some(key) => key.expose_secret(),
        None => {
            tracing::debug!("Runner API key not configured, skipping auth");
            return Ok(next.run(req).await);
        }
    };

    // 从请求头获取 API Key（支持多种格式）
    let headers = req.headers();
    let provided_key = headers
        .get("x-runner-api-key")
        .or_else(|| headers.get("authorization"))
        .and_then(|v| v.to_str().ok());

    let provided_key = if let Some(key) = provided_key {
        // 处理 Bearer token 格式
        if key.to_lowercase().starts_with("bearer ") {
            &key[7..]
        } else {
            key
        }
    } else {
        return Err(crate::error::AppError::authentication("Missing Runner API Key"));
    };

    // 验证 API Key
    if provided_key != expected_key {
        tracing::warn!(
            runner_name = headers.get("x-runner-name").and_then(|v| v.to_str().ok()),
            "Invalid Runner API key"
        );
        return Err(crate::error::AppError::authentication("Invalid Runner API Key"));
    }

    tracing::debug!("Runner API key validated successfully");
    Ok(next.run(req).await)
}
