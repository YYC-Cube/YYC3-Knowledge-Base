//! SSH执行器模块
//! 提供SSH连接管理和命令执行能力
//!
//! 使用 russh 库实现真实的 SSH 连接和命令执行

use std::sync::Arc;
use std::time::Duration;
use tokio::time::timeout;
use tracing::{debug, error, info, warn};

// 使用 base64 crate 进行脚本编码
use base64::{engine::general_purpose, Engine as _};

use russh::client;
use russh::client::Config;
use russh::keys::PrivateKeyWithHashAlg;
use russh::ChannelMsg;
use russh::keys::decode_secret_key;
use russh::keys::PublicKeyBase64;
use sha2::Digest;
use russh::keys::ssh_key::PublicKey;

use crate::error::AppError;

// 重新导出 common 的类型
pub use common::{execution::ExecutionResult, ssh::*};

/// SSH客户端
pub struct SSHClient {
    config: SshConfig,
}

/// 进度回调函数类型
/// 参数: (当前输出片段, 是否完成)
pub type ProgressCallback = Arc<dyn Fn(String, bool) + Send + Sync>;

impl SSHClient {
    /// 从 common 的 SshConfig 创建 SSH 客户端
    pub fn new(config: SshConfig) -> Self {
        Self { config }
    }

    /// 从 host, username 和 password 创建客户端
    pub fn with_password(host: String, username: String, password: String) -> Self {
        Self::new(SshConfig::with_password(host, username, password))
    }

    /// 从 host, username 和 private key 创建客户端
    pub fn with_key(
        host: String,
        username: String,
        private_key: String,
        passphrase: Option<String>,
    ) -> Self {
        Self::new(SshConfig::with_key(host, username, private_key, passphrase))
    }

    /// 获取配置的引用
    pub fn config(&self) -> &SshConfig {
        &self.config
    }

    /// 创建带验证策略的会话处理器
    fn create_session(&self) -> SSHSession {
        SSHSession {
            verification_mode: self.config.host_key_verification.clone(),
            known_hosts: self.config.known_hosts.clone(),
            host: self.config.host.clone(),
            port: self.config.port,
        }
    }

    /// 将 common 的 SshAuth 转换为内部使用的认证方式
    fn convert_auth(auth: &SshAuth) -> InternalSshAuth {
        match auth {
            SshAuth::Password { password } => InternalSshAuth::Password(password.clone()),
            SshAuth::Key {
                private_key,
                passphrase,
            } => InternalSshAuth::Key {
                private_key: private_key.clone(),
                passphrase: passphrase.clone(),
            },
        }
    }

