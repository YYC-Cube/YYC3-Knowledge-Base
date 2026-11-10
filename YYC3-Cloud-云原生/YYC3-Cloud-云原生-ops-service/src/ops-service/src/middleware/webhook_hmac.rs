//! 构建 Webhook HMAC 签名鉴权中间件
//!
//! 为 build status/log/artifact webhook 提供应用层鉴权，防止:
//! - 未授权方伪造构建状态/日志/产物
//! - 重放攻击
//! - 已注销 Runner 继续回传

use axum::{
    extract::{Request, State},
    middleware::Next,
    response::Response,
};
use dashmap::DashMap;
use secrecy::ExposeSecret;
use sha2::{Digest, Sha256};
use std::sync::Arc;
use std::time::{Duration, Instant};

use crate::error::AppError;

/// Nonce 防重放存储
///
/// 记录最近使用的 nonce 以检测重放攻击
pub struct NonceStore {
    entries: DashMap<String, Instant>,
    ttl: Duration,
}

impl NonceStore {
    pub fn new(ttl_secs: u64) -> Self {
        Self {
            entries: DashMap::new(),
            ttl: Duration::from_secs(ttl_secs),
        }
    }

    /// 检查 nonce 是否已被使用，如果未被使用则记录
    pub fn check_and_record(&self, nonce: &str) -> bool {
        let now = Instant::now();

        // 先清理过期条目
        self.entries.retain(|_, v| now.duration_since(*v) < self.ttl);

        // 检查是否已存在
        if self.entries.contains_key(nonce) {
            return false;
        }

        self.entries.insert(nonce.to_string(), now);
        true
    }
}

/// 构建 webhook 签名规范的字符串
///
/// 组件: HTTP method + path + timestamp + body_sha256 + runner_id + nonce
pub fn build_canonical_string(
    method: &str,
    path: &str,
    timestamp: &str,
    body_sha256: &str,
    runner_id: &str,
    nonce: &str,
) -> String {
    format!(
        "{}\n{}\n{}\n{}\n{}\n{}",
        method.to_uppercase(),
        path,
        timestamp,
        body_sha256,
        runner_id,
        nonce,
    )
}

/// 计算 HMAC-SHA256 签名
///
/// 手动实现 HMAC-SHA256（避免引入 hmac crate 的 digest 版本冲突）
/// HMAC(key, message) = H((key ⊕ opad) || H((key ⊕ ipad) || message))
pub fn compute_hmac_sha256(key: &[u8], message: &[u8]) -> Vec<u8> {
    const BLOCK_SIZE: usize = 64;

    // Step 1: 如果 key 长度超过 block size，先 hash 一次
    let key_material: Vec<u8> = if key.len() > BLOCK_SIZE {
        let mut hasher = Sha256::new();
        hasher.update(key);
        hasher.finalize().to_vec()
    } else {
        key.to_vec()
    };

    // Step 2: 用 0 填充到 block size
    let mut key_padded = vec![0u8; BLOCK_SIZE];
    key_padded[..key_material.len()].copy_from_slice(&key_material);

    // Step 3: 创建 inner key (key ⊕ 0x36) 和 outer key (key ⊕ 0x5c)
    let mut inner_key = [0u8; BLOCK_SIZE];
    let mut outer_key = [0u8; BLOCK_SIZE];
    for i in 0..BLOCK_SIZE {
        inner_key[i] = key_padded[i] ^ 0x36;
        outer_key[i] = key_padded[i] ^ 0x5c;
    }

    // Step 4: inner hash = SHA256(key⊕ipad || message)
    let inner_hash = {
        let mut hasher = Sha256::new();
        hasher.update(&inner_key);
        hasher.update(message);
        hasher.finalize()
    };

    // Step 5: final hash = SHA256(key⊕opad || inner_hash)
    let mut hasher = Sha256::new();
    hasher.update(&outer_key);
    hasher.update(&inner_hash);
    hasher.finalize().to_vec()
}

/// 计算 HMAC-SHA256 的 hex 编码签名
pub fn compute_hmac_signature_hex(key: &[u8], message: &[u8]) -> String {
    hex::encode(compute_hmac_sha256(key, message))
}

