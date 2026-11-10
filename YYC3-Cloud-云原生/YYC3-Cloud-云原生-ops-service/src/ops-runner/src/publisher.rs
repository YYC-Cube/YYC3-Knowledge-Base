//! RabbitMQ 消息发布器 - 向控制面发送状态和日志

use anyhow::{Context, Result};
use lapin::types::FieldTable;
use lapin::types::ShortString;
use lapin::{options::*, BasicProperties, Channel, ExchangeKind};
use tracing::{debug, error, info, warn};

use crate::config::RunnerConfig;
use crate::messages::*;

fn short_string(value: impl Into<String>) -> ShortString {
    value.into().into()
}

/// 消息发布器
pub struct MessagePublisher {
    channel: Channel,
    runner_name: String,
    exchange: String,
}

impl MessagePublisher {
    /// 创建新的发布器
    pub async fn new(config: &RunnerConfig, channel: Channel) -> Result<Self> {
        let exchange = config.message_queue.exchange.clone();
        let runner_name = config.runner.name.clone();

        // 声明统一的交换机（Topic 类型）
        // 与控制面保持一致：使用同一个 exchange，通过 routing key 区分消息类型
        channel
            .exchange_declare(
                short_string(exchange.clone()),
                ExchangeKind::Topic,
                ExchangeDeclareOptions {
                    durable: true,
                    ..Default::default()
                },
                FieldTable::default(),
            )
            .await
            .context("Failed to declare build exchange")?;

        info!("Message publisher created for runner: {}, exchange: {}", runner_name, exchange);

        Ok(Self {
            channel,
            runner_name,
            exchange,
        })
    }

    /// 发布构建状态
    pub async fn publish_build_status(
        &self,
        task: &BuildTaskMessage,
        status: BuildStatus,
        step_status: Option<StepStatusUpdate>,
        error: Option<String>,
        error_category: Option<ErrorCategory>,
    ) -> Result<()> {
        let status_str = format!("{:?}", status);

        let message = BuildStatusMessage {
            task_id: task.task_id,
            job_id: task.job_id,
            runner_name: self.runner_name.clone(),
            attempt_id: None,
            status: status.clone(),
            step_status,
            error,
            error_category,
            timestamp: chrono::Utc::now(),
        };

        // 使用与控制面消费者一致的 routing key 格式: build.status.{job_id}.{task_id}
        // 控制面消费者绑定到 "build.status.#"
        let routing_key = format!("build.status.{}.{}", task.job_id, task.task_id);
        let payload = serde_json::to_vec(&message).context("Failed to serialize status message")?;

        self.channel
            .basic_publish(
                short_string(self.exchange.clone()),
                short_string(routing_key.clone()),
                BasicPublishOptions::default(),
                &payload,
                BasicProperties::default()
                    .with_delivery_mode(2) // 持久化
                    .with_content_type("application/json".into()),
            )
            .await
            .context("Failed to publish status message")?;

        debug!(
            "Published status: job={}, task={}, status={}, routing_key={}",
            task.job_id, task.task_id, status_str, routing_key
        );

        Ok(())
    }

    /// 发布步骤状态
    #[allow(clippy::too_many_arguments)]
    pub async fn publish_step_status(
        &self,
        task: &BuildTaskMessage,
        step: &BuildStep,
        step_status: StepStatus,
        started_at: chrono::DateTime<chrono::Utc>,
        completed_at: Option<chrono::DateTime<chrono::Utc>>,
        exit_code: Option<i32>,
        artifact: Option<BuildArtifact>,
    ) -> Result<()> {
        let step_status_str = format!("{:?}", step_status);

        let step_update = StepStatusUpdate {
            step_id: step.id.clone(),
            status: step_status,
            started_at,
            completed_at,
            exit_code,
            artifact,
        };

        self.publish_build_status(task, BuildStatus::Running, Some(step_update), None, None)
            .await?;

        debug!(
            "Published step status: job={}, task={}, step={}, status={}",
            task.job_id, task.task_id, step.name, step_status_str
        );

        Ok(())
    }