    /// 执行命令
    pub async fn execute(&self, command: &str) -> Result<ExecutionResult, AppError> {
        let start_time = std::time::Instant::now();

        debug!(
            host = %self.config.host,
            port = %self.config.port,
            user = %self.config.username,
            command = %command,
            "Executing SSH command"
        );

        // 创建 SSH 客户端配置
        let client_config = Arc::new(Config {
            preferred: russh::Preferred::default(),
            ..Default::default()
        });

        // 建立连接
        let overall_timeout =
            std::cmp::min(self.config.connect_timeout_secs, self.config.handshake_timeout_secs);
        let session = self.create_session();

        let mut handle = timeout(
            Duration::from_secs(overall_timeout),
            client::connect(client_config, (self.config.host.clone(), self.config.port), session),
        )
        .await
        .map_err(|_| {
            if self.config.connect_timeout_secs <= self.config.handshake_timeout_secs {
                AppError::SshConnectionError(format!(
                    "TCP连接超时: {}@{}",
                    self.config.host, self.config.port
                ))
            } else {
                AppError::SshConnectionError(format!(
                    "SSH握手超时: {}@{}:{}",
                    self.config.username, self.config.host, self.config.port
                ))
            }
        })?
        .map_err(|e| {
            error!(error = %e, "SSH连接失败");
            if e.to_string().contains("Host key") || e.to_string().contains("fingerprint") {
                AppError::SshConnectionError(format!("主机密钥验证失败: {}", e))
            } else {
                AppError::SshConnectionError(format!("SSH连接失败: {}", e))
            }
        })?;

        // 认证
        let auth = Self::convert_auth(&self.config.auth);
        let auth_result = match auth {
            InternalSshAuth::Password(password) => {
                handle
                    .authenticate_password(self.config.username.clone(), &password)
                    .await
            }
            InternalSshAuth::Key {
                private_key,
                passphrase,
            } => {
                // 使用 load_secret_key 加载私钥
                let key = decode_secret_key(&private_key, passphrase.as_deref()).map_err(|e| {
                    error!(error = %e, "加载SSH私钥失败");
                    AppError::SshConnectionError(format!("加载私钥失败: {}", e))
                })?;

                handle
                    .authenticate_publickey(
                        self.config.username.clone(),
                        PrivateKeyWithHashAlg::new(Arc::new(key), None),
                    )
                    .await
            }
        };

        if !auth_result.map(|result| result.success()).unwrap_or(false) {
            error!("SSH认证失败");
            return Err(AppError::SshAuthenticationError("SSH认证失败".to_string()));
        }

        info!("SSH认证成功，准备执行命令");

        // 执行命令
        let mut channel = handle.channel_open_session().await.map_err(|e| {
            error!(error = %e, "打开SSH通道失败");
            AppError::SshConnectionError(format!("打开SSH通道失败: {}", e))
        })?;

        channel.exec(true, command).await.map_err(|e| {
            error!(error = %e, "执行命令失败");
            AppError::SshExecutionError(format!("执行命令失败: {}", e))
        })?;

        let mut stdout = Vec::new();
        let mut stderr = Vec::new();
        let mut exit_code = 0;

        // 读取输出
        let command_timeout = Duration::from_secs(self.config.command_timeout_secs);

        loop {
            let msg = timeout(command_timeout, channel.wait()).await;

            match msg {
                Ok(Some(ChannelMsg::Data { ref data })) => {
                    stdout.extend_from_slice(data);
                }
                Ok(Some(ChannelMsg::ExtendedData { ref data, ext })) => {
                    if ext == 1 {
                        // SSH_EXTENDED_DATA_STDERR
                        stderr.extend_from_slice(data);
                    }
                }
                Ok(Some(ChannelMsg::ExitStatus { exit_status })) => {
                    exit_code = exit_status as i32;
                    break;
                }
                Ok(Some(ChannelMsg::Eof)) => {
                    break;
                }
                Ok(None) => {
                    break;
                }
                Err(_) => {
                    warn!("命令执行超时");
                    exit_code = 124; // timeout 退出码
                    break;
                }
                _ => {}
            }
        }

        // 关闭通道和连接
        let _ = channel.close().await;
        let _ = handle
            .disconnect(russh::Disconnect::ByApplication, "", "")
            .await;

        let duration_secs = start_time.elapsed().as_secs_f64();
        let timed_out = exit_code == 124;

        info!(
            host = %self.config.host,
            exit_code = exit_code,
            duration_secs = duration_secs,
            stdout_len = stdout.len(),
            stderr_len = stderr.len(),
            "Command executed"
        );

        Ok(ExecutionResult {
            exit_code,
            stdout: String::from_utf8_lossy(&stdout).to_string(),
            stderr: String::from_utf8_lossy(&stderr).to_string(),
            duration_secs,
            timed_out,
        })
    }

