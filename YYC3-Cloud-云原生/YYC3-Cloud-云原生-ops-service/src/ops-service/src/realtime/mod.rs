//! Real-time event streaming
//! P3 阶段：实时事件推送（SSE）

use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{broadcast, RwLock};
use uuid::Uuid;

use crate::error::{AppError, Result};

/// 实时事件类型
#[derive(Debug, Clone)]
pub enum RealtimeEvent {
    /// 作业状态变更
    JobStatusChanged {
        job_id: Uuid,
        old_status: String,
        new_status: String,
    },
    /// 任务状态变更
    TaskStatusChanged {
        task_id: Uuid,
        job_id: Uuid,
        old_status: String,
        new_status: String,
    },
    /// 任务输出更新
    TaskOutputUpdate {
        task_id: Uuid,
        job_id: Uuid,
        output: String,
        is_complete: bool,
    },
    /// 审批状态变更
    ApprovalStatusChanged {
        approval_id: Uuid,
        old_status: String,
        new_status: String,
    },
    /// 新审批请求
    NewApprovalRequest {
        approval_id: Uuid,
        job_id: Option<Uuid>,
        title: String,
        requested_by: Uuid,
    },
    /// 心跳信号（保持连接活跃）
    Heartbeat,
}

impl RealtimeEvent {
    /// 转换为SSE格式的数据
    pub fn to_sse_data(&self) -> String {
        match self {
            RealtimeEvent::JobStatusChanged {
                job_id,
                old_status,
                new_status,
            } => serde_json::json!({
                "type": "job_status_changed",
                "data": {
                    "job_id": job_id,
                    "old_status": old_status,
                    "new_status": new_status,
                }
            })
            .to_string(),
            RealtimeEvent::TaskStatusChanged {
                task_id,
                job_id,
                old_status,
                new_status,
            } => serde_json::json!({
                "type": "task_status_changed",
                "data": {
                    "task_id": task_id,
                    "job_id": job_id,
                    "old_status": old_status,
                    "new_status": new_status,
                }
            })
            .to_string(),
            RealtimeEvent::TaskOutputUpdate {
                task_id,
                job_id,
                output,
                is_complete,
            } => serde_json::json!({
                "type": "task_output_update",
                "data": {
                    "task_id": task_id,
                    "job_id": job_id,
                    "output": output,
                    "is_complete": is_complete,
                }
            })
            .to_string(),
            RealtimeEvent::ApprovalStatusChanged {
                approval_id,
                old_status,
                new_status,
            } => serde_json::json!({
                "type": "approval_status_changed",
                "data": {
                    "approval_id": approval_id,
                    "old_status": old_status,
                    "new_status": new_status,
                }
            })
            .to_string(),
            RealtimeEvent::NewApprovalRequest {
                approval_id,
                job_id,
                title,
                requested_by,
            } => serde_json::json!({
                "type": "new_approval_request",
                "data": {
                    "approval_id": approval_id,
                    "job_id": job_id,
                    "title": title,
                    "requested_by": requested_by,
                }
            })
            .to_string(),
            RealtimeEvent::Heartbeat => serde_json::json!({
                "type": "heartbeat",
                "data": {
                    "timestamp": chrono::Utc::now().to_rfc3339()
                }
            })
            .to_string(),
        }
    }

    /// 获取事件类型名称
    pub fn event_type(&self) -> &str {
        match self {
            RealtimeEvent::JobStatusChanged { .. } => "job_status_changed",
            RealtimeEvent::TaskStatusChanged { .. } => "task_status_changed",
            RealtimeEvent::TaskOutputUpdate { .. } => "task_output_update",
            RealtimeEvent::ApprovalStatusChanged { .. } => "approval_status_changed",
            RealtimeEvent::NewApprovalRequest { .. } => "new_approval_request",
            RealtimeEvent::Heartbeat => "heartbeat",
        }
    }
}

/// 事件总线
#[derive(Clone)]
pub struct EventBus {
    /// 广播发送器（用于向所有订阅者发送事件）
    sender: broadcast::Sender<RealtimeEvent>,
}

