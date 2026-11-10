//! Authentication repository (认证数据访问)

use crate::{error::AppError, models::audit::*};
use sha2::{Digest, Sha256};
use sqlx::{PgPool, Row};
use uuid::Uuid;

pub struct AuthRepository {
    db: PgPool,
}

impl AuthRepository {
    pub fn new(db: PgPool) -> Self {
        Self { db }
    }

    // ==================== Refresh Tokens ====================

    /// 存储刷新令牌
    pub async fn store_refresh_token(&self, token: &RefreshToken) -> Result<(), AppError> {
        sqlx::query(
            r#"
            INSERT INTO refresh_tokens (
                id, token_hash, user_id, device_id, user_agent, ip_address, expires_at, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            "#,
        )
        .bind(token.id)
        .bind(&token.token_hash)
        .bind(token.user_id)
        .bind(&token.device_id)
        .bind(&token.user_agent)
        .bind(&token.ip_address)
        .bind(token.expires_at)
        .bind(token.created_at)
        .execute(&self.db)
        .await?;

        Ok(())
    }

    /// 根据哈希查找刷新令牌
    pub async fn find_refresh_token_by_hash(
        &self,
        token_hash: &str,
    ) -> Result<Option<RefreshToken>, AppError> {
        let token =
            sqlx::query_as::<_, RefreshToken>("SELECT * FROM refresh_tokens WHERE token_hash = $1")
                .bind(token_hash)
                .fetch_optional(&self.db)
                .await?;

        Ok(token)
    }

    /// 撤销刷新令牌
    pub async fn revoke_refresh_token(&self, token_id: Uuid) -> Result<bool, AppError> {
        let result = sqlx::query(
            "UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL",
        )
        .bind(token_id)
        .execute(&self.db)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    /// 根据哈希撤销刷新令牌
    pub async fn revoke_refresh_token_by_hash(
        &self,
        token_hash: &str,
        user_id: Uuid,
    ) -> Result<bool, AppError> {
        let result = sqlx::query(
            "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND user_id = $2 AND revoked_at IS NULL"
        )
        .bind(token_hash)
        .bind(user_id)
        .execute(&self.db)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    /// 撤销用户的所有刷新令牌
    pub async fn revoke_all_refresh_tokens(&self, user_id: Uuid) -> Result<u64, AppError> {
        let result = sqlx::query(
            "UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL"
        )
        .bind(user_id)
        .execute(&self.db)
        .await?;

        Ok(result.rows_affected())
    }

    /// 清理过期的刷新令牌
    pub async fn cleanup_expired_tokens(&self) -> Result<u64, AppError> {
        let result = sqlx::query("DELETE FROM refresh_tokens WHERE expires_at < NOW()")
            .execute(&self.db)
            .await?;

        Ok(result.rows_affected())
    }

    // ==================== Login Events ====================

    /// 记录登录事件
    pub async fn record_login_event(&self, event: &LoginEvent) -> Result<(), AppError> {
        sqlx::query(
            r#"
            INSERT INTO login_events (
                id, user_id, username, event_type, auth_method, failure_reason,
                source_ip, user_agent, device_id, risk_tag, occurred_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            "#,
        )
        .bind(event.id)
        .bind(event.user_id)
        .bind(&event.username)
        .bind(&event.event_type)
        .bind(&event.auth_method)
        .bind(&event.failure_reason)
        .bind(&event.source_ip)
        .bind(&event.user_agent)
        .bind(&event.device_id)
        .bind(&event.risk_tag)
        .bind(event.occurred_at)
        .execute(&self.db)
        .await?;

        Ok(())
    }

    /// 统计最近的登录失败次数
    pub async fn count_recent_login_failures(
        &self,
        client_ip: &str,
        seconds: i64,
    ) -> Result<i64, AppError> {
        let count: i64 = sqlx::query(
            r#"
            SELECT COUNT(*)
            FROM login_events
            WHERE source_ip = $1
                AND event_type = 'login_failure'
                AND occurred_at > NOW() - INTERVAL '1 second' * $2
            "#,
        )
        .bind(client_ip)
        .bind(seconds)
        .fetch_one(&self.db)
        .await?
        .get(0);

        Ok(count)
    }

    /// 统计用户最近的成功登录次数
    pub async fn count_recent_user_logins(
        &self,
        user_id: Uuid,
        hours: i64,
    ) -> Result<i64, AppError> {
        let count: i64 = sqlx::query(
            r#"
            SELECT COUNT(*)
            FROM login_events
            WHERE user_id = $1
                AND event_type = 'login_success'
                AND occurred_at > NOW() - INTERVAL '1 hour' * $2
            "#,
        )
        .bind(user_id)
        .bind(hours)
        .fetch_one(&self.db)
        .await?
        .get(0);

        Ok(count)
    }

    // ==================== Utility Functions ====================

    /// 哈希令牌用于存储
    pub fn hash_token(token: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(token.as_bytes());
        hex::encode(hasher.finalize())
    }
}
