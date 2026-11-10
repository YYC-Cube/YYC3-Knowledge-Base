//! Runner Docker 配置管理模型
//! 支持通过 Web 界面动态配置 Runner 的 Docker 执行环境

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::Json;
use uuid::Uuid;

/// Runner Docker 配置
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct RunnerDockerConfig {
    pub id: Uuid,
    pub name: String,

    // 基础配置
    pub enabled: bool,
    pub default_image: String,
    pub default_timeout_secs: i64,

    // 资源限制
    pub memory_limit_gb: Option<i64>,
    pub cpu_shares: Option<i64>,
    pub pids_limit: Option<i64>,

    // 按构建类型指定的镜像
    pub images_by_type: Json<serde_json::Value>,

    // 按能力标签的配置覆盖
    pub per_capability: Json<serde_json::Value>,

    // 按 Runner 名称的配置覆盖
    pub per_runner: Json<serde_json::Value>,

    // 元数据
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 创建/更新 Runner Docker 配置请求
#[derive(Debug, Clone, Deserialize)]
pub struct RunnerDockerConfigRequest {
    /// 配置名称
    pub name: String,

    /// 是否启用 Docker 执行
    #[serde(default = "default_enabled")]
    pub enabled: bool,

    /// 默认 Docker 镜像
    #[serde(default = "default_image")]
    pub default_image: String,

    /// 默认超时（秒）
    #[serde(default = "default_timeout")]
    pub default_timeout_secs: i64,

    /// 内存限制（GB）
    pub memory_limit_gb: Option<i64>,

    /// CPU 份额
    pub cpu_shares: Option<i64>,

    /// 最大进程数
    pub pids_limit: Option<i64>,

    /// 按构建类型指定的镜像
    #[serde(default)]
    pub images_by_type: Option<std::collections::HashMap<String, String>>,

    /// 按能力标签的配置覆盖
    #[serde(default)]
    pub per_capability: Option<std::collections::HashMap<String, RunnerConfigOverride>>,

    /// 按 Runner 名称的配置覆盖
    #[serde(default)]
    pub per_runner: Option<std::collections::HashMap<String, RunnerConfigOverride>>,

    /// 描述
    pub description: Option<String>,
}

/// Runner 配置覆盖
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunnerConfigOverride {
    /// 覆盖是否启用
    #[serde(default)]
    pub enabled: Option<bool>,

    /// 覆盖默认镜像
    pub default_image: Option<String>,

    /// 覆盖内存限制（GB）
    pub memory_limit_gb: Option<i64>,

    /// 覆盖 CPU 份额
    pub cpu_shares: Option<i64>,

    /// 覆盖最大进程数
    pub pids_limit: Option<i64>,

    /// 覆盖超时（秒）
    pub default_timeout_secs: Option<i64>,
}

/// Runner 配置响应
#[derive(Debug, Serialize)]
pub struct RunnerDockerConfigResponse {
    pub id: Uuid,
    pub name: String,
    pub enabled: bool,
    pub default_image: String,
    pub default_timeout_secs: i64,
    pub memory_limit_gb: Option<i64>,
    pub cpu_shares: Option<i64>,
    pub pids_limit: Option<i64>,
    pub images_by_type: std::collections::HashMap<String, String>,
    pub per_capability: std::collections::HashMap<String, RunnerConfigOverride>,
    pub per_runner: std::collections::HashMap<String, RunnerConfigOverride>,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<RunnerDockerConfig> for RunnerDockerConfigResponse {
    fn from(config: RunnerDockerConfig) -> Self {
        let images_by_type: std::collections::HashMap<String, String> =
            serde_json::from_value(config.images_by_type.0).unwrap_or_default();

        let per_capability: std::collections::HashMap<String, RunnerConfigOverride> =
            serde_json::from_value(config.per_capability.0).unwrap_or_default();

        let per_runner: std::collections::HashMap<String, RunnerConfigOverride> =
            serde_json::from_value(config.per_runner.0).unwrap_or_default();

        Self {
            id: config.id,
            name: config.name,
            enabled: config.enabled,
            default_image: config.default_image,
            default_timeout_secs: config.default_timeout_secs,
            memory_limit_gb: config.memory_limit_gb,
            cpu_shares: config.cpu_shares,
            pids_limit: config.pids_limit,
            images_by_type,
            per_capability,
            per_runner,
            description: config.description,
            created_at: config.created_at,
            updated_at: config.updated_at,
        }
    }
}

/// Runner 配置列表响应
#[derive(Debug, Serialize)]
pub struct RunnerDockerConfigListResponse {
    pub configs: Vec<RunnerDockerConfigResponse>,
    pub total: i64,
}

/// Runner 配置历史记录
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct RunnerConfigHistory {
    pub id: Uuid,
    pub config_id: Uuid,
    pub old_config: Json<serde_json::Value>,
    pub new_config: Json<serde_json::Value>,
    pub change_reason: Option<String>,
    pub changed_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

/// Runner 配置历史响应
#[derive(Debug, Serialize)]
pub struct RunnerConfigHistoryResponse {
    pub id: Uuid,
    pub config_id: Uuid,
    pub old_config: serde_json::Value,
    pub new_config: serde_json::Value,
    pub change_reason: Option<String>,
    pub changed_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

impl From<RunnerConfigHistory> for RunnerConfigHistoryResponse {
    fn from(history: RunnerConfigHistory) -> Self {
        Self {
            id: history.id,
            config_id: history.config_id,
            old_config: history.old_config.0,
            new_config: history.new_config.0,
            change_reason: history.change_reason,
            changed_by: history.changed_by,
            created_at: history.created_at,
        }
    }
}

/// 活跃配置信息（用于心跳响应）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveRunnerConfig {
    pub enabled: bool,
    pub default_image: String,
    pub images_by_type: std::collections::HashMap<String, String>,
    pub memory_limit_gb: Option<i64>,
    pub cpu_shares: Option<i64>,
    pub pids_limit: Option<i64>,
    pub default_timeout_secs: i64,
}

// 默认值函数（导出供测试使用）
pub fn default_enabled() -> bool {
    true
}

pub fn default_image() -> String {
    "ubuntu:22.04".to_string()
}

pub fn default_timeout() -> i64 {
    1800
}

/// 配置验证
impl RunnerDockerConfigRequest {
    pub fn validate(&self) -> Result<(), String> {
        if self.name.is_empty() || self.name.len() > 255 {
            return Err("Name must be between 1 and 255 characters".to_string());
        }

        if !self.default_image.is_empty() && self.default_image.len() > 255 {
            return Err("Default image name too long (max 255 characters)".to_string());
        }

        if !(60..=86400).contains(&self.default_timeout_secs) {
            return Err("Default timeout must be between 60 and 86400 seconds".to_string());
        }

        if let Some(memory) = self.memory_limit_gb {
            if !(1..=128).contains(&memory) {
                return Err("Memory limit must be between 1 and 128 GB".to_string());
            }
        }

        if let Some(cpu) = self.cpu_shares {
            if !(128..=4096).contains(&cpu) {
                return Err("CPU shares must be between 128 and 4096".to_string());
            }
        }

        if let Some(pids) = self.pids_limit {
            if !(64..=65536).contains(&pids) {
                return Err("PIDs limit must be between 64 and 65536".to_string());
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_runner_config_override_serialization() {
        let override_config = RunnerConfigOverride {
            enabled: Some(true),
            default_image: Some("node:20-alpine".to_string()),
            memory_limit_gb: Some(2),
            cpu_shares: Some(512),
            pids_limit: Some(512),
            default_timeout_secs: Some(900),
        };

        let json = serde_json::to_string(&override_config).unwrap();
        assert!(json.contains("\"enabled\":true"));
        assert!(json.contains("\"default_image\":\"node:20-alpine\""));
        assert!(json.contains("\"memory_limit_gb\":2"));

        let deserialized: RunnerConfigOverride = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.enabled, Some(true));
        assert_eq!(deserialized.default_image, Some("node:20-alpine".to_string()));
        assert_eq!(deserialized.memory_limit_gb, Some(2));
    }

    #[test]
    fn test_config_request_validation() {
        let valid_request = RunnerDockerConfigRequest {
            name: "test-config".to_string(),
            enabled: true,
            default_image: "ubuntu:22.04".to_string(),
            default_timeout_secs: 1800,
            memory_limit_gb: Some(4),
            cpu_shares: Some(1024),
            pids_limit: Some(1024),
            images_by_type: None,
            per_capability: None,
            per_runner: None,
            description: None,
        };

        assert!(valid_request.validate().is_ok());

        // 测试无效的内存限制
        let invalid_request = RunnerDockerConfigRequest {
            memory_limit_gb: Some(256), // 超过最大值
            ..valid_request.clone()
        };
        assert!(invalid_request.validate().is_err());

        // 测试无效的超时
        let invalid_timeout = RunnerDockerConfigRequest {
            default_timeout_secs: 30, // 小于最小值
            ..valid_request
        };
        assert!(invalid_timeout.validate().is_err());
    }

    #[test]
    fn test_config_response_conversion() {
        let config = RunnerDockerConfig {
            id: Uuid::new_v4(),
            name: "test-config".to_string(),
            enabled: true,
            default_image: "ubuntu:22.04".to_string(),
            default_timeout_secs: 1800,
            memory_limit_gb: Some(4),
            cpu_shares: Some(1024),
            pids_limit: Some(1024),
            images_by_type: Json(serde_json::json!({"node": "node:20-alpine"})),
            per_capability: Json(
                serde_json::json!({"frontend": {"enabled": true, "memory_limit_gb": 2}}),
            ),
            per_runner: Json(serde_json::json!({})),
            description: Some("Test config".to_string()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let response: RunnerDockerConfigResponse = config.into();
        assert_eq!(response.name, "test-config");
        assert_eq!(response.images_by_type.len(), 1);
        assert_eq!(response.images_by_type.get("node").unwrap(), "node:20-alpine");
    }

    #[test]
    fn test_default_values() {
        assert_eq!(default_enabled(), true);
        assert_eq!(default_image(), "ubuntu:22.04");
        assert_eq!(default_timeout(), 1800);
    }
}