impl EventBus {
    /// 创建新的事件总线
    pub fn new(capacity: usize) -> Self {
        let (sender, _) = broadcast::channel(capacity);
        Self { sender }
    }

    /// 发布事件
    pub fn publish(&self, event: RealtimeEvent) -> Result<()> {
        self.sender
            .send(event)
            .map_err(|e| AppError::internal_error(&format!("Failed to publish event: {}", e)))?;
        Ok(())
    }

    /// 订阅事件
    pub fn subscribe(&self) -> broadcast::Receiver<RealtimeEvent> {
        self.sender.subscribe()
    }

    /// 订阅特定作业的事件
    pub fn subscribe_to_job(&self, job_id: Uuid) -> JobEventStream {
        JobEventStream::new(self.subscribe(), job_id)
    }

    /// 订阅所有审批事件
    pub fn subscribe_to_approvals(&self) -> ApprovalEventStream {
        ApprovalEventStream::new(self.subscribe())
    }
}

/// 作业事件流（过滤特定作业的事件）
pub struct JobEventStream {
    receiver: broadcast::Receiver<RealtimeEvent>,
    job_id: Uuid,
}

impl JobEventStream {
    fn new(receiver: broadcast::Receiver<RealtimeEvent>, job_id: Uuid) -> Self {
        Self { receiver, job_id }
    }

    /// 转换为SSE流
    pub async fn to_sse_stream(mut self) -> Result<impl futures::Stream<Item = Result<String>>> {
        let (tx, rx) = tokio::sync::mpsc::channel(100);

        // 心跳定时器
        let heartbeat_tx = tx.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(30));
            loop {
                interval.tick().await;
                if heartbeat_tx
                    .send(Ok(RealtimeEvent::Heartbeat.to_sse_data()))
                    .await
                    .is_err()
                {
                    break;
                }
            }
        });

        // 事件转发任务
        tokio::spawn(async move {
            while let Ok(event) = self.receiver.recv().await {
                // 过滤与当前作业相关的事件
                let should_send = match &event {
                    RealtimeEvent::JobStatusChanged { job_id, .. } => job_id == &self.job_id,
                    RealtimeEvent::TaskStatusChanged { job_id, .. } => job_id == &self.job_id,
                    RealtimeEvent::TaskOutputUpdate { job_id, .. } => job_id == &self.job_id,
                    RealtimeEvent::Heartbeat => true,
                    _ => false,
                };

                if should_send {
                    let sse_data =
                        format!("event: {}\ndata: {}\n\n", event.event_type(), event.to_sse_data());
                    if tx.send(Ok(sse_data)).await.is_err() {
                        break;
                    }
                }
            }
        });

        // 创建一个Stream
        let stream = tokio_stream::wrappers::ReceiverStream::new(rx);
        Ok(stream)
    }
}

/// 审批事件流
pub struct ApprovalEventStream {
    receiver: broadcast::Receiver<RealtimeEvent>,
}

impl ApprovalEventStream {
    fn new(receiver: broadcast::Receiver<RealtimeEvent>) -> Self {
        Self { receiver }
    }

    /// 转换为SSE流
    pub async fn to_sse_stream(mut self) -> Result<impl futures::Stream<Item = Result<String>>> {
        let (tx, rx) = tokio::sync::mpsc::channel(100);

        // 心跳定时器
        let heartbeat_tx = tx.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(30));
            loop {
                interval.tick().await;
                if heartbeat_tx
                    .send(Ok(RealtimeEvent::Heartbeat.to_sse_data()))
                    .await
                    .is_err()
                {
                    break;
                }
            }
        });

        // 事件转发任务
        tokio::spawn(async move {
            while let Ok(event) = self.receiver.recv().await {
                // 过滤审批相关的事件
                let should_send = matches!(
                    event,
                    RealtimeEvent::ApprovalStatusChanged { .. }
                        | RealtimeEvent::NewApprovalRequest { .. }
                        | RealtimeEvent::Heartbeat
                );

                if should_send {
                    let sse_data =
                        format!("event: {}\ndata: {}\n\n", event.event_type(), event.to_sse_data());
                    if tx.send(Ok(sse_data)).await.is_err() {
                        break;
                    }
                }
            }
        });

        let stream = tokio_stream::wrappers::ReceiverStream::new(rx);
        Ok(stream)
    }
}

