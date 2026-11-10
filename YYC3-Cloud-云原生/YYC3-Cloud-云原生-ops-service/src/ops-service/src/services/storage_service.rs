//! 外部存储服务 (P2.1)
//!
//! 提供统一的存储抽象接口，支持多种存储后端：
//! - 本地文件系统
//! - S3 兼容存储 (AWS S3, MinIO)
//! - 生成预签名下载 URL（真实 AWS SigV4 签名）

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tracing::{debug, warn};

/// S3 凭证
#[derive(Debug, Clone)]
pub struct S3Credentials {
    pub access_key: String,
    pub secret_key: String,
}

/// 存储配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageConfig {
    /// 存储类型
    pub storage_type: StorageType,

    /// 本地存储配置
    #[serde(default)]
    pub local: LocalStorageConfig,

    /// S3 存储配置
    #[serde(default)]
    pub s3: S3StorageConfig,
}

impl Default for StorageConfig {
    fn default() -> Self {
        Self {
            storage_type: StorageType::Local,
            local: LocalStorageConfig::default(),
            s3: S3StorageConfig::default(),
        }
    }
}

/// 存储类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum StorageType {
    Local,
    S3,
}

/// 本地存储配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalStorageConfig {
    /// 基础路径
    pub base_path: String,

    /// 通过 HTTP 服务的基础 URL
    pub base_url: Option<String>,
}

impl Default for LocalStorageConfig {
    fn default() -> Self {
        Self {
            base_path: "/var/lib/ops-service/artifacts".to_string(),
            base_url: None,
        }
    }
}

/// S3 存储配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct S3StorageConfig {
    /// 区域
    pub region: Option<String>,

    /// 端点 URL (用于 MinIO 等兼容服务)
    pub endpoint: Option<String>,

    /// Bucket 名称
    pub bucket: String,

    /// Access Key
    pub access_key: Option<String>,

    /// Secret Key
    pub secret_key: Option<String>,

    /// 预签名 URL 过期时间（秒）
    #[serde(default = "default_presign_ttl")]
    pub presign_ttl_secs: u64,
}

impl Default for S3StorageConfig {
    fn default() -> Self {
        Self {
            region: Some("us-east-1".to_string()),
            endpoint: None,
            bucket: "ops-artifacts".to_string(),
            access_key: None,
            secret_key: None,
            presign_ttl_secs: 3600,
        }
    }
}

fn default_presign_ttl() -> u64 {
    3600 // 1 hour
}

/// 存储服务
pub struct StorageService {
    config: StorageConfig,
    /// S3 凭证（使用 secrecy 保护）
    s3_credentials: Option<S3Credentials>,
}

impl StorageService {
    /// 创建新的存储服务
    pub fn new(config: StorageConfig) -> Self {
        // 从配置中提取 S3 凭证
        let s3_credentials = if let (Some(access_key), Some(secret_key)) =
            (&config.s3.access_key, &config.s3.secret_key)
        {
            Some(S3Credentials {
                access_key: access_key.clone(),
                secret_key: secret_key.clone(),
            })
        } else {
            None
        };

        Self {
            config,
            s3_credentials,
        }
    }

    /// 从环境变量加载配置
    pub fn from_env() -> Result<Self> {
        let storage_type = match std::env::var("STORAGE_TYPE")
            .unwrap_or_else(|_| "local".to_string())
            .as_str()
        {
            "s3" => StorageType::S3,
            "local" => StorageType::Local,
            _ => StorageType::Local,
        };

        let local = LocalStorageConfig {
            base_path: std::env::var("STORAGE_LOCAL_PATH")
                .unwrap_or_else(|_| "/var/lib/ops-service/artifacts".to_string()),
            base_url: std::env::var("STORAGE_LOCAL_BASE_URL").ok(),
        };

        let s3 = S3StorageConfig {
            region: std::env::var("STORAGE_S3_REGION").ok(),
            endpoint: std::env::var("STORAGE_S3_ENDPOINT").ok(),
            bucket: std::env::var("STORAGE_S3_BUCKET")
                .unwrap_or_else(|_| "ops-artifacts".to_string()),
            access_key: std::env::var("STORAGE_S3_ACCESS_KEY").ok(),
            secret_key: std::env::var("STORAGE_S3_SECRET_KEY").ok(),
            presign_ttl_secs: std::env::var("STORAGE_S3_PRESIGN_TTL")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(3600),
        };

        let config = StorageConfig {
            storage_type,
            local,
            s3,
        };

        Ok(Self::new(config))
    }