    /// 发布日志
    pub async fn publish_log(
        &self,
        task: &BuildTaskMessage,
        step: &BuildStep,
        content: &str,
        level: LogLevel,
        offset: u64,
        is_final: bool,
    ) -> Result<()> {
        // 分割大日志以避免超过 RabbitMQ 消息大小限制
        const MAX_CHUNK_SIZE: usize = 256 * 1024; // 256KB

        let content_bytes = content.as_bytes();

        if content_bytes.len() <= MAX_CHUNK_SIZE {
            self.publish_log_chunk(task, step, content, level.clone(), offset, is_final)
                .await?;
        } else {
            // 分块发送
            let chunks: Vec<&str> = content
                .as_bytes()
                .chunks(MAX_CHUNK_SIZE)
                .map(|chunk| std::str::from_utf8(chunk).unwrap_or(""))
                .collect();

            let total_chunks = chunks.len();
            for (i, chunk) in chunks.iter().enumerate() {
                let is_last_chunk = i == total_chunks - 1;
                let chunk_offset = offset + (i * MAX_CHUNK_SIZE) as u64;
                self.publish_log_chunk(
                    task,
                    step,
                    chunk,
                    level.clone(),
                    chunk_offset,
                    is_final && is_last_chunk,
                )
                .await?;
            }
        }

        Ok(())
    }

    /// 发布单个日志块
    async fn publish_log_chunk(
        &self,
        task: &BuildTaskMessage,
        step: &BuildStep,
        content: &str,
        level: LogLevel,
        offset: u64,
        is_final: bool,
    ) -> Result<()> {
        let message = BuildLogMessage {
            task_id: task.task_id,
            job_id: task.job_id,
            step_id: step.id.clone(),
            runner_name: self.runner_name.clone(),
            attempt_id: None,
            level,
            content: content.to_string(),
            offset,
            chunk_index: 0,
            is_final,
            timestamp: chrono::Utc::now(),
        };

        // 使用与控制面消费者一致的 routing key 格式: build.log.{job_id}.{task_id}.{step_id}
        // 控制面消费者绑定到 "build.log.#"
        let routing_key = format!("build.log.{}.{}.{}", task.job_id, task.task_id, step.id);

        let payload = serde_json::to_vec(&message).context("Failed to serialize log message")?;

        self.channel
            .basic_publish(
                short_string(self.exchange.clone()),
                short_string(routing_key.clone()),
                BasicPublishOptions::default(),
                &payload,
                BasicProperties::default()
                    .with_delivery_mode(2) // 持久化
                    .with_content_type("application/json".into()),
            )
            .await
            .context("Failed to publish log message")?;

        debug!(
            "Published log: job={}, task={}, step={}, bytes={}, offset={}, routing_key={}",
            task.job_id,
            task.task_id,
            step.name,
            content.len(),
            offset,
            routing_key
        );

        Ok(())
    }

    /// 发布错误信息
    pub async fn publish_error(
        &self,
        task: &BuildTaskMessage,
        error: &str,
        category: ErrorCategory,
    ) -> Result<()> {
        let category_str = format!("{:?}", category);

        self.publish_build_status(
            task,
            BuildStatus::Failed,
            None,
            Some(error.to_string()),
            Some(category.clone()),
        )
        .await?;

        error!(
            "Published error: job={}, task={}, error={}, category={}",
            task.job_id, task.task_id, error, category_str
        );

        Ok(())
    }

