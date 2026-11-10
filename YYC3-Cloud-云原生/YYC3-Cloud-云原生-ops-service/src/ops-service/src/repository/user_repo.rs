//! User repository (数据库访问层)

use crate::{error::AppError, models::role::RoleBinding, models::user::*};
use sqlx::{PgPool, Row};
use uuid::Uuid;

pub struct UserRepository {
    db: PgPool,
}

impl UserRepository {
    pub fn new(db: PgPool) -> Self {
        Self { db }
    }

    /// 根据用户名查找用户
    pub async fn find_by_username(&self, username: &str) -> Result<Option<User>, AppError> {
        let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE username = $1")
            .bind(username)
            .fetch_optional(&self.db)
            .await?;

        Ok(user)
    }

    /// 根据 ID 查找用户
    pub async fn find_by_id(&self, id: &Uuid) -> Result<Option<User>, AppError> {
        let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.db)
            .await?;

        Ok(user)
    }

    /// 创建用户
    pub async fn create(
        &self,
        req: &CreateUserRequest,
        password_hash: &str,
        created_by: Uuid,
    ) -> Result<User, AppError> {
        let user = sqlx::query_as::<_, User>(
            r#"
            INSERT INTO users (username, email, password_hash, full_name, department, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            "#,
        )
        .bind(&req.username)
        .bind(&req.email)
        .bind(password_hash)
        .bind(&req.full_name)
        .bind(&req.department)
        .bind(created_by)
        .fetch_one(&self.db)
        .await?;

        Ok(user)
    }

    /// 更新用户
    pub async fn update(
        &self,
        id: Uuid,
        req: &UpdateUserRequest,
    ) -> Result<Option<User>, AppError> {
        let user = sqlx::query_as::<_, User>(
            r#"
            UPDATE users
            SET
                email = COALESCE($2, email),
                full_name = COALESCE($3, full_name),
                department = COALESCE($4, department),
                status = COALESCE($5, status),
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(&req.email)
        .bind(&req.full_name)
        .bind(&req.department)
        .bind(&req.status)
        .fetch_optional(&self.db)
        .await?;

        Ok(user)
    }

    /// 更新密码
    pub async fn update_password(
        &self,
        id: Uuid,
        password_hash: &str,
        force_change: bool,
    ) -> Result<bool, AppError> {
        let result = sqlx::query(
            r#"
            UPDATE users
            SET
                password_hash = $2,
                password_changed_at = NOW(),
                must_change_password = $3,
                failed_login_attempts = 0,
                locked_until = NULL,
                updated_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(id)
        .bind(password_hash)
        .bind(force_change)
        .execute(&self.db)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    /// 删除用户
    pub async fn delete(&self, id: Uuid) -> Result<bool, AppError> {
        let result = sqlx::query("DELETE FROM users WHERE id = $1")
            .bind(id)
            .execute(&self.db)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    /// 增加失败登录次数
    pub async fn increment_failed_attempts(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query(
            r#"
            UPDATE users
            SET
                failed_login_attempts = failed_login_attempts + 1,
                last_failed_login_at = NOW(),
                updated_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(id)
        .execute(&self.db)
        .await?;

        Ok(())
    }

    /// 重置失败登录次数
    pub async fn reset_failed_attempts(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query(
            r#"
            UPDATE users
            SET
                failed_login_attempts = 0,
                last_failed_login_at = NULL,
                updated_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(id)
        .execute(&self.db)
        .await?;

        Ok(())
    }

    /// 锁定用户账户
    pub async fn lock_account(
        &self,
        id: Uuid,
        locked_until: chrono::DateTime<chrono::Utc>,
    ) -> Result<(), AppError> {
        sqlx::query(
            r#"
            UPDATE users
            SET
                status = 'locked',
                locked_until = $2,
                updated_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(id)
        .bind(locked_until)
        .execute(&self.db)
        .await?;

        Ok(())
    }

    /// 获取用户的角色绑定
    pub async fn get_user_roles(&self, user_id: Uuid) -> Result<Vec<RoleBinding>, AppError> {
        let bindings = sqlx::query_as::<_, RoleBinding>(
            r#"
            SELECT
                rb.id,
                rb.user_id,
                rb.role_id,
                r.name as role_name,
                rb.scope_type,
                rb.scope_value,
                rb.created_at
            FROM role_bindings rb
            JOIN roles r ON rb.role_id = r.id
            WHERE rb.user_id = $1
            "#,
        )
        .bind(user_id)
        .fetch_all(&self.db)
        .await?;

        Ok(bindings)
    }

    /// 列出所有用户
    pub async fn list(&self, limit: i64, offset: i64) -> Result<Vec<User>, AppError> {
        let users = sqlx::query_as::<_, User>(
            "SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.db)
        .await?;

        Ok(users)
    }

    /// 统计用户数量
    pub async fn count(&self) -> Result<i64, AppError> {
        let count: i64 = sqlx::query("SELECT COUNT(*) FROM users")
            .fetch_one(&self.db)
            .await?
            .get(0);

        Ok(count)
    }
}
