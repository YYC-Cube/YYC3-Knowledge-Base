//! RabbitMQ 发布器
//!
//! 负责将构建任务派发到 RabbitMQ，供 Runner 消费执行

use anyhow::{Context, Result};
use futures::pin_mut;
use lapin::{options::*, BasicProperties, Channel, Connection, ConnectionProperties, ExchangeKind};
use lapin::types::ShortString;
use secrecy::ExposeSecret;
use serde::Serialize;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{debug, info, warn};

use crate::config::RabbitMqConfig;

fn short_string(value: impl Into<String>) -> ShortString {
    value.into().into()
}

/// RabbitMQ 发布器
#[derive(Clone)]
pub struct RabbitMqPublisher {
    config: Arc<RabbitMqConfig>,
    #[allow(dead_code)]
    connection: Arc<Connection>,
    channel: Arc<Channel>,
}

impl RabbitMqPublisher {
    /// 创建新的发布器
    pub async fn new(config: RabbitMqConfig) -> Result<Self> {
        let amqp_url = config.amqp_url.expose_secret();
        info!("Connecting to RabbitMQ: {}", amqp_url.replace(':', ":***@"));

        let conn = Connection::connect(amqp_url, ConnectionProperties::default())
            .await
            .context("Failed to connect to RabbitMQ")?;

        info!("Connected to RabbitMQ");

        let channel = conn
            .create_channel()
            .await
            .context("Failed to create channel")?;

        // 设置发布者确认
        channel
            .confirm_select(ConfirmSelectOptions::default())
            .await
            .context("Failed to enable publisher confirms")?;

        info!("RabbitMQ publisher created with confirms enabled");

        Ok(Self {
            config: Arc::new(config),
            connection: Arc::new(conn),
            channel: Arc::new(channel),
        })
    }

    /// 声明交换机和队列
    pub async fn setup_infrastructure(&self) -> Result<()> {
        // 声明构建任务交换机（Topic 类型）
        self.channel
            .exchange_declare(
                short_string(self.config.build_exchange.clone()),
                ExchangeKind::Topic,
                ExchangeDeclareOptions {
                    durable: true,
                    ..Default::default()
                },
                lapin::types::FieldTable::default(),
            )
            .await
            .context("Failed to declare build exchange")?;

        info!("Declared build exchange: {}", self.config.build_exchange);

        // 声明 Runner 交换机（Direct 类型，用于注册/心跳）
        self.channel
            .exchange_declare(
                short_string(self.config.runner_exchange.clone()),
                ExchangeKind::Direct,
                ExchangeDeclareOptions {
                    durable: true,
                    ..Default::default()
                },
                lapin::types::FieldTable::default(),
            )
            .await
            .context("Failed to declare runner exchange")?;

        info!("Declared runner exchange: {}", self.config.runner_exchange);

        // 声明死信交换机
        let dlq_exchange = format!("{}.dlq", self.config.build_exchange);
        self.channel
            .exchange_declare(
                short_string(dlq_exchange.clone()),
                ExchangeKind::Topic,
                ExchangeDeclareOptions {
                    durable: true,
                    ..Default::default()
                },
                lapin::types::FieldTable::default(),
            )
            .await
            .context("Failed to declare DLQ exchange")?;

        info!("Declared DLQ exchange: {}", dlq_exchange);

        Ok(())
    }

    /// 发布构建任务
    pub async fn publish_build_task(
        &self,
        build_type: &str,
        runner_name: Option<&str>,
        payload: &[u8],
    ) -> Result<()> {
        // 构建路由键：build.<type>[.<runner_name>]
        let routing_key = if let Some(runner) = runner_name {
            format!("build.{}.{}", build_type, runner)
        } else {
            format!("build.{}", build_type)
        };

        let confirm = self
            .channel
            .basic_publish(
                short_string(self.config.build_exchange.clone()),
                short_string(routing_key.clone()),
                BasicPublishOptions::default(),
                payload,
                BasicProperties::default()
                    .with_delivery_mode(2) // 持久化
                    .with_content_type("application/json".into()),
            )
            .await?
            .await?;

        if confirm.is_ack() {
            debug!("Build task published and acknowledged: {}", routing_key);
        } else {
            warn!("Build task published but not acknowledged: {}", routing_key);
        }

        Ok(())
    }

