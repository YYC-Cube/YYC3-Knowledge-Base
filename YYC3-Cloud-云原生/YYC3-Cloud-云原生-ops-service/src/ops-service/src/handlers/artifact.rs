//! 构建产物 API 处理器 (P2.1)
//!
//! 提供产物元数据记录、查询和下载审计功能

use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Json},
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{error, info};
use uuid::Uuid;

use crate::{
    auth::AuthContext,
    error::{AppError, Result},
    middleware::AppState,
};

use crate::services::audit_service::AuditLogParams;
use sqlx::Row;

/// 产物元数据响应
#[derive(Debug, Serialize)]
pub struct ArtifactMetadata {
    /// 产物 ID
    pub id: Uuid,

    /// 构建作业 ID
    pub build_job_id: Uuid,

    /// 产物名称
    pub artifact_name: String,

    /// 产物类型
    pub artifact_type: String,

    /// 产物路径
    pub artifact_path: String,

    /// 文件大小（字节）
    pub artifact_size: i64,

    /// SHA256 哈希
    pub artifact_hash: String,

    /// 版本
    pub version: Option<String>,

    /// 元数据
    pub metadata: serde_json::Value,

    /// 是否公开
    pub is_public: bool,

    /// 下载次数
    pub download_count: i32,

    /// 创建时间
    pub created_at: chrono::DateTime<chrono::Utc>,

    /// 上传者
    pub uploaded_by: Uuid,
}

/// 产物列表查询参数
#[derive(Debug, Deserialize)]
pub struct ArtifactListQuery {
    /// 构建作业 ID
    pub build_job_id: Option<Uuid>,

    /// 产物类型
    pub artifact_type: Option<String>,

    /// 版本
    pub version: Option<String>,

    /// 是否只显示公开产物
    pub public_only: Option<bool>,

    /// 分页
    pub page: Option<u64>,
    pub per_page: Option<u64>,
}

/// 产物列表响应
#[derive(Debug, Serialize)]
pub struct ArtifactListResponse {
    /// 产物列表
    pub artifacts: Vec<ArtifactMetadata>,

    /// 总数
    pub total: i64,

    /// 分页信息
    pub page: u64,
    pub per_page: u64,
}

/// 记录产物元数据请求
#[derive(Debug, Deserialize)]
pub struct RecordArtifactRequest {
    /// 构建作业 ID
    pub build_job_id: Uuid,

    /// 产物名称
    pub artifact_name: String,

    /// 产物类型
    pub artifact_type: String,

    /// 产物路径
    pub artifact_path: String,

    /// 文件大小（字节）
    pub artifact_size: i64,

    /// SHA256 哈希
    pub artifact_hash: String,

    /// 版本（用于唯一性检查）
    pub version: Option<String>,

    /// 元数据
    #[serde(default)]
    pub metadata: serde_json::Value,

    /// 是否公开
    #[serde(default)]
    pub is_public: bool,
}

/// 更新产物请求
#[derive(Debug, Deserialize, Serialize)]
pub struct UpdateArtifactRequest {
    /// 是否公开
    pub is_public: Option<bool>,

    /// 元数据更新
    pub metadata: Option<serde_json::Value>,
}

// ==================== 产物 API ====================

