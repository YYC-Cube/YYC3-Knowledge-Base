//! 配置系统
//! 从环境变量加载所有配置，使用 Secret 包装敏感信息

use config::{Config, ConfigError, Environment};
use secrecy::{ExposeSecret, SecretString};
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct ServerConfig {
    /// 监听地址，例如 "0.0.0.0:3000"
    pub addr: String,
    /// 优雅关闭超时时间（秒）
    pub graceful_shutdown_timeout_secs: u64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DatabaseConfig {
    /// 数据库连接 URL（使用 Secret 包装，防止日志泄露）
    pub url: SecretString,
    /// 最大连接数
    pub max_connections: u32,
    /// 最小连接数
    pub min_connections: u32,
    /// 获取连接超时时间（秒）
    pub acquire_timeout_secs: u64,
    /// 空闲连接超时时间（秒）
    pub idle_timeout_secs: u64,
    /// 连接最大生命周期（秒）
    pub max_lifetime_secs: u64,
    /// 数据库不存在时是否自动创建（生产环境应设为 false）
    #[serde(default = "default_auto_create_db")]
    pub auto_create_if_missing: bool,
}

fn default_auto_create_db() -> bool {
    true
}

#[derive(Debug, Clone, Deserialize)]
pub struct LoggingConfig {
    /// 日志级别: trace, debug, info, warn, error
    pub level: String,
    /// 日志格式: json, pretty
    pub format: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SecurityConfig {
    /// JWT 密钥（使用 Secret 包装，防止日志泄露）
    pub jwt_secret: SecretString,
    /// 访问令牌过期时间（秒）
    pub access_token_exp_secs: u64,
    /// 刷新令牌过期时间（秒）
    pub refresh_token_exp_secs: u64,
    /// 密码最小长度
    pub password_min_length: usize,
    /// 密码必须包含大写字母
    pub password_require_uppercase: bool,
    /// 密码必须包含数字
    pub password_require_digit: bool,
    /// 密码必须包含特殊字符
    pub password_require_special: bool,
    /// 最大登录失败次数
    pub max_login_attempts: u32,
    /// 登录锁定持续时间（秒）
    pub login_lockout_duration_secs: u64,
    /// 速率限制（每秒请求数）
    pub rate_limit_rps: u64,
    /// 是否信任 X-Forwarded-For 头
    pub trust_proxy: bool,
    /// IP 白名单（可选）
    pub allowed_ips: Option<Vec<String>>,
    /// Runner API Key（使用 Secret 包装，用于 Runner 注册和心跳鉴权）
    #[serde(default)]
    pub runner_api_key: Option<SecretString>,

    /// Runner Webhook HMAC 签名密钥（使用 Secret 包装）
    #[serde(default)]
    pub runner_webhook_hmac_secret: Option<SecretString>,

    /// Runner Webhook 签名时间戳最大偏差（秒）
    #[serde(default = "default_webhook_max_skew_secs")]
    pub runner_webhook_max_skew_secs: u64,

    /// Runner Webhook Nonce 有效期（秒）
    #[serde(default = "default_webhook_nonce_ttl_secs")]
    pub runner_webhook_nonce_ttl_secs: u64,

    /// 登录失败速率限制：时间窗口内最大失败次数
    #[serde(default = "default_login_rate_limit_max_attempts")]
    pub login_rate_limit_max_attempts: u32,

    /// 登录失败速率限制：滑动窗口时长（秒）
    #[serde(default = "default_login_rate_limit_window_secs")]
    pub login_rate_limit_window_secs: u64,
}

fn default_webhook_max_skew_secs() -> u64 {
    300
}

fn default_webhook_nonce_ttl_secs() -> u64 {
    600
}

fn default_login_rate_limit_max_attempts() -> u32 {
    10
}

fn default_login_rate_limit_window_secs() -> u64 {
    300
}

/// Metrics 暴露配置
#[derive(Debug, Clone, Deserialize)]
pub struct MetricsConfig {
    /// 是否启用 metrics 端点
    #[serde(default = "default_true")]
    pub enabled: bool,
    /// 独立绑定地址（可选，如 "127.0.0.1:9090"）
    #[serde(default)]
    pub bind_addr: Option<String>,
    /// 是否要求 IP 白名单
    #[serde(default)]
    pub require_whitelist: bool,
}

fn default_true() -> bool {
    true
}

impl Default for MetricsConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            bind_addr: None,
            require_whitelist: false,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct SshConfig {
    /// 默认 SSH 用户名
    pub default_username: String,
    /// 默认 SSH 密码（使用 Secret 包装，防止日志泄露）
    pub default_password: SecretString,
    /// 默认 SSH 私钥（可选，使用 Secret 包装）
    pub default_private_key: Option<SecretString>,
    /// 私钥密码（可选，使用 Secret 包装）
    pub private_key_passphrase: Option<SecretString>,
    /// 连接超时（秒）
    pub connect_timeout_secs: u64,
    /// 握手超时（秒）
    pub handshake_timeout_secs: u64,
    /// 命令执行默认超时（秒）
    pub command_timeout_secs: u64,
    /// 主机密钥验证策略（strict/accept/disabled）
    #[serde(default = "default_host_key_verification")]
    pub host_key_verification: String,
    /// known_hosts 文件路径（可选）
    #[serde(default)]
    pub known_hosts_file: Option<String>,
}

/// 默认主机密钥验证策略：accept（首次连接时接受新密钥）
fn default_host_key_verification() -> String {
    "accept".to_string()
}

#[derive(Debug, Clone, Deserialize)]
pub struct AppConfig {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub logging: LoggingConfig,
    pub security: SecurityConfig,
    pub ssh: SshConfig,
    pub concurrency: ConcurrencyConfig,
    pub rabbitmq: RabbitMqConfig,
    /// Runner Docker 配置
    #[serde(default)]
    pub runner_docker: RunnerDockerConfig,
    /// Metrics 暴露配置
    #[serde(default)]
    pub metrics: MetricsConfig,
}

/// 并发控制配置
#[derive(Debug, Clone, Deserialize)]
pub struct ConcurrencyConfig {
    /// 全局并发上限
    pub global_limit: i32,
    /// 每分组并发上限
    pub group_limit: Option<i32>,
    /// 每环境并发上限
    pub environment_limit: Option<i32>,
    /// 生产环境更严格的并发限制
    pub production_limit: Option<i32>,
    /// 获取许可的超时时间（秒）
    pub acquire_timeout_secs: u64,
    /// 超限时的处理策略（reject/wait/queue）
    pub strategy: String,
    /// 排队策略的最大队列长度
    pub queue_max_length: usize,
}

/// RabbitMQ 配置
#[derive(Debug, Clone, Deserialize)]
pub struct RabbitMqConfig {
    /// AMQP 连接 URL
    pub amqp_url: SecretString,
    /// Virtual host
    #[serde(default = "default_rabbitmq_vhost")]
    pub vhost: String,
    /// 构建任务交换机
    #[serde(default = "default_build_exchange")]
    pub build_exchange: String,
    /// Runner 交换机
    #[serde(default = "default_runner_exchange")]
    pub runner_exchange: String,
    /// 连接池大小
    #[serde(default = "default_pool_size")]
    pub pool_size: u32,
    /// 发布确认超时（秒）
    #[serde(default = "default_publish_timeout")]
    pub publish_timeout_secs: u64,
}

/// Runner Docker 配置（从控制面分发给 Runner）
#[derive(Debug, Clone, Deserialize)]
pub struct RunnerDockerConfig {
    /// 是否启用 Docker 执行
    #[serde(default)]
    pub enabled: bool,

    /// 默认 Docker 镜像
    #[serde(default = "default_runner_docker_image")]
    pub default_image: String,

    /// 按构建类型指定的镜像
    #[serde(default)]
    pub images_by_type: std::collections::HashMap<String, String>,

    /// 内存限制（GB）
    #[serde(default)]
    pub memory_limit_gb: Option<i64>,

    /// CPU 份额
    #[serde(default)]
    pub cpu_shares: Option<i64>,

    /// 最大进程数
    #[serde(default)]
    pub pids_limit: Option<i64>,

    /// 默认超时（秒）
    #[serde(default = "default_runner_docker_timeout")]
    pub default_timeout_secs: u64,

    /// 按 Runner 名称的配置覆盖
    #[serde(default)]
    pub per_runner: std::collections::HashMap<String, RunnerDockerOverride>,

    /// 按能力标签的配置覆盖
    #[serde(default)]
    pub per_capability: std::collections::HashMap<String, RunnerDockerOverride>,
}

/// 单个 Runner 的 Docker 配置覆盖
#[derive(Debug, Clone, Deserialize)]
pub struct RunnerDockerOverride {
    /// 覆盖是否启用
    #[serde(default)]
    pub enabled: Option<bool>,

    /// 覆盖默认镜像
    #[serde(default)]
    pub default_image: Option<String>,

    /// 覆盖内存限制（GB）
    #[serde(default)]
    pub memory_limit_gb: Option<i64>,

    /// 覆盖 CPU 份额
    #[serde(default)]
    pub cpu_shares: Option<i64>,

    /// 覆盖最大进程数
    #[serde(default)]
    pub pids_limit: Option<i64>,

    /// 覆盖超时（秒）
    #[serde(default)]
    pub default_timeout_secs: Option<u64>,
}

impl RunnerDockerConfig {
    /// 获取指定 Runner 的配置（考虑名称和能力标签的覆盖）
    pub fn get_config_for_runner(
        &self,
        runner_name: &str,
        capabilities: &[String],
    ) -> RunnerDockerEffectiveConfig {
        let mut config = RunnerDockerEffectiveConfig {
            enabled: self.enabled,
            default_image: self.default_image.clone(),
            memory_limit_gb: self.memory_limit_gb,
            cpu_shares: self.cpu_shares,
            pids_limit: self.pids_limit,
            default_timeout_secs: self.default_timeout_secs,
        };

        // 优先级：Runner 名称 > 能力标签 > 默认配置

        // 首先应用按能力标签的覆盖
        for capability in capabilities {
            if let Some(override_cfg) = self.per_capability.get(capability) {
                override_cfg.apply_to(&mut config);
            }
        }

        // 然后应用按 Runner 名称的覆盖（优先级更高）
        if let Some(override_cfg) = self.per_runner.get(runner_name) {
            override_cfg.apply_to(&mut config);
        }

        config
    }
}

impl RunnerDockerOverride {
    fn apply_to(&self, config: &mut RunnerDockerEffectiveConfig) {
        if let Some(enabled) = self.enabled {
            config.enabled = enabled;
        }
        if let Some(ref image) = self.default_image {
            config.default_image = image.clone();
        }
        if let Some(memory) = self.memory_limit_gb {
            config.memory_limit_gb = Some(memory);
        }
        if let Some(cpu) = self.cpu_shares {
            config.cpu_shares = Some(cpu);
        }
        if let Some(pids) = self.pids_limit {
            config.pids_limit = Some(pids);
        }
        if let Some(timeout) = self.default_timeout_secs {
            config.default_timeout_secs = timeout;
        }
    }
}

/// 应用覆盖后的有效配置
#[derive(Debug, Clone)]
pub struct RunnerDockerEffectiveConfig {
    pub enabled: bool,
    pub default_image: String,
    pub memory_limit_gb: Option<i64>,
    pub cpu_shares: Option<i64>,
    pub pids_limit: Option<i64>,
    pub default_timeout_secs: u64,
}

fn default_runner_docker_image() -> String {
    "ubuntu:22.04".to_string()
}

fn default_runner_docker_timeout() -> u64 {
    1800
}

impl Default for RunnerDockerConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            default_image: default_runner_docker_image(),
            images_by_type: std::collections::HashMap::new(),
            memory_limit_gb: Some(4),
            cpu_shares: Some(1024),
            pids_limit: Some(1024),
            default_timeout_secs: default_runner_docker_timeout(),
            per_runner: std::collections::HashMap::new(),
            per_capability: std::collections::HashMap::new(),
        }
    }
}