    /// 发布到 Runner 交换机（用于注册/心跳响应等）
    pub async fn publish_to_runner(
        &self,
        routing_key: &str,
        payload: impl Serialize,
    ) -> Result<()> {
        let data = serde_json::to_vec(&payload).context("Failed to serialize runner message")?;

        self.channel
            .basic_publish(
                short_string(self.config.runner_exchange.clone()),
                short_string(routing_key),
                BasicPublishOptions::default(),
                &data,
                BasicProperties::default()
                    .with_delivery_mode(1) // 非持久化
                    .with_content_type("application/json".into()),
            )
            .await?;

        debug!("Published to runner exchange: {}", routing_key);
        Ok(())
    }

    /// 健康检查
    pub async fn health_check(&self) -> bool {
        if let Err(e) = self
            .channel
            .exchange_declare(
                short_string(self.config.build_exchange.clone()),
                ExchangeKind::Topic,
                ExchangeDeclareOptions {
                    passive: true,
                    ..Default::default()
                },
                lapin::types::FieldTable::default(),
            )
            .await
        {
            warn!("RabbitMQ health check failed: {}", e);
            false
        } else {
            true
        }
    }
}

/// RabbitMQ 发布器池
pub struct RabbitMqPublisherPool {
    publisher: Arc<RwLock<Option<RabbitMqPublisher>>>,
    config: RabbitMqConfig,
}

impl RabbitMqPublisherPool {
    /// 创建新的发布器池
    pub fn new(config: RabbitMqConfig) -> Self {
        Self {
            publisher: Arc::new(RwLock::new(None)),
            config,
        }
    }

    /// 获取或初始化发布器
    pub async fn get(&self) -> Result<RabbitMqPublisher> {
        // 检查是否有可用的发布器
        {
            let reader = self.publisher.read().await;
            if let Some(publisher) = reader.as_ref() {
                // 检查健康状态
                if publisher.health_check().await {
                    return Ok(publisher.clone());
                }
            }
        }

        // 需要重新初始化
        let mut writer = self.publisher.write().await;
        let new_publisher = RabbitMqPublisher::new(self.config.clone()).await?;
        new_publisher.setup_infrastructure().await?;
        *writer = Some(new_publisher.clone());
        Ok(new_publisher)
    }

    /// 健康检查
    pub async fn health_check(&self) -> bool {
        let reader = self.publisher.read().await;
        if let Some(publisher) = reader.as_ref() {
            publisher.health_check().await
        } else {
            false
        }
    }
}

/// RabbitMQ 消费器
/// 用于消费 Runner 回传的状态和日志消息
#[derive(Clone)]
pub struct RabbitMqConsumer {
    config: Arc<RabbitMqConfig>,
    #[allow(dead_code)]
    connection: Arc<Connection>,
    channel: Arc<Channel>,
}

impl RabbitMqConsumer {
    /// 创建新的消费者
    pub async fn new(config: RabbitMqConfig) -> Result<Self> {
        let amqp_url = config.amqp_url.expose_secret();
        info!("Connecting to RabbitMQ for consumer: {}", amqp_url.replace(':', ":***@"));

        let conn = Connection::connect(amqp_url, ConnectionProperties::default())
            .await
            .context("Failed to connect to RabbitMQ")?;

        info!("Connected to RabbitMQ for consumer");

        let channel = conn
            .create_channel()
            .await
            .context("Failed to create consumer channel")?;

        // 设置 QoS（每次只获取一条消息，确保顺序处理）
        channel
            .basic_qos(1, BasicQosOptions::default())
            .await
            .context("Failed to set QoS")?;

        info!("RabbitMQ consumer created with QoS=1");

        Ok(Self {
            config: Arc::new(config),
            connection: Arc::new(conn),
            channel: Arc::new(channel),
        })
    }

