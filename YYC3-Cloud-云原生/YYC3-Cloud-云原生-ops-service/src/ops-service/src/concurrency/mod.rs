//! 并发控制与速率限制模块
//! P2 阶段：提供全局和分维度的并发控制
//! 支持：排队/拒绝/等待策略

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{Mutex, OwnedSemaphorePermit, Semaphore};
use tracing::{debug, warn};

/// 并发策略：当达到并发上限时的处理方式
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum ConcurrencyStrategy {
    /// 拒绝策略：立即返回错误，不等待
    Reject,
    /// 等待策略：等待指定时间后超时返回错误（默认）
    #[default]
    Wait,
    /// 排队策略：将作业放入队列，等待有空闲时执行
    Queue,
}

/// 并发许可（持有 semaphore 许可）
#[derive(Clone)]
pub struct ConcurrencyPermit {
    /// 全局许可（可选）
    _global_permit: Option<Arc<OwnedSemaphorePermit>>,
    /// 分组许可（可选）
    _group_permit: Option<Arc<OwnedSemaphorePermit>>,
    /// 环境许可（可选）
    _env_permit: Option<Arc<OwnedSemaphorePermit>>,
}

impl ConcurrencyPermit {
    /// 创建一个新的许可（用于内部）
    fn new(
        global_permit: Option<OwnedSemaphorePermit>,
        group_permit: Option<OwnedSemaphorePermit>,
        env_permit: Option<OwnedSemaphorePermit>,
    ) -> Self {
        Self {
            _global_permit: global_permit.map(Arc::new),
            _group_permit: group_permit.map(Arc::new),
            _env_permit: env_permit.map(Arc::new),
        }
    }
}

/// 并发控制器
#[derive(Clone)]
pub struct ConcurrencyController {
    /// 全局并发限制
    global_semaphore: Arc<Semaphore>,
    /// 分组维度并发限制
    group_semaphores: Arc<Mutex<HashMap<String, GroupSemaphore>>>,
    /// 环境维度并发限制
    environment_semaphores: Arc<Mutex<HashMap<String, EnvironmentSemaphore>>>,
    /// 配置
    config: ConcurrencyConfig,
}

/// 分组级别的信号量
#[derive(Clone)]
struct GroupSemaphore {
    semaphore: Arc<Semaphore>,
    limit: i32,
}

/// 环境级别的信号量
#[derive(Clone)]
struct EnvironmentSemaphore {
    semaphore: Arc<Semaphore>,
    limit: i32,
}

/// 并发配置
#[derive(Debug, Clone)]
pub struct ConcurrencyConfig {
    /// 全局并发上限（0表示无限制）
    pub global_limit: i32,
    /// 每分组并发上限（None表示使用全局限制）
    pub group_limit: Option<i32>,
    /// 每环境并发上限（None表示使用全局限制）
    pub environment_limit: Option<i32>,
    /// 生产环境更严格的并发限制
    pub production_limit: Option<i32>,
    /// 获取许可的超时时间（Wait 策略时使用）
    pub acquire_timeout_secs: u64,
    /// 超限时的处理策略
    pub strategy: ConcurrencyStrategy,
    /// 排队策略的最大队列长度（Queue 策略时使用）
    pub queue_max_length: usize,
}

impl Default for ConcurrencyConfig {
    fn default() -> Self {
        Self {
            global_limit: 50,
            group_limit: Some(10),
            environment_limit: Some(20),
            production_limit: Some(5),
            acquire_timeout_secs: 300,
            strategy: ConcurrencyStrategy::Wait,
            queue_max_length: 100,
        }
    }
}

/// 并发错误
#[derive(Debug, thiserror::Error)]
pub enum ConcurrencyError {
    #[error("Acquire timeout for resource: {resource}")]
    AcquireTimeout { resource: String },

    #[error("Semaphore closed")]
    Closed,

    #[error("Concurrency limit exceeded for {scope_type}: {scope_value}")]
    LimitExceeded {
        scope_type: String,
        scope_value: String,
    },

    /// 拒绝策略：立即拒绝（达到并发上限）
    #[error("Request rejected due to concurrency limit: {scope_type}/{scope_value}")]
    Rejected {
        scope_type: String,
        scope_value: String,
        strategy: ConcurrencyStrategy,
    },

    /// 排队策略：队列已满
    #[error("Concurrency queue is full (max: {max_length})")]
    QueueFull { max_length: usize },
}

impl ConcurrencyError {
    /// 转换为 HTTP 状态码
    pub fn http_status_code(&self) -> u16 {
        match self {
            ConcurrencyError::Rejected { .. } => 429, // Too Many Requests
            ConcurrencyError::QueueFull { .. } => 503, // Service Unavailable
            ConcurrencyError::AcquireTimeout { .. } => 504, // Gateway Timeout
            ConcurrencyError::LimitExceeded { .. } => 429,
            ConcurrencyError::Closed => 503,
        }
    }