    /// 执行命令并支持增量输出推送
    pub async fn execute_with_progress(
        &self,
        command: &str,
        progress_callback: Option<ProgressCallback>,
    ) -> Result<ExecutionResult, AppError> {
        let start_time = std::time::Instant::now();

        debug!(
            host = %self.config.host,
            port = %self.config.port,
            user = %self.config.username,
            command = %command,
            "Executing SSH command with progress"
        );

        // 创建 SSH 客户端配置
        let client_config = Arc::new(Config {
            preferred: russh::Preferred::default(),
            ..Default::default()
        });

        // 建立连接
        let overall_timeout =
            std::cmp::min(self.config.connect_timeout_secs, self.config.handshake_timeout_secs);
        let session = self.create_session();

        let mut handle = timeout(
            Duration::from_secs(overall_timeout),
            client::connect(client_config, (self.config.host.clone(), self.config.port), session),
        )
        .await
        .map_err(|_| {
            if self.config.connect_timeout_secs <= self.config.handshake_timeout_secs {
                AppError::SshConnectionError(format!(
                    "TCP连接超时: {}@{}",
                    self.config.host, self.config.port
                ))
            } else {
                AppError::SshConnectionError(format!(
                    "SSH握手超时: {}@{}:{}",
                    self.config.username, self.config.host, self.config.port
                ))
            }
        })?
        .map_err(|e| {
            error!(error = %e, "SSH连接失败");
            if e.to_string().contains("Host key") || e.to_string().contains("fingerprint") {
                AppError::SshConnectionError(format!("主机密钥验证失败: {}", e))
            } else {
                AppError::SshConnectionError(format!("SSH连接失败: {}", e))
            }
        })?;

        // 认证
        let auth = Self::convert_auth(&self.config.auth);
        let auth_result = match auth {
            InternalSshAuth::Password(password) => {
                handle
                    .authenticate_password(self.config.username.clone(), &password)
                    .await
            }
            InternalSshAuth::Key {
                private_key,
                passphrase,
            } => {
                let key = decode_secret_key(&private_key, passphrase.as_deref()).map_err(|e| {
                    error!(error = %e, "加载SSH私钥失败");
                    AppError::SshConnectionError(format!("加载私钥失败: {}", e))
                })?;

                handle
                    .authenticate_publickey(
                        self.config.username.clone(),
                        PrivateKeyWithHashAlg::new(Arc::new(key), None),
                    )
                    .await
            }
        };

        if !auth_result.map(|result| result.success()).unwrap_or(false) {
            error!("SSH认证失败");
            return Err(AppError::SshAuthenticationError("SSH认证失败".to_string()));
        }

        info!("SSH认证成功，准备执行命令");

        // 执行命令
        let mut channel = handle.channel_open_session().await.map_err(|e| {
            error!(error = %e, "打开SSH通道失败");
            AppError::SshConnectionError(format!("打开SSH通道失败: {}", e))
        })?;

        channel.exec(true, command).await.map_err(|e| {
            error!(error = %e, "执行命令失败");
            AppError::SshExecutionError(format!("执行命令失败: {}", e))
        })?;

        let mut stdout = Vec::new();
        let mut stderr = Vec::new();
        let mut exit_code = 0;
        let mut last_callback_time = std::time::Instant::now();
        let callback_interval = Duration::from_millis(500); // 每500ms推送一次

        // 读取输出
        let command_timeout = Duration::from_secs(self.config.command_timeout_secs);

        loop {
            let msg = timeout(command_timeout, channel.wait()).await;

            match msg {
                Ok(Some(ChannelMsg::Data { ref data })) => {
                    stdout.extend_from_slice(data);

                    // 增量推送输出
                    if let Some(ref callback) = progress_callback {
                        let now = std::time::Instant::now();
                        if now.duration_since(last_callback_time) >= callback_interval {
                            let output = String::from_utf8_lossy(&stdout).to_string();
                            callback(output, false);
                            last_callback_time = now;
                        }
                    }
                }
                Ok(Some(ChannelMsg::ExtendedData { ref data, ext })) => {
                    if ext == 1 {
                        stderr.extend_from_slice(data);
                    }
                }
                Ok(Some(ChannelMsg::ExitStatus { exit_status })) => {
                    exit_code = exit_status as i32;
                    break;
                }
                Ok(Some(ChannelMsg::Eof)) => {
                    break;
                }
                Ok(None) => {
                    break;
                }
                Err(_) => {
                    warn!("命令执行超时");
                    exit_code = 124;
                    break;
                }
                _ => {}
            }
        }

        // 关闭通道和连接
        let _ = channel.close().await;
        let _ = handle
            .disconnect(russh::Disconnect::ByApplication, "", "")
            .await;

        let duration_secs = start_time.elapsed().as_secs_f64();
        let timed_out = exit_code == 124;

        // 最终输出推送（标记为完成）
        if let Some(ref callback) = progress_callback {
            let final_output = if stderr.is_empty() {
                String::from_utf8_lossy(&stdout).to_string()
            } else if stdout.is_empty() {
                String::from_utf8_lossy(&stderr).to_string()
            } else {
                format!(
                    "{}\n{}",
                    String::from_utf8_lossy(&stdout),
                    String::from_utf8_lossy(&stderr)
                )
            };
            callback(final_output, true);
        }

        info!(
            host = %self.config.host,
            exit_code = exit_code,
            duration_secs = duration_secs,
            stdout_len = stdout.len(),
            stderr_len = stderr.len(),
            "Command executed with progress"
        );

        Ok(ExecutionResult {
            exit_code,
            stdout: String::from_utf8_lossy(&stdout).to_string(),
            stderr: String::from_utf8_lossy(&stderr).to_string(),
            duration_secs,
            timed_out,
        })
    }

