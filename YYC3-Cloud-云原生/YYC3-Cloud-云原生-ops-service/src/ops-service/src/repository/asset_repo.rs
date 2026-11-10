//! Asset repository (资产数据访问)

use crate::{error::AppError, models::asset::*};
use sqlx::{PgPool, Row};
use uuid::Uuid;

pub struct AssetRepository {
    db: PgPool,
}

impl AssetRepository {
    pub fn new(db: PgPool) -> Self {
        Self { db }
    }

    // ==================== Groups ====================

    /// 创建资产组
    pub async fn create_group(
        &self,
        req: &CreateGroupRequest,
        created_by: Uuid,
    ) -> Result<AssetGroup, AppError> {
        let group = sqlx::query_as::<_, AssetGroup>(
            r#"
            INSERT INTO assets_groups (name, description, environment, parent_id, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            "#,
        )
        .bind(&req.name)
        .bind(&req.description)
        .bind(&req.environment)
        .bind(req.parent_id)
        .bind(created_by)
        .fetch_one(&self.db)
        .await?;

        Ok(group)
    }

    /// 获取资产组
    pub async fn get_group(&self, id: Uuid) -> Result<Option<AssetGroup>, AppError> {
        let group = sqlx::query_as::<_, AssetGroup>("SELECT * FROM assets_groups WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.db)
            .await?;

        Ok(group)
    }

    /// 列出资产组
    pub async fn list_groups(
        &self,
        environment: Option<&str>,
    ) -> Result<Vec<AssetGroup>, AppError> {
        let groups = if let Some(env) = environment {
            sqlx::query_as::<_, AssetGroup>(
                "SELECT * FROM assets_groups WHERE environment = $1 ORDER BY name",
            )
            .bind(env)
            .fetch_all(&self.db)
            .await?
        } else {
            sqlx::query_as::<_, AssetGroup>(
                "SELECT * FROM assets_groups ORDER BY environment, name",
            )
            .fetch_all(&self.db)
            .await?
        };

        Ok(groups)
    }

    /// 更新资产组
    pub async fn update_group(
        &self,
        id: Uuid,
        req: &UpdateGroupRequest,
    ) -> Result<Option<AssetGroup>, AppError> {
        let group = sqlx::query_as::<_, AssetGroup>(
            r#"
            UPDATE assets_groups
            SET
                name = COALESCE($2, name),
                description = COALESCE($3, description),
                environment = COALESCE($4, environment),
                parent_id = COALESCE($5, parent_id),
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(&req.name)
        .bind(&req.description)
        .bind(&req.environment)
        .bind(req.parent_id)
        .fetch_optional(&self.db)
        .await?;

        Ok(group)
    }

    /// 删除资产组
    pub async fn delete_group(&self, id: Uuid) -> Result<bool, AppError> {
        let result = sqlx::query("DELETE FROM assets_groups WHERE id = $1")
            .bind(id)
            .execute(&self.db)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    // ==================== Hosts ====================

    /// 创建主机
    pub async fn create_host(
        &self,
        req: &CreateHostRequest,
        created_by: Uuid,
    ) -> Result<Host, AppError> {
        let host = sqlx::query_as::<_, Host>(
            r#"
            INSERT INTO assets_hosts (
                identifier, display_name, address, port, group_id, environment,
                tags, owner_id, status, notes, os_type, os_version, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
            "#
        )
        .bind(&req.identifier)
        .bind(&req.display_name)
        .bind(&req.address)
        .bind(req.port)
        .bind(req.group_id)
        .bind(&req.environment)
        .bind(sqlx::types::Json(req.tags.clone())) // 转换为 Json
        .bind(req.owner_id)
        .bind(&req.status)
        .bind(&req.notes)
        .bind(&req.os_type)
        .bind(&req.os_version)
        .bind(created_by)
        .fetch_one(&self.db)
        .await?;

        Ok(host)
    }

    /// 获取主机
    pub async fn get_host(&self, id: Uuid) -> Result<Option<Host>, AppError> {
        let host = sqlx::query_as::<_, Host>("SELECT * FROM assets_hosts WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.db)
            .await?;

        Ok(host)
    }

    /// 根据标识符获取主机
    pub async fn get_host_by_identifier(&self, identifier: &str) -> Result<Option<Host>, AppError> {
        let host = sqlx::query_as::<_, Host>("SELECT * FROM assets_hosts WHERE identifier = $1")
            .bind(identifier)
            .fetch_optional(&self.db)
            .await?;

        Ok(host)
    }

    /// 列出主机
    pub async fn list_hosts(
        &self,
        filters: &HostListFilters,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<Host>, AppError> {
        let mut query = String::from("SELECT * FROM assets_hosts WHERE 1=1");
        let mut index = 0;

        if filters.group_id.is_some() {
            index += 1;
            query.push_str(&format!(" AND group_id = ${}", index));
        }
        if let Some(_env) = &filters.environment {
            index += 1;
            query.push_str(&format!(" AND environment = ${}", index));
        }
        if let Some(_status) = &filters.status {
            index += 1;
            query.push_str(&format!(" AND status = ${}", index));
        }
        if let Some(_search) = &filters.search {
            index += 1;
            query.push_str(&format!(
                " AND (identifier ILIKE ${} OR display_name ILIKE ${})",
                index,
                index + 1
            ));
            index += 1;
        }
        if let Some(_tags) = &filters.tags {
            index += 1;
            query.push_str(&format!(" AND tags @> ${}", index));
        }

        query.push_str(&format!(" ORDER BY identifier LIMIT ${} OFFSET ${}", index + 1, index + 2));

        let mut query_builder = sqlx::query_as::<_, Host>(&query);

        if let Some(group_id) = &filters.group_id {
            query_builder = query_builder.bind(group_id);
        }
        if let Some(env) = &filters.environment {
            query_builder = query_builder.bind(env);
        }
        if let Some(status) = &filters.status {
            query_builder = query_builder.bind(status);
        }
        let search_pattern;
        if let Some(search) = &filters.search {
            search_pattern = format!("%{}%", search);
            query_builder = query_builder.bind(&search_pattern);
            query_builder = query_builder.bind(&search_pattern);
        }
        if let Some(tags) = &filters.tags {
            query_builder = query_builder.bind(sqlx::types::Json(tags.clone()));
        }

        let hosts = query_builder
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.db)
            .await?;

        Ok(hosts)
    }

    /// 更新主机
    pub async fn update_host(
        &self,
        id: Uuid,
        req: &UpdateHostRequest,
        updated_by: Uuid,
    ) -> Result<Option<Host>, AppError> {
        // 乐观锁：检查版本
        let current: Host = self
            .get_host(id)
            .await?
            .ok_or_else(|| AppError::not_found("Resource not found"))?;

        if current.version != req.version {
            return Err(AppError::BadRequest("资源已被其他用户修改".to_string()));
        }

        // 转换tags为Json类型
        let tags_json = req.tags.as_ref().map(|t| sqlx::types::Json(t.clone()));

        let host = sqlx::query_as::<_, Host>(
            r#"
            UPDATE assets_hosts
            SET
                display_name = COALESCE($2, display_name),
                address = COALESCE($3, address),
                port = COALESCE($4, port),
                group_id = COALESCE($5, group_id),
                environment = COALESCE($6, environment),
                tags = COALESCE($7, tags),
                owner_id = COALESCE($8, owner_id),
                status = COALESCE($9, status),
                notes = COALESCE($10, notes),
                os_type = COALESCE($11, os_type),
                os_version = COALESCE($12, os_version),
                updated_by = $13,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(&req.display_name)
        .bind(&req.address)
        .bind(req.port)
        .bind(req.group_id)
        .bind(&req.environment)
        .bind(&tags_json)
        .bind(req.owner_id)
        .bind(&req.status)
        .bind(&req.notes)
        .bind(&req.os_type)
        .bind(&req.os_version)
        .bind(updated_by)
        .fetch_optional(&self.db)
        .await?;

        Ok(host)
    }

    /// 删除主机
    pub async fn delete_host(&self, id: Uuid) -> Result<bool, AppError> {
        let result = sqlx::query("DELETE FROM assets_hosts WHERE id = $1")
            .bind(id)
            .execute(&self.db)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    /// 统计主机数量
    pub async fn count_hosts(&self, filters: &HostListFilters) -> Result<i64, AppError> {
        let mut query = String::from("SELECT COUNT(*) FROM assets_hosts WHERE 1=1");
        let mut index = 0;

        if filters.group_id.is_some() {
            index += 1;
            query.push_str(&format!(" AND group_id = ${}", index));
        }
        if let Some(_env) = &filters.environment {
            index += 1;
            query.push_str(&format!(" AND environment = ${}", index));
        }
        if let Some(_status) = &filters.status {
            index += 1;
            query.push_str(&format!(" AND status = ${}", index));
        }
        if let Some(_search) = &filters.search {
            index += 1;
            query.push_str(&format!(
                " AND (identifier ILIKE ${} OR display_name ILIKE ${})",
                index,
                index + 1
            ));
            index += 1;
        }
        if let Some(_tags) = &filters.tags {
            index += 1;
            query.push_str(&format!(" AND tags @> ${}", index));
        }

        let mut query_builder = sqlx::query(&query);

        if let Some(group_id) = &filters.group_id {
            query_builder = query_builder.bind(group_id);
        }
        if let Some(env) = &filters.environment {
            query_builder = query_builder.bind(env);
        }
        if let Some(status) = &filters.status {
            query_builder = query_builder.bind(status);
        }
        let search_pattern;
        if let Some(search) = &filters.search {
            search_pattern = format!("%{}%", search);
            query_builder = query_builder.bind(&search_pattern);
            query_builder = query_builder.bind(&search_pattern);
        }
        if let Some(tags) = &filters.tags {
            query_builder = query_builder.bind(sqlx::types::Json(tags.clone()));
        }

        let count: i64 = query_builder.fetch_one(&self.db).await?.get(0);
        Ok(count)
    }
}