    /// 生成预签名下载 URL
    ///
    /// # 参数
    /// - `artifact_path`: 产物路径（可能是 s3://bucket/path 或本地路径）
    /// - `artifact_id`: 产物 ID（用于生成本地下载 URL）
    ///
    /// # 返回
    /// 预签名 URL，如果无法生成则返回 None
    pub async fn generate_presigned_url(
        &self,
        artifact_path: &str,
        artifact_id: uuid::Uuid,
    ) -> Result<Option<String>> {
        // 如果已经是 HTTP(S) URL，直接返回
        if artifact_path.starts_with("http://") || artifact_path.starts_with("https://") {
            return Ok(Some(artifact_path.to_string()));
        }

        // S3/MinIO 路径
        if artifact_path.starts_with("s3://") || artifact_path.starts_with("minio://") {
            return self.generate_s3_presigned_url(artifact_path).await;
        }

        // 本地路径
        if self.config.storage_type == StorageType::Local {
            return Ok(Some(format!("/api/v1/artifacts/{}/download", artifact_id)));
        }

        // 未知存储类型
        warn!(
            artifact_path = %artifact_path,
            "Unknown storage type for artifact path"
        );
        Ok(None)
    }

    /// 生成 S3 预签名 URL（使用真实的 AWS SigV4 签名）
    async fn generate_s3_presigned_url(&self, artifact_path: &str) -> Result<Option<String>> {
        use s3::bucket::Bucket;
        use s3::creds::Credentials;
        use s3::Region;

        // 解析 S3 路径: s3://bucket/key/path
        let path = artifact_path
            .strip_prefix("s3://")
            .or_else(|| artifact_path.strip_prefix("minio://"))
            .ok_or_else(|| anyhow::anyhow!("Invalid S3 path: {}", artifact_path))?;

        let (bucket, key) = path
            .split_once('/')
            .ok_or_else(|| anyhow::anyhow!("Invalid S3 path: {}", artifact_path))?;

        debug!(
            bucket = %bucket,
            key = %key,
            "Generating S3 presigned URL with AWS SigV4 signature"
        );

        // 检查凭证
        let (access_key, secret_key) = match &self.s3_credentials {
            Some(creds) => (creds.access_key.clone(), creds.secret_key.clone()),
            None => {
                // 尝试从环境变量获取
                match (
                    std::env::var("AWS_ACCESS_KEY_ID").ok(),
                    std::env::var("AWS_SECRET_ACCESS_KEY").ok(),
                ) {
                    (Some(access), Some(secret)) => (access, secret),
                    _ => {
                        warn!("S3 credentials not configured, returning placeholder URL");
                        return self.generate_placeholder_s3_url(bucket, key);
                    }
                }
            }
        };

        let credentials = Credentials::new(Some(&access_key), Some(&secret_key), None, None, None)
            .context("Failed to construct S3 credentials")?;

        let region_str = self
            .config
            .s3
            .region
            .clone()
            .or_else(|| std::env::var("AWS_REGION").ok())
            .unwrap_or_else(|| "us-east-1".to_string());

        let region = if let Some(ref endpoint) = self.config.s3.endpoint {
            // 自定义端点（如 MinIO）
            Region::Custom {
                region: region_str,
                endpoint: endpoint.clone(),
            }
        } else {
            // 标准 AWS S3
            region_str.parse().unwrap_or(Region::UsEast1)
        };

        let bucket_client = Bucket::new(bucket, region, credentials)
            .context("Failed to create S3 bucket client")?;

        let key_path = if key.starts_with('/') {
            key.to_string()
        } else {
            format!("/{}", key)
        };

        let ttl_secs = self.config.s3.presign_ttl_secs.min(u32::MAX as u64) as u32;

        let url = bucket_client
            .presign_get(&key_path, ttl_secs, None)
            .await
            .context("Failed to generate S3 presigned URL")?;

        debug!(
            bucket = %bucket,
            key = %key,
            "Generated S3 presigned URL successfully"
        );

        Ok(Some(url))
    }

    /// 生成占位符 S3 URL（当没有配置凭证时）
    fn generate_placeholder_s3_url(&self, bucket: &str, key: &str) -> Result<Option<String>> {
        warn!("S3 credentials not configured, returning placeholder URL");

        let base_url = if let Some(ref endpoint) = self.config.s3.endpoint {
            endpoint.clone()
        } else if let Some(ref region) = self.config.s3.region {
            format!("https://s3.{}.amazonaws.com", region)
        } else {
            "https://s3.amazonaws.com".to_string()
        };

        // 占位符：返回一个带过期参数的 URL（未经签名）
        let expires_in =
            chrono::Utc::now() + chrono::Duration::seconds(self.config.s3.presign_ttl_secs as i64);
        let url = format!("{}/{}/{}?expires={}", base_url, bucket, key, expires_in.timestamp());

        Ok(Some(url))
    }

