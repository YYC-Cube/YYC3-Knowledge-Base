//! 构建任务执行引擎

use anyhow::{Context, Result};
use futures_util::StreamExt;
use lapin::{options::*, Channel, Connection, ConnectionProperties, ExchangeKind, Queue};
use lapin::types::ShortString;
use std::sync::Arc;
use tokio::sync::Semaphore;
use tracing::{debug, error, info};

use crate::config::RunnerConfig;
use crate::executor::BuildExecutor;
use crate::messages::*;
use crate::publisher::MessagePublisher;

// 导入 lapin 的类型
use lapin::types::FieldTable;

fn short_string(value: impl Into<String>) -> ShortString {
    value.into().into()
}

/// 任务 Worker
pub struct TaskWorker {
    #[allow(dead_code)]
    config: Arc<RunnerConfig>,
    channel: Channel,
    queue: Queue,
    executor: Arc<BuildExecutor>,
    publisher: Arc<MessagePublisher>,
    semaphore: Arc<Semaphore>,
}

impl TaskWorker {
    /// 创建新的 Worker
    pub async fn new(config: Arc<RunnerConfig>) -> Result<Self> {
        // 连接到 RabbitMQ
        let conn =
            Connection::connect(&config.message_queue.amqp_url, ConnectionProperties::default())
                .await
                .context("Failed to connect to RabbitMQ")?;

        info!("Connected to RabbitMQ");

        let channel = conn
            .create_channel()
            .await
            .context("Failed to create channel")?;

        // 声明交换机（与服务端一致使用 durable）
        channel
            .exchange_declare(
                short_string(config.message_queue.exchange.clone()),
                ExchangeKind::Topic,
                ExchangeDeclareOptions {
                    durable: true,
                    ..Default::default()
                },
                FieldTable::default(),
            )
            .await
            .context("Failed to declare exchange")?;

        info!("Declared exchange: {}", config.message_queue.exchange);

        // 声明队列
        let queue_name = config.queue_name();
        let queue = channel
            .queue_declare(short_string(queue_name.clone()), QueueDeclareOptions::default(), FieldTable::default())
            .await
            .context("Failed to declare queue")?;

        info!("Declared queue: {}", queue_name);

        // 设置预取
        channel
            .basic_qos(config.message_queue.prefetch, BasicQosOptions::default())
            .await
            .context("Failed to set QoS")?;

        // 绑定队列到交换机
        // 同时支持广播模式（向后兼容）和定向模式（新）
        for capability in &config.runner.capabilities {
            // 广播模式：build.<capability>（向后兼容，逐步废弃）
            let broadcast_routing_key = config.routing_key(capability);
            channel
                .queue_bind(
                    short_string(queue_name.clone()),
                    short_string(config.message_queue.exchange.clone()),
                    short_string(broadcast_routing_key.clone()),
                    QueueBindOptions::default(),
                    FieldTable::default(),
                )
                .await
                .context("Failed to bind queue (broadcast)")?;
            debug!(
                "Bound queue {} to exchange with broadcast routing key: {}",
                queue_name, broadcast_routing_key
            );

            // 定向模式：build.<capability>.<runner_name>（只有此 runner 接收）
            let direct_routing_key = config.routing_key_for_runner(capability);
            channel
                .queue_bind(
                    short_string(queue_name.clone()),
                    short_string(config.message_queue.exchange.clone()),
                    short_string(direct_routing_key.clone()),
                    QueueBindOptions::default(),
                    FieldTable::default(),
                )
                .await
                .context("Failed to bind queue (direct)")?;
            debug!(
                "Bound queue {} to exchange with direct routing key: {}",
                queue_name, direct_routing_key
            );
        }

        // 创建执行引擎
        let executor = Arc::new(BuildExecutor::new(config.clone())?);

        // 创建消息发布器
        let publisher = Arc::new(MessagePublisher::new(&config, channel.clone()).await?);

        // 创建信号量用于并发控制
        let semaphore = Arc::new(Semaphore::new(config.runner.max_concurrent_jobs));

        Ok(Self {
            config,
            channel,
            queue,
            executor,
            publisher,
            semaphore,
        })
    }

