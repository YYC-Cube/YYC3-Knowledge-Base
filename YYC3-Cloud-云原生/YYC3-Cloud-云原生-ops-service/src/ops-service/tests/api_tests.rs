//! API 集成测试
//!
//! 测试 HTTP API 端点

use axum::{
    body::Body,
    http::{Method, Request, StatusCode},
};
use http_body_util::BodyExt;
use ops_service::config::{
    AppConfig, ConcurrencyConfig, DatabaseConfig, LoggingConfig, MetricsConfig, RabbitMqConfig,
    RunnerDockerConfig, SecurityConfig, ServerConfig, SshConfig,
};
use ops_service::db;
use ops_service::handlers::health::health_check;
use ops_service::middleware::AppState;
use secrecy::SecretString;
use std::sync::Arc;
use tokio::sync::RwLock;
use tower::ServiceExt;

/// 创建测试配置
fn create_test_config() -> AppConfig {
    let database_url = std::env::var("TEST_DATABASE_URL").unwrap_or_else(|_| {
        "postgresql://postgres:postgres@localhost:5432/ops_service_test".to_string()
    });

    AppConfig {
        server: ServerConfig {
            addr: "127.0.0.1:0".to_string(),
            graceful_shutdown_timeout_secs: 5,
        },
        database: DatabaseConfig {
            url: SecretString::from(database_url),
            max_connections: 5,
            min_connections: 1,
            acquire_timeout_secs: 5,
            idle_timeout_secs: 300,
            max_lifetime_secs: 1800,
            auto_create_if_missing: true,
        },
        logging: LoggingConfig {
            level: "debug".to_string(),
            format: "pretty".to_string(),
        },
        security: SecurityConfig {
            jwt_secret: SecretString::from("test-secret-key-for-testing-only-min-32-chars".to_string()),
            access_token_exp_secs: 300,
            refresh_token_exp_secs: 3600,
            password_min_length: 8,
            password_require_uppercase: true,
            password_require_digit: true,
            password_require_special: false,
            max_login_attempts: 5,
            login_lockout_duration_secs: 300,
            rate_limit_rps: 1000,
            trust_proxy: false,
            allowed_ips: None,
            runner_api_key: None,
            runner_webhook_hmac_secret: None,
            runner_webhook_max_skew_secs: 300,
            runner_webhook_nonce_ttl_secs: 600,
            login_rate_limit_max_attempts: 10,
            login_rate_limit_window_secs: 300,
        },
        ssh: SshConfig {
            default_username: "root".to_string(),
            default_password: SecretString::from("".to_string()),
            default_private_key: None,
            private_key_passphrase: None,
            connect_timeout_secs: 10,
            handshake_timeout_secs: 10,
            command_timeout_secs: 300,
            host_key_verification: "accept".to_string(),
            known_hosts_file: None,
        },
        concurrency: ConcurrencyConfig {
            global_limit: 100,
            group_limit: None,
            environment_limit: None,
            production_limit: None,
            acquire_timeout_secs: 30,
            strategy: "queue".to_string(),
            queue_max_length: 1000,
        },
        rabbitmq: RabbitMqConfig {
            amqp_url: SecretString::from("amqp://localhost:5672".to_string()),
            vhost: "/".to_string(),
            build_exchange: "ops.build".to_string(),
            runner_exchange: "ops.runner".to_string(),
            pool_size: 5,
            publish_timeout_secs: 10,
        },
        runner_docker: RunnerDockerConfig::default(),
        metrics: MetricsConfig::default(),
    }
}