    /// 获取错误码
    pub fn error_code(&self) -> &'static str {
        match self {
            ConcurrencyError::Rejected { .. } => "CONCURRENCY_REJECTED",
            ConcurrencyError::QueueFull { .. } => "CONCURRENCY_QUEUE_FULL",
            ConcurrencyError::AcquireTimeout { .. } => "CONCURRENCY_TIMEOUT",
            ConcurrencyError::LimitExceeded { .. } => "CONCURRENCY_EXCEEDED",
            ConcurrencyError::Closed => "INTERNAL_ERROR",
        }
    }
}

impl ConcurrencyController {
    /// 创建新的并发控制器
    pub fn new(config: ConcurrencyConfig) -> Self {
        let global_limit = if config.global_limit <= 0 {
            // 0或负数表示无限制，使用一个很大的数字
            10000
        } else {
            config.global_limit as usize
        };

        Self {
            global_semaphore: Arc::new(Semaphore::new(global_limit)),
            group_semaphores: Arc::new(Mutex::new(HashMap::new())),
            environment_semaphores: Arc::new(Mutex::new(HashMap::new())),
            config,
        }
    }

    /// 获取执行许可（根据配置策略处理）
    pub async fn acquire(
        &self,
        group_id: Option<&str>,
        environment: Option<&str>,
    ) -> Result<ConcurrencyPermit, ConcurrencyError> {
        match self.config.strategy {
            ConcurrencyStrategy::Reject => {
                // 拒绝策略：非阻塞获取，立即返回
                self.try_acquire_nowait(group_id, environment).await
            }
            ConcurrencyStrategy::Wait => {
                // 等待策略：等待指定时间后超时
                self.acquire_with_timeout(group_id, environment).await
            }
            ConcurrencyStrategy::Queue => {
                // 排队策略：放入队列（暂未实现，回退到 Wait）
                warn!("Queue strategy not fully implemented, falling back to Wait");
                self.acquire_with_timeout(group_id, environment).await
            }
        }
    }

    /// 非阻塞尝试获取许可（用于 Reject 策略）
    pub async fn try_acquire_nowait(
        &self,
        group_id: Option<&str>,
        environment: Option<&str>,
    ) -> Result<ConcurrencyPermit, ConcurrencyError> {
        // 1. 尝试获取全局许可（非阻塞）
        let global_permit = match self.global_semaphore.clone().try_acquire_owned() {
            Ok(permit) => Some(permit),
            Err(_) => {
                return Err(ConcurrencyError::Rejected {
                    scope_type: "global".to_string(),
                    scope_value: format!("limit: {}", self.config.global_limit),
                    strategy: ConcurrencyStrategy::Reject,
                });
            }
        };

        debug!("Acquired global concurrency permit (non-blocking)");

        // 2. 获取分组许可（非阻塞）
        let group_permit = if let Some(gid) = group_id {
            let group_sem = self.get_or_create_group_semaphore(gid).await;
            let limit = group_sem.limit;

            match group_sem.semaphore.clone().try_acquire_owned() {
                Ok(permit) => Some(permit),
                Err(_) => {
                    return Err(ConcurrencyError::Rejected {
                        scope_type: "group".to_string(),
                        scope_value: format!("{} (limit: {})", gid, limit),
                        strategy: ConcurrencyStrategy::Reject,
                    });
                }
            }
        } else {
            None
        };

        // 3. 获取环境许可（非阻塞）
        let env_permit = if let Some(env) = environment {
            let env_sem = self.get_or_create_env_semaphore(env).await;
            let limit = env_sem.limit;

            match env_sem.semaphore.clone().try_acquire_owned() {
                Ok(permit) => Some(permit),
                Err(_) => {
                    return Err(ConcurrencyError::Rejected {
                        scope_type: "environment".to_string(),
                        scope_value: format!("{} (limit: {})", env, limit),
                        strategy: ConcurrencyStrategy::Reject,
                    });
                }
            }
        } else {
            None
        };

        debug!(
            group_id = group_id,
            environment = environment,
            "Concurrency permit acquired (non-blocking)"
        );

        Ok(ConcurrencyPermit::new(global_permit, group_permit, env_permit))
    }