    /// 启动 Worker
    pub async fn run(&self) -> Result<()> {
        info!("Starting task worker");

        // 创建消费者
        let consumer = self
            .channel
            .basic_consume(
                self.queue.name().clone(),
                short_string(""),
                BasicConsumeOptions::default(),
                FieldTable::default(),
            )
            .await
            .context("Failed to create consumer")?;

        info!("Consumer created for queue: {}", self.queue.name());

        // 处理消息
        let mut consumer = consumer;
        while let Some(delivery) = consumer.next().await {
            let delivery = delivery.context("Failed to get delivery")?;

            // 获取信号量许可
            let permit = self.semaphore.clone().acquire_owned().await.unwrap();

            let executor = self.executor.clone();
            let publisher = self.publisher.clone();
            let channel = self.channel.clone();

            tokio::spawn(async move {
                let task_id = delivery.routing_key.clone();

                // 处理消息
                match Self::process_message(delivery, executor, publisher, channel).await {
                    Ok(_) => {
                        info!("Task processed successfully: {}", task_id);
                    }
                    Err(e) => {
                        error!("Failed to process task {}: {}", task_id, e);
                    }
                }

                // 释放许可
                drop(permit);
            });
        }

        Ok(())
    }

    /// 处理单条消息
    async fn process_message(
        delivery: lapin::message::Delivery,
        executor: Arc<BuildExecutor>,
        publisher: Arc<MessagePublisher>,
        channel: Channel,
    ) -> Result<()> {
        // 解析消息
        let task: BuildTaskMessage =
            serde_json::from_slice(&delivery.data).context("Failed to parse task message")?;

        info!("Received build task: job={}, task={}", task.job_id, task.task_id);

        // 确认消息
        channel
            .basic_ack(delivery.delivery_tag, BasicAckOptions::default())
            .await
            .context("Failed to ack message")?;

        // 发送接收状态
        publisher
            .publish_build_status(&task, BuildStatus::Received, None, None, None)
            .await?;

        // 执行构建
        match executor.execute(task.clone(), publisher.as_ref()).await {
            Ok(_) => {
                info!("Build completed successfully");
            }
            Err(e) => {
                error!("Build failed: {}", e);
                // 发送失败状态
                let _ = publisher
                    .publish_error(&task, &e.to_string(), ErrorCategory::Network)
                    .await;
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::RunnerConfig;
    use std::collections::HashMap;
    use uuid::Uuid;

    /// 创建测试用的配置
    fn create_test_config() -> RunnerConfig {
        RunnerConfig {
            runner: crate::config::RunnerInfo {
                name: "test-worker".to_string(),
                capabilities: vec!["node".to_string(), "rust".to_string()],
                docker_supported: false,
                max_concurrent_jobs: 2,
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
                queue_prefix: "test-worker".to_string(),
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
        }
    }

    /// 创建测试用的构建任务消息
    fn create_test_task_message() -> BuildTaskMessage {
        BuildTaskMessage {
            task_id: Uuid::new_v4(),
            job_id: Uuid::new_v4(),
            project: ProjectInfo {
                name: "test-project".to_string(),
                repository_url: "https://github.com/test/repo".to_string(),
                branch: "main".to_string(),
                commit: "abc123".to_string(),
                triggered_by: Uuid::new_v4(),
            },
            build: BuildParameters {
                build_type: "node".to_string(),
                env_vars: {
                    let mut map = HashMap::new();
                    map.insert("NODE_ENV".to_string(), "test".to_string());
                    map
                },
                parameters: HashMap::new(),
            },
            steps: vec![BuildStep {
                id: "step-1".to_string(),
                name: "Install".to_string(),
                step_type: StepType::Install,
                command: Some("npm install".to_string()),
                script: None,
                working_dir: None,
                timeout_secs: Some(300),
                continue_on_failure: false,
                produces_artifact: false,
                docker_image: None,
            }],
            publish_target: None,
        }
    }

    #[test]
    fn test_task_message_creation() {
        let msg = create_test_task_message();
        assert!(!msg.task_id.is_nil());
        assert!(!msg.job_id.is_nil());
        assert_eq!(msg.project.name, "test-project");
        assert_eq!(msg.build.build_type, "node");
        assert_eq!(msg.steps.len(), 1);
    }

    #[test]
    fn test_task_message_serialization() {
        let msg = create_test_task_message();
        let json = serde_json::to_string(&msg).unwrap();

        assert!(json.contains("\"task_id\""));
        assert!(json.contains("\"job_id\""));
        assert!(json.contains("\"test-project\""));

        // 测试反序列化
        let deserialized: BuildTaskMessage = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.project.name, msg.project.name);
        assert_eq!(deserialized.steps.len(), msg.steps.len());
    }

    #[test]
    fn test_build_step_types() {
        let step_types = vec![
            StepType::Command,
            StepType::Script,
            StepType::Install,
            StepType::Build,
            StepType::Test,
            StepType::Package,
            StepType::Publish,
            StepType::Custom("deploy".to_string()),
        ];

        for step_type in step_types {
            let step = BuildStep {
                id: "test".to_string(),
                name: "Test Step".to_string(),
                step_type: step_type.clone(),
                command: Some("echo test".to_string()),
                script: None,
                working_dir: None,
                timeout_secs: None,
                continue_on_failure: false,
                produces_artifact: false,
                docker_image: None,
            };

            // 序列化测试
            let json = serde_json::to_string(&step).unwrap();
            let deserialized: BuildStep = serde_json::from_str(&json).unwrap();

            match &step_type {
                StepType::Custom(s) => {
                    if let StepType::Custom(deserialized_s) = &deserialized.step_type {
                        assert_eq!(s, deserialized_s);
                    } else {
                        panic!("Custom step type not preserved");
                    }
                }
                _ => {
                    assert_eq!(format!("{:?}", step_type), format!("{:?}", deserialized.step_type));
                }
            }
        }
    }

    #[test]
    fn test_build_step_with_continue_on_failure() {
        let step = BuildStep {
            id: "step-failable".to_string(),
            name: "Failable Step".to_string(),
            step_type: StepType::Command,
            command: Some("false".to_string()),
            script: None,
            working_dir: None,
            timeout_secs: None,
            continue_on_failure: true,
            produces_artifact: false,
            docker_image: None,
        };

        assert!(step.continue_on_failure);

        // 序列化测试
        let json = serde_json::to_string(&step).unwrap();
        assert!(json.contains("\"continue_on_failure\":true"));

        let deserialized: BuildStep = serde_json::from_str(&json).unwrap();
        assert!(deserialized.continue_on_failure);
    }

    #[test]
    fn test_build_step_with_artifact() {
        let step = BuildStep {
            id: "step-artifact".to_string(),
            name: "Build Artifact".to_string(),
            step_type: StepType::Build,
            command: Some("cargo build --release".to_string()),
            script: None,
            working_dir: None,
            timeout_secs: Some(600),
            continue_on_failure: false,
            produces_artifact: true,
            docker_image: Some("rust:1.75".to_string()),
        };

        assert!(step.produces_artifact);
        assert_eq!(step.docker_image, Some("rust:1.75".to_string()));
        assert_eq!(step.timeout_secs, Some(600));

        let json = serde_json::to_string(&step).unwrap();
        assert!(json.contains("\"produces_artifact\":true"));
        assert!(json.contains("\"docker_image\":\"rust:1.75\""));
    }

    #[test]
    fn test_project_info() {
        let project = ProjectInfo {
            name: "my-project".to_string(),
            repository_url: "https://github.com/user/repo".to_string(),
            branch: "develop".to_string(),
            commit: "def456".to_string(),
            triggered_by: Uuid::new_v4(),
        };

        assert_eq!(project.name, "my-project");
        assert_eq!(project.branch, "develop");
        assert_eq!(project.commit, "def456");

        // 序列化测试
        let json = serde_json::to_string(&project).unwrap();
        let deserialized: ProjectInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.name, project.name);
        assert_eq!(deserialized.repository_url, project.repository_url);
    }

    #[test]
    fn test_build_parameters() {
        let mut env_vars = HashMap::new();
        env_vars.insert("KEY1".to_string(), "value1".to_string());
        env_vars.insert("KEY2".to_string(), "value2".to_string());

        let mut parameters = HashMap::new();
        parameters.insert("flag".to_string(), serde_json::json!(true));
        parameters.insert("count".to_string(), serde_json::json!(42));

        let params = BuildParameters {
            build_type: "rust".to_string(),
            env_vars,
            parameters,
        };

        assert_eq!(params.build_type, "rust");
        assert_eq!(params.env_vars.len(), 2);
        assert_eq!(params.parameters.len(), 2);

        let json = serde_json::to_string(&params).unwrap();
        assert!(json.contains("\"build_type\":\"rust\""));
        assert!(json.contains("\"KEY1\""));
    }

    #[test]
    fn test_config_queue_name_generation() {
        let config = create_test_config();
        let queue_name = config.queue_name();

        assert_eq!(queue_name, "test-worker.test_worker.queue");
    }

    #[test]
    fn test_config_routing_key_generation() {
        let config = create_test_config();

        assert_eq!(config.routing_key("node"), "build.node");
        assert_eq!(config.routing_key("rust"), "build.rust");
        assert_eq!(config.routing_key("java"), "build.java");
        assert_eq!(config.routing_key("python"), "build.python");
    }

    #[test]
    fn test_config_capabilities() {
        let config = create_test_config();

        assert_eq!(config.runner.capabilities.len(), 2);
        assert!(config.runner.capabilities.contains(&"node".to_string()));
        assert!(config.runner.capabilities.contains(&"rust".to_string()));
    }

    #[test]
    fn test_config_max_concurrent_jobs() {
        let config = create_test_config();

        assert_eq!(config.runner.max_concurrent_jobs, 2);
    }

    #[test]
    fn test_config_message_queue_settings() {
        let config = create_test_config();

        assert_eq!(config.message_queue.vhost, "/");
        assert_eq!(config.message_queue.exchange, "ops.build");
        assert_eq!(config.message_queue.prefetch, 1);
    }

    #[test]
    fn test_build_status_serialization() {
        let statuses = vec![
            BuildStatus::Received,
            BuildStatus::Preparing,
            BuildStatus::Running,
            BuildStatus::Succeeded,
            BuildStatus::Failed,
            BuildStatus::Timeout,
            BuildStatus::Cancelled,
        ];

        for status in statuses {
            let json = serde_json::to_string(&status).unwrap();
            let deserialized: BuildStatus = serde_json::from_str(&json).unwrap();
            assert_eq!(format!("{:?}", status), format!("{:?}", deserialized));
        }
    }

    #[test]
    fn test_step_status_serialization() {
        let statuses = vec![
            StepStatus::Pending,
            StepStatus::Running,
            StepStatus::Succeeded,
            StepStatus::Failed,
            StepStatus::Timeout,
            StepStatus::Skipped,
        ];

        for status in statuses {
            let json = serde_json::to_string(&status).unwrap();
            let deserialized: StepStatus = serde_json::from_str(&json).unwrap();

            // �试 PartialEq
            assert_eq!(status, deserialized);
        }
    }

    #[test]
    fn test_error_category_serialization() {
        let categories = vec![
            ErrorCategory::Network,
            ErrorCategory::Auth,
            ErrorCategory::Dependency,
            ErrorCategory::Build,
            ErrorCategory::Test,
            ErrorCategory::Timeout,
            ErrorCategory::Resource,
            ErrorCategory::Permission,
            ErrorCategory::Unknown,
        ];

        for category in categories {
            let json = serde_json::to_string(&category).unwrap();
            let deserialized: ErrorCategory = serde_json::from_str(&json).unwrap();
            assert_eq!(format!("{:?}", category), format!("{:?}", deserialized));
        }
    }

    #[test]
    fn test_full_task_message_with_all_fields() {
        let task = create_test_task_message();

        // 验证所有必需字段
        assert!(!task.task_id.is_nil());
        assert!(!task.job_id.is_nil());
        assert!(!task.project.triggered_by.is_nil());

        // 验证步骤
        assert!(!task.steps.is_empty());
        for step in &task.steps {
            assert!(!step.id.is_empty());
            assert!(!step.name.is_empty());
        }
    }

    #[test]
    fn test_multiple_steps_message() {
        let mut task = create_test_task_message();
        task.steps = vec![
            BuildStep {
                id: "step-1".to_string(),
                name: "Install".to_string(),
                step_type: StepType::Install,
                command: Some("npm install".to_string()),
                script: None,
                working_dir: None,
                timeout_secs: Some(300),
                continue_on_failure: false,
                produces_artifact: false,
                docker_image: None,
            },
            BuildStep {
                id: "step-2".to_string(),
                name: "Build".to_string(),
                step_type: StepType::Build,
                command: Some("npm run build".to_string()),
                script: None,
                working_dir: None,
                timeout_secs: Some(600),
                continue_on_failure: false,
                produces_artifact: true,
                docker_image: None,
            },
            BuildStep {
                id: "step-3".to_string(),
                name: "Test".to_string(),
                step_type: StepType::Test,
                command: Some("npm test".to_string()),
                script: None,
                working_dir: None,
                timeout_secs: Some(300),
                continue_on_failure: true,
                produces_artifact: false,
                docker_image: None,
            },
        ];

        assert_eq!(task.steps.len(), 3);

        let json = serde_json::to_string(&task).unwrap();
        let deserialized: BuildTaskMessage = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.steps.len(), 3);
        assert_eq!(deserialized.steps[0].name, "Install");
        assert_eq!(deserialized.steps[1].name, "Build");
        assert_eq!(deserialized.steps[2].name, "Test");
    }
}