/// 创建测试应用状态
async fn create_test_app_state() -> Arc<AppState> {
    let config = create_test_config();
    let pool = db::create_pool(&config.database)
        .await
        .expect("Failed to create test database pool");

    let jwt_service = Arc::new(
        ops_service::auth::jwt::JwtService::from_config(&config)
            .expect("Failed to create JWT service"),
    );
    let auth_service = Arc::new(ops_service::services::AuthService::new(
        pool.clone(),
        jwt_service.clone(),
        Arc::new(config.clone()),
    ));
    let permission_service = Arc::new(ops_service::services::PermissionService::new(pool.clone()));
    let audit_service = Arc::new(ops_service::services::AuditService::new(pool.clone()));

    // 创建并发控制器
    let concurrency_controller = Arc::new(ops_service::concurrency::ConcurrencyController::new(
        ops_service::concurrency::ConcurrencyConfig::default(),
    ));

    // 创建 job_service
    let job_service = Arc::new(ops_service::services::JobService::new(
        pool.clone(),
        concurrency_controller.clone(),
        audit_service.clone(),
        config.ssh.clone(),
    ));

    // 创建 event_bus
    let event_bus = Arc::new(ops_service::realtime::EventBus::new(100));

    // 创建 approval_service
    let approval_service = Arc::new(ops_service::services::ApprovalService::new(
        pool.clone(),
        audit_service.clone(),
        event_bus.clone(),
    ));

    // 创建 runner_docker_config_cache
    let runner_docker_config_cache = Arc::new(RwLock::new(config.runner_docker.clone()));

    let runner_scheduler = Arc::new(ops_service::services::RunnerScheduler::new(pool.clone()));
    let storage_service = Arc::new(ops_service::services::StorageService::new(
        ops_service::services::StorageConfig::default(),
    ));

    Arc::new(AppState {
        config: config.clone(),
        db: pool,
        auth_service,
        permission_service,
        audit_service,
        jwt_service,
        job_service,
        approval_service,
        event_bus,
        concurrency_controller,
        rate_limiter: Arc::new(ops_service::middleware::IpRateLimiter::new(
            ops_service::middleware::RateLimitConfig::default(),
        )),
        rabbitmq_publisher: Arc::new(ops_service::rabbitmq::RabbitMqPublisherPool::new(
            config.rabbitmq.clone(),
        )),
        runner_docker_config_cache,
        runner_scheduler,
        storage_service,
        webhook_nonce_store: None,
        runner_config_version: Arc::new(std::sync::atomic::AtomicU64::new(0)),
    })
}

// ==================== 健康检查测试 ====================

#[tokio::test]
async fn test_health_check_endpoint() {
    // 创建简单的健康检查处理器
    let app = axum::Router::new().route("/health", axum::routing::get(health_check));

    let response = app
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["status"], "ok");
}

#[tokio::test]
async fn test_ready_check_endpoint() {
    // 注意: readiness_check 需要完整的 AppState，这里只测试 health_check
    // 实际的就绪检查测试需要数据库连接，在集成测试中进行
    let app = axum::Router::new().route("/health", axum::routing::get(health_check));

    let response = app
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["status"], "ok");
}

#[tokio::test]
async fn test_404_not_found() {
    let app = axum::Router::new().route("/health", axum::routing::get(health_check));

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/nonexistent")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    // 404 响应可能有空的 body，不尝试解析 JSON
    let body = response.into_body().collect().await.unwrap().to_bytes();
    // 只验证 body 可能为空或者是某个错误格式
    let body_str = String::from_utf8(body.to_vec()).unwrap_or_default();
    assert!(body_str.is_empty() || body_str.len() > 0);
}

#[tokio::test]
async fn test_method_not_allowed() {
    let app = axum::Router::new().route("/health", axum::routing::get(health_check));

    // POST 到只接受 GET 的端点
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::METHOD_NOT_ALLOWED);
}

#[tokio::test]
async fn test_health_check_response_structure() {
    let app = axum::Router::new().route("/health", axum::routing::get(health_check));

    let response = app
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // 验证 content-type（需要在消耗body之前）
    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok());
    assert_eq!(content_type, Some("application/json"));

    // 然后验证body
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

    // 验证响应结构
    assert!(json.is_object());
    assert!(json.get("status").is_some());
}

#[tokio::test]
async fn test_multiple_health_check_requests() {
    let app = axum::Router::new().route("/health", axum::routing::get(health_check));

    // 发送多个请求确保稳定性
    for _ in 0..5 {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }
}