/// 连接管理器（用于跟踪和管理活跃的SSE连接）
#[derive(Clone)]
pub struct ConnectionManager {
    connections: Arc<RwLock<std::collections::HashMap<Uuid, ConnectionInfo>>>,
}

/// 连接信息
#[derive(Clone, Debug)]
pub struct ConnectionInfo {
    pub user_id: Uuid,
    pub connected_at: chrono::DateTime<chrono::Utc>,
    pub last_activity: chrono::DateTime<chrono::Utc>,
    pub subscription_type: String, // "job", "approval", "all"
}

impl ConnectionManager {
    pub fn new() -> Self {
        Self {
            connections: Arc::new(RwLock::new(std::collections::HashMap::new())),
        }
    }
}

impl Default for ConnectionManager {
    fn default() -> Self {
        Self::new()
    }
}

impl ConnectionManager {
    /// 注册连接
    pub async fn register(&self, conn_id: Uuid, info: ConnectionInfo) {
        let mut conns = self.connections.write().await;
        conns.insert(conn_id, info);
    }

    /// 注销连接
    pub async fn unregister(&self, conn_id: &Uuid) {
        let mut conns = self.connections.write().await;
        conns.remove(conn_id);
    }

    /// 更新连接活动时间
    pub async fn update_activity(&self, conn_id: &Uuid) {
        let mut conns = self.connections.write().await;
        if let Some(conn) = conns.get_mut(conn_id) {
            conn.last_activity = chrono::Utc::now();
        }
    }

    /// 获取活跃连接数
    pub async fn active_count(&self) -> usize {
        let conns = self.connections.read().await;
        conns.len()
    }

    /// 清理超时连接
    pub async fn cleanup_timeout(&self, timeout_secs: i64) {
        let mut conns = self.connections.write().await;
        let timeout_threshold = chrono::Utc::now() - chrono::Duration::seconds(timeout_secs);

        conns.retain(|_, info| info.last_activity > timeout_threshold);
    }
}

/// 数据脱敏工具
pub struct DataMasker;

impl DataMasker {
    /// 脱敏输出内容（移除敏感信息）
    pub fn mask_output(output: &str) -> String {
        let mut masked = output.to_string();

        // 脱敏密码（常见模式）- 使用简化的正则表达式
        let password_patterns = vec![
            (r"(?i)password\s*[:=]\s*\S+", "****"),
            (r"(?i)passwd\s*[:=]\s*\S+", "****"),
            (r"(?i)pwd\s*[:=]\s*\S+", "****"),
            (r"(?i)api_key\s*[:=]\s*\S+", "****"),
            (r"(?i)secret\s*[:=]\s*\S+", "****"),
            (r"(?i)token\s*[:=]\s*\S+", "****"),
        ];

        for (pattern, replacement) in password_patterns {
            if let Ok(re) = regex::Regex::new(pattern) {
                masked = re.replace_all(&masked, replacement).to_string();
            }
        }

        // 脱敏邮箱
        let email_re =
            regex::Regex::new(r"[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})").unwrap();
        masked = email_re.replace_all(&masked, "***@$1").to_string();

        // 脱敏IP地址（可选，取决于安全策略）
        // let ip_re = regex::Regex::new(r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}").unwrap();
        // masked = ip_re.replace_all(&masked, "***.***.***.***").to_string();

        masked
    }

    /// 脱敏错误信息
    pub fn mask_error(error: &str) -> String {
        Self::mask_output(error)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mask_password() {
        let output = "password=secret123\nusername=admin";
        let masked = DataMasker::mask_output(output);
        assert!(!masked.contains("secret123"));
        assert!(masked.contains("username=admin"));
    }

    #[test]
    fn test_mask_email() {
        let output = "Email: test@example.com";
        let masked = DataMasker::mask_output(output);
        assert!(masked.contains("***@"));
        assert!(!masked.contains("test@example.com"));
    }
}