    /// 发布产物信息
    pub async fn publish_artifact(
        &self,
        task: &BuildTaskMessage,
        step: &BuildStep,
        artifact: &BuildArtifact,
    ) -> Result<()> {
        // 产物信息作为状态消息的一部分发布
        let step_update = StepStatusUpdate {
            step_id: step.id.clone(),
            status: StepStatus::Succeeded,
            started_at: chrono::Utc::now(),
            completed_at: Some(chrono::Utc::now()),
            exit_code: Some(0),
            artifact: Some(artifact.clone()),
        };

        let message = BuildStatusMessage {
            task_id: task.task_id,
            job_id: task.job_id,
            runner_name: self.runner_name.clone(),
            attempt_id: None,
            status: BuildStatus::Running,
            step_status: Some(step_update),
            error: None,
            error_category: None,
            timestamp: chrono::Utc::now(),
        };

        // 使用状态消息的 routing key 格式
        let routing_key = format!("build.status.{}.{}", task.job_id, task.task_id);

        let payload =
            serde_json::to_vec(&message).context("Failed to serialize artifact message")?;

        self.channel
            .basic_publish(
                short_string(self.exchange.clone()),
                short_string(routing_key.clone()),
                BasicPublishOptions::default(),
                &payload,
                BasicProperties::default()
                    .with_delivery_mode(2)
                    .with_content_type("application/json".into()),
            )
            .await
            .context("Failed to publish artifact message")?;

        info!(
            "Published artifact: job={}, task={}, artifact={}, size={}, routing_key={}",
            task.job_id, task.task_id, artifact.name, artifact.size, routing_key
        );

        Ok(())
    }
}

/// 产物存储客户端
pub struct ArtifactStorage {
    /// 存储类型 (s3, http, local)
    pub storage_type: String,
    /// 存储端点
    endpoint: Option<String>,
    /// 存储桶/路径前缀
    bucket: Option<String>,
    /// 访问密钥
    access_key: Option<String>,
    /// 密钥
    secret_key: Option<String>,
    /// HTTP 客户端（用于上传）
    client: reqwest::Client,
}

impl ArtifactStorage {
    /// 创建新的存储客户端
    pub fn new(
        storage_type: String,
        endpoint: Option<String>,
        bucket: Option<String>,
        access_key: Option<String>,
        secret_key: Option<String>,
    ) -> Self {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(300))
            .build()
            .unwrap();