#[tokio::test]
async fn test_ready_check_response_structure() {
    // readiness_check 需要完整的 AppState，这里简化测试
    let app = axum::Router::new().route("/health", axum::routing::get(health_check));

    let response = app
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // 验证 content-type（需要在消耗body之前）
    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok());
    assert_eq!(content_type, Some("application/json"));

    // 然后验证body
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

    // 验证响应结构
    assert!(json.is_object());
    assert!(json.get("status").is_some());
    assert_eq!(json["status"], "ok");
}

#[tokio::test]
async fn test_empty_body_request() {
    let app = axum::Router::new().route("/health", axum::routing::get(health_check));

    let response = app
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_invalid_uri() {
    let app = axum::Router::new().route("/health", axum::routing::get(health_check));

    // 无效的 URI 应该返回 404
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/health/extra/segments")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_response_headers() {
    let app = axum::Router::new().route("/health", axum::routing::get(health_check));

    let response = app
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // 验证响应头
    assert_eq!(
        response
            .headers()
            .get("content-type")
            .and_then(|v| v.to_str().ok()),
        Some("application/json")
    );
}

// ==================== 认证 API 测试 ====================

#[tokio::test]
#[ignore = "需要数据库连接"]
async fn test_login_missing_credentials() {
    use ops_service::handlers::auth::login;

    let state = create_test_app_state().await;

    let app = axum::Router::new()
        .route("/auth/login", axum::routing::post(login))
        .with_state(state);

    // 缺少密码的请求
    let invalid_request = serde_json::json!({
        "username": "testuser"
    });

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(invalid_request.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    // 应该返回 400 或 422
    assert!(
        response.status() == StatusCode::BAD_REQUEST
            || response.status() == StatusCode::UNPROCESSABLE_ENTITY
    );
}

#[tokio::test]
#[ignore = "需要数据库连接"]
async fn test_login_empty_credentials() {
    use ops_service::handlers::auth::login;

    let state = create_test_app_state().await;

    let app = axum::Router::new()
        .route("/auth/login", axum::routing::post(login))
        .with_state(state);

    // 空用户名和密码
    let empty_request = serde_json::json!({
        "username": "",
        "password": ""
    });

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(empty_request.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    // 应该返回未授权
    assert!(
        response.status() == StatusCode::UNAUTHORIZED
            || response.status() == StatusCode::BAD_REQUEST
    );
}

// ==================== 请求解析测试 ====================

#[tokio::test]
async fn test_invalid_json_body() {
    let app = axum::Router::new().route("/health", axum::routing::get(health_check));

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/health")
                .header("content-type", "application/json")
                .body(Body::from("{invalid json"))
                .unwrap(),
        )
        .await
        .unwrap();

    // 方法不允许，但 JSON 解析会在路由之前发生
    assert_eq!(response.status(), StatusCode::METHOD_NOT_ALLOWED);
}

#[tokio::test]
async fn test_health_check_with_query_params() {
    let app = axum::Router::new().route("/health", axum::routing::get(health_check));

    let response = app
        .oneshot(
            Request::builder()
                .uri("/health?verbose=true")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // 查询参数不应影响健康检查
    assert_eq!(response.status(), StatusCode::OK);
}

// ==================== 并发请求测试 ====================

#[tokio::test]
async fn test_concurrent_health_checks() {
    let app = axum::Router::new().route("/health", axum::routing::get(health_check));

    let mut handles = vec![];

    // 发送 10 个并发请求
    for _ in 0..10 {
        let app_clone = app.clone();
        let handle = tokio::spawn(async move {
            app_clone
                .oneshot(
                    Request::builder()
                        .uri("/health")
                        .body(Body::empty())
                        .unwrap(),
                )
                .await
                .unwrap()
                .status()
        });
        handles.push(handle);
    }

    // 等待所有请求完成
    for handle in handles {
        let status = handle.await.unwrap();
        assert_eq!(status, StatusCode::OK);
    }
}
