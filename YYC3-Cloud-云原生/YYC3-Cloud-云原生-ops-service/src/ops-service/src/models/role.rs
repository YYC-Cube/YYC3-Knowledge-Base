//! Role and permission domain models

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Role
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Role {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub is_system: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Permission
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Permission {
    pub id: Uuid,
    pub resource: String,
    pub action: String,
    pub description: Option<String>,
}

/// Role binding (user <-> role with scope)
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct RoleBinding {
    pub id: Uuid,
    pub user_id: Uuid,
    pub role_id: Uuid,
    pub role_name: String,  // Joined from roles table
    pub scope_type: String, // global, group, environment
    pub scope_value: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// User role summary (from role bindings)
#[derive(Debug, Clone, Serialize)]
pub struct UserRoleSummary {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub scope_type: String,
    pub scope_value: Option<String>,
}

/// Create role request
#[derive(Debug, Deserialize)]
pub struct CreateRoleRequest {
    pub name: String,
    pub description: Option<String>,
}

/// Update role request
#[derive(Debug, Deserialize)]
pub struct UpdateRoleRequest {
    pub description: Option<String>,
}

/// Assign role request
#[derive(Debug, Deserialize)]
pub struct AssignRoleRequest {
    pub user_id: Uuid,
    pub role_id: Uuid,
    pub scope_type: String, // global, group, environment
    pub scope_value: Option<String>,
}

/// Permission summary
#[derive(Debug, Serialize)]
pub struct PermissionSummary {
    pub resource: String,
    pub action: String,
    pub description: Option<String>,
}