        Self {
            storage_type,
            endpoint,
            bucket,
            access_key,
            secret_key,
            client,
        }
    }

    /// 从配置创建
    pub fn from_env() -> Result<Self> {
        let storage_type =
            std::env::var("ARTIFACT_STORAGE_TYPE").unwrap_or_else(|_| "local".to_string());

        let endpoint = std::env::var("ARTIFACT_STORAGE_ENDPOINT").ok();
        let bucket = std::env::var("ARTIFACT_STORAGE_BUCKET").ok();
        let access_key = std::env::var("ARTIFACT_STORAGE_ACCESS_KEY").ok();
        let secret_key = std::env::var("ARTIFACT_STORAGE_SECRET_KEY").ok();

        Ok(Self::new(storage_type, endpoint, bucket, access_key, secret_key))
    }

    /// 上传产物
    pub async fn upload(
        &self,
        artifact_path: &std::path::Path,
        remote_path: &str,
    ) -> Result<ArtifactUploadResult> {
        match self.storage_type.as_str() {
            "s3" | "minio" => self.upload_s3(artifact_path, remote_path).await,
            "http" => self.upload_http(artifact_path, remote_path).await,
            "local" => self.upload_local(artifact_path, remote_path).await,
            _ => {
                warn!("Unknown storage type: {}, using local", self.storage_type);
                self.upload_local(artifact_path, remote_path).await
            }
        }
    }

    /// 上传到 S3 兼容存储
    async fn upload_s3(
        &self,
        artifact_path: &std::path::Path,
        remote_path: &str,
    ) -> Result<ArtifactUploadResult> {
        let content = tokio::fs::read(artifact_path)
            .await
            .context("Failed to read artifact file")?;

        let sha256 = {
            use sha2::{Digest, Sha256};
            let hash = Sha256::digest(&content);
            hex::encode(hash)
        };

        let endpoint = self
            .endpoint
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("S3 endpoint not configured"))?;

        let bucket = self.bucket.as_deref().unwrap_or("artifacts");

        // 构造 S3 URL
        let url = format!("{}/{}/{}", endpoint.trim_end_matches('/'), bucket, remote_path);

        // 发送 PUT 请求（简化的 S3 兼容上传）
        let response = if let (Some(key), Some(secret)) = (&self.access_key, &self.secret_key) {
            // 使用 AWS Signature V4 签名（简化版）
            self.client
                .put(&url)
                .header("Content-Type", "application/octet-stream")
                .header("x-amz-content-sha256", &sha256)
                .basic_auth(key, Some(secret))
                .body(content)
                .send()
                .await
        } else {
            self.client
                .put(&url)
                .header("Content-Type", "application/octet-stream")
                .body(content)
                .send()
                .await
        }
        .context("Failed to upload to S3")?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            anyhow::bail!("S3 upload failed with status {}: {}", status, body);
        }

        Ok(ArtifactUploadResult {
            url,
            size: artifact_path.metadata()?.len(),
            sha256,
        })
    }

    /// 上传到 HTTP 端点
    async fn upload_http(
        &self,
        artifact_path: &std::path::Path,
        remote_path: &str,
    ) -> Result<ArtifactUploadResult> {
        let content = tokio::fs::read(artifact_path)
            .await
            .context("Failed to read artifact file")?;

        let sha256 = {
            use sha2::{Digest, Sha256};
            let hash = Sha256::digest(&content);
            hex::encode(hash)
        };

        let endpoint = self
            .endpoint
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("HTTP endpoint not configured"))?;

        let url = format!("{}/{}", endpoint.trim_end_matches('/'), remote_path);

        let response = self
            .client
            .post(&url)
            .header("Content-Type", "application/octet-stream")
            .header("X-Artifact-SHA256", &sha256)
            .body(content)
            .send()
            .await
            .context("Failed to upload to HTTP endpoint")?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            anyhow::bail!("HTTP upload failed with status {}: {}", status, body);
        }

        // 假设响应包含下载 URL
        let download_url = response
            .headers()
            .get("X-Download-URL")
            .and_then(|v| v.to_str().ok())
            .unwrap_or(&url)
            .to_string();

        Ok(ArtifactUploadResult {
            url: download_url,
            size: artifact_path.metadata()?.len(),
            sha256,
        })
    }

    /// 复制到本地存储
    async fn upload_local(
        &self,
        artifact_path: &std::path::Path,
        remote_path: &str,
    ) -> Result<ArtifactUploadResult> {
        let content = tokio::fs::read(artifact_path)
            .await
            .context("Failed to read artifact file")?;

        let sha256 = {
            use sha2::{Digest, Sha256};
            let hash = Sha256::digest(&content);
            hex::encode(hash)
        };

        let storage_dir = self.endpoint.as_deref().unwrap_or("/tmp/artifacts");

        // 创建目标目录
        let target_path = std::path::PathBuf::from(storage_dir).join(remote_path);

        if let Some(parent) = target_path.parent() {
            tokio::fs::create_dir_all(parent)
                .await
                .context("Failed to create artifact directory")?;
        }

        // 复制文件
        tokio::fs::copy(artifact_path, &target_path)
            .await
            .context("Failed to copy artifact")?;

        info!("Artifact saved locally: {:?}", target_path);

        Ok(ArtifactUploadResult {
            url: target_path.to_string_lossy().to_string(),
            size: artifact_path.metadata()?.len(),
            sha256,
        })
    }
}

/// 产物上传结果
#[derive(Debug, Clone)]
pub struct ArtifactUploadResult {
    /// 下载 URL
    pub url: String,
    /// 文件大小
    pub size: u64,
    /// SHA256 哈希
    #[allow(dead_code)]
    pub sha256: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_artifact_storage_creation() {
        let storage = ArtifactStorage::new(
            "local".to_string(),
            Some("/tmp/artifacts".to_string()),
            None,
            None,
            None,
        );

        assert_eq!(storage.storage_type, "local");
        assert_eq!(storage.endpoint, Some("/tmp/artifacts".to_string()));
    }

    #[test]
    fn test_upload_result_creation() {
        let result = ArtifactUploadResult {
            url: "https://storage.example.com/artifact.bin".to_string(),
            size: 1024,
            sha256: "abc123".to_string(),
        };

        assert_eq!(result.size, 1024);
        assert_eq!(result.url, "https://storage.example.com/artifact.bin");
    }
}