fn default_rabbitmq_vhost() -> String {
    "/".to_string()
}

fn default_build_exchange() -> String {
    "ops.build".to_string()
}

fn default_runner_exchange() -> String {
    "ops.runner".to_string()
}

fn default_pool_size() -> u32 {
    5
}

fn default_publish_timeout() -> u64 {
    10
}

impl AppConfig {
    /// 从环境变量加载配置
    pub fn from_env() -> Result<Self, ConfigError> {
        let mut settings = Config::builder();

        // 添加默认配置
    settings = settings
        .set_default("server.addr", "0.0.0.0:3000")?
        .set_default("server.graceful_shutdown_timeout_secs", 30)?
        .set_default("database.max_connections", 10)?
        .set_default("database.min_connections", 2)?
        .set_default("database.acquire_timeout_secs", 30)?
        .set_default("database.idle_timeout_secs", 600)?
        .set_default("database.max_lifetime_secs", 1800)?
        .set_default("database.auto_create_if_missing", true)?
        .set_default("logging.level", "info")?
        .set_default("logging.format", "json")?
        .set_default("security.jwt_secret", "change-this-secret-in-production-min-32-chars!")?
        .set_default("security.access_token_exp_secs", 900)?
        .set_default("security.refresh_token_exp_secs", 604800)?
        .set_default("security.password_min_length", 8)?
        .set_default("security.password_require_uppercase", true)?
        .set_default("security.password_require_digit", true)?
        .set_default("security.password_require_special", false)?
        .set_default("security.max_login_attempts", 5)?
        .set_default("security.login_lockout_duration_secs", 1800)?
        .set_default("security.rate_limit_rps", 100)?
        .set_default("security.trust_proxy", true)?
        .set_default("security.login_rate_limit_max_attempts", 10)?
        .set_default("security.login_rate_limit_window_secs", 300)?
        // Metrics 默认配置
        .set_default("metrics.enabled", true)?
        .set_default("metrics.require_whitelist", false)?
            // SSH 默认配置
            .set_default("ssh.default_username", "root")?
            .set_default("ssh.default_password", "")?
            .set_default("ssh.connect_timeout_secs", 10)?
            .set_default("ssh.handshake_timeout_secs", 10)?
            .set_default("ssh.command_timeout_secs", 300)?
            // 并发控制默认配置
            .set_default("concurrency.global_limit", 50)?
            .set_default("concurrency.group_limit", 10)?
            .set_default("concurrency.environment_limit", 20)?
            .set_default("concurrency.production_limit", 5)?
            .set_default("concurrency.acquire_timeout_secs", 300)?
            .set_default("concurrency.strategy", "wait")?
            .set_default("concurrency.queue_max_length", 100)?
            // RabbitMQ 默认配置
            .set_default("rabbitmq.amqp_url", "amqp://guest:guest@localhost:5672/%2F")?
            .set_default("rabbitmq.vhost", "/")?
            .set_default("rabbitmq.build_exchange", "ops.build")?
            .set_default("rabbitmq.runner_exchange", "ops.runner")?
            .set_default("rabbitmq.pool_size", 5)?
            .set_default("rabbitmq.publish_timeout_secs", 10)?;

        // 从环境变量加载配置（前缀为 OPS_）
        settings = settings.add_source(
            Environment::with_prefix("OPS")
                .prefix_separator("_")
                .separator("__")
                .try_parsing(true),
        );

        let config: AppConfig = settings.build()?.try_deserialize()?;

        // 验证配置
        config.validate()?;

        Ok(config)
    }

