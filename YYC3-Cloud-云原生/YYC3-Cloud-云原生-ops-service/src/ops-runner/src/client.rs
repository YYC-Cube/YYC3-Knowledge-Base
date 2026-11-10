//! 控制面 API 客户端

use anyhow::{Context, Result};
use chrono::Utc;
use reqwest::Client;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use sysinfo::System;
use tokio::sync::Mutex as TokioMutex;
use tokio::sync::watch;
use tracing::{debug, info, warn};

use crate::config::RunnerConfig;
use crate::messages::{
    RunnerDockerConfig, RunnerHeartbeatMessage, RunnerRegistrationMessage, RunnerStatus, SystemInfo,
};

/// 控制面 API 客户端
pub struct ControlPlaneClient {
    client: Client,
    config: RunnerConfig,
    runner_id: Option<String>,
    /// 从控制面接收的 Docker 配置
    docker_config: Arc<TokioMutex<Option<RunnerDockerConfig>>>,
    /// 当前正在执行的作业数（由 Worker 更新）
    current_jobs: Arc<AtomicUsize>,
    /// 配置变更通知通道 (心跳 -> executor)
    config_update_tx: watch::Sender<Option<RunnerDockerConfig>>,
}

impl ControlPlaneClient {
    /// 创建新的客户端
    pub fn new(config: RunnerConfig) -> Self {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .unwrap();

        let (config_update_tx, _) = watch::channel(None);

        Self {
            client,
            config,
            runner_id: None,
            docker_config: Arc::new(TokioMutex::new(None)),
            current_jobs: Arc::new(AtomicUsize::new(0)),
            config_update_tx,
        }
    }

    /// 设置当前作业数（由 Worker 调用）
    pub fn set_current_jobs(&self, count: usize) {
        self.current_jobs.store(count, Ordering::Relaxed);
    }

    /// 获取配置变更通知接收端
    pub fn config_update_receiver(&self) -> watch::Receiver<Option<RunnerDockerConfig>> {
        self.config_update_tx.subscribe()
    }

    /// 获取/设置当前作业计数器的可变引用（供外部注入共享计数器）
    pub fn current_jobs_mut(&mut self) -> &mut Arc<AtomicUsize> {
        &mut self.current_jobs
    }

    /// 获取 Docker 配置（从控制面接收）
    pub async fn get_docker_config(&self) -> Option<RunnerDockerConfig> {
        self.docker_config.lock().await.clone()
    }

    /// 设置 Docker 配置
    pub async fn set_docker_config(&self, config: RunnerDockerConfig) {
        let config = Some(config);
        *self.docker_config.lock().await = config.clone();
        let _ = self.config_update_tx.send(config);
    }

    /// 注册 Runner
    pub async fn register(&mut self) -> Result<String> {
        info!("Registering runner with control plane");

        let mut sys = System::new_all();
        sys.refresh_all();

        let msg = RunnerRegistrationMessage {
            name: self.config.runner.name.clone(),
            capabilities: self.config.runner.capabilities.clone(),
            docker_supported: self.config.runner.docker_supported,
            max_concurrent_jobs: self.config.runner.max_concurrent_jobs,
            outbound_allowlist: self.config.runner.outbound_allowlist.clone(),
            os: std::env::consts::OS.to_string(),
            arch: std::env::consts::ARCH.to_string(),
            version: env!("CARGO_PKG_VERSION").to_string(),
            hostname: gethostname::gethostname().to_string_lossy().to_string(),
            ip: get_local_ips()?,
            timestamp: Utc::now(),
        };

        let response = self
            .client
            .post(format!("{}/api/v1/runners/register", self.config.control_plane.api_url))
            .header("Authorization", format!("Bearer {}", self.config.control_plane.api_key))
            .header("Content-Type", "application/json")
            .json(&msg)
            .send()
            .await
            .context("Failed to send registration request")?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            anyhow::bail!("Registration failed with status {}: {}", status, body);
        }

        #[derive(serde::Deserialize)]
        struct RegisterResponse {
            runner_id: String,
            heartbeat_interval_secs: Option<u64>,
            /// Docker 配置（如果控制面返回）
            docker: Option<RunnerDockerConfig>,
        }

        let resp: RegisterResponse = response
            .json()
            .await
            .context("Failed to parse registration response")?;

        // 如果控制面返回了不同的心跳间隔，更新配置
        if let Some(interval) = resp.heartbeat_interval_secs {
            debug!("Control plane suggested heartbeat interval: {}s", interval);
        }

