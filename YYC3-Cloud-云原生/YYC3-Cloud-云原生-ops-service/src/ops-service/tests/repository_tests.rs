//! 仓库层集成测试
//!
//! 测试数据访问层的功能（需要数据库连接）

use ops_service::auth::password::PasswordHasher;
use ops_service::config::{
    AppConfig, ConcurrencyConfig, DatabaseConfig, LoggingConfig, MetricsConfig, RabbitMqConfig,
    RunnerDockerConfig, SecurityConfig, ServerConfig, SshConfig,
};
use ops_service::models::asset::*;
use ops_service::models::role::*;
use ops_service::models::user::*;
use ops_service::repository::asset_repo::AssetRepository;
use ops_service::repository::audit_repo::AuditRepository;
use ops_service::repository::role_repo::RoleRepository;
use ops_service::repository::user_repo::UserRepository;
use secrecy::{ExposeSecret, SecretString};
use sqlx::PgPool;
use uuid::Uuid;

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

/// 初始化测试数据库
async fn setup_test_db() -> PgPool {
    let config = create_test_config();

    let pool = sqlx::PgPool::connect(&config.database.url.expose_secret())
        .await
        .expect("Failed to connect to test database");

    // 运行迁移
    sqlx::query(
        r#"
        -- 创建用户表
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY,
            username VARCHAR(100) UNIQUE NOT NULL,
            email VARCHAR(255),
            password_hash TEXT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'enabled',
            failed_login_attempts INTEGER NOT NULL DEFAULT 0,
            last_failed_login_at TIMESTAMP,
            locked_until TIMESTAMP,
            password_changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
            must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
            full_name VARCHAR(100),
            department VARCHAR(100),
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
            created_by UUID,
            version INTEGER NOT NULL DEFAULT 1
        );

        -- 创建角色表
        CREATE TABLE IF NOT EXISTS roles (
            id UUID PRIMARY KEY,
            name VARCHAR(100) UNIQUE NOT NULL,
            description TEXT,
            is_system BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        -- 创建权限表
        CREATE TABLE IF NOT EXISTS permissions (
            id UUID PRIMARY KEY,
            resource VARCHAR(100) NOT NULL,
            action VARCHAR(100) NOT NULL,
            description TEXT,
            UNIQUE(resource, action)
        );

        -- 创建角色权限关联表
        CREATE TABLE IF NOT EXISTS role_permissions (
            role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
            permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
            PRIMARY KEY (role_id, permission_id)
        );

        -- 创建角色绑定表
        CREATE TABLE IF NOT EXISTS role_bindings (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
            scope_type VARCHAR(50) NOT NULL,
            scope_value VARCHAR(255),
            created_by UUID REFERENCES users(id),
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        -- 创建资产组表
        CREATE TABLE IF NOT EXISTS assets_groups (
            id UUID PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            environment VARCHAR(50) NOT NULL,
            parent_id UUID REFERENCES assets_groups(id),
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
            created_by UUID
        );

        -- 创建主机表
        CREATE TABLE IF NOT EXISTS assets_hosts (
            id UUID PRIMARY KEY,
            identifier VARCHAR(255) UNIQUE NOT NULL,
            display_name VARCHAR(255),
            address VARCHAR(500) NOT NULL,
            port INTEGER NOT NULL DEFAULT 22,
            group_id UUID NOT NULL REFERENCES assets_groups(id),
            environment VARCHAR(50) NOT NULL,
            tags JSONB NOT NULL DEFAULT '[]',
            owner_id UUID,
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            notes TEXT,
            os_type VARCHAR(100),
            os_version VARCHAR(100),
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
            created_by UUID,
            updated_by UUID,
            version INTEGER NOT NULL DEFAULT 1
        );

        -- 创建审计日志表
        CREATE TABLE IF NOT EXISTS audit_logs (
            id UUID PRIMARY KEY,
            subject_id UUID NOT NULL,
            subject_type VARCHAR(50) NOT NULL,
            subject_name VARCHAR(255),
            action VARCHAR(100) NOT NULL,
            resource_type VARCHAR(50) NOT NULL,
            resource_id UUID,
            resource_name VARCHAR(255),
            changes JSONB,
            changes_summary TEXT,
            source_ip VARCHAR(50),
            user_agent TEXT,
            trace_id VARCHAR(100),
            request_id VARCHAR(100),
            result VARCHAR(20) NOT NULL,
            error_message TEXT,
            occurred_at TIMESTAMP NOT NULL
        );

        -- 创建索引
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_role_bindings_user_id ON role_bindings(user_id);
        CREATE INDEX IF NOT EXISTS idx_assets_hosts_group_id ON assets_hosts(group_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_subject_id ON audit_logs(subject_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_occurred_at ON audit_logs(occurred_at);
        "#,
    )
    .execute(&pool)
    .await
    .expect("Failed to create test tables");

    // 清理测试数据
    sqlx::query("TRUNCATE TABLE audit_logs, assets_hosts, assets_groups, role_bindings, role_permissions, permissions, roles, users CASCADE")
        .execute(&pool)
        .await
        .ok();

    pool
}

// ==================== UserRepository 测试 ====================

#[tokio::test]
#[ignore = "需要数据库连接"]
async fn test_user_repository_create_and_find() {
    let pool = setup_test_db().await;
    let repo = UserRepository::new(pool.clone());
    let hasher = PasswordHasher::new();

    let password_hash = hasher.hash("TestPassword123!").unwrap();
    let req = CreateUserRequest {
        username: "testuser".to_string(),
        email: Some("test@example.com".to_string()),
        password: "TestPassword123!".to_string(),
        full_name: Some("Test User".to_string()),
        department: Some("Engineering".to_string()),
    };

    let user = repo
        .create(&req, &password_hash, Uuid::new_v4())
        .await
        .expect("User creation should succeed");

    assert_eq!(user.username, "testuser");
    assert_eq!(user.email, Some("test@example.com".to_string()));
    assert_eq!(user.status, "enabled");

    // 按用户名查找
    let found = repo
        .find_by_username("testuser")
        .await
        .expect("Find by username should succeed");
    assert!(found.is_some());
    assert_eq!(found.unwrap().id, user.id);

    // 按 ID 查找
    let found = repo.find_by_id(&user.id).await.unwrap();
    assert!(found.is_some());
    assert_eq!(found.unwrap().username, "testuser");
}

#[tokio::test]
#[ignore = "需要数据库连接"]
async fn test_user_repository_update() {
    let pool = setup_test_db().await;
    let repo = UserRepository::new(pool.clone());
    let hasher = PasswordHasher::new();

    let password_hash = hasher.hash("TestPassword123!").unwrap();
    let req = CreateUserRequest {
        username: "updatetest".to_string(),
        email: None,
        password: "TestPassword123!".to_string(),
        full_name: None,
        department: None,
    };

    let user = repo
        .create(&req, &password_hash, Uuid::new_v4())
        .await
        .unwrap();

    let update_req = UpdateUserRequest {
        email: Some("updated@example.com".to_string()),
        full_name: Some("Updated Name".to_string()),
        department: Some("Updated Dept".to_string()),
        status: Some("disabled".to_string()),
    };

    let updated = repo.update(user.id, &update_req).await.unwrap();
    assert!(updated.is_some());
    let updated = updated.unwrap();
    assert_eq!(updated.email, Some("updated@example.com".to_string()));
    assert_eq!(updated.full_name, Some("Updated Name".to_string()));
    assert_eq!(updated.status, "disabled");
}

#[tokio::test]
#[ignore = "需要数据库连接"]
async fn test_user_repository_delete() {
    let pool = setup_test_db().await;
    let repo = UserRepository::new(pool.clone());
    let hasher = PasswordHasher::new();

    let password_hash = hasher.hash("TestPassword123!").unwrap();
    let req = CreateUserRequest {
        username: "deletetest".to_string(),
        email: None,
        password: "TestPassword123!".to_string(),
        full_name: None,
        department: None,
    };

    let user = repo
        .create(&req, &password_hash, Uuid::new_v4())
        .await
        .unwrap();

    let deleted = repo.delete(user.id).await.unwrap();
    assert!(deleted);

    let found = repo.find_by_id(&user.id).await.unwrap();
    assert!(found.is_none());
}

#[tokio::test]
#[ignore = "需要数据库连接"]
async fn test_user_repository_failed_attempts() {
    let pool = setup_test_db().await;
    let repo = UserRepository::new(pool.clone());
    let hasher = PasswordHasher::new();

    let password_hash = hasher.hash("TestPassword123!").unwrap();
    let req = CreateUserRequest {
        username: "failedtest".to_string(),
        email: None,
        password: "TestPassword123!".to_string(),
        full_name: None,
        department: None,
    };

    let user = repo
        .create(&req, &password_hash, Uuid::new_v4())
        .await
        .unwrap();

    // 增加失败次数
    repo.increment_failed_attempts(user.id).await.unwrap();
    repo.increment_failed_attempts(user.id).await.unwrap();

    let found = repo.find_by_id(&user.id).await.unwrap().unwrap();
    assert_eq!(found.failed_login_attempts, 2);

    // 重置失败次数
    repo.reset_failed_attempts(user.id).await.unwrap();
    let found = repo.find_by_id(&user.id).await.unwrap().unwrap();
    assert_eq!(found.failed_login_attempts, 0);
}

// ==================== RoleRepository 测试 ====================

#[tokio::test]
#[ignore = "需要数据库连接"]
async fn test_role_repository_create_and_find() {
    let pool = setup_test_db().await;
    let repo = RoleRepository::new(pool.clone());

    let req = CreateRoleRequest {
        name: "editor".to_string(),
        description: Some("Can edit content".to_string()),
    };

    let role = repo.create(&req).await.unwrap();
    assert_eq!(role.name, "editor");
    assert_eq!(role.description, Some("Can edit content".to_string()));

    // 按名称查找
    let found = repo.find_by_name("editor").await.unwrap();
    assert!(found.is_some());
    assert_eq!(found.unwrap().id, role.id);
}

#[tokio::test]
#[ignore = "需要数据库连接"]
async fn test_role_repository_list() {
    let pool = setup_test_db().await;
    let repo = RoleRepository::new(pool.clone());

    // 创建多个角色
    for name in &["admin", "editor", "viewer"] {
        repo.create(&CreateRoleRequest {
            name: name.to_string(),
            description: None,
        })
        .await
        .unwrap();
    }

    let roles = repo.list().await.unwrap();
    assert!(roles.len() >= 3);
}

#[tokio::test]
#[ignore = "需要数据库连接"]
async fn test_role_repository_assign_to_user() {
    let pool = setup_test_db().await;
    let role_repo = RoleRepository::new(pool.clone());
    let user_repo = UserRepository::new(pool.clone());
    let hasher = PasswordHasher::new();

    // 创建用户
    let password_hash = hasher.hash("TestPassword123!").unwrap();
    let user_req = CreateUserRequest {
        username: "roleuser".to_string(),
        email: None,
        password: "TestPassword123!".to_string(),
        full_name: None,
        department: None,
    };
    let user = user_repo
        .create(&user_req, &password_hash, Uuid::new_v4())
        .await
        .unwrap();

    // 创建角色
    let role_req = CreateRoleRequest {
        name: "test_role".to_string(),
        description: None,
    };
    let role = role_repo.create(&role_req).await.unwrap();

    // 分配角色
    let binding = role_repo
        .assign_role_to_user(user.id, role.id, "global", None, user.id)
        .await
        .unwrap();

    assert_eq!(binding.user_id, user.id);
    assert_eq!(binding.role_id, role.id);
    assert_eq!(binding.scope_type, "global");

    // 获取用户角色绑定
    let bindings = role_repo.get_user_role_bindings(user.id).await.unwrap();
    assert_eq!(bindings.len(), 1);
    assert_eq!(bindings[0].role_name, "test_role");
}

// ==================== AssetRepository 测试 ====================

#[tokio::test]
#[ignore = "需要数据库连接"]
async fn test_asset_repository_create_group() {
    let pool = setup_test_db().await;
    let repo = AssetRepository::new(pool.clone());

    let req = CreateGroupRequest {
        name: "web-servers".to_string(),
        description: Some("Web server group".to_string()),
        environment: "production".to_string(),
        parent_id: None,
    };

    let group = repo.create_group(&req, Uuid::new_v4()).await.unwrap();

    assert_eq!(group.name, "web-servers");
    assert_eq!(group.environment, "production");

    // 查找组
    let found = repo.get_group(group.id).await.unwrap();
    assert!(found.is_some());
    assert_eq!(found.unwrap().name, "web-servers");
}

#[tokio::test]
#[ignore = "需要数据库连接"]
async fn test_asset_repository_create_host() {
    let pool = setup_test_db().await;
    let repo = AssetRepository::new(pool.clone());

    // 先创建组
    let group_req = CreateGroupRequest {
        name: "test-group".to_string(),
        description: None,
        environment: "dev".to_string(),
        parent_id: None,
    };
    let group = repo.create_group(&group_req, Uuid::new_v4()).await.unwrap();

    // 创建主机
    let host_req = CreateHostRequest {
        identifier: "host-01".to_string(),
        display_name: Some("Host 01".to_string()),
        address: "192.168.1.100".to_string(),
        port: 22,
        group_id: group.id,
        environment: "dev".to_string(),
        tags: vec!["linux".to_string(), "web".to_string()],
        owner_id: None,
        status: "active".to_string(),
        notes: None,
        os_type: Some("Linux".to_string()),
        os_version: None,
        ssh_username: None,
        ssh_password: None,
        ssh_private_key: None,
        ssh_key_passphrase: None,
        host_key_verification: None,
        known_hosts: None,
    };

    let host = repo.create_host(&host_req, Uuid::new_v4()).await.unwrap();

    assert_eq!(host.identifier, "host-01");
    assert_eq!(host.address, "192.168.1.100");
    assert_eq!(host.group_id, group.id);

    // 查找主机
    let found = repo.get_host(host.id).await.unwrap();
    assert!(found.is_some());
    assert_eq!(found.unwrap().identifier, "host-01");
}

#[tokio::test]
#[ignore = "需要数据库连接"]
async fn test_asset_repository_list_hosts() {
    let pool = setup_test_db().await;
    let repo = AssetRepository::new(pool.clone());

    // 创建组
    let group_req = CreateGroupRequest {
        name: "list-test-group".to_string(),
        description: None,
        environment: "test".to_string(),
        parent_id: None,
    };
    let group = repo.create_group(&group_req, Uuid::new_v4()).await.unwrap();

    // 创建多个主机
    for i in 1..=3 {
        let host_req = CreateHostRequest {
            identifier: format!("host-{:02}", i),
            display_name: None,
            address: format!("192.168.1.{}", 100 + i),
            port: 22,
            group_id: group.id,
            environment: "test".to_string(),
            tags: vec![],
            owner_id: None,
            status: "active".to_string(),
            notes: None,
            os_type: None,
            os_version: None,
            ssh_username: None,
            ssh_password: None,
            ssh_private_key: None,
            ssh_key_passphrase: None,
            host_key_verification: None,
            known_hosts: None,
        };
        repo.create_host(&host_req, Uuid::new_v4()).await.unwrap();
    }

    // 列出主机
    let filters = HostListFilters {
        group_id: Some(group.id),
        environment: Some("test".to_string()),
        status: None,
        tags: None,
        search: None,
    };

    let hosts = repo.list_hosts(&filters, 10, 0).await.unwrap();
    assert_eq!(hosts.len(), 3);
}

// ==================== AuditRepository 测试 ====================

#[tokio::test]
#[ignore = "需要数据库连接"]
async fn test_audit_repository_insert_and_query() {
    use ops_service::models::audit::*;

    let pool = setup_test_db().await;
    let repo = AuditRepository::new(pool.clone());

    let log = AuditLog {
        id: Uuid::new_v4(),
        subject_id: Uuid::new_v4(),
        subject_type: "user".to_string(),
        subject_name: Some("testuser".to_string()),
        action: "user.create".to_string(),
        resource_type: "user".to_string(),
        resource_id: Some(Uuid::new_v4()),
        resource_name: Some("testuser".to_string()),
        changes: Some(serde_json::json!({"field": "value"})),
        changes_summary: Some("Created user".to_string()),
        source_ip: Some("127.0.0.1".to_string()),
        user_agent: Some("test-agent".to_string()),
        trace_id: Some("trace-123".to_string()),
        request_id: None,
        result: "success".to_string(),
        error_message: None,
        occurred_at: chrono::Utc::now(),
    };

    repo.insert_audit_log(&log).await.unwrap();

    // 查询审计日志
    let filters = AuditLogFilters {
        subject_id: Some(log.subject_id),
        resource_type: Some("user".to_string()),
        resource_id: None,
        action: None,
        result: None,
        start_time: None,
        end_time: None,
        trace_id: None,
    };

    let logs = repo.query_audit_logs(&filters, 10, 0).await.unwrap();
    assert_eq!(logs.len(), 1);
    assert_eq!(logs[0].action, "user.create");
}

#[tokio::test]
#[ignore = "需要数据库连接"]
async fn test_audit_repository_count() {
    use ops_service::models::audit::*;

    let pool = setup_test_db().await;
    let repo = AuditRepository::new(pool.clone());

    // 创建多条审计日志
    for i in 0..5 {
        let log = AuditLog {
            id: Uuid::new_v4(),
            subject_id: Uuid::new_v4(),
            subject_type: "user".to_string(),
            subject_name: Some(format!("user{}", i)),
            action: "user.login".to_string(),
            resource_type: "user".to_string(),
            resource_id: None,
            resource_name: None,
            changes: None,
            changes_summary: None,
            source_ip: None,
            user_agent: None,
            trace_id: None,
            request_id: None,
            result: "success".to_string(),
            error_message: None,
            occurred_at: chrono::Utc::now(),
        };
        repo.insert_audit_log(&log).await.unwrap();
    }

    let filters = AuditLogFilters {
        subject_id: None,
        resource_type: Some("user".to_string()),
        resource_id: None,
        action: None,
        result: None,
        start_time: None,
        end_time: None,
        trace_id: None,
    };

    let count = repo.count_audit_logs(&filters).await.unwrap();
    assert_eq!(count, 5);
}