/// 记录产物元数据
pub async fn record_artifact(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Json(request): Json<RecordArtifactRequest>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "artifact", "write", None, None)
        .await?;

    // 检查构建作业是否存在
    let _job_exists = sqlx::query("SELECT id, created_by FROM build_jobs WHERE id = $1")
        .bind(request.build_job_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to check build job");
            AppError::database("Failed to check build job")
        })?
        .ok_or_else(|| AppError::not_found("Build job not found"))?;

    // 如果指定了版本号，检查是否已存在（防止覆盖上传）
    if let Some(ref version) = request.version {
        if !version.is_empty() {
            let existing = sqlx::query(
                "SELECT id FROM build_artifacts WHERE version = $1 AND artifact_type = $2",
            )
            .bind(version)
            .bind(&request.artifact_type)
            .fetch_optional(&state.db)
            .await
            .map_err(|e| {
                error!(error = %e, "Failed to check existing artifact");
                AppError::database("Failed to check artifact")
            })?;

            if existing.is_some() {
                return Err(AppError::validation(
                    "Artifact with this version already exists. Cannot overwrite.",
                ));
            }
        }
    }

    // 记录产物元数据
    let artifact_id = sqlx::query(
        "INSERT INTO build_artifacts (build_job_id, artifact_name, artifact_type, artifact_path,
                                     artifact_size, artifact_hash, version, metadata, is_public, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id",
    )
    .bind(request.build_job_id)
    .bind(&request.artifact_name)
    .bind(&request.artifact_type)
    .bind(&request.artifact_path)
    .bind(request.artifact_size)
    .bind(&request.artifact_hash)
    .bind(&request.version)
    .bind(&request.metadata)
    .bind(request.is_public)
    .bind(auth.user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        error!(error = %e, "Failed to record artifact");
        AppError::database("Failed to record artifact")
    })?
    .get("id");

    // 更新构建作业的产物统计
    sqlx::query(
        "UPDATE build_jobs SET has_artifacts = TRUE, artifact_count = artifact_count + 1 WHERE id = $1",
    )
    .bind(request.build_job_id)
    .execute(&state.db)
    .await
    .map_err(|e| {
        error!(error = %e, "Failed to update build job artifact count");
        AppError::database("Failed to update build job")
    })?;

    // 记录审计日志
    let _ = state
        .audit_service
        .log_action(AuditLogParams {
            subject_id: auth.user_id,
            subject_type: "user",
            subject_name: None,
            action: crate::services::audit_service::AuditAction::ArtifactCreate.as_str(),
            resource_type: "artifact",
            resource_id: Some(artifact_id),
            resource_name: Some(&request.artifact_name),
            changes: Some(serde_json::json!({
                "artifact_type": request.artifact_type,
                "version": request.version,
                "size": request.artifact_size,
            })),
            changes_summary: None,
            source_ip: None,
            user_agent: None,
            trace_id: None,
            result: "success",
            error_message: None,
        })
        .await;

    info!(
        artifact_id = %artifact_id,
        artifact_name = %request.artifact_name,
        version = ?request.version,
        "Artifact metadata recorded"
    );

    Ok((
        StatusCode::CREATED,
        Json(serde_json::json!({
            "id": artifact_id,
            "message": "Artifact metadata recorded successfully"
        })),
    ))
}

