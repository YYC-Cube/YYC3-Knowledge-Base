//! SSH 配置模型
//!
//! 统一的 SSH 配置定义，可被 ops-service 和 ops-runner 共享

use secrecy::{ExposeSecret, SecretString};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 主机密钥验证策略
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum HostKeyVerification {
    /// 严格模式：只接受已知的主机密钥
    Strict,
    /// 接受模式：首次连接时接受新密钥，之后验证
    #[default]
    Accept,
    /// 禁用验证（不安全，仅用于开发/测试）
    Disabled,
}

impl std::str::FromStr for HostKeyVerification {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "strict" => Ok(Self::Strict),
            "accept" => Ok(Self::Accept),
            "disabled" | "none" | "false" => Ok(Self::Disabled),
            _ => Err(format!("Unknown host key verification mode: {}", s)),
        }
    }
}

/// SSH 认证方式
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SshAuth {
    /// 密码认证
    Password { password: String },
    /// 私钥认证
    Key {
        /// 私钥内容（PEM格式）
        private_key: String,
        /// 密码（如果有）
        passphrase: Option<String>,
    },
}

/// SSH 连接配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshConfig {
    /// 主机地址
    pub host: String,

    /// 端口
    #[serde(default = "default_ssh_port")]
    pub port: u16,

    /// 用户名
    pub username: String,

    /// 认证方式
    pub auth: SshAuth,

    /// 连接超时（秒）
    #[serde(default = "default_connect_timeout")]
    pub connect_timeout_secs: u64,

    /// 握手超时（秒）
    #[serde(default = "default_connect_timeout")]
    pub handshake_timeout_secs: u64,

    /// 命令执行默认超时（秒）
    #[serde(default = "default_command_timeout")]
    pub command_timeout_secs: u64,

    /// 主机密钥验证策略
    #[serde(default)]
    pub host_key_verification: HostKeyVerification,

    /// 已知的主机密钥（known_hosts 格式的简化存储）
    #[serde(default)]
    pub known_hosts: Option<HashMap<String, String>>,
}

fn default_ssh_port() -> u16 {
    22
}

fn default_connect_timeout() -> u64 {
    10
}

fn default_command_timeout() -> u64 {
    300
}

impl SshConfig {
    /// 创建新的 SSH 配置
    pub fn new(host: String, username: String, auth: SshAuth) -> Self {
        Self {
            host,
            port: default_ssh_port(),
            username,
            auth,
            connect_timeout_secs: default_connect_timeout(),
            handshake_timeout_secs: default_connect_timeout(),
            command_timeout_secs: default_command_timeout(),
            host_key_verification: HostKeyVerification::default(),
            known_hosts: None,
        }
    }

    /// 创建使用密码认证的配置
    pub fn with_password(host: String, username: String, password: String) -> Self {
        Self::new(host, username, SshAuth::Password { password })
    }

    /// 创建使用私钥认证的配置
    pub fn with_key(
        host: String,
        username: String,
        private_key: String,
        passphrase: Option<String>,
    ) -> Self {
        Self::new(
            host,
            username,
            SshAuth::Key {
                private_key,
                passphrase,
            },
        )
    }

    /// 设置端口
    pub fn with_port(mut self, port: u16) -> Self {
        self.port = port;
        self
    }

    /// 设置连接超时
    pub fn with_connect_timeout(mut self, timeout_secs: u64) -> Self {
        self.connect_timeout_secs = timeout_secs;
        self
    }

    /// 设置命令超时
    pub fn with_command_timeout(mut self, timeout_secs: u64) -> Self {
        self.command_timeout_secs = timeout_secs;
        self
    }

    /// 设置主机密钥验证策略
    pub fn with_host_key_verification(mut self, verification: HostKeyVerification) -> Self {
        self.host_key_verification = verification;
        self
    }

    /// 获取目标地址字符串
    pub fn target(&self) -> String {
        format!("{}@{}:{}", self.username, self.host, self.port)
    }
}

/// 用于配置文件的 SSH 配置（使用 Secret 包装敏感信息）
#[derive(Debug, Clone, Deserialize)]
pub struct SshConfigSettings {
    /// 默认 SSH 用户名
    pub default_username: String,

    /// 默认 SSH 密码（使用 Secret 包装，防止日志泄露）
    pub default_password: SecretString,

    /// 默认 SSH 私钥（可选，使用 Secret 包装）
    pub default_private_key: Option<SecretString>,

    /// 私钥密码（可选，使用 Secret 包装）
    pub private_key_passphrase: Option<SecretString>,

    /// 连接超时（秒）
    #[serde(default = "default_connect_timeout")]
    pub connect_timeout_secs: u64,

    /// 握手超时（秒）
    #[serde(default = "default_connect_timeout")]
    pub handshake_timeout_secs: u64,

    /// 命令执行默认超时（秒）
    #[serde(default = "default_command_timeout")]
    pub command_timeout_secs: u64,
}

impl SshConfigSettings {
    /// 将配置转换为 SshAuth
    pub fn to_auth(&self, use_key: bool) -> SshAuth {
        if use_key {
            if let Some(ref key) = self.default_private_key {
                SshAuth::Key {
                    private_key: key.expose_secret().to_string(),
                    passphrase: self
                        .private_key_passphrase
                        .as_ref()
                        .map(|p| p.expose_secret().to_string()),
                }
            } else {
                // 回退到密码认证
                SshAuth::Password {
                    password: self.default_password.expose_secret().to_string(),
                }
            }
        } else {
            SshAuth::Password {
                password: self.default_password.expose_secret().to_string(),
            }
        }
    }

