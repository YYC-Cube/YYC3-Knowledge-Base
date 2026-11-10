//! User domain models

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// User account
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub email: Option<String>,
    pub password_hash: String,

    // Account state
    pub status: String, // enabled, disabled, locked

    // Security policy
    pub failed_login_attempts: i32,
    pub last_failed_login_at: Option<DateTime<Utc>>,
    pub locked_until: Option<DateTime<Utc>>,
    pub password_changed_at: DateTime<Utc>,
    pub must_change_password: bool,

    // Metadata
    pub full_name: Option<String>,
    pub department: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,

    pub version: i32,
}

/// User status enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum UserStatus {
    Enabled,
    Disabled,
    Locked,
}

impl From<String> for UserStatus {
    fn from(s: String) -> Self {
        match s.to_lowercase().as_str() {
            "enabled" => UserStatus::Enabled,
            "disabled" => UserStatus::Disabled,
            "locked" => UserStatus::Locked,
            _ => UserStatus::Disabled,
        }
    }
}

impl From<UserStatus> for String {
    fn from(status: UserStatus) -> Self {
        match status {
            UserStatus::Enabled => "enabled".to_string(),
            UserStatus::Disabled => "disabled".to_string(),
            UserStatus::Locked => "locked".to_string(),
        }
    }
}

/// Create user request
#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub username: String,
    pub email: Option<String>,
    pub password: String,
    pub full_name: Option<String>,
    pub department: Option<String>,
}

/// Update user request
#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub email: Option<String>,
    pub full_name: Option<String>,
    pub department: Option<String>,
    pub status: Option<String>,
}

/// Change password request
#[derive(Debug, Deserialize)]
pub struct ChangePasswordRequest {
    pub old_password: String,
    pub new_password: String,
}

/// User response (without sensitive data)
#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub username: String,
    pub email: Option<String>,
    pub status: String,
    pub full_name: Option<String>,
    pub department: Option<String>,
    pub must_change_password: bool,
    pub created_at: DateTime<Utc>,
}

impl From<User> for UserResponse {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            username: user.username,
            email: user.email,
            status: user.status,
            full_name: user.full_name,
            department: user.department,
            must_change_password: user.must_change_password,
            created_at: user.created_at,
        }
    }
}

/// User with roles
#[derive(Debug, Serialize)]
pub struct UserWithRoles {
    #[serde(flatten)]
    pub user: UserResponse,
    pub roles: Vec<String>,
    pub scopes: Vec<String>,
}