/// 查询产物列表
pub async fn list_artifacts(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Query(query): Query<ArtifactListQuery>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "artifact", "read", None, None)
        .await?;

    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(50).min(100);
    let offset = (page - 1) * per_page;

    // 检查用户权限
    let is_admin = state
        .permission_service
        .is_admin(auth.user_id)
        .await
        .unwrap_or(false);

    // 使用参数化查询，防止 SQL 注入
    // 动态构建 WHERE 条件和对应的绑定参数
    let mut where_clauses: Vec<String> = vec!["1=1".to_string()];
    let mut param_idx: u32 = 1;

    // 收集所有绑定参数的值（使用统一类型包装）
    #[derive(Debug)]
    enum BindValue {
        Uuid(Uuid),
        Text(String),
    }
    let mut bind_values: Vec<BindValue> = Vec::new();

    if let Some(build_job_id) = query.build_job_id {
        where_clauses.push(format!("build_job_id = ${}", param_idx));
        bind_values.push(BindValue::Uuid(build_job_id));
        param_idx += 1;
    }

    if let Some(ref artifact_type) = query.artifact_type {
        where_clauses.push(format!("artifact_type = ${}", param_idx));
        bind_values.push(BindValue::Text(artifact_type.clone()));
        param_idx += 1;
    }

    if let Some(ref version) = query.version {
        where_clauses.push(format!("version = ${}", param_idx));
        bind_values.push(BindValue::Text(version.clone()));
        param_idx += 1;
    }

    // 非管理员只能看到公开产物或自己上传的产物
    if !is_admin {
        if query.public_only.unwrap_or(false) {
            where_clauses.push("is_public = true".to_string());
        } else {
            where_clauses.push(format!("(is_public = true OR uploaded_by = ${})", param_idx));
            bind_values.push(BindValue::Uuid(auth.user_id));
            param_idx += 1;
        }
    }

    let where_clause = where_clauses.join(" AND ");

    // 计算总数（参数化）
    let count_sql = format!("SELECT COUNT(*) FROM build_artifacts WHERE {}", where_clause);
    let mut count_query = sqlx::query(&count_sql);
    for val in &bind_values {
        count_query = match val {
            BindValue::Uuid(v) => count_query.bind(v),
            BindValue::Text(v) => count_query.bind(v),
        };
    }
    let total: i64 = count_query
        .fetch_one(&state.db)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to count artifacts");
            AppError::database("Failed to count artifacts")
        })?
        .get("count");

    // 查询产物列表（参数化，LIMIT/OFFSET 也使用绑定参数）
    let limit_param = param_idx;
    param_idx += 1;
    let offset_param = param_idx;

    let data_sql = format!(
        "SELECT id, build_job_id, artifact_name, artifact_type, artifact_path,
                artifact_size, artifact_hash, version, metadata, is_public, download_count,
                created_at, uploaded_by
         FROM build_artifacts
         WHERE {}
         ORDER BY created_at DESC
         LIMIT ${} OFFSET ${}",
        where_clause, limit_param, offset_param
    );

    let mut data_query = sqlx::query(&data_sql);
    for val in &bind_values {
        data_query = match val {
            BindValue::Uuid(v) => data_query.bind(v),
            BindValue::Text(v) => data_query.bind(v),
        };
    }
    data_query = data_query.bind(per_page as i64).bind(offset as i64);

    let rows = data_query.fetch_all(&state.db).await.map_err(|e| {
        error!(error = %e, "Failed to list artifacts");
        AppError::database("Failed to list artifacts")
    })?;

    let artifacts: Vec<ArtifactMetadata> = rows
        .iter()
        .map(|row| ArtifactMetadata {
            id: row.get("id"),
            build_job_id: row.get("build_job_id"),
            artifact_name: row.get("artifact_name"),
            artifact_type: row.get("artifact_type"),
            artifact_path: row.get("artifact_path"),
            artifact_size: row.get("artifact_size"),
            artifact_hash: row.get("artifact_hash"),
            version: row.get("version"),
            metadata: row.get::<serde_json::Value, _>("metadata"),
            is_public: row.get("is_public"),
            download_count: row.get("download_count"),
            created_at: row.get("created_at"),
            uploaded_by: row.get("uploaded_by"),
        })
        .collect();

    Ok(Json(ArtifactListResponse {
        artifacts,
        total,
        page,
        per_page,
    }))
}

/// 获取产物详情
pub async fn get_artifact(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "artifact", "read", None, None)
        .await?;

    let row = sqlx::query(
        "SELECT id, build_job_id, artifact_name, artifact_type, artifact_path,
                artifact_size, artifact_hash, version, metadata, is_public, download_count,
                created_at, uploaded_by
         FROM build_artifacts WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        error!(error = %e, "Failed to get artifact");
        AppError::database("Failed to get artifact")
    })?
    .ok_or_else(|| AppError::not_found("Artifact not found"))?;

    let is_public: bool = row.get("is_public");
    let uploaded_by: Uuid = row.get("uploaded_by");
    let is_admin = state
        .permission_service
        .is_admin(auth.user_id)
        .await
        .unwrap_or(false);

    // 检查权限（反枚举：返回 404 而非 403）
    if !is_public && !is_admin && uploaded_by != auth.user_id {
        return Err(AppError::not_found("Artifact not found"));
    }

    Ok(Json(ArtifactMetadata {
        id: row.get("id"),
        build_job_id: row.get("build_job_id"),
        artifact_name: row.get("artifact_name"),
        artifact_type: row.get("artifact_type"),
        artifact_path: row.get("artifact_path"),
        artifact_size: row.get("artifact_size"),
        artifact_hash: row.get("artifact_hash"),
        version: row.get("version"),
        metadata: row.get::<serde_json::Value, _>("metadata"),
        is_public,
        download_count: row.get("download_count"),
        created_at: row.get("created_at"),
        uploaded_by,
    }))
}

