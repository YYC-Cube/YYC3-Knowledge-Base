//! Runner 配置管理

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;

/// Runner 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunnerConfig {
    /// Runner 基本信息
    pub runner: RunnerInfo,

    /// 控制面配置
    pub control_plane: ControlPlaneConfig,

    /// RabbitMQ 配置
    pub message_queue: MessageQueueConfig,

    /// 执行配置
    pub execution: ExecutionConfig,
}

/// Runner 基本信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunnerInfo {
    /// Runner 名称（唯一标识）
    pub name: String,

    /// Runner 标签/能力
    #[serde(default)]
    pub capabilities: Vec<String>,

    /// 是否支持 Docker 执行
    #[serde(default = "default_true")]
    pub docker_supported: bool,

    /// 最大并发任务数
    #[serde(default = "default_max_concurrent")]
    pub max_concurrent_jobs: usize,

    /// 出站白名单（域名）
    #[serde(default)]
    pub outbound_allowlist: Vec<String>,

    /// 环境类型（dev/staging/prod）
    pub environment: String,
}

fn default_true() -> bool {
    true
}

fn default_max_concurrent() -> usize {
    2
}

/// 控制面配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ControlPlaneConfig {
    /// 控制 API 地址
    pub api_url: String,

    /// Runner API Key（用于注册和状态更新）
    pub api_key: String,

    /// 心跳间隔（秒）
    #[serde(default = "default_heartbeat_interval")]
    pub heartbeat_interval_secs: u64,
}

fn default_heartbeat_interval() -> u64 {
    30
}

/// RabbitMQ 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageQueueConfig {
    /// AMQP 地址
    pub amqp_url: String,

    /// 虚拟主机
    #[serde(default = "default_vhost")]
    pub vhost: String,

    /// 交换机名称
    #[serde(default = "default_exchange")]
    pub exchange: String,

    /// 队列命名前缀
    #[serde(default = "default_queue_prefix")]
    pub queue_prefix: String,

    /// 预取消息数量
    #[serde(default = "default_prefetch")]
    pub prefetch: u16,
}

fn default_vhost() -> String {
    "/".to_string()
}

fn default_exchange() -> String {
    "ops.build".to_string()
}

fn default_queue_prefix() -> String {
    "ops-runner".to_string()
}

fn default_prefetch() -> u16 {
    1
}

/// 执行配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionConfig {
    /// workspace 基础目录
    #[serde(default = "default_workspace_dir")]
    pub workspace_base_dir: String,

    /// 任务执行超时（秒）
    #[serde(default = "default_task_timeout")]
    pub task_timeout_secs: u64,

    /// 步骤执行超时（秒）
    #[serde(default = "default_step_timeout")]
    pub step_timeout_secs: u64,

    /// 是否清理 workspace
    #[serde(default = "default_true")]
    pub cleanup_workspace: bool,

    /// 构建缓存目录
    #[serde(default)]
    pub cache_dir: Option<String>,

    /// Docker 配置
    #[serde(default)]
    pub docker: Option<DockerConfig>,
}

/// Docker 容器执行配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DockerConfig {
    /// 是否启用 Docker 执行
    #[serde(default)]
    pub enabled: bool,

    /// 默认 Docker 镜像
    #[serde(default = "default_docker_image")]
    pub default_image: String,

    /// 按步骤类型指定的自定义镜像
    #[serde(default)]
    pub custom_images: HashMap<String, String>,

    /// 资源限制
    #[serde(default)]
    pub resource_limits: DockerResourceLimits,

    /// 安全配置
    #[serde(default)]
    pub security: DockerSecurityConfig,

    /// 网络模式 (bridge, host, none)
    #[serde(default)]
    pub network_mode: Option<String>,

    /// 默认超时（秒）
    #[serde(default = "default_docker_timeout")]
    pub default_timeout: u64,
}

impl Default for DockerConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            default_image: default_docker_image(),
            custom_images: HashMap::new(),
            resource_limits: DockerResourceLimits::default(),
            security: DockerSecurityConfig::default(),
            network_mode: None,
            default_timeout: default_docker_timeout(),
        }
    }
}

