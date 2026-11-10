//! 数据库连接池与迁移管理
//! 提供 PostgreSQL 连接池、迁移执行和健康检查

use crate::config::DatabaseConfig;
use secrecy::ExposeSecret;
use sqlx::{
    postgres::{PgConnectOptions, PgPoolOptions},
    Connection, PgPool,
};
use std::str::FromStr;
use std::time::Duration;

/// 创建数据库连接池
pub async fn create_pool(config: &DatabaseConfig) -> Result<PgPool, DbError> {
    let db_url = config.url.expose_secret();

    tracing::debug!("Creating database connection pool...");

    let pool = match connect_pool(config, db_url).await {
        Ok(pool) => pool,
        Err(e) if is_missing_database_error(&e) => {
            if config.auto_create_if_missing {
                tracing::warn!("Database does not exist but auto_create_if_missing is enabled, attempting to create it");
                ensure_database_exists(db_url).await?;
                connect_pool(config, db_url)
                    .await
                    .map_err(|e| DbError::ConnectionFailed(e.to_string()))?
            } else {
                return Err(DbError::ConnectionFailed(
                    "Database does not exist and auto_create_if_missing is disabled. Please create the database manually.".to_string(),
                ));
            }
        }
        Err(e) => return Err(DbError::ConnectionFailed(e.to_string())),
    };

    tracing::info!(
        max_connections = config.max_connections,
        min_connections = config.min_connections,
        "Database pool created successfully"
    );

    Ok(pool)
}

async fn connect_pool(config: &DatabaseConfig, db_url: &str) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(config.max_connections)
        .min_connections(config.min_connections)
        .acquire_timeout(Duration::from_secs(config.acquire_timeout_secs))
        .idle_timeout(Duration::from_secs(config.idle_timeout_secs))
        .max_lifetime(Duration::from_secs(config.max_lifetime_secs))
        .test_before_acquire(true)
        .connect(db_url)
        .await
}

fn is_missing_database_error(e: &sqlx::Error) -> bool {
    match e {
        sqlx::Error::Database(db_err) => db_err.code().as_deref() == Some("3D000"),
        _ => false,
    }
}

async fn ensure_database_exists(db_url: &str) -> Result<(), DbError> {
    let db_name = extract_database_name(db_url).ok_or_else(|| {
        DbError::ConnectionFailed("Failed to parse database name from URL".into())
    })?;

    tracing::warn!(db_name = %db_name, "Database does not exist, attempting to create it");

    let mut conn = {
        let options = PgConnectOptions::from_str(db_url)
            .map_err(|e| DbError::ConnectionFailed(e.to_string()))?
            .database("postgres");

        sqlx::postgres::PgConnection::connect_with(&options)
            .await
            .map_err(|e| DbError::DatabaseBootstrapFailed(e.to_string()))?
    };

    let exists: Option<i64> = sqlx::query_scalar("SELECT 1 FROM pg_database WHERE datname = $1")
        .bind(&db_name)
        .fetch_optional(&mut conn)
        .await
        .map_err(|e| DbError::DatabaseBootstrapFailed(e.to_string()))?;

    if exists.is_some() {
        return Ok(());
    }

    let sql = format!("CREATE DATABASE {}", quote_ident(&db_name));
    match sqlx::query(&sql).execute(&mut conn).await {
        Ok(_) => Ok(()),
        Err(sqlx::Error::Database(db_err)) if db_err.code().as_deref() == Some("42P04") => Ok(()),
        Err(e) => Err(DbError::DatabaseBootstrapFailed(e.to_string())),
    }
}

fn extract_database_name(db_url: &str) -> Option<String> {
    let without_fragment = db_url.split('#').next().unwrap_or(db_url);
    let without_query = without_fragment
        .split('?')
        .next()
        .unwrap_or(without_fragment);
    let db = without_query.rsplit('/').next()?;
    if db.is_empty() {
        None
    } else {
        Some(db.to_string())
    }
}

fn quote_ident(ident: &str) -> String {
    format!("\"{}\"", ident.replace('"', "\"\""))
}

/// 运行数据库迁移
pub async fn run_migrations(pool: &PgPool) -> Result<(), DbError> {
    tracing::info!("Running database migrations...");

    sqlx::migrate!("../../migrations")
        .run(pool)
        .await
        .map_err(|e| {
            tracing::error!("Migration failed: {}", e);
            DbError::MigrationFailed(e.to_string())
        })?;

    tracing::info!("Migrations completed successfully");
    Ok(())
}

/// 数据库健康检查
pub async fn health_check(pool: &PgPool) -> HealthStatus {
    match sqlx::query("SELECT 1").fetch_one(pool).await {
        Ok(_) => {
            tracing::debug!("Database health check: OK");
            HealthStatus::Healthy
        }
        Err(e) => {
            tracing::warn!("Database health check failed: {}", e);
            HealthStatus::Unhealthy(e.to_string())
        }
    }
}

/// 记录数据库连接池指标
pub fn record_pool_metrics(pool: &PgPool) {
    metrics::gauge!("db.pool.size").set(pool.size() as f64);
    metrics::gauge!("db.pool.idle").set(pool.num_idle() as f64);
}

/// 数据库错误类型
#[derive(Debug, thiserror::Error)]
pub enum DbError {
    #[error("Connection failed: {0}")]
    ConnectionFailed(String),

    #[error("Database bootstrap failed: {0}")]
    DatabaseBootstrapFailed(String),

    #[error("Migration failed: {0}")]
    MigrationFailed(String),

    #[error("Health check failed: {0}")]
    HealthCheckFailed(String),
}

/// 健康状态
#[derive(Debug, Clone)]
pub enum HealthStatus {
    Healthy,
    Unhealthy(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_health_status() {
        let healthy = HealthStatus::Healthy;
        let unhealthy = HealthStatus::Unhealthy("Connection refused".to_string());

        match healthy {
            HealthStatus::Healthy => assert!(true),
            _ => assert!(false),
        }

        match unhealthy {
            HealthStatus::Unhealthy(msg) => assert_eq!(msg, "Connection refused"),
            _ => assert!(false),
        }
    }
}