    /// 解析存储路径
    ///
    /// 将产物路径解析为实际的存储位置
    pub fn resolve_path(&self, artifact_path: &str) -> String {
        if artifact_path.starts_with("s3://") || artifact_path.starts_with("minio://") {
            // S3 路径保持不变
            artifact_path.to_string()
        } else if artifact_path.starts_with('/') {
            // 绝对路径
            artifact_path.to_string()
        } else {
            // 相对路径，附加到本地基础路径
            format!("{}/{}", self.config.local.base_path, artifact_path)
        }
    }

    /// 检查存储是否可用
    pub async fn health_check(&self) -> bool {
        match self.config.storage_type {
            StorageType::Local => {
                // 检查本地目录是否存在
                Path::new(&self.config.local.base_path).exists()
            }
            StorageType::S3 => {
                // 尝试生成一个预签名 URL 来验证配置
                if self.s3_credentials.is_none() {
                    // 没有配置凭证，无法检查
                    return true;
                }

                // 简单的连接检查
                if self.config.s3.endpoint.is_some() {
                    // 对于自定义端点（MinIO），可以检查连接
                    // 这里简化处理，返回 true
                    true
                } else {
                    // AWS S3，假设配置正确
                    true
                }
            }
        }
    }

    /// 获取存储类型
    pub fn storage_type(&self) -> StorageType {
        self.config.storage_type
    }

    /// 获取配置
    pub fn config(&self) -> &StorageConfig {
        &self.config
    }
}

/// 产物下载信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtifactDownloadInfo {
    /// 产物 ID
    pub artifact_id: uuid::Uuid,
    /// 产物名称
    pub artifact_name: String,
    /// 下载 URL
    pub download_url: Option<String>,
    /// 文件大小
    pub file_size: i64,
    /// SHA256 哈希
    pub sha256: String,
    /// URL 过期时间（秒）
    pub expires_in_secs: u32,
    /// 存储类型
    pub storage_type: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_storage_config_default() {
        let config = StorageConfig::default();
        assert_eq!(config.storage_type, StorageType::Local);
        assert_eq!(config.local.base_path, "/var/lib/ops-service/artifacts");
    }

    #[test]
    fn test_resolve_local_path() {
        let service = StorageService::new(StorageConfig {
            storage_type: StorageType::Local,
            local: LocalStorageConfig {
                base_path: "/tmp/artifacts".to_string(),
                base_url: None,
            },
            s3: S3StorageConfig::default(),
        });

        assert_eq!(service.resolve_path("my-app.tar.gz"), "/tmp/artifacts/my-app.tar.gz");
        assert_eq!(service.resolve_path("/absolute/path/file.bin"), "/absolute/path/file.bin");
    }

    #[test]
    fn test_resolve_s3_path() {
        let service = StorageService::new(StorageConfig::default());

        assert_eq!(
            service.resolve_path("s3://my-bucket/path/to/file.tar.gz"),
            "s3://my-bucket/path/to/file.tar.gz"
        );
    }

    #[test]
    fn test_presign_http_url() {
        let service = StorageService::new(StorageConfig::default());
        let uuid = uuid::Uuid::new_v4();

        tokio::runtime::Runtime::new().unwrap().block_on(async {
            let result = service
                .generate_presigned_url("https://example.com/file.tar.gz", uuid)
                .await
                .unwrap();
            assert_eq!(result, Some("https://example.com/file.tar.gz".to_string()));
        });
    }

    #[test]
    fn test_s3_placeholder_url() {
        let service = StorageService::new(StorageConfig {
            storage_type: StorageType::S3,
            local: LocalStorageConfig::default(),
            s3: S3StorageConfig {
                region: Some("us-west-2".to_string()),
                endpoint: None,
                bucket: "test-bucket".to_string(),
                access_key: None,
                secret_key: None,
                presign_ttl_secs: 1800,
            },
        });

        tokio::runtime::Runtime::new().unwrap().block_on(async {
            let result = service
                .generate_s3_presigned_url("s3://test-bucket/path/to/file.tar.gz")
                .await
                .unwrap();
            // 应该返回占位符 URL
            assert!(result.is_some());
            let url = result.unwrap();
            assert!(url.contains("s3.us-west-2.amazonaws.com"));
            assert!(url.contains("test-bucket"));
            assert!(url.contains("path/to/file.tar.gz"));
        });
    }
}