/// 记录产物下载
pub async fn record_download(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "artifact", "read", None, None)
        .await?;

    // 提取 IP 地址（优先使用 X-Forwarded-For 或 X-Real-IP）
    let ip_address = headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.split(',').next())
        .map(|s| s.trim().to_string())
        .or_else(|| {
            headers
                .get("x-real-ip")
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string())
        })
        .or_else(|| {
            headers
                .get("cf-connecting-ip")
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string())
        });

    // 提取 User-Agent
    let user_agent = headers
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    // 检查产物是否存在
    let artifact =
        sqlx::query("SELECT id, is_public, uploaded_by FROM build_artifacts WHERE id = $1")
            .bind(id)
            .fetch_optional(&state.db)
            .await
            .map_err(|e| {
                error!(error = %e, "Failed to get artifact");
                AppError::database("Failed to get artifact")
            })?
            .ok_or_else(|| AppError::not_found("Artifact not found"))?;

    let is_public: bool = artifact.get("is_public");
    let uploaded_by: Uuid = artifact.get("uploaded_by");
    let is_admin = state
        .permission_service
        .is_admin(auth.user_id)
        .await
        .unwrap_or(false);

    // 检查权限（反枚举：返回 404 而非 403）
    if !is_public && !is_admin && uploaded_by != auth.user_id {
        return Err(AppError::not_found("Artifact not found"));
    }

    // 记录下载（包含 IP 和 User-Agent）
    sqlx::query(
        "INSERT INTO artifact_downloads (artifact_id, downloaded_by, downloaded_at, ip_address, user_agent)
         VALUES ($1, $2, NOW(), $3, $4)",
    )
    .bind(id)
    .bind(auth.user_id)
    .bind(ip_address.as_deref())
    .bind(user_agent.as_deref())
    .execute(&state.db)
    .await
    .map_err(|e| {
        error!(error = %e, "Failed to record download");
        AppError::database("Failed to record download")
    })?;

    // 增加下载计数
    sqlx::query("UPDATE build_artifacts SET download_count = download_count + 1 WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to update download count");
            AppError::database("Failed to update download count")
        })?;

    // 记录审计日志（包含 IP 和 User-Agent）
    let _ = state
        .audit_service
        .log_action(AuditLogParams {
            subject_id: auth.user_id,
            subject_type: "user",
            subject_name: None,
            action: crate::services::audit_service::AuditAction::ArtifactDownload.as_str(),
            resource_type: "artifact",
            resource_id: Some(id),
            resource_name: None,
            changes: None,
            changes_summary: None,
            source_ip: ip_address.as_deref(),
            user_agent: user_agent.as_deref(),
            trace_id: None,
            result: "success",
            error_message: None,
        })
        .await;

    info!(
        artifact_id = %id,
        ip = ?ip_address,
        "Artifact download recorded"
    );

    Ok(StatusCode::OK)
}

/// 更新产物元数据
pub async fn update_artifact(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
    Json(request): Json<UpdateArtifactRequest>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "artifact", "write", None, None)
        .await?;

    // 检查产物是否存在
    let artifact = sqlx::query("SELECT id, uploaded_by FROM build_artifacts WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to get artifact");
            AppError::database("Failed to get artifact")
        })?
        .ok_or_else(|| AppError::not_found("Artifact not found"))?;

    let uploaded_by: Uuid = artifact.get("uploaded_by");
    let is_admin = state
        .permission_service
        .is_admin(auth.user_id)
        .await
        .unwrap_or(false);

    // 检查权限（反枚举：返回 404 而非 403）
    if !is_admin && uploaded_by != auth.user_id {
        return Err(AppError::not_found("Artifact not found"));
    }

    // 更新产物
    if let Some(is_public) = request.is_public {
        sqlx::query("UPDATE build_artifacts SET is_public = $1, updated_at = NOW() WHERE id = $2")
            .bind(is_public)
            .bind(id)
            .execute(&state.db)
            .await
            .map_err(|e| {
                error!(error = %e, "Failed to update artifact");
                AppError::database("Failed to update artifact")
            })?;
    }

    if let Some(ref metadata) = request.metadata {
        sqlx::query("UPDATE build_artifacts SET metadata = $1, updated_at = NOW() WHERE id = $2")
            .bind(metadata)
            .bind(id)
            .execute(&state.db)
            .await
            .map_err(|e| {
                error!(error = %e, "Failed to update artifact metadata");
                AppError::database("Failed to update artifact metadata")
            })?;
    }

    // 记录审计日志
    let _ = state
        .audit_service
        .log_action(AuditLogParams {
            subject_id: auth.user_id,
            subject_type: "user",
            subject_name: None,
            action: crate::services::audit_service::AuditAction::ArtifactUpdate.as_str(),
            resource_type: "artifact",
            resource_id: Some(id),
            resource_name: None,
            changes: Some(serde_json::to_value(request).unwrap_or_default()),
            changes_summary: None,
            source_ip: None,
            user_agent: None,
            trace_id: None,
            result: "success",
            error_message: None,
        })
        .await;

    info!(artifact_id = %id, "Artifact updated");

    Ok(StatusCode::OK)
}