/// Docker 资源限制
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DockerResourceLimits {
    /// 内存限制（GB）
    #[serde(default)]
    pub memory: Option<i64>,

    /// 交换空间限制（GB）
    #[serde(default)]
    pub memory_swap: Option<i64>,

    /// CPU 配额（微秒，需要配合 period 使用）
    #[serde(default)]
    pub cpu_quota: Option<i64>,

    /// CPU 周期（微秒）
    #[serde(default)]
    pub cpu_period: Option<i64>,

    /// CPU 份额（相对权重，1024 为基准）
    #[serde(default)]
    pub cpu_shares: Option<i64>,

    /// 最大进程数
    #[serde(default)]
    pub pids_limit: Option<i64>,

    /// 文件描述符限制
    #[serde(default)]
    pub nofile: Option<i64>,

    /// 进程数限制
    #[serde(default)]
    pub nproc: Option<i64>,
}

impl Default for DockerResourceLimits {
    fn default() -> Self {
        Self {
            memory: Some(4), // 4GB
            memory_swap: None,
            cpu_quota: None,
            cpu_period: None,
            cpu_shares: Some(1024),
            pids_limit: Some(1024),
            nofile: Some(65536),
            nproc: Some(4096),
        }
    }
}

/// Docker 安全配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DockerSecurityConfig {
    /// 是否使用非 root 用户运行
    #[serde(default)]
    pub non_root: bool,

    /// 是否使用只读根文件系统
    #[serde(default)]
    pub read_only_rootfs: bool,

    /// 是否丢弃所有能力
    #[serde(default)]
    pub drop_all_capabilities: bool,

    /// 需要添加的能力
    #[serde(default)]
    pub add_capabilities: Vec<String>,

    /// 允许访问的设备
    #[serde(default)]
    pub allowed_devices: Vec<String>,
}

impl Default for DockerSecurityConfig {
    fn default() -> Self {
        Self {
            non_root: false,
            read_only_rootfs: false,
            drop_all_capabilities: true,
            add_capabilities: vec!["CAP_NET_BIND_SERVICE".to_string()],
            allowed_devices: Vec::new(),
        }
    }
}

impl DockerSecurityConfig {
    /// 获取需要添加的能力列表
    pub fn capabilities_to_add(&self) -> Vec<String> {
        if self.drop_all_capabilities {
            self.add_capabilities.clone()
        } else {
            Vec::new()
        }
    }
}

fn default_workspace_dir() -> String {
    "/tmp/ops-runner/workspace".to_string()
}

fn default_task_timeout() -> u64 {
    3600 // 1小时
}

fn default_step_timeout() -> u64 {
    600 // 10分钟
}

fn default_docker_image() -> String {
    "ubuntu:22.04".to_string()
}

fn default_docker_timeout() -> u64 {
    1800 // 30分钟
}