        // 存储控制面返回的 Docker 配置
        if let Some(docker_cfg) = resp.docker {
            info!(
                "Received Docker configuration from control plane (enabled: {})",
                docker_cfg.enabled
            );
            self.set_docker_config(docker_cfg).await;
        }

        self.runner_id = Some(resp.runner_id.clone());

        info!("Runner registered successfully with ID: {}", resp.runner_id);
        Ok(resp.runner_id)
    }

    /// 发送心跳
    ///
    /// 返回是否收到了 Docker 配置更新
    pub async fn send_heartbeat(&self) -> Result<bool> {
        let mut sys = System::new_all();
        sys.refresh_all();

        let cpu_usage = sys.global_cpu_usage();
        let total_memory = sys.total_memory();
        let used_memory = sys.used_memory();
        let available_memory = sys.available_memory();

        let memory_usage = if total_memory > 0 {
            (used_memory as f32 / total_memory as f32) * 100.0
        } else {
            0.0
        };

        let available_memory_mb = available_memory / 1024;

        // 简化磁盘使用率（默认值）
        let disk_usage = 50.0;
        let available_disk_gb = 10.0;

        let system_info = SystemInfo {
            cpu_usage_percent: cpu_usage,
            memory_usage_percent: memory_usage,
            disk_usage_percent: disk_usage,
            available_memory_mb,
            available_disk_gb,
        };

        let msg = RunnerHeartbeatMessage {
            name: self.config.runner.name.clone(),
            status: RunnerStatus::Active,
            current_jobs: self.current_jobs.load(Ordering::Relaxed),
            last_error: None,
            system: system_info,
            timestamp: Utc::now(),
        };

        let response = self
            .client
            .post(format!("{}/api/v1/runners/heartbeat", self.config.control_plane.api_url))
            .header("Authorization", format!("Bearer {}", self.config.control_plane.api_key))
            .header("Content-Type", "application/json")
            .json(&msg)
            .send()
            .await
            .context("Failed to send heartbeat")?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            warn!("Heartbeat failed with status {}: {}", status, body);
            anyhow::bail!("Heartbeat failed with status {}: {}", status, body);
        }

        // 解析响应以获取配置更新
        #[derive(serde::Deserialize)]
        struct HeartbeatResponse {
            #[serde(default)]
            docker: Option<RunnerDockerConfig>,
        }

        let mut config_updated = false;
        if let Ok(resp) = response.json::<HeartbeatResponse>().await {
            // 应用 Docker 配置更新
            if let Some(docker_cfg) = resp.docker {
                info!(
                    "Received Docker config update from heartbeat (enabled: {})",
                    docker_cfg.enabled
                );
                self.set_docker_config(docker_cfg).await;
                config_updated = true;
            }
        }

        debug!("Heartbeat sent successfully");
        Ok(config_updated)
    }

    /// 获取 Runner ID
    #[allow(dead_code)]
    pub fn runner_id(&self) -> Option<&str> {
        self.runner_id.as_deref()
    }
}