    /// 验证配置合法性
    fn validate(&self) -> Result<(), ConfigError> {
        // 验证端口范围
        if let Some(port_str) = self.server.addr.split(':').next_back() {
            if let Ok(port) = port_str.parse::<u16>() {
                if port < 1024 {
                    return Err(ConfigError::Message("Server port should be >= 1024".to_string()));
                }
            }
        }

        // 验证日志级别
        match self.logging.level.to_lowercase().as_str() {
            "trace" | "debug" | "info" | "warn" | "error" => {}
            _ => {
                return Err(ConfigError::Message(format!(
                    "Invalid log level: {}. Must be one of: trace, debug, info, warn, error",
                    self.logging.level
                )))
            }
        }

        // 验证日志格式
        match self.logging.format.to_lowercase().as_str() {
            "json" | "pretty" => {}
            _ => {
                return Err(ConfigError::Message(format!(
                    "Invalid log format: {}. Must be one of: json, pretty",
                    self.logging.format
                )))
            }
        }

        // 验证数据库连接池配置
        if self.database.max_connections < self.database.min_connections {
            return Err(ConfigError::Message(
                "max_connections must be >= min_connections".to_string(),
            ));
        }

        // 验证 JWT 密钥长度（至少 32 字符）
        if self.security.jwt_secret.expose_secret().len() < 32 {
            return Err(ConfigError::Message(
                "JWT secret must be at least 32 characters long".to_string(),
            ));
        }

        // 验证令牌过期时间
        if self.security.access_token_exp_secs < 60 || self.security.access_token_exp_secs > 86400 {
            return Err(ConfigError::Message(
                "access_token_exp_secs must be between 60 and 86400 (1 minute to 24 hours)"
                    .to_string(),
            ));
        }

        if self.security.refresh_token_exp_secs < 3600
            || self.security.refresh_token_exp_secs > 2592000
        {
            return Err(ConfigError::Message(
                "refresh_token_exp_secs must be between 3600 and 2592000 (1 hour to 30 days)"
                    .to_string(),
            ));
        }

        // 验证密码策略
        if self.security.password_min_length < 6 || self.security.password_min_length > 128 {
            return Err(ConfigError::Message(
                "password_min_length must be between 6 and 128".to_string(),
            ));
        }

        // 验证登录失败锁定配置
        if self.security.max_login_attempts < 1 || self.security.max_login_attempts > 20 {
            return Err(ConfigError::Message(
                "max_login_attempts must be between 1 and 20".to_string(),
            ));
        }

        // 验证并发策略
        match self.concurrency.strategy.to_lowercase().as_str() {
            "reject" | "wait" | "queue" => {}
            _ => {
                return Err(ConfigError::Message(format!(
                    "Invalid concurrency strategy: {}. Must be one of: reject, wait, queue",
                    self.concurrency.strategy
                )))
            }
        }

        // 验证并发限制
        if self.concurrency.global_limit < 0 || self.concurrency.global_limit > 1000 {
            return Err(ConfigError::Message(
                "concurrency.global_limit must be between 0 and 1000".to_string(),
            ));
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serial_test::serial;

    #[test]
    #[serial]
    fn test_config_defaults() {
        // 清理所有可能的环境变量
        std::env::remove_var("OPS_DATABASE__URL");
        std::env::remove_var("OPS_SERVER__ADDR");
        std::env::remove_var("OPS_LOGGING__LEVEL");
        std::env::remove_var("OPS_LOGGING__FORMAT");
        std::env::remove_var("OPS_SECURITY__JWT_SECRET");

        // 设置测试环境变量
        std::env::set_var("OPS_DATABASE__URL", "postgresql://user:pass@localhost/db");

        let config = AppConfig::from_env().unwrap();
        assert_eq!(config.server.addr, "0.0.0.0:3000");
        assert_eq!(config.logging.level, "info");

        std::env::remove_var("OPS_DATABASE__URL");
    }

    #[test]
    #[serial]
    fn test_config_validation_invalid_port() {
        // 清理环境变量
        std::env::remove_var("OPS_SERVER__ADDR");
        std::env::remove_var("OPS_SERVER__ADDR");
        std::env::remove_var("OPS_DATABASE__URL");
        std::env::remove_var("OPS_DATABASE__URL");

        std::env::set_var("OPS_SERVER__ADDR", "0.0.0.0:80");
        std::env::set_var("OPS_DATABASE__URL", "postgresql://user:pass@localhost/db");

        let result = AppConfig::from_env();
        assert!(result.is_err());

        std::env::remove_var("OPS_SERVER__ADDR");
        std::env::remove_var("OPS_DATABASE__URL");
    }

    #[test]
    #[serial]
    fn test_config_validation_invalid_log_level() {
        // 清理环境变量
        std::env::remove_var("OPS_LOGGING__LEVEL");
        std::env::remove_var("OPS_LOGGING__LEVEL");
        std::env::remove_var("OPS_DATABASE__URL");
        std::env::remove_var("OPS_DATABASE__URL");

        std::env::set_var("OPS_LOGGING__LEVEL", "invalid");
        std::env::set_var("OPS_DATABASE__URL", "postgresql://user:pass@localhost/db");

        let result = AppConfig::from_env();
        assert!(result.is_err());

        std::env::remove_var("OPS_LOGGING__LEVEL");
        std::env::remove_var("OPS_DATABASE__URL");
    }
}