/// 删除产物（仅管理员或上传者）
pub async fn delete_artifact(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "artifact", "write", None, None)
        .await?;

    // 检查产物是否存在
    let artifact = sqlx::query("SELECT id, uploaded_by FROM build_artifacts WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to get artifact");
            AppError::database("Failed to get artifact")
        })?
        .ok_or_else(|| AppError::not_found("Artifact not found"))?;

    let uploaded_by: Uuid = artifact.get("uploaded_by");
    let is_admin = state
        .permission_service
        .is_admin(auth.user_id)
        .await
        .unwrap_or(false);

    // 检查权限（反枚举：返回 404 而非 403）
    if !is_admin && uploaded_by != auth.user_id {
        return Err(AppError::not_found("Artifact not found"));
    }

    // 删除产物（元数据）
    sqlx::query("DELETE FROM build_artifacts WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to delete artifact");
            AppError::database("Failed to delete artifact")
        })?;

    // 记录审计日志
    let _ = state
        .audit_service
        .log_action(AuditLogParams {
            subject_id: auth.user_id,
            subject_type: "user",
            subject_name: None,
            action: crate::services::audit_service::AuditAction::ArtifactDelete.as_str(),
            resource_type: "artifact",
            resource_id: Some(id),
            resource_name: None,
            changes: None,
            changes_summary: None,
            source_ip: None,
            user_agent: None,
            trace_id: None,
            result: "success",
            error_message: None,
        })
        .await;

    info!(artifact_id = %id, "Artifact deleted");

    Ok(StatusCode::NO_CONTENT)
}

/// 下载历史记录
#[derive(Debug, Serialize)]
pub struct DownloadHistoryRecord {
    /// 下载 ID
    pub id: Uuid,
    /// 产物 ID
    pub artifact_id: Uuid,
    /// 下载者 ID
    pub downloaded_by: Uuid,
    /// 下载时间
    pub downloaded_at: chrono::DateTime<chrono::Utc>,
    /// IP 地址
    pub ip_address: Option<String>,
    /// User-Agent
    pub user_agent: Option<String>,
}

/// 下载历史响应
#[derive(Debug, Serialize)]
pub struct DownloadHistoryResponse {
    /// 下载记录
    pub downloads: Vec<DownloadHistoryRecord>,
    /// 总数
    pub total: i64,
}

