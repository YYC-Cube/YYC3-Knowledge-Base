//! Docker 配置模型
//!
//! 统一的 Docker 配置定义，可被 ops-service 和 ops-runner 共享

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

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

fn default_docker_image() -> String {
    "ubuntu:22.04".to_string()
}

fn default_docker_timeout() -> u64 {
    1800 // 30分钟
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

impl DockerConfig {
    /// 创建新的 Docker 配置
    pub fn new(default_image: String) -> Self {
        Self {
            default_image,
            ..Default::default()
        }
    }

    /// 获取指定步骤类型的镜像
    pub fn get_image_for_step(&self, step_type: &str) -> Option<String> {
        self.custom_images
            .get(step_type)
            .cloned()
            .or_else(|| Some(self.default_image.clone()))
    }

    /// 添加自定义镜像
    pub fn with_custom_image(mut self, step_type: String, image: String) -> Self {
        self.custom_images.insert(step_type, image);
        self
    }

    /// 设置资源限制
    pub fn with_resource_limits(mut self, limits: DockerResourceLimits) -> Self {
        self.resource_limits = limits;
        self
    }

    /// 设置安全配置
    pub fn with_security(mut self, security: DockerSecurityConfig) -> Self {
        self.security = security;
        self
    }

    /// 启用 Docker
    pub fn with_enabled(mut self, enabled: bool) -> Self {
        self.enabled = enabled;
        self
    }

    /// 设置网络模式
    pub fn with_network_mode(mut self, mode: String) -> Self {
        self.network_mode = Some(mode);
        self
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

impl DockerResourceLimits {
    /// 创建新的资源限制
    pub fn new() -> Self {
        Self::default()
    }

    /// 设置内存限制（GB）
    pub fn with_memory(mut self, memory_gb: i64) -> Self {
        self.memory = Some(memory_gb);
        self
    }

    /// 设置 CPU 份额
    pub fn with_cpu_shares(mut self, shares: i64) -> Self {
        self.cpu_shares = Some(shares);
        self
    }

    /// 设置进程数限制
    pub fn with_pids_limit(mut self, limit: i64) -> Self {
        self.pids_limit = Some(limit);
        self
    }

    /// 将内存限制转换为字节
    pub fn memory_bytes(&self) -> Option<u64> {
        self.memory.map(|m| (m * 1024 * 1024 * 1024) as u64)
    }

    /// 检查是否有任何限制
    pub fn has_limits(&self) -> bool {
        self.memory.is_some()
            || self.cpu_quota.is_some()
            || self.cpu_shares.is_some()
            || self.pids_limit.is_some()
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
    /// 创建新的安全配置
    pub fn new() -> Self {
        Self::default()
    }

    /// 创建宽松的安全配置（用于开发）
    pub fn permissive() -> Self {
        Self {
            non_root: false,
            read_only_rootfs: false,
            drop_all_capabilities: false,
            add_capabilities: Vec::new(),
            allowed_devices: Vec::new(),
        }
    }

    /// 创建严格的安全配置（用于生产）
    pub fn strict() -> Self {
        Self {
            non_root: true,
            read_only_rootfs: true,
            drop_all_capabilities: true,
            add_capabilities: vec![],
            allowed_devices: Vec::new(),
        }
    }

    /// 设置是否使用非 root 用户
    pub fn with_non_root(mut self, non_root: bool) -> Self {
        self.non_root = non_root;
        self
    }

    /// 设置是否使用只读根文件系统
    pub fn with_read_only_rootfs(mut self, read_only: bool) -> Self {
        self.read_only_rootfs = read_only;
        self
    }

    /// 添加需要的能力
    pub fn with_capability(mut self, capability: String) -> Self {
        self.add_capabilities.push(capability);
        self
    }

    /// 获取需要添加的能力列表
    pub fn capabilities_to_add(&self) -> Vec<String> {
        if self.drop_all_capabilities {
            self.add_capabilities.clone()
        } else {
            Vec::new()
        }
    }

    /// 检查是否为严格模式
    pub fn is_strict(&self) -> bool {
        self.non_root || self.read_only_rootfs || self.drop_all_capabilities
    }
}

/// 容器执行结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContainerResult {
    /// 容器 ID
    pub container_id: String,

    /// 退出码
    pub exit_code: i64,

    /// 标准输出
    pub stdout: String,

    /// 标准错误
    pub stderr: String,

    /// 执行时长（秒）
    pub duration_secs: f64,

    /// 是否超时
    pub timed_out: bool,
}

impl ContainerResult {
    /// 判断是否成功
    pub fn is_success(&self) -> bool {
        self.exit_code == 0 && !self.timed_out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_docker_config_default() {
        let config = DockerConfig::default();
        assert!(!config.enabled);
        assert_eq!(config.default_image, "ubuntu:22.04");
        assert_eq!(config.default_timeout, 1800);
    }

    #[test]
    fn test_docker_config_new() {
        let config = DockerConfig::new("alpine:latest".to_string());
        assert_eq!(config.default_image, "alpine:latest");
    }

    #[test]
    fn test_docker_config_builder() {
        let config = DockerConfig::new("ubuntu:22.04".to_string())
            .with_enabled(true)
            .with_custom_image("build".to_string(), "builder:latest".to_string())
            .with_network_mode("bridge".to_string());

        assert!(config.enabled);
        assert_eq!(config.custom_images.get("build").unwrap(), "builder:latest");
        assert_eq!(config.network_mode.as_ref().unwrap(), "bridge");
    }

    #[test]
    fn test_docker_config_get_image_for_step() {
        let config = DockerConfig::new("default:latest".to_string())
            .with_custom_image("rust".to_string(), "rust-builder:latest".to_string());

        assert_eq!(config.get_image_for_step("rust").unwrap(), "rust-builder:latest");
        assert_eq!(config.get_image_for_step("node").unwrap(), "default:latest");
    }

    #[test]
    fn test_docker_resource_limits_default() {
        let limits = DockerResourceLimits::default();
        assert_eq!(limits.memory, Some(4));
        assert_eq!(limits.cpu_shares, Some(1024));
        assert_eq!(limits.pids_limit, Some(1024));
    }

    #[test]
    fn test_docker_resource_limits_builder() {
        let limits = DockerResourceLimits::new()
            .with_memory(8)
            .with_cpu_shares(2048)
            .with_pids_limit(2048);

        assert_eq!(limits.memory, Some(8));
        assert_eq!(limits.cpu_shares, Some(2048));
        assert_eq!(limits.pids_limit, Some(2048));
    }

    #[test]
    fn test_docker_resource_limits_memory_bytes() {
        let limits = DockerResourceLimits::new().with_memory(4);
        assert_eq!(limits.memory_bytes(), Some(4 * 1024 * 1024 * 1024));
    }

    #[test]
    fn test_docker_resource_limits_has_limits() {
        let limits = DockerResourceLimits::default();
        assert!(limits.has_limits());

        let no_limits = DockerResourceLimits {
            memory: None,
            memory_swap: None,
            cpu_quota: None,
            cpu_period: None,
            cpu_shares: None,
            pids_limit: None,
            nofile: None,
            nproc: None,
        };
        assert!(!no_limits.has_limits());
    }

    #[test]
    fn test_docker_security_config_default() {
        let config = DockerSecurityConfig::default();
        assert!(!config.non_root);
        assert!(!config.read_only_rootfs);
        assert!(config.drop_all_capabilities);
    }

    #[test]
    fn test_docker_security_config_permissive() {
        let config = DockerSecurityConfig::permissive();
        assert!(!config.non_root);
        assert!(!config.read_only_rootfs);
        assert!(!config.drop_all_capabilities);
    }

    #[test]
    fn test_docker_security_config_strict() {
        let config = DockerSecurityConfig::strict();
        assert!(config.non_root);
        assert!(config.read_only_rootfs);
        assert!(config.drop_all_capabilities);
        assert!(config.add_capabilities.is_empty());
    }

    #[test]
    fn test_docker_security_config_builder() {
        let config = DockerSecurityConfig::new()
            .with_non_root(true)
            .with_read_only_rootfs(true)
            .with_capability("CAP_NET_RAW".to_string());

        assert!(config.non_root);
        assert!(config.read_only_rootfs);
        assert!(config.add_capabilities.contains(&"CAP_NET_RAW".to_string()));
    }

    #[test]
    fn test_docker_security_config_capabilities_to_add() {
        let config = DockerSecurityConfig::default();
        let caps = config.capabilities_to_add();
        assert!(caps.contains(&"CAP_NET_BIND_SERVICE".to_string()));
    }

    #[test]
    fn test_docker_security_config_is_strict() {
        assert!(!DockerSecurityConfig::permissive().is_strict());
        assert!(DockerSecurityConfig::strict().is_strict());
    }

    #[test]
    fn test_container_result_is_success() {
        let result = ContainerResult {
            container_id: "abc123".to_string(),
            exit_code: 0,
            stdout: "success".to_string(),
            stderr: String::new(),
            duration_secs: 1.0,
            timed_out: false,
        };
        assert!(result.is_success());
    }

    #[test]
    fn test_container_result_is_failure() {
        let result = ContainerResult {
            container_id: "abc123".to_string(),
            exit_code: 1,
            stdout: String::new(),
            stderr: "error".to_string(),
            duration_secs: 1.0,
            timed_out: false,
        };
        assert!(!result.is_success());
    }

    #[test]
    fn test_container_result_is_timeout() {
        let result = ContainerResult {
            container_id: "abc123".to_string(),
            exit_code: 124,
            stdout: String::new(),
            stderr: "timeout".to_string(),
            duration_secs: 30.0,
            timed_out: true,
        };
        assert!(!result.is_success());
    }

    #[test]
    fn test_docker_config_serialization() {
        let config = DockerConfig {
            enabled: true,
            default_image: "alpine:latest".to_string(),
            custom_images: {
                let mut map = HashMap::new();
                map.insert("rust".to_string(), "rust:1.80".to_string());
                map
            },
            resource_limits: DockerResourceLimits::default(),
            security: DockerSecurityConfig::default(),
            network_mode: Some("host".to_string()),
            default_timeout: 3600,
        };

        let json = serde_json::to_string(&config).unwrap();
        assert!(json.contains("\"enabled\":true"));
        assert!(json.contains("\"default_image\":\"alpine:latest\""));
        assert!(json.contains("\"network_mode\":\"host\""));

        let deserialized: DockerConfig = serde_json::from_str(&json).unwrap();
        assert!(deserialized.enabled);
        assert_eq!(deserialized.default_image, "alpine:latest");
        assert_eq!(deserialized.network_mode.unwrap(), "host");
    }
}