    /// 执行脚本（通过上传临时脚本文件）
    pub async fn execute_script(
        &self,
        script_content: &str,
        script_path: Option<&str>,
    ) -> Result<ExecutionResult, AppError> {
        let start_time = std::time::Instant::now();

        debug!(
            host = %self.config.host,
            port = %self.config.port,
            user = %self.config.username,
            script_len = script_content.len(),
            "Executing SSH script"
        );

        // 创建 SSH 客户端配置
        let client_config = Arc::new(Config {
            preferred: russh::Preferred::default(),
            ..Default::default()
        });

        // 建立连接
        let overall_timeout =
            std::cmp::min(self.config.connect_timeout_secs, self.config.handshake_timeout_secs);
        let session = self.create_session();

        let mut handle = timeout(
            Duration::from_secs(overall_timeout),
            client::connect(client_config, (self.config.host.clone(), self.config.port), session),
        )
        .await
        .map_err(|_| {
            if self.config.connect_timeout_secs <= self.config.handshake_timeout_secs {
                AppError::SshConnectionError(format!(
                    "TCP连接超时: {}@{}",
                    self.config.host, self.config.port
                ))
            } else {
                AppError::SshConnectionError(format!(
                    "SSH握手超时: {}@{}:{}",
                    self.config.username, self.config.host, self.config.port
                ))
            }
        })?
        .map_err(|e| {
            error!(error = %e, "SSH连接失败");
            if e.to_string().contains("Host key") || e.to_string().contains("fingerprint") {
                AppError::SshConnectionError(format!("主机密钥验证失败: {}", e))
            } else {
                AppError::SshConnectionError(format!("SSH连接失败: {}", e))
            }
        })?;

        // 认证
        let auth = Self::convert_auth(&self.config.auth);
        let auth_result = match auth {
            InternalSshAuth::Password(password) => {
                handle
                    .authenticate_password(self.config.username.clone(), &password)
                    .await
            }
            InternalSshAuth::Key {
                private_key,
                passphrase,
            } => {
                let key = decode_secret_key(&private_key, passphrase.as_deref()).map_err(|e| {
                    error!(error = %e, "加载SSH私钥失败");
                    AppError::SshConnectionError(format!("加载私钥失败: {}", e))
                })?;

                handle
                    .authenticate_publickey(
                        self.config.username.clone(),
                        PrivateKeyWithHashAlg::new(Arc::new(key), None),
                    )
                    .await
            }
        };

        if !auth_result.map(|result| result.success()).unwrap_or(false) {
            error!("SSH认证失败");
            return Err(AppError::SshAuthenticationError("SSH认证失败".to_string()));
        }

        // 生成临时脚本文件路径
        let temp_script_path = if let Some(path) = script_path {
            path.to_string()
        } else {
            // 使用 /tmp 目录和随机名称
            format!("/tmp/ops_script_{}.sh", uuid::Uuid::new_v4().to_string().replace("-", ""))
        };

        // 创建脚本执行命令（包含上传和执行）
        // 使用 base64 编码脚本内容以避免转义问题
        let encoded_script = general_purpose::STANDARD.encode(script_content);
        let command = format!(
            "echo '{}' | base64 -d > '{}' && chmod +x '{}' && sh '{}'; rm -f '{}'",
            encoded_script, temp_script_path, temp_script_path, temp_script_path, temp_script_path
        );

        // 执行命令
        let mut channel = handle.channel_open_session().await.map_err(|e| {
            error!(error = %e, "打开SSH通道失败");
            AppError::SshConnectionError(format!("打开SSH通道失败: {}", e))
        })?;

        channel.exec(true, command.as_str()).await.map_err(|e| {
            error!(error = %e, "执行脚本失败");
            AppError::SshExecutionError(format!("执行脚本失败: {}", e))
        })?;

        let mut stdout = Vec::new();
        let mut stderr = Vec::new();
        let mut exit_code = 0;

        // 读取输出
        let command_timeout = Duration::from_secs(self.config.command_timeout_secs);

        loop {
            let msg = timeout(command_timeout, channel.wait()).await;

            match msg {
                Ok(Some(ChannelMsg::Data { ref data })) => {
                    stdout.extend_from_slice(data);
                }
                Ok(Some(ChannelMsg::ExtendedData { ref data, ext })) => {
                    if ext == 1 {
                        stderr.extend_from_slice(data);
                    }
                }
                Ok(Some(ChannelMsg::ExitStatus { exit_status })) => {
                    exit_code = exit_status as i32;
                    break;
                }
                Ok(Some(ChannelMsg::Eof)) => {
                    break;
                }
                Ok(None) => {
                    break;
                }
                Err(_) => {
                    warn!("脚本执行超时");
                    exit_code = 124;
                    break;
                }
                _ => {}
            }
        }

        // 关闭通道和连接
        let _ = channel.close().await;
        let _ = handle
            .disconnect(russh::Disconnect::ByApplication, "", "")
            .await;

        let duration_secs = start_time.elapsed().as_secs_f64();
        let timed_out = exit_code == 124;

        info!(
            host = %self.config.host,
            exit_code = exit_code,
            duration_secs = duration_secs,
            stdout_len = stdout.len(),
            stderr_len = stderr.len(),
            "Script executed"
        );

        Ok(ExecutionResult {
            exit_code,
            stdout: String::from_utf8_lossy(&stdout).to_string(),
            stderr: String::from_utf8_lossy(&stderr).to_string(),
            duration_secs,
            timed_out,
        })
    }
}