impl RunnerConfig {
    /// 从环境变量加载配置
    pub fn from_env() -> Result<Self> {
        Ok(Self {
            runner: RunnerInfo {
                name: std::env::var("RUNNER_NAME").context("RUNNER_NAME must be set")?,
                capabilities: std::env::var("RUNNER_CAPABILITIES")
                    .ok()
                    .unwrap_or_else(|| "node,java,rust,frontend,other".to_string())
                    .split(',')
                    .map(|s| s.trim().to_string())
                    .collect(),
                docker_supported: std::env::var("RUNNER_DOCKER_SUPPORTED")
                    .ok()
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(true),
                max_concurrent_jobs: std::env::var("RUNNER_MAX_CONCURRENT_JOBS")
                    .ok()
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(2),
                outbound_allowlist: std::env::var("RUNNER_OUTBOUND_ALLOWLIST")
                    .ok()
                    .unwrap_or_default()
                    .split(',')
                    .map(|s| s.trim().to_string())
                    .collect(),
                environment: std::env::var("RUNNER_ENVIRONMENT")
                    .unwrap_or_else(|_| "dev".to_string()),
            },
            control_plane: ControlPlaneConfig {
                api_url: std::env::var("CONTROL_PLANE_API_URL")
                    .context("CONTROL_PLANE_API_URL must be set")?,
                api_key: std::env::var("RUNNER_API_KEY").context("RUNNER_API_KEY must be set")?,
                heartbeat_interval_secs: std::env::var("RUNNER_HEARTBEAT_INTERVAL_SECS")
                    .ok()
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(30),
            },
            message_queue: MessageQueueConfig {
                amqp_url: std::env::var("RABBITMQ_AMQP_URL")
                    .context("RABBITMQ_AMQP_URL must be set")?,
                vhost: std::env::var("RABBITMQ_VHOST")
                    .ok()
                    .unwrap_or_else(|| "/".to_string()),
                exchange: std::env::var("RABBITMQ_EXCHANGE")
                    .ok()
                    .unwrap_or_else(|| "ops.build".to_string()),
                queue_prefix: std::env::var("RABBITMQ_QUEUE_PREFIX")
                    .ok()
                    .unwrap_or_else(|| "ops-runner".to_string()),
                prefetch: std::env::var("RABBITMQ_PREFETCH")
                    .ok()
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(1),
            },
            execution: ExecutionConfig {
                workspace_base_dir: std::env::var("RUNNER_WORKSPACE_DIR")
                    .ok()
                    .unwrap_or_else(|| "/tmp/ops-runner/workspace".to_string()),
                task_timeout_secs: std::env::var("RUNNER_TASK_TIMEOUT_SECS")
                    .ok()
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(3600),
                step_timeout_secs: std::env::var("RUNNER_STEP_TIMEOUT_SECS")
                    .ok()
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(600),
                cleanup_workspace: std::env::var("RUNNER_CLEANUP_WORKSPACE")
                    .ok()
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(true),
                cache_dir: std::env::var("RUNNER_CACHE_DIR").ok(),
                docker: None,
            },
        })
    }

    /// 应用从控制面接收的 Docker 配置
    pub fn apply_docker_config(&mut self, remote_config: common::messages::RunnerDockerConfig) {
        use std::collections::HashMap;

        let custom_images: HashMap<String, String> =
            remote_config.images_by_type.into_iter().collect();

        self.execution.docker = Some(DockerConfig {
            enabled: remote_config.enabled,
            default_image: remote_config.default_image,
            custom_images,
            resource_limits: DockerResourceLimits {
                memory: remote_config.memory_limit_gb,
                memory_swap: None,
                cpu_quota: None,
                cpu_period: None,
                cpu_shares: remote_config.cpu_shares,
                pids_limit: remote_config.pids_limit,
                nofile: Some(65536),
                nproc: Some(4096),
            },
            security: DockerSecurityConfig::default(),
            network_mode: None,
            default_timeout: remote_config.default_timeout_secs,
        });
    }

    /// 获取心跳间隔
    pub fn heartbeat_interval(&self) -> Duration {
        Duration::from_secs(self.control_plane.heartbeat_interval_secs)
    }

    /// 获取任务超时
    #[allow(dead_code)]
    pub fn task_timeout(&self) -> Duration {
        Duration::from_secs(self.execution.task_timeout_secs)
    }

    /// 获取步骤超时
    pub fn step_timeout(&self) -> Duration {
        Duration::from_secs(self.execution.step_timeout_secs)
    }

    /// 生成队列名称
    pub fn queue_name(&self) -> String {
        format!(
            "{}.{}.queue",
            self.message_queue.queue_prefix,
            self.runner.name.replace('-', "_")
        )
    }

    /// 生成广播模式 routing key（向后兼容）
    pub fn routing_key(&self, capability: &str) -> String {
        format!("build.{}", capability)
    }

    /// 生成定向 routing key（仅本 Runner 接收）
    pub fn routing_key_for_runner(&self, capability: &str) -> String {
        format!("build.{}.{}", capability, self.runner.name)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Mutex, OnceLock};

