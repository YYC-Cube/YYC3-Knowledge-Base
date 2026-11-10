//! Role repository (角色数据访问)

use crate::{error::AppError, models::role::*};
use sqlx::{PgPool, Row};
use uuid::Uuid;

pub struct RoleRepository {
    db: PgPool,
}

impl RoleRepository {
    pub fn new(db: PgPool) -> Self {
        Self { db }
    }

    // ==================== Roles ====================

    /// 列出所有角色
    pub async fn list(&self) -> Result<Vec<Role>, AppError> {
        let roles = sqlx::query_as::<_, Role>("SELECT * FROM roles ORDER BY name")
            .fetch_all(&self.db)
            .await?;

        Ok(roles)
    }

    /// 根据名称查找角色
    pub async fn find_by_name(&self, name: &str) -> Result<Option<Role>, AppError> {
        let role = sqlx::query_as::<_, Role>("SELECT * FROM roles WHERE name = $1")
            .bind(name)
            .fetch_optional(&self.db)
            .await?;

        Ok(role)
    }

    /// 根据 ID 查找角色
    pub async fn find_by_id(&self, id: &Uuid) -> Result<Option<Role>, AppError> {
        let role = sqlx::query_as::<_, Role>("SELECT * FROM roles WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.db)
            .await?;

        Ok(role)
    }

    /// 创建角色
    pub async fn create(&self, req: &CreateRoleRequest) -> Result<Role, AppError> {
        let role = sqlx::query_as::<_, Role>(
            r#"
            INSERT INTO roles (name, description)
            VALUES ($1, $2)
            RETURNING *
            "#,
        )
        .bind(&req.name)
        .bind(&req.description)
        .fetch_one(&self.db)
        .await?;

        Ok(role)
    }

    /// 更新角色
    pub async fn update(
        &self,
        id: Uuid,
        req: &UpdateRoleRequest,
    ) -> Result<Option<Role>, AppError> {
        let role = sqlx::query_as::<_, Role>(
            r#"
            UPDATE roles
            SET
                description = COALESCE($2, description),
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(&req.description)
        .fetch_optional(&self.db)
        .await?;

        Ok(role)
    }

    /// 删除角色
    pub async fn delete(&self, id: Uuid) -> Result<bool, AppError> {
        // 检查是否为系统角色
        let role = self
            .find_by_id(&id)
            .await?
            .ok_or_else(|| AppError::not_found("Resource not found"))?;

        if role.is_system {
            return Err(AppError::BadRequest("Cannot delete system role".to_string()));
        }

        let result = sqlx::query("DELETE FROM roles WHERE id = $1")
            .bind(id)
            .execute(&self.db)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    // ==================== Permissions ====================

    /// 获取角色的所有权限
    pub async fn get_role_permissions(&self, role_id: Uuid) -> Result<Vec<Permission>, AppError> {
        let permissions = sqlx::query_as::<_, Permission>(
            r#"
            SELECT p.*
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = $1
            ORDER BY p.resource, p.action
            "#,
        )
        .bind(role_id)
        .fetch_all(&self.db)
        .await?;

        Ok(permissions)
    }

    /// 列出所有权限
    pub async fn list_permissions(&self) -> Result<Vec<Permission>, AppError> {
        let permissions =
            sqlx::query_as::<_, Permission>("SELECT * FROM permissions ORDER BY resource, action")
                .fetch_all(&self.db)
                .await?;

        Ok(permissions)
    }

    /// 检查角色是否拥有特定权限
    pub async fn role_has_permission(
        &self,
        role_id: Uuid,
        resource: &str,
        action: &str,
    ) -> Result<bool, AppError> {
        let count: i64 = sqlx::query(
            r#"
            SELECT COUNT(*)
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            WHERE rp.role_id = $1 AND p.resource = $2 AND p.action = $3
            "#,
        )
        .bind(role_id)
        .bind(resource)
        .bind(action)
        .fetch_one(&self.db)
        .await?
        .get(0);

        Ok(count > 0)
    }

    /// 为角色添加权限
    pub async fn add_permission_to_role(
        &self,
        role_id: Uuid,
        permission_id: Uuid,
    ) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING"
        )
        .bind(role_id)
        .bind(permission_id)
        .execute(&self.db)
        .await?;

        Ok(())
    }

    /// 从角色移除权限
    pub async fn remove_permission_from_role(
        &self,
        role_id: Uuid,
        permission_id: Uuid,
    ) -> Result<bool, AppError> {
        let result =
            sqlx::query("DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2")
                .bind(role_id)
                .bind(permission_id)
                .execute(&self.db)
                .await?;

        Ok(result.rows_affected() > 0)
    }

    // ==================== Role Bindings ====================

    /// 获取用户的角色绑定
    pub async fn get_user_role_bindings(
        &self,
        user_id: Uuid,
    ) -> Result<Vec<RoleBinding>, AppError> {
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

    /// 为用户分配角色
    pub async fn assign_role_to_user(
        &self,
        user_id: Uuid,
        role_id: Uuid,
        scope_type: &str,
        scope_value: Option<&str>,
        created_by: Uuid,
    ) -> Result<RoleBinding, AppError> {
        let binding = sqlx::query_as::<_, RoleBinding>(
            r#"
            INSERT INTO role_bindings (user_id, role_id, scope_type, scope_value, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            "#,
        )
        .bind(user_id)
        .bind(role_id)
        .bind(scope_type)
        .bind(scope_value)
        .bind(created_by)
        .fetch_one(&self.db)
        .await?;

        Ok(binding)
    }

    /// 撤销用户的角色
    pub async fn revoke_role_from_user(&self, binding_id: Uuid) -> Result<bool, AppError> {
        let result = sqlx::query("DELETE FROM role_bindings WHERE id = $1")
            .bind(binding_id)
            .execute(&self.db)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    /// 撤销用户的所有角色绑定
    pub async fn revoke_all_roles_from_user(&self, user_id: Uuid) -> Result<u64, AppError> {
        let result = sqlx::query("DELETE FROM role_bindings WHERE user_id = $1")
            .bind(user_id)
            .execute(&self.db)
            .await?;

        Ok(result.rows_affected())
    }
}
