//! Audit repository (审计数据访问)

use crate::{error::AppError, models::audit::*};
use sqlx::{PgPool, Row};
use uuid::Uuid;

pub struct AuditRepository {
    db: PgPool,
}

impl AuditRepository {
    pub fn new(db: PgPool) -> Self {
        Self { db }
    }

    // ==================== Audit Logs ====================

    /// 插入审计日志
    pub async fn insert_audit_log(&self, log: &AuditLog) -> Result<(), AppError> {
        sqlx::query(
            r#"
            INSERT INTO audit_logs (
                id, subject_id, subject_type, subject_name, action, resource_type, resource_id,
                resource_name, changes, changes_summary, source_ip, user_agent, trace_id,
                request_id, result, error_message, occurred_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            "#,
        )
        .bind(log.id)
        .bind(log.subject_id)
        .bind(&log.subject_type)
        .bind(&log.subject_name)
        .bind(&log.action)
        .bind(&log.resource_type)
        .bind(log.resource_id)
        .bind(&log.resource_name)
        .bind(&log.changes)
        .bind(&log.changes_summary)
        .bind(&log.source_ip)
        .bind(&log.user_agent)
        .bind(&log.trace_id)
        .bind(&log.request_id)
        .bind(&log.result)
        .bind(&log.error_message)
        .bind(log.occurred_at)
        .execute(&self.db)
        .await?;

        Ok(())
    }

    /// 查询审计日志
    pub async fn query_audit_logs(
        &self,
        filters: &AuditLogFilters,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<AuditLog>, AppError> {
        let mut query = String::from("SELECT * FROM audit_logs WHERE 1=1");
        let mut index = 0;

        if filters.subject_id.is_some() {
            index += 1;
            query.push_str(&format!(" AND subject_id = ${}", index));
        }
        if let Some(_resource_type) = &filters.resource_type {
            index += 1;
            query.push_str(&format!(" AND resource_type = ${}", index));
        }
        if filters.resource_id.is_some() {
            index += 1;
            query.push_str(&format!(" AND resource_id = ${}", index));
        }
        if let Some(_action) = &filters.action {
            index += 1;
            query.push_str(&format!(" AND action = ${}", index));
        }
        if let Some(_result) = &filters.result {
            index += 1;
            query.push_str(&format!(" AND result = ${}", index));
        }
        if filters.start_time.is_some() {
            index += 1;
            query.push_str(&format!(" AND occurred_at >= ${}", index));
        }
        if filters.end_time.is_some() {
            index += 1;
            query.push_str(&format!(" AND occurred_at <= ${}", index));
        }
        if let Some(_trace_id) = &filters.trace_id {
            index += 1;
            query.push_str(&format!(" AND trace_id = ${}", index));
        }

        query.push_str(&format!(
            " ORDER BY occurred_at DESC LIMIT ${} OFFSET ${}",
            index + 1,
            index + 2
        ));

        let mut query_builder = sqlx::query_as::<_, AuditLog>(&query);

        if let Some(subject_id) = filters.subject_id {
            query_builder = query_builder.bind(subject_id);
        }
        if let Some(resource_type) = &filters.resource_type {
            query_builder = query_builder.bind(resource_type);
        }
        if let Some(resource_id) = filters.resource_id {
            query_builder = query_builder.bind(resource_id);
        }
        if let Some(action) = &filters.action {
            query_builder = query_builder.bind(action);
        }
        if let Some(result) = &filters.result {
            query_builder = query_builder.bind(result);
        }
        if let Some(start_time) = filters.start_time {
            query_builder = query_builder.bind(start_time);
        }
        if let Some(end_time) = filters.end_time {
            query_builder = query_builder.bind(end_time);
        }
        if let Some(trace_id) = &filters.trace_id {
            query_builder = query_builder.bind(trace_id);
        }

        let logs = query_builder
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.db)
            .await?;

        Ok(logs)
    }

    /// 统计审计日志数量
    pub async fn count_audit_logs(&self, filters: &AuditLogFilters) -> Result<i64, AppError> {
        let mut query = String::from("SELECT COUNT(*) FROM audit_logs WHERE 1=1");
        let mut index = 0;

        if filters.subject_id.is_some() {
            index += 1;
            query.push_str(&format!(" AND subject_id = ${}", index));
        }
        if let Some(_resource_type) = &filters.resource_type {
            index += 1;
            query.push_str(&format!(" AND resource_type = ${}", index));
        }
        if filters.resource_id.is_some() {
            index += 1;
            query.push_str(&format!(" AND resource_id = ${}", index));
        }
        if let Some(_action) = &filters.action {
            index += 1;
            query.push_str(&format!(" AND action = ${}", index));
        }
        if let Some(_result) = &filters.result {
            index += 1;
            query.push_str(&format!(" AND result = ${}", index));
        }
        if filters.start_time.is_some() {
            index += 1;
            query.push_str(&format!(" AND occurred_at >= ${}", index));
        }
        if filters.end_time.is_some() {
            index += 1;
            query.push_str(&format!(" AND occurred_at <= ${}", index));
        }
        if let Some(_trace_id) = &filters.trace_id {
            index += 1;
            query.push_str(&format!(" AND trace_id = ${}", index));
        }

        let mut query_builder = sqlx::query(&query);

        if let Some(subject_id) = filters.subject_id {
            query_builder = query_builder.bind(subject_id);
        }
        if let Some(resource_type) = &filters.resource_type {
            query_builder = query_builder.bind(resource_type);
        }
        if let Some(resource_id) = filters.resource_id {
            query_builder = query_builder.bind(resource_id);
        }
        if let Some(action) = &filters.action {
            query_builder = query_builder.bind(action);
        }
        if let Some(result) = &filters.result {
            query_builder = query_builder.bind(result);
        }
        if let Some(start_time) = filters.start_time {
            query_builder = query_builder.bind(start_time);
        }
        if let Some(end_time) = filters.end_time {
            query_builder = query_builder.bind(end_time);
        }
        if let Some(trace_id) = &filters.trace_id {
            query_builder = query_builder.bind(trace_id);
        }

        let count: i64 = query_builder.fetch_one(&self.db).await?.get(0);
        Ok(count)
    }

    // ==================== Login Events ====================

    /// 查询登录事件
    pub async fn query_login_events(
        &self,
        user_id: Option<Uuid>,
        event_type: Option<&str>,
        start_time: Option<chrono::DateTime<chrono::Utc>>,
        end_time: Option<chrono::DateTime<chrono::Utc>>,
        limit: i64,
    ) -> Result<Vec<LoginEvent>, AppError> {
        let mut query = String::from("SELECT * FROM login_events WHERE 1=1");
        let mut index = 0;

        if user_id.is_some() {
            index += 1;
            query.push_str(&format!(" AND user_id = ${}", index));
        }
        if event_type.is_some() {
            index += 1;
            query.push_str(&format!(" AND event_type = ${}", index));
        }
        if start_time.is_some() {
            index += 1;
            query.push_str(&format!(" AND occurred_at >= ${}", index));
        }
        if end_time.is_some() {
            index += 1;
            query.push_str(&format!(" AND occurred_at <= ${}", index));
        }

        query.push_str(&format!(" ORDER BY occurred_at DESC LIMIT ${}", index + 1));

        let mut query_builder = sqlx::query_as::<_, LoginEvent>(&query);

        if let Some(user_id) = user_id {
            query_builder = query_builder.bind(user_id);
        }
        if let Some(event_type) = event_type {
            query_builder = query_builder.bind(event_type);
        }
        if let Some(start_time) = start_time {
            query_builder = query_builder.bind(start_time);
        }
        if let Some(end_time) = end_time {
            query_builder = query_builder.bind(end_time);
        }

        let events = query_builder.bind(limit).fetch_all(&self.db).await?;

        Ok(events)
    }
}