    /// 带超时获取许可（用于 Wait 策略）
    async fn acquire_with_timeout(
        &self,
        group_id: Option<&str>,
        environment: Option<&str>,
    ) -> Result<ConcurrencyPermit, ConcurrencyError> {
        let timeout = Duration::from_secs(self.config.acquire_timeout_secs);

        // 1. 获取全局许可
        let global_permit =
            tokio::time::timeout(timeout, self.global_semaphore.clone().acquire_owned())
                .await
                .map_err(|_| ConcurrencyError::AcquireTimeout {
                    resource: "global".to_string(),
                })?
                .map_err(|_| ConcurrencyError::Closed)?;

        debug!("Acquired global concurrency permit");

        // 2. 获取分组许可
        let group_permit = if let Some(gid) = group_id {
            let group_sem = self.get_or_create_group_semaphore(gid).await;
            let limit = group_sem.limit;

            match tokio::time::timeout(timeout, group_sem.semaphore.clone().acquire_owned()).await {
                Ok(Ok(permit)) => Some(permit),
                Ok(Err(_)) => {
                    return Err(ConcurrencyError::Closed);
                }
                Err(_) => {
                    return Err(ConcurrencyError::AcquireTimeout {
                        resource: format!("group: {} (limit: {})", gid, limit),
                    });
                }
            }
        } else {
            None
        };

        // 3. 获取环境许可
        let env_permit = if let Some(env) = environment {
            let env_sem = self.get_or_create_env_semaphore(env).await;
            let limit = env_sem.limit;

            match tokio::time::timeout(timeout, env_sem.semaphore.clone().acquire_owned()).await {
                Ok(Ok(permit)) => Some(permit),
                Ok(Err(_)) => {
                    return Err(ConcurrencyError::Closed);
                }
                Err(_) => {
                    return Err(ConcurrencyError::AcquireTimeout {
                        resource: format!("environment: {} (limit: {})", env, limit),
                    });
                }
            }
        } else {
            None
        };

        debug!(group_id = group_id, environment = environment, "Concurrency permit acquired");

        Ok(ConcurrencyPermit::new(Some(global_permit), group_permit, env_permit))
    }

    /// 获取或创建分组信号量
    async fn get_or_create_group_semaphore(&self, group_id: &str) -> GroupSemaphore {
        let mut groups = self.group_semaphores.lock().await;

        if let Some(sem) = groups.get(group_id) {
            return sem.clone();
        }

        let limit = self.config.group_limit.unwrap_or(self.config.global_limit);
        let semaphore = Arc::new(Semaphore::new(limit.max(1) as usize));

        let sem = GroupSemaphore {
            semaphore: semaphore.clone(),
            limit,
        };

        groups.insert(group_id.to_string(), sem.clone());
        sem
    }

    /// 获取或创建环境信号量
    async fn get_or_create_env_semaphore(&self, environment: &str) -> EnvironmentSemaphore {
        let mut envs = self.environment_semaphores.lock().await;

        if let Some(sem) = envs.get(environment) {
            return sem.clone();
        }

        // 生产环境使用更严格的限制
        let limit = if environment == "production" {
            self.config.production_limit.unwrap_or(
                self.config
                    .environment_limit
                    .unwrap_or(self.config.global_limit),
            )
        } else {
            self.config
                .environment_limit
                .unwrap_or(self.config.global_limit)
        };

        let semaphore = Arc::new(Semaphore::new(limit.max(1) as usize));

        let sem = EnvironmentSemaphore {
            semaphore: semaphore.clone(),
            limit,
        };

        envs.insert(environment.to_string(), sem.clone());
        sem
    }

    /// 获取当前并发统计
    pub async fn get_stats(&self) -> ConcurrencyStats {
        let global_available = self.global_semaphore.available_permits();
        let groups = self.group_semaphores.lock().await;
        let envs = self.environment_semaphores.lock().await;

        let group_stats = groups
            .iter()
            .map(|(k, v)| {
                let used = v.limit - v.semaphore.available_permits() as i32;
                (
                    k.clone(),
                    ScopeConcurrencyStats {
                        limit: v.limit,
                        used,
                        available: v.semaphore.available_permits() as i32,
                        utilization_percent: if v.limit > 0 {
                            (used as f64 / v.limit as f64 * 100.0) as f32
                        } else {
                            0.0
                        },
                    },
                )
            })
            .collect();

        let env_stats = envs
            .iter()
            .map(|(k, v)| {
                let used = v.limit - v.semaphore.available_permits() as i32;
                (
                    k.clone(),
                    ScopeConcurrencyStats {
                        limit: v.limit,
                        used,
                        available: v.semaphore.available_permits() as i32,
                        utilization_percent: if v.limit > 0 {
                            (used as f64 / v.limit as f64 * 100.0) as f32
                        } else {
                            0.0
                        },
                    },
                )
            })
            .collect();

        let global_used = self.config.global_limit - global_available as i32;
        ConcurrencyStats {
            global_limit: self.config.global_limit,
            global_used,
            global_available: global_available as i32,
            global_utilization_percent: if self.config.global_limit > 0 {
                (global_used as f64 / self.config.global_limit as f64 * 100.0) as f32
            } else {
                0.0
            },
            strategy: self.config.strategy,
            group_stats,
            environment_stats: env_stats,
        }
    }