    /// 声明消费用的队列和绑定
    pub async fn setup_consumer_queues(&self) -> Result<()> {
        // 声明构建状态交换机
        self.channel
            .exchange_declare(
                short_string(self.config.build_exchange.clone()),
                ExchangeKind::Topic,
                ExchangeDeclareOptions {
                    durable: true,
                    ..Default::default()
                },
                lapin::types::FieldTable::default(),
            )
            .await
            .context("Failed to declare build exchange")?;

        // 声明状态更新队列（Fanout from build status）
        let status_queue = "build.status.queue";
        let _queue = self
            .channel
            .queue_declare(
                short_string(status_queue),
                QueueDeclareOptions {
                    durable: true,
                    ..Default::default()
                },
                lapin::types::FieldTable::default(),
            )
            .await
            .context("Failed to declare status queue")?;

        // 绑定状态队列到交换机（监听所有状态更新）
        self.channel
            .queue_bind(
                short_string(status_queue),
                short_string(self.config.build_exchange.clone()),
                short_string("build.status.#"),
                QueueBindOptions::default(),
                lapin::types::FieldTable::default(),
            )
            .await
            .context("Failed to bind status queue")?;

        info!("Declared and bound status queue: {}", status_queue);

        // 声明日志队列
        let log_queue = "build.log.queue";
        let _queue = self
            .channel
            .queue_declare(
                short_string(log_queue),
                QueueDeclareOptions {
                    durable: true,
                    ..Default::default()
                },
                lapin::types::FieldTable::default(),
            )
            .await
            .context("Failed to declare log queue")?;

        // 绑定日志队列到交换机
        self.channel
            .queue_bind(
                short_string(log_queue),
                short_string(self.config.build_exchange.clone()),
                short_string("build.log.#"),
                QueueBindOptions::default(),
                lapin::types::FieldTable::default(),
            )
            .await
            .context("Failed to bind log queue")?;

        info!("Declared and bound log queue: {}", log_queue);

        Ok(())
    }

    /// 启动状态消息消费者
    pub async fn consume_status_messages<F>(&self, mut handler: F) -> Result<()>
    where
        F: FnMut(Vec<u8>) + Send + 'static,
    {
        let queue = "build.status.queue";
        let consumer = self
            .channel
            .basic_consume(
                short_string(queue),
                short_string("status_consumer"),
                BasicConsumeOptions::default(),
                lapin::types::FieldTable::default(),
            )
            .await
            .context("Failed to create status consumer")?;

        info!("Started consuming status messages from: {}", queue);

        // 消费消息 - 使用 StreamExt
        use futures::StreamExt;
        pin_mut!(consumer);

        while let Some(delivery_result) = consumer.next().await {
            match delivery_result {
                Ok(delivery) => {
                    let data = delivery.data.clone();

                    // 调用处理函数
                    handler(data);

                    // 确认消息
                    if let Err(e) = self
                        .channel
                        .basic_ack(delivery.delivery_tag, BasicAckOptions::default())
                        .await
                    {
                        tracing::error!("Failed to ack message: {}", e);
                    }
                }
                Err(e) => {
                    tracing::error!("Consumer error: {}", e);
                }
            }
        }

        Ok(())
    }

    /// 启动日志消息消费者
    pub async fn consume_log_messages<F>(&self, mut handler: F) -> Result<()>
    where
        F: FnMut(Vec<u8>) + Send + 'static,
    {
        let queue = "build.log.queue";
        let consumer = self
            .channel
            .basic_consume(
                short_string(queue),
                short_string("log_consumer"),
                BasicConsumeOptions::default(),
                lapin::types::FieldTable::default(),
            )
            .await
            .context("Failed to create log consumer")?;

        info!("Started consuming log messages from: {}", queue);

        // 消费消息
        use futures::StreamExt;
        pin_mut!(consumer);

        while let Some(delivery_result) = consumer.next().await {
            match delivery_result {
                Ok(delivery) => {
                    let data = delivery.data.clone();

                    // 调用处理函数
                    handler(data);

                    // 确认消息
                    if let Err(e) = self
                        .channel
                        .basic_ack(delivery.delivery_tag, BasicAckOptions::default())
                        .await
                    {
                        tracing::error!("Failed to ack log message: {}", e);
                    }
                }
                Err(e) => {
                    tracing::error!("Log consumer error: {}", e);
                }
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use secrecy::SecretString;

    fn create_test_config() -> RabbitMqConfig {
        RabbitMqConfig {
            amqp_url: SecretString::from("amqp://guest:guest@localhost:5672/%2F".to_string()),
            vhost: "/".to_string(),
            build_exchange: "test.ops.build".to_string(),
            runner_exchange: "test.ops.runner".to_string(),
            pool_size: 1,
            publish_timeout_secs: 5,
        }
    }

    #[test]
    fn test_config_creation() {
        let config = create_test_config();
        assert_eq!(config.build_exchange, "test.ops.build");
        assert_eq!(config.runner_exchange, "test.ops.runner");
    }

    #[test]
    fn test_routing_key_generation() {
        let routing_key = format!("build.{}", "node");
        assert_eq!(routing_key, "build.node");

        let routing_key = format!("build.{}.{}", "node", "runner-1");
        assert_eq!(routing_key, "build.node.runner-1");
    }
}