    /// 创建用于特定主机的 SshConfig
    pub fn for_host(&self, host: String, port: Option<u16>, use_key: bool) -> SshConfig {
        SshConfig {
            host,
            port: port.unwrap_or(22),
            username: self.default_username.clone(),
            auth: self.to_auth(use_key),
            connect_timeout_secs: self.connect_timeout_secs,
            handshake_timeout_secs: self.handshake_timeout_secs,
            command_timeout_secs: self.command_timeout_secs,
            host_key_verification: HostKeyVerification::default(),
            known_hosts: None,
        }
    }
}

/// SSH 执行选项
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SshExecOptions {
    /// 命令执行超时（秒），None 表示使用默认
    pub timeout_secs: Option<u64>,

    /// 工作目录
    pub working_dir: Option<String>,

    /// 环境变量
    #[serde(default)]
    pub env_vars: HashMap<String, String>,

    /// 是否在失败时继续
    #[serde(default)]
    pub continue_on_error: bool,

    /// 是否使用 PTY（伪终端）
    #[serde(default)]
    pub use_pty: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_host_key_verification_default() {
        let verification = HostKeyVerification::default();
        assert_eq!(verification, HostKeyVerification::Accept);
    }

    #[test]
    fn test_host_key_verification_from_str() {
        assert_eq!("strict".parse::<HostKeyVerification>().unwrap(), HostKeyVerification::Strict);
        assert_eq!("accept".parse::<HostKeyVerification>().unwrap(), HostKeyVerification::Accept);
        assert_eq!(
            "disabled".parse::<HostKeyVerification>().unwrap(),
            HostKeyVerification::Disabled
        );
        assert_eq!("none".parse::<HostKeyVerification>().unwrap(), HostKeyVerification::Disabled);
    }

    #[test]
    fn test_ssh_config_new() {
        let config = SshConfig::new(
            "example.com".to_string(),
            "user".to_string(),
            SshAuth::Password {
                password: "pass".to_string(),
            },
        );

        assert_eq!(config.host, "example.com");
        assert_eq!(config.port, 22);
        assert_eq!(config.username, "user");
        assert_eq!(config.connect_timeout_secs, 10);
    }

    #[test]
    fn test_ssh_config_with_password() {
        let config = SshConfig::with_password(
            "example.com".to_string(),
            "user".to_string(),
            "pass123".to_string(),
        );

        assert!(matches!(config.auth, SshAuth::Password { .. }));
    }

    #[test]
    fn test_ssh_config_with_key() {
        let config = SshConfig::with_key(
            "example.com".to_string(),
            "user".to_string(),
            "private-key-content".to_string(),
            Some("passphrase".to_string()),
        );

        match &config.auth {
            SshAuth::Key {
                private_key,
                passphrase,
            } => {
                assert_eq!(private_key, "private-key-content");
                assert_eq!(passphrase.as_ref().unwrap(), "passphrase");
            }
            _ => panic!("Expected Key auth"),
        }
    }

    #[test]
    fn test_ssh_config_builder() {
        let config =
            SshConfig::with_password("host".to_string(), "user".to_string(), "pass".to_string())
                .with_port(2222)
                .with_connect_timeout(30)
                .with_command_timeout(600)
                .with_host_key_verification(HostKeyVerification::Strict);

        assert_eq!(config.port, 2222);
        assert_eq!(config.connect_timeout_secs, 30);
        assert_eq!(config.command_timeout_secs, 600);
        assert_eq!(config.host_key_verification, HostKeyVerification::Strict);
    }

    #[test]
    fn test_ssh_config_target() {
        let config = SshConfig::with_password(
            "example.com".to_string(),
            "root".to_string(),
            "pass".to_string(),
        );
        assert_eq!(config.target(), "root@example.com:22");

        let config = config.with_port(2222);
        assert_eq!(config.target(), "root@example.com:2222");
    }

    #[test]
    fn test_ssh_auth_serialization() {
        let password_auth = SshAuth::Password {
            password: "secret".to_string(),
        };
        let json = serde_json::to_string(&password_auth).unwrap();
        assert!(json.contains("password"));

        let key_auth = SshAuth::Key {
            private_key: "key-content".to_string(),
            passphrase: Some("pass".to_string()),
        };
        let json = serde_json::to_string(&key_auth).unwrap();
        assert!(json.contains("private_key"));
    }

    #[test]
    fn test_ssh_exec_options_default() {
        let options = SshExecOptions::default();
        assert!(options.timeout_secs.is_none());
        assert!(options.working_dir.is_none());
        assert!(options.env_vars.is_empty());
        assert!(!options.continue_on_error);
        assert!(!options.use_pty);
    }

    #[test]
    fn test_ssh_config_serialization() {
        let config = SshConfig {
            host: "test.com".to_string(),
            port: 2222,
            username: "admin".to_string(),
            auth: SshAuth::Password {
                password: "pass".to_string(),
            },
            connect_timeout_secs: 20,
            handshake_timeout_secs: 20,
            command_timeout_secs: 300,
            host_key_verification: HostKeyVerification::Strict,
            known_hosts: None,
        };

        let json = serde_json::to_string(&config).unwrap();
        assert!(json.contains("\"host\":\"test.com\""));
        assert!(json.contains("\"port\":2222"));
        assert!(json.contains("\"username\":\"admin\""));

        let deserialized: SshConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.host, "test.com");
        assert_eq!(deserialized.port, 2222);
    }
}
