//! Audit domain models

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Audit log entry
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AuditLog {
    pub id: Uuid,
    pub subject_id: Uuid,
    pub subject_type: String,
    pub subject_name: Option<String>,
    pub action: String,
    pub resource_type: String,
    pub resource_id: Option<Uuid>,
    pub resource_name: Option<String>,
    pub changes: Option<serde_json::Value>,
    pub changes_summary: Option<String>,
    pub source_ip: Option<String>,
    pub user_agent: Option<String>,
    pub trace_id: Option<String>,
    pub request_id: Option<String>,
    pub result: String,
    pub error_message: Option<String>,
    pub occurred_at: DateTime<Utc>,
}

/// Audit log filters
#[derive(Debug, Deserialize)]
pub struct AuditLogFilters {
    pub subject_id: Option<Uuid>,
    pub resource_type: Option<String>,
    pub resource_id: Option<Uuid>,
    pub action: Option<String>,
    pub result: Option<String>,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub trace_id: Option<String>,
}

/// Login event
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct LoginEvent {
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    pub username: String,
    pub event_type: String,
    pub auth_method: String,
    pub failure_reason: Option<String>,
    pub source_ip: String,
    pub user_agent: Option<String>,
    pub device_id: Option<String>,
    pub risk_tag: Option<String>,
    pub occurred_at: DateTime<Utc>,
}

/// Refresh token record
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct RefreshToken {
    pub id: Uuid,
    pub token_hash: String,
    pub user_id: Uuid,
    pub device_id: Option<String>,
    pub user_agent: Option<String>,
    pub ip_address: String,
    pub expires_at: DateTime<Utc>,
    pub revoked_at: Option<DateTime<Utc>>,
    pub replaced_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}