/// 查询产物下载历史
pub async fn get_download_history(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "artifact", "read", None, None)
        .await?;

    // 检查产物是否存在及权限
    let artifact =
        sqlx::query("SELECT id, is_public, uploaded_by FROM build_artifacts WHERE id = $1")
            .bind(id)
            .fetch_optional(&state.db)
            .await
            .map_err(|e| {
                error!(error = %e, "Failed to get artifact");
                AppError::database("Failed to get artifact")
            })?
            .ok_or_else(|| AppError::not_found("Artifact not found"))?;

    let _is_public: bool = artifact.get("is_public");
    let uploaded_by: Uuid = artifact.get("uploaded_by");
    let is_admin = state
        .permission_service
        .is_admin(auth.user_id)
        .await
        .unwrap_or(false);

    // 检查权限（只有上传者和管理员可以查看下载历史，反枚举：返回 404 而非 403）
    if !is_admin && uploaded_by != auth.user_id {
        return Err(AppError::not_found("Artifact not found"));
    }

    // 查询下载历史
    let rows = sqlx::query(
        "SELECT id, artifact_id, downloaded_by, downloaded_at, ip_address, user_agent
         FROM artifact_downloads
         WHERE artifact_id = $1
         ORDER BY downloaded_at DESC
         LIMIT 100",
    )
    .bind(id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        error!(error = %e, "Failed to get download history");
        AppError::database("Failed to get download history")
    })?;

    let downloads: Vec<DownloadHistoryRecord> = rows
        .iter()
        .map(|row| DownloadHistoryRecord {
            id: row.get("id"),
            artifact_id: row.get("artifact_id"),
            downloaded_by: row.get("downloaded_by"),
            downloaded_at: row.get("downloaded_at"),
            ip_address: row.get("ip_address"),
            user_agent: row.get("user_agent"),
        })
        .collect();

    // 获取总数
    let total: i64 = sqlx::query("SELECT COUNT(*) FROM artifact_downloads WHERE artifact_id = $1")
        .bind(id)
        .fetch_one(&state.db)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to count downloads");
            AppError::database("Failed to count downloads")
        })?
        .get("count");

    Ok(Json(DownloadHistoryResponse { downloads, total }))
}

/// 生成产物下载 URL（用于外部存储集成）
///
/// 如果产物的 artifact_path 指向外部存储（如 S3、MinIO），
/// 此端点可以返回一个带签名的临时下载 URL
#[derive(Debug, Serialize)]
pub struct DownloadUrlResponse {
    /// 产物 ID
    pub artifact_id: Uuid,
    /// 产物名称
    pub artifact_name: String,
    /// 下载 URL（如果是外部存储）
    pub download_url: Option<String>,
    /// 文件大小（字节）
    pub file_size: i64,
    /// SHA256 哈希（用于验证）
    pub sha256: String,
    /// URL 过期时间（秒）
    pub expires_in_secs: u32,
}

/// 生成下载 URL
pub async fn generate_download_url(
    State(state): State<Arc<AppState>>,
    auth: AuthContext,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse> {
    state
        .permission_service
        .require_permission(auth.user_id, "artifact", "read", None, None)
        .await?;

    // 检查产物是否存在
    let artifact = sqlx::query(
        "SELECT id, artifact_name, artifact_path, artifact_size, artifact_hash, is_public, uploaded_by
         FROM build_artifacts WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        error!(error = %e, "Failed to get artifact");
        AppError::database("Failed to get artifact")
    })?
    .ok_or_else(|| AppError::not_found("Artifact not found"))?;

    let artifact_name: String = artifact.get("artifact_name");
    let artifact_path: String = artifact.get("artifact_path");
    let artifact_size: i64 = artifact.get("artifact_size");
    let artifact_hash: String = artifact.get("artifact_hash");
    let is_public: bool = artifact.get("is_public");
    let uploaded_by: Uuid = artifact.get("uploaded_by");
    let is_admin = state
        .permission_service
        .is_admin(auth.user_id)
        .await
        .unwrap_or(false);

    // 检查权限（反枚举：返回 404 而非 403）
    if !is_public && !is_admin && uploaded_by != auth.user_id {
        return Err(AppError::not_found("Artifact not found"));
    }

    // 使用存储服务生成预签名 URL
    let download_url = state
        .storage_service
        .generate_presigned_url(&artifact_path, id)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to generate presigned URL");
            AppError::internal_error("Failed to generate download URL")
        })?;

    // 获取存储配置的过期时间
    let expires_in_secs = match state.storage_service.storage_type() {
        crate::services::StorageType::S3 => {
            state.storage_service.config().s3.presign_ttl_secs as u32
        }
        crate::services::StorageType::Local => 3600, // 本地存储默认 1 小时
    };

    Ok(Json(DownloadUrlResponse {
        artifact_id: id,
        artifact_name,
        download_url,
        file_size: artifact_size,
        sha256: artifact_hash,
        expires_in_secs,
    }))
}