/// 构建 webhook HMAC 鉴权中间件
pub async fn build_webhook_hmac_middleware(
    State(state): State<Arc<crate::middleware::AppState>>,
    req: Request,
    next: Next,
) -> Result<Response, AppError> {
    let hmac_secret = match &state.config.security.runner_webhook_hmac_secret {
        Some(secret) => secret.expose_secret().to_string(),
        None => {
            tracing::warn!("HMAC secret not configured, rejecting webhook request");
            return Err(AppError::authentication(
                "Webhook HMAC authentication is required but not configured",
            ));
        }
    };

    let max_skew = state.config.security.runner_webhook_max_skew_secs;

    // 读取请求体并计算 SHA256（在提取 header 前先读取 body，避免 borrow 冲突）
    let (parts, body) = req.into_parts();
    let body_bytes = axum::body::to_bytes(body, 1024 * 1024)
        .await
        .map_err(|_| AppError::BadRequest("Failed to read request body".to_string()))?;

    let headers = &parts.headers;
    let method = parts.method.as_str();
    let path = parts.uri.path().to_string();

    // 提取必需的请求头
    let runner_id = headers
        .get("x-runner-id")
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| AppError::authentication("Missing x-runner-id header"))?
        .to_string();

    let timestamp_str = headers
        .get("x-runner-timestamp")
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| AppError::authentication("Missing x-runner-timestamp header"))?
        .to_string();

    let signature = headers
        .get("x-runner-signature")
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| AppError::authentication("Missing x-runner-signature header"))?
        .to_string();

    let nonce = headers
        .get("x-runner-nonce")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    // 校验时间戳偏差
    let timestamp: i64 = timestamp_str.parse().map_err(|_| {
        AppError::authentication("Invalid x-runner-timestamp format")
    })?;

    let now = chrono::Utc::now().timestamp();
    let skew = (now - timestamp).abs() as u64;
    if skew > max_skew {
        tracing::warn!(
            runner_id = %runner_id,
            timestamp = timestamp_str,
            skew_secs = skew,
            max_skew_secs = max_skew,
            "Webhook timestamp skew too large"
        );
        return Err(AppError::authentication("Request timestamp too old or too far in the future"));
    }

    // 防重放: 检查 nonce
    if let Some(ref n) = nonce {
        let nonce_store = state
            .webhook_nonce_store
            .as_ref()
            .ok_or_else(|| AppError::internal_error("Nonce store not initialized"))?;

        if !nonce_store.check_and_record(n) {
            tracing::warn!(
                runner_id = %runner_id,
                nonce = %n,
                "Duplicate webhook nonce detected"
            );
            return Err(AppError::authentication("Duplicate or replayed webhook request"));
        }
    } else {
        tracing::debug!(
            runner_id = %runner_id,
            "Webhook request without nonce"
        );
    }

    // 计算请求体的 SHA256（body_bytes 已在上方读取）
    let mut sha256 = Sha256::new();
    sha256.update(&body_bytes);
    let body_sha256 = hex::encode(sha256.finalize());

    // 构建规范字符串并验证签名
    let canonical = build_canonical_string(
        method,
        &path,
        &timestamp_str,
        &body_sha256,
        &runner_id,
        nonce.as_deref().unwrap_or(""),
    );

    let expected_signature =
        compute_hmac_signature_hex(hmac_secret.as_bytes(), canonical.as_bytes());

    if signature != expected_signature {
        tracing::warn!(
            runner_id = %runner_id,
            "Invalid webhook HMAC signature"
        );
        return Err(AppError::authentication("Invalid webhook signature"));
    }

    // 验证 Runner 是否在系统中注册且状态允许
    let runner_active = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM runners WHERE name = $1 AND status != 'disabled')",
    )
    .bind(&runner_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(false);

    if !runner_active {
        tracing::warn!(
            runner_id = %runner_id,
            "Runner not found or disabled"
        );
        return Err(AppError::authentication("Runner not registered or disabled"));
    }

    // 重新构造请求，注入 runner_id 供下游使用
    let mut req = Request::from_parts(parts, axum::body::Body::from(body_bytes));
    req.extensions_mut().insert(runner_id);

    Ok(next.run(req).await)
}

/// 清理 NonceStore 中的过期条目
pub async fn cleanup_nonce_store_loop(store: Arc<NonceStore>, interval_secs: u64) {
    let duration = Duration::from_secs(interval_secs);
    loop {
        tokio::time::sleep(duration).await;
        let now = Instant::now();
        store.entries.retain(|_, v| now.duration_since(*v) < store.ttl);
        tracing::debug!(
            remaining_nonces = store.entries.len(),
            "Nonce store cleanup completed"
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_canonical_string_format() {
        let canonical = build_canonical_string(
            "POST",
            "/api/v1/webhooks/build/status",
            "1234567890",
            "abcd1234",
            "runner-01",
            "nonce-001",
        );
        assert_eq!(
            canonical,
            "POST\n/api/v1/webhooks/build/status\n1234567890\nabcd1234\nrunner-01\nnonce-001"
        );
    }

    #[test]
    fn test_hmac_computation() {
        let signature = compute_hmac_signature_hex(b"secret-key", b"test message");
        // HMAC-SHA256 hex is always 64 chars
        assert_eq!(signature.len(), 64);
    }

    #[test]
    fn test_hmac_deterministic() {
        let sig1 = compute_hmac_signature_hex(b"key", b"data");
        let sig2 = compute_hmac_signature_hex(b"key", b"data");
        assert_eq!(sig1, sig2);
    }

    #[test]
    fn test_hmac_differs_with_different_keys() {
        let sig1 = compute_hmac_signature_hex(b"key1", b"data");
        let sig2 = compute_hmac_signature_hex(b"key2", b"data");
        assert_ne!(sig1, sig2);
    }

    #[test]
    fn test_nonce_store() {
        let store = NonceStore::new(60);

        assert!(store.check_and_record("nonce-1"));
        assert!(!store.check_and_record("nonce-1"));
        assert!(store.check_and_record("nonce-2"));
    }

    #[test]
    fn test_hmac_with_long_key() {
        // Key longer than block size (64 bytes for SHA256)
        let long_key = vec![b'A'; 100];
        let sig = compute_hmac_signature_hex(&long_key, b"test");
        assert_eq!(sig.len(), 64);
    }

    #[test]
    fn test_known_hmac_vector() {
        // RFC 4231 Test Case 1
        let key = vec![0x0bu8; 20];
        let data = b"Hi There";
        let sig = compute_hmac_signature_hex(&key, data);
        assert_eq!(
            sig,
            "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7"
        );
    }
}