    /// 获取配置（只读）
    pub fn get_config(&self) -> &ConcurrencyConfig {
        &self.config
    }
}

/// 并发统计
#[derive(Debug, Clone, serde::Serialize)]
pub struct ConcurrencyStats {
    pub global_limit: i32,
    pub global_used: i32,
    pub global_available: i32,
    pub global_utilization_percent: f32,
    pub strategy: ConcurrencyStrategy,
    pub group_stats: HashMap<String, ScopeConcurrencyStats>,
    pub environment_stats: HashMap<String, ScopeConcurrencyStats>,
}

/// 作用域级别的并发统计
#[derive(Debug, Clone, serde::Serialize)]
pub struct ScopeConcurrencyStats {
    pub limit: i32,
    pub used: i32,
    pub available: i32,
    pub utilization_percent: f32,
}

/// 速率限制器（滑动窗口）
#[derive(Clone)]
pub struct RateLimiter {
    /// 请求时间戳记录
    requests: Arc<Mutex<Vec<std::time::Instant>>>,
    /// 时间窗口
    window_duration: Duration,
    /// 最大请求数
    max_requests: usize,
}

impl RateLimiter {
    /// 创建新的速率限制器
    pub fn new(window_duration_secs: u64, max_requests: usize) -> Self {
        Self {
            requests: Arc::new(Mutex::new(Vec::new())),
            window_duration: Duration::from_secs(window_duration_secs),
            max_requests,
        }
    }

    /// 检查是否允许请求
    pub async fn check(&self) -> Result<(), RateLimitError> {
        let mut requests = self.requests.lock().await;
        let now = std::time::Instant::now();

        // 清理过期的请求记录
        requests.retain(|&timestamp| now.duration_since(timestamp) < self.window_duration);

        // 检查是否超过限制
        if requests.len() >= self.max_requests {
            warn!(
                current_requests = requests.len(),
                max_requests = self.max_requests,
                "Rate limit exceeded"
            );
            return Err(RateLimitError::LimitExceeded {
                max_requests: self.max_requests,
                window_duration_secs: self.window_duration.as_secs(),
            });
        }

        // 记录当前请求
        requests.push(now);
        Ok(())
    }

    /// 获取当前统计
    pub async fn get_stats(&self) -> RateLimitStats {
        let requests = self.requests.lock().await;
        let now = std::time::Instant::now();
        let active_requests = requests
            .iter()
            .filter(|&&timestamp| now.duration_since(timestamp) < self.window_duration)
            .count();

        RateLimitStats {
            max_requests: self.max_requests,
            current_requests: active_requests,
            window_duration_secs: self.window_duration.as_secs(),
        }
    }
}

/// 速率限制错误
#[derive(Debug, thiserror::Error)]
pub enum RateLimitError {
    #[error("Rate limit exceeded: {max_requests} requests per {window_duration_secs} seconds")]
    LimitExceeded {
        max_requests: usize,
        window_duration_secs: u64,
    },
}

/// 速率限制统计
#[derive(Debug, Clone, serde::Serialize)]
pub struct RateLimitStats {
    pub max_requests: usize,
    pub current_requests: usize,
    pub window_duration_secs: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_concurrency_controller() {
        let config = ConcurrencyConfig {
            global_limit: 2,
            strategy: ConcurrencyStrategy::Reject,
            ..Default::default()
        };
        let controller = ConcurrencyController::new(config);

        // 获取两个许可应该成功
        let _permit1 = controller.acquire(None, None).await.unwrap();
        let _permit2 = controller.acquire(None, None).await.unwrap();

        // 第三次获取应该失败（达到限制）
        let result = controller.acquire(None, None).await;
        assert!(result.is_err(), "Third acquire should fail due to limit");
    }

    #[tokio::test]
    async fn test_rate_limiter() {
        let limiter = RateLimiter::new(1, 2); // 1秒内最多2个请求

        // 前两个请求应该成功
        assert!(limiter.check().await.is_ok());
        assert!(limiter.check().await.is_ok());

        // 第三个请求应该失败
        assert!(limiter.check().await.is_err());

        // 等待窗口过去
        tokio::time::sleep(Duration::from_secs(2)).await;

        // 现在应该可以再次请求
        assert!(limiter.check().await.is_ok());
    }
}