    fn env_lock() -> &'static Mutex<()> {
        static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
        LOCK.get_or_init(|| Mutex::new(()))
    }

    fn create_test_config() -> RunnerConfig {
        RunnerConfig {
            runner: RunnerInfo {
                name: "test-runner".to_string(),
                capabilities: vec!["node".to_string(), "rust".to_string()],
                docker_supported: true,
                max_concurrent_jobs: 4,
                outbound_allowlist: vec!["*.crates.io".to_string()],
                environment: "test".to_string(),
            },
            control_plane: ControlPlaneConfig {
                api_url: "http://localhost:3000".to_string(),
                api_key: "test-key".to_string(),
                heartbeat_interval_secs: 60,
            },
            message_queue: MessageQueueConfig {
                amqp_url: "amqp://localhost:5672".to_string(),
                vhost: "/".to_string(),
                exchange: "ops.build".to_string(),
                queue_prefix: "test-runner".to_string(),
                prefetch: 2,
            },
            execution: ExecutionConfig {
                workspace_base_dir: "/tmp/test-workspace".to_string(),
                task_timeout_secs: 1800,
                step_timeout_secs: 300,
                cleanup_workspace: true,
                cache_dir: Some("/tmp/cache".to_string()),
                docker: None,
            },
        }
    }

    #[test]
    fn test_queue_name_generation() {
        let config = create_test_config();
        assert_eq!(config.queue_name(), "test-runner.test_runner.queue");
    }

    #[test]
    fn test_queue_name_with_dashes() {
        let mut config = create_test_config();
        config.runner.name = "my-test-runner-01".to_string();
        assert_eq!(config.queue_name(), "test-runner.my_test_runner_01.queue");
    }

    #[test]
    fn test_routing_key_generation() {
        let config = create_test_config();
        assert_eq!(config.routing_key("node"), "build.node");
        assert_eq!(config.routing_key("rust"), "build.rust");
        assert_eq!(config.routing_key("java"), "build.java");
    }

    #[test]
    fn test_heartbeat_interval() {
        let config = create_test_config();
        assert_eq!(config.heartbeat_interval(), Duration::from_secs(60));
    }

    #[test]
    fn test_task_timeout() {
        let config = create_test_config();
        assert_eq!(config.task_timeout(), Duration::from_secs(1800));
    }

    #[test]
    fn test_step_timeout() {
        let config = create_test_config();
        assert_eq!(config.step_timeout(), Duration::from_secs(300));
    }

    #[test]
    fn test_default_values() {
        let _info = RunnerInfo {
            name: "test".to_string(),
            capabilities: vec![],
            docker_supported: false,
            max_concurrent_jobs: 0,
            outbound_allowlist: vec![],
            environment: "dev".to_string(),
        };

        // 默认值测试
        assert!(default_true());
        assert_eq!(default_max_concurrent(), 2);
        assert_eq!(default_heartbeat_interval(), 30);
        assert_eq!(default_vhost(), "/");
        assert_eq!(default_exchange(), "ops.build");
        assert_eq!(default_queue_prefix(), "ops-runner");
        assert_eq!(default_prefetch(), 1);
        assert_eq!(default_workspace_dir(), "/tmp/ops-runner/workspace");
        assert_eq!(default_task_timeout(), 3600);
        assert_eq!(default_step_timeout(), 600);
    }

    #[test]
    fn test_config_serialization() {
        let config = create_test_config();
        let json = serde_json::to_string(&config).unwrap();
        assert!(json.contains("\"name\":\"test-runner\""));
        assert!(json.contains("\"api_url\":\"http://localhost:3000\""));
        assert!(json.contains("\"amqp_url\":\"amqp://localhost:5672\""));
    }

    #[test]
    fn test_config_deserialization() {
        let json = r#"{
            "runner": {
                "name": "test-runner",
                "capabilities": ["node", "rust"],
                "docker_supported": true,
                "max_concurrent_jobs": 4,
                "outbound_allowlist": ["*.crates.io"],
                "environment": "test"
            },
            "control_plane": {
                "api_url": "http://localhost:3000",
                "api_key": "test-key",
                "heartbeat_interval_secs": 60
            },
            "message_queue": {
                "amqp_url": "amqp://localhost:5672"
            },
            "execution": {
                "task_timeout_secs": 1800,
                "step_timeout_secs": 300
            }
        }"#;

        let config: RunnerConfig = serde_json::from_str(json).unwrap();
        assert_eq!(config.runner.name, "test-runner");
        assert_eq!(config.runner.capabilities.len(), 2);
        assert_eq!(config.control_plane.api_url, "http://localhost:3000");
        assert_eq!(config.execution.task_timeout_secs, 1800);
    }

    #[test]
    fn test_from_env_missing_required() {
        let _guard = env_lock().lock().unwrap();
        // 清除环境变量
        std::env::remove_var("RUNNER_NAME");
        std::env::remove_var("CONTROL_PLANE_API_URL");
        std::env::remove_var("RUNNER_API_KEY");
        std::env::remove_var("RABBITMQ_AMQP_URL");

        let result = RunnerConfig::from_env();
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("RUNNER_NAME"));
    }

    #[test]
    fn test_from_env_with_valid_vars() {
        let _guard = env_lock().lock().unwrap();
        std::env::set_var("RUNNER_NAME", "env-test-runner");
        std::env::set_var("CONTROL_PLANE_API_URL", "http://localhost:3000");
        std::env::set_var("RUNNER_API_KEY", "env-test-key");
        std::env::set_var("RABBITMQ_AMQP_URL", "amqp://localhost:5672");

        let config = RunnerConfig::from_env().unwrap();
        assert_eq!(config.runner.name, "env-test-runner");
        assert_eq!(config.control_plane.api_url, "http://localhost:3000");
        assert_eq!(config.control_plane.api_key, "env-test-key");
        assert_eq!(config.message_queue.amqp_url, "amqp://localhost:5672");

        // 清理
        std::env::remove_var("RUNNER_NAME");
        std::env::remove_var("CONTROL_PLANE_API_URL");
        std::env::remove_var("RUNNER_API_KEY");
        std::env::remove_var("RABBITMQ_AMQP_URL");
    }

    #[test]
    fn test_from_env_with_optional_vars() {
        let _guard = env_lock().lock().unwrap();
        std::env::set_var("RUNNER_NAME", "test");
        std::env::set_var("CONTROL_PLANE_API_URL", "http://localhost:3000");
        std::env::set_var("RUNNER_API_KEY", "key");
        std::env::set_var("RABBITMQ_AMQP_URL", "amqp://localhost:5672");

        // 设置可选变量
        std::env::set_var("RUNNER_CAPABILITIES", "go,python");
        std::env::set_var("RUNNER_MAX_CONCURRENT_JOBS", "8");
        std::env::set_var("RUNNER_HEARTBEAT_INTERVAL_SECS", "120");
        std::env::set_var("RUNNER_WORKSPACE_DIR", "/custom/workspace");

        let config = RunnerConfig::from_env().unwrap();
        assert_eq!(config.runner.capabilities, vec!["go".to_string(), "python".to_string()]);
        assert_eq!(config.runner.max_concurrent_jobs, 8);
        assert_eq!(config.control_plane.heartbeat_interval_secs, 120);
        assert_eq!(config.execution.workspace_base_dir, "/custom/workspace");

        // 清理
        std::env::remove_var("RUNNER_NAME");
        std::env::remove_var("CONTROL_PLANE_API_URL");
        std::env::remove_var("RUNNER_API_KEY");
        std::env::remove_var("RABBITMQ_AMQP_URL");
        std::env::remove_var("RUNNER_CAPABILITIES");
        std::env::remove_var("RUNNER_MAX_CONCURRENT_JOBS");
        std::env::remove_var("RUNNER_HEARTBEAT_INTERVAL_SECS");
        std::env::remove_var("RUNNER_WORKSPACE_DIR");
    }
}