/// 获取本地 IP 地址
fn get_local_ips() -> Result<Vec<String>> {
    let mut ips = Vec::new();

    // 获取本地主机名并解析
    let hostname = gethostname::gethostname().to_string_lossy().to_string();

    // 尝试解析为 IP 地址
    if let Ok(addr) = hostname.parse::<std::net::IpAddr>() {
        ips.push(addr.to_string());
    }

    // 添加回环地址
    ips.push("127.0.0.1".to_string());
    ips.push("::1".to_string());

    Ok(ips)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_control_plane_client_creation() {
        let config = crate::config::RunnerConfig {
            runner: crate::config::RunnerInfo {
                name: "test-runner".to_string(),
                capabilities: vec![],
                docker_supported: false,
                max_concurrent_jobs: 1,
                outbound_allowlist: vec![],
                environment: "test".to_string(),
            },
            control_plane: crate::config::ControlPlaneConfig {
                api_url: "http://localhost:3000".to_string(),
                api_key: "test-key".to_string(),
                heartbeat_interval_secs: 30,
            },
            message_queue: crate::config::MessageQueueConfig {
                amqp_url: "amqp://localhost:5672".to_string(),
                vhost: "/".to_string(),
                exchange: "ops.build".to_string(),
                queue_prefix: "test-runner".to_string(),
                prefetch: 1,
            },
            execution: crate::config::ExecutionConfig {
                workspace_base_dir: "/tmp/test-workspace".to_string(),
                task_timeout_secs: 1800,
                step_timeout_secs: 300,
                cleanup_workspace: true,
                cache_dir: None,
                docker: None,
            },
        };

        let client = ControlPlaneClient::new(config);
        // 客户端创建成功
        assert_eq!(client.config.runner.name, "test-runner");
    }

    #[test]
    fn test_client_config_reference() {
        let config = crate::config::RunnerConfig {
            runner: crate::config::RunnerInfo {
                name: "config-test-runner".to_string(),
                capabilities: vec!["rust".to_string()],
                docker_supported: true,
                max_concurrent_jobs: 2,
                outbound_allowlist: vec![],
                environment: "prod".to_string(),
            },
            control_plane: crate::config::ControlPlaneConfig {
                api_url: "https://api.example.com".to_string(),
                api_key: "secret-key".to_string(),
                heartbeat_interval_secs: 60,
            },
            message_queue: crate::config::MessageQueueConfig {
                amqp_url: "amqp://mq.example.com".to_string(),
                vhost: "/test".to_string(),
                exchange: "ops.test".to_string(),
                queue_prefix: "test".to_string(),
                prefetch: 5,
            },
            execution: crate::config::ExecutionConfig {
                workspace_base_dir: "/workspace".to_string(),
                task_timeout_secs: 3600,
                step_timeout_secs: 900,
                cleanup_workspace: false,
                cache_dir: Some("/cache".to_string()),
                docker: None,
            },
        };

        let client = ControlPlaneClient::new(config);
        assert_eq!(client.config.runner.name, "config-test-runner");
        assert_eq!(client.config.runner.capabilities, vec!["rust"]);
        assert_eq!(client.config.control_plane.api_url, "https://api.example.com");
        assert_eq!(client.config.control_plane.heartbeat_interval_secs, 60);
    }

    #[test]
    fn test_system_info_creation() {
        let system_info = SystemInfo {
            cpu_usage_percent: 50.5,
            memory_usage_percent: 70.0,
            disk_usage_percent: 80.0,
            available_memory_mb: 4096,
            available_disk_gb: 25.5,
        };

        assert_eq!(system_info.cpu_usage_percent, 50.5);
        assert_eq!(system_info.memory_usage_percent, 70.0);
        assert_eq!(system_info.available_memory_mb, 4096);
        assert_eq!(system_info.available_disk_gb, 25.5);
    }

    #[test]
    fn test_system_info_serialization() {
        let info = SystemInfo {
            cpu_usage_percent: 33.3,
            memory_usage_percent: 55.5,
            disk_usage_percent: 66.6,
            available_memory_mb: 2048,
            available_disk_gb: 100.0,
        };

        let json = serde_json::to_string(&info).unwrap();
        assert!(json.contains("\"cpu_usage_percent\":33.3"));
        assert!(json.contains("\"memory_usage_percent\":55.5"));
        assert!(json.contains("\"disk_usage_percent\":66.6"));

        // 测试反序列化
        let deserialized: SystemInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.cpu_usage_percent, 33.3);
        assert_eq!(deserialized.available_memory_mb, 2048);
    }

    #[test]
    fn test_get_local_ips() {
        let ips = get_local_ips().unwrap();

        // 应该至少包含回环地址
        assert!(ips.contains(&"127.0.0.1".to_string()));
        assert!(ips.contains(&"::1".to_string()));

        // 回环地址应该在最后
        assert_eq!(ips[ips.len() - 2], "127.0.0.1");
        assert_eq!(ips[ips.len() - 1], "::1");
    }

    #[test]
    fn test_runner_status_serialization() {
        use crate::messages::RunnerStatus;

        let statuses = vec![
            (RunnerStatus::Online, "online"),
            (RunnerStatus::Active, "active"),
            (RunnerStatus::Maintenance, "maintenance"),
            (RunnerStatus::Offline, "offline"),
        ];

        for (status, expected) in statuses {
            let json = serde_json::to_string(&status).unwrap();
            assert_eq!(json, format!("\"{}\"", expected));

            let deserialized: RunnerStatus = serde_json::from_str(&json).unwrap();
            assert_eq!(deserialized, status);
        }
    }

    #[test]
    fn test_runner_registration_message_structure() {
        use crate::messages::RunnerRegistrationMessage;

        let msg = RunnerRegistrationMessage {
            name: "test-runner".to_string(),
            capabilities: vec!["node".to_string(), "python".to_string()],
            docker_supported: true,
            max_concurrent_jobs: 4,
            outbound_allowlist: vec![],
            os: std::env::consts::OS.to_string(),
            arch: std::env::consts::ARCH.to_string(),
            version: "0.1.0".to_string(),
            hostname: "test-host".to_string(),
            ip: vec!["192.168.1.1".to_string()],
            timestamp: chrono::Utc::now(),
        };

        assert_eq!(msg.name, "test-runner");
        assert_eq!(msg.capabilities.len(), 2);
        assert!(msg.docker_supported);
        assert_eq!(msg.max_concurrent_jobs, 4);
        assert!(!msg.ip.is_empty());

        // 测试序列化
        let json = serde_json::to_string(&msg).unwrap();
        assert!(json.contains("\"name\":\"test-runner\""));
        assert!(json.contains("\"capabilities\":[\"node\",\"python\"]"));
    }

    #[test]
    fn test_runner_heartbeat_message_structure() {
        use crate::messages::{RunnerHeartbeatMessage, RunnerStatus};

        let msg = RunnerHeartbeatMessage {
            name: "test-runner".to_string(),
            status: RunnerStatus::Active,
            current_jobs: 2,
            last_error: None,
            system: SystemInfo {
                cpu_usage_percent: 45.0,
                memory_usage_percent: 60.0,
                disk_usage_percent: 75.0,
                available_memory_mb: 8192,
                available_disk_gb: 50.0,
            },
            timestamp: chrono::Utc::now(),
        };

        assert_eq!(msg.name, "test-runner");
        assert_eq!(msg.current_jobs, 2);
        assert!(msg.last_error.is_none());
        assert_eq!(msg.system.cpu_usage_percent, 45.0);

        // 测试序列化
        let json = serde_json::to_string(&msg).unwrap();
        let deserialized: RunnerHeartbeatMessage = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.name, "test-runner");
        assert_eq!(deserialized.current_jobs, 2);
    }

    #[test]
    fn test_runner_heartbeat_with_error() {
        use crate::messages::{RunnerHeartbeatMessage, RunnerStatus};

        let msg = RunnerHeartbeatMessage {
            name: "test-runner".to_string(),
            status: RunnerStatus::Offline,
            current_jobs: 0,
            last_error: Some("Connection lost".to_string()),
            system: SystemInfo {
                cpu_usage_percent: 0.0,
                memory_usage_percent: 0.0,
                disk_usage_percent: 0.0,
                available_memory_mb: 0,
                available_disk_gb: 0.0,
            },
            timestamp: chrono::Utc::now(),
        };

        assert_eq!(msg.status, RunnerStatus::Offline);
        assert_eq!(msg.last_error, Some("Connection lost".to_string()));

        // 测试序列化
        let json = serde_json::to_string(&msg).unwrap();
        assert!(json.contains("\"last_error\":\"Connection lost\""));
        assert!(json.contains("\"status\":\"offline\""));
    }

    #[test]
    fn test_system_info_boundary_values() {
        // 测试边界值
        let info = SystemInfo {
            cpu_usage_percent: 0.0,
            memory_usage_percent: 0.0,
            disk_usage_percent: 0.0,
            available_memory_mb: 0,
            available_disk_gb: 0.0,
        };

        assert_eq!(info.cpu_usage_percent, 0.0);
        assert_eq!(info.memory_usage_percent, 0.0);

        // 测试最大值
        let max_info = SystemInfo {
            cpu_usage_percent: 100.0,
            memory_usage_percent: 100.0,
            disk_usage_percent: 100.0,
            available_memory_mb: u64::MAX,
            available_disk_gb: 1000000.0,
        };

        assert_eq!(max_info.cpu_usage_percent, 100.0);
        assert_eq!(max_info.memory_usage_percent, 100.0);
    }

    #[test]
    fn test_runner_id_none_initially() {
        let config = crate::config::RunnerConfig {
            runner: crate::config::RunnerInfo {
                name: "test-runner".to_string(),
                capabilities: vec![],
                docker_supported: false,
                max_concurrent_jobs: 1,
                outbound_allowlist: vec![],
                environment: "test".to_string(),
            },
            control_plane: crate::config::ControlPlaneConfig {
                api_url: "http://localhost:3000".to_string(),
                api_key: "test-key".to_string(),
                heartbeat_interval_secs: 30,
            },
            message_queue: crate::config::MessageQueueConfig {
                amqp_url: "amqp://localhost:5672".to_string(),
                vhost: "/".to_string(),
                exchange: "ops.build".to_string(),
                queue_prefix: "test-runner".to_string(),
                prefetch: 1,
            },
            execution: crate::config::ExecutionConfig {
                workspace_base_dir: "/tmp/test-workspace".to_string(),
                task_timeout_secs: 1800,
                step_timeout_secs: 300,
                cleanup_workspace: true,
                cache_dir: None,
                docker: None,
            },
        };

        let client = ControlPlaneClient::new(config);
        // 初始状态下 runner_id 应该为 None
        assert!(client.runner_id().is_none());
    }
}