/// SSH 客户端会话处理器
struct SSHSession {
    verification_mode: HostKeyVerification,
    known_hosts: Option<std::collections::HashMap<String, String>>,
    host: String,
    port: u16,
}

impl client::Handler for SSHSession {
    type Error = russh::Error;

    fn check_server_key(
        &mut self,
        server_public_key: &PublicKey,
    ) -> impl std::future::Future<Output = Result<bool, Self::Error>> + Send {
        let verification_mode = self.verification_mode.clone();
        let known_hosts = self.known_hosts.clone();
        let host = self.host.clone();
        let port = self.port;
        let key_data = server_public_key.public_key_base64();

        async move {
            match verification_mode {
                HostKeyVerification::Disabled => {
                    warn!(
                        host = %host,
                        port = port,
                        "Host key verification DISABLED - accepting all keys"
                    );
                    Ok(true)
                }
                HostKeyVerification::Accept => {
                    let mut hasher = sha2::Sha256::new();
                    hasher.update(key_data.as_bytes());
                    let fingerprint = hex::encode(hasher.finalize());
                    let host_key = format!("{}:{}", host, port);

                    if let Some(known_hosts) = &known_hosts {
                        if let Some(stored_fingerprint) = known_hosts.get(&host_key) {
                            if stored_fingerprint == &fingerprint {
                                debug!(host = %host_key, "Host key verified");
                                return Ok(true);
                            }

                            error!(
                                host = %host_key,
                                expected = %stored_fingerprint,
                                actual = %fingerprint,
                                "Host key mismatch - POSSIBLE SECURITY BREACH"
                            );
                            return Ok(false);
                        }
                    }

                    info!(
                        host = %host_key,
                        fingerprint = %fingerprint,
                        "First time connecting - accepting host key"
                    );
                    Ok(true)
                }
                HostKeyVerification::Strict => {
                    let mut hasher = sha2::Sha256::new();
                    hasher.update(key_data.as_bytes());
                    let fingerprint = hex::encode(hasher.finalize());
                    let host_key = format!("{}:{}", host, port);

                    if let Some(known_hosts) = &known_hosts {
                        if let Some(stored_fingerprint) = known_hosts.get(&host_key) {
                            if stored_fingerprint == &fingerprint {
                                debug!(host = %host_key, "Host key verified (strict mode)");
                                return Ok(true);
                            }

                            error!(
                                host = %host_key,
                                expected = %stored_fingerprint,
                                actual = %fingerprint,
                                "Host key mismatch - REJECTING CONNECTION"
                            );
                            return Ok(false);
                        }
                    }

                    error!(
                        host = %host_key,
                        "Unknown host in strict mode - rejecting connection"
                    );
                    Ok(false)
                }
            }
        }
    }
}

/// 内部使用的认证方式（与 common 的 SshAuth 相同结构，但使用引用）
enum InternalSshAuth {
    Password(String),
    Key {
        private_key: String,
        passphrase: Option<String>,
    },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ssh_client_with_password() {
        let client = SSHClient::with_password(
            "localhost".to_string(),
            "test".to_string(),
            "password".to_string(),
        );

        assert_eq!(client.config().host, "localhost");
        assert_eq!(client.config().username, "test");
    }

    #[test]
    fn test_ssh_client_with_key() {
        let client = SSHClient::with_key(
            "example.com".to_string(),
            "user".to_string(),
            "private-key".to_string(),
            Some("passphrase".to_string()),
        );

        assert_eq!(client.config().host, "example.com");
        assert_eq!(client.config().username, "user");
    }

    #[test]
    fn test_ssh_config_from_common() {
        let config = SshConfig::with_password(
            "test.com".to_string(),
            "admin".to_string(),
            "secret".to_string(),
        )
        .with_port(2222);

        assert_eq!(config.host, "test.com");
        assert_eq!(config.port, 2222);
    }

    #[test]
    fn test_execution_result_from_common() {
        let result = ExecutionResult::success("output".to_string(), 1.5);
        assert!(result.is_success());

        let failed = ExecutionResult::failure(1, "err".to_string(), "error".to_string(), 2.0);
        assert!(failed.is_failure());

        let timed_out = ExecutionResult::timeout(30.0);
        assert!(timed_out.timed_out);
    }
}
