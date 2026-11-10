//! JWT 服务单元测试
//!
//! 测试 JWT token 生成、验证和刷新功能

use ops_service::auth::jwt::JwtService;
use ops_service::config::{
    AppConfig, ConcurrencyConfig, DatabaseConfig, LoggingConfig, MetricsConfig, RabbitMqConfig,
    RunnerDockerConfig, SecurityConfig, ServerConfig, SshConfig,
};
use secrecy::SecretString;
use uuid::Uuid;

/// 创建测试配置
fn create_test_config() -> AppConfig {
    AppConfig {
        server: ServerConfig {
            addr: "127.0.0.1:3000".to_string(),
            graceful_shutdown_timeout_secs: 30,
        },
        database: DatabaseConfig {
            url: SecretString::from("postgresql://localhost/test".to_string()),
            max_connections: 10,
            min_connections: 1,
            acquire_timeout_secs: 30,
            idle_timeout_secs: 600,
            max_lifetime_secs: 1800,
            auto_create_if_missing: true,
        },
        logging: LoggingConfig {
            level: "info".to_string(),
            format: "json".to_string(),
        },
        security: SecurityConfig {
            jwt_secret: SecretString::from("test_secret_key_32_characters_long!".to_string()),
            access_token_exp_secs: 900,
            refresh_token_exp_secs: 604800,
            rate_limit_rps: 100,
            trust_proxy: true,
            allowed_ips: None,
            password_min_length: 8,
            password_require_uppercase: true,
            password_require_digit: true,
            password_require_special: false,
            max_login_attempts: 5,
            login_lockout_duration_secs: 1800,
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

#[test]
fn test_jwt_service_creation() {
    let config = create_test_config();
    let service = JwtService::from_config(&config);

    assert!(service.is_ok(), "JWT service should be created successfully");

    // 通过生成 token 验证配置被正确应用
    let service = service.unwrap();
    let user_id = Uuid::new_v4();
    let token = service
        .generate_access_token(&user_id, "testuser", vec![], vec![])
        .expect("Token generation should succeed");
    let claims = service.validate_access_token(&token).unwrap();
    let exp_duration = claims.exp - claims.iat;
    assert_eq!(exp_duration, 900);
}

#[test]
fn test_jwt_service_secret_too_short() {
    let mut config = create_test_config();
    config.security.jwt_secret = SecretString::from("short".to_string());

    let result = JwtService::from_config(&config);
    assert!(result.is_err(), "Short secret should fail");
}

#[test]
fn test_generate_access_token() {
    let config = create_test_config();
    let service = JwtService::from_config(&config).unwrap();
    let user_id = Uuid::new_v4();

    let token = service
        .generate_access_token(
            &user_id,
            "testuser",
            vec!["admin".to_string()],
            vec!["read".to_string(), "write".to_string()],
        )
        .expect("Token generation should succeed");

    // Token 应该是三个部分用点分隔
    let parts: Vec<&str> = token.split('.').collect();
    assert_eq!(parts.len(), 3, "JWT should have 3 parts");

    // Token 不应该为空
    assert!(!token.is_empty());
    assert!(token.len() > 100);
}

#[test]
fn test_generate_and_validate_access_token() {
    let config = create_test_config();
    let service = JwtService::from_config(&config).unwrap();
    let user_id = Uuid::new_v4();

    let token = service
        .generate_access_token(&user_id, "testuser", vec!["admin".to_string()], vec![])
        .expect("Token generation should succeed");

    let claims = service
        .validate_access_token(&token)
        .expect("Token validation should succeed");

    assert_eq!(claims.sub, user_id.to_string());
    assert_eq!(claims.username, "testuser");
    assert_eq!(claims.token_type, "access");
    assert!(claims.roles.contains(&"admin".to_string()));
    assert_eq!(claims.scopes.len(), 0);
}

#[test]
fn test_generate_and_validate_refresh_token() {
    let config = create_test_config();
    let service = JwtService::from_config(&config).unwrap();
    let user_id = Uuid::new_v4();

    let token = service
        .generate_refresh_token(&user_id, "testuser")
        .expect("Refresh token generation should succeed");

    let claims = service
        .validate_refresh_token(&token)
        .expect("Refresh token validation should succeed");

    assert_eq!(claims.sub, user_id.to_string());
    assert_eq!(claims.username, "testuser");
    assert_eq!(claims.token_type, "refresh");
    assert_eq!(claims.roles.len(), 0);
    assert_eq!(claims.scopes.len(), 0);
}

#[test]
fn test_token_type_validation() {
    let config = create_test_config();
    let service = JwtService::from_config(&config).unwrap();
    let user_id = Uuid::new_v4();

    let access_token = service
        .generate_access_token(&user_id, "testuser", vec![], vec![])
        .expect("Access token generation should succeed");

    // 尝试作为 refresh token 验证应该失败
    assert!(
        service.validate_refresh_token(&access_token).is_err(),
        "Access token should not validate as refresh token"
    );

    let refresh_token = service
        .generate_refresh_token(&user_id, "testuser")
        .expect("Refresh token generation should succeed");

    // 尝试作为 access token 验证应该失败
    assert!(
        service.validate_access_token(&refresh_token).is_err(),
        "Refresh token should not validate as access token"
    );
}

#[test]
fn test_generate_token_pair() {
    let config = create_test_config();
    let service = JwtService::from_config(&config).unwrap();
    let user_id = Uuid::new_v4();

    let token_pair = service
        .generate_token_pair(
            &user_id,
            "testuser",
            vec!["admin".to_string()],
            vec!["read".to_string()],
        )
        .expect("Token pair generation should succeed");

    // 验证 access token
    let access_claims = service
        .validate_access_token(&token_pair.access_token)
        .expect("Access token should be valid");
    assert_eq!(access_claims.sub, user_id.to_string());
    assert_eq!(access_claims.token_type, "access");

    // 验证 refresh token
    let refresh_claims = service
        .validate_refresh_token(&token_pair.refresh_token)
        .expect("Refresh token should be valid");
    assert_eq!(refresh_claims.sub, user_id.to_string());
    assert_eq!(refresh_claims.token_type, "refresh");

    // 验证 expires_in
    assert_eq!(token_pair.expires_in, 900);
}

#[test]
fn test_invalid_token_fails() {
    let config = create_test_config();
    let service = JwtService::from_config(&config).unwrap();

    // 完全无效的 token
    assert!(service.validate_access_token("invalid").is_err());
    assert!(service.validate_access_token("not.a.token").is_err());
    assert!(service.validate_access_token("a.b.c").is_err());

    // 空字符串
    assert!(service.validate_access_token("").is_err());
    assert!(service.validate_refresh_token("").is_err());
}

#[test]
fn test_token_with_multiple_roles() {
    let config = create_test_config();
    let service = JwtService::from_config(&config).unwrap();
    let user_id = Uuid::new_v4();

    let roles = vec![
        "admin".to_string(),
        "editor".to_string(),
        "viewer".to_string(),
    ];
    let scopes = vec![
        "read".to_string(),
        "write".to_string(),
        "delete".to_string(),
    ];

    let token = service
        .generate_access_token(&user_id, "testuser", roles.clone(), scopes.clone())
        .expect("Token generation should succeed");

    let claims = service
        .validate_access_token(&token)
        .expect("Token validation should succeed");

    assert_eq!(claims.roles.len(), 3);
    assert!(claims.roles.contains(&"admin".to_string()));
    assert!(claims.roles.contains(&"editor".to_string()));
    assert!(claims.roles.contains(&"viewer".to_string()));

    assert_eq!(claims.scopes.len(), 3);
    assert!(claims.scopes.contains(&"read".to_string()));
    assert!(claims.scopes.contains(&"write".to_string()));
    assert!(claims.scopes.contains(&"delete".to_string()));
}

#[test]
fn test_token_claims_structure() {
    let config = create_test_config();
    let service = JwtService::from_config(&config).unwrap();
    let user_id = Uuid::new_v4();

    let token = service
        .generate_access_token(&user_id, "testuser", vec!["admin".to_string()], vec![])
        .expect("Token generation should succeed");

    let claims = service
        .validate_access_token(&token)
        .expect("Token validation should succeed");

    // 验证 Claims 结构
    assert!(!claims.sub.is_empty());
    assert!(!claims.username.is_empty());
    assert!(!claims.token_type.is_empty());
    assert!(!claims.jti.is_empty());
    assert!(claims.iat > 0);
    assert!(claims.exp > 0);
    assert!(claims.exp > claims.iat);
}

#[test]
fn test_token_expiration_time() {
    let config = create_test_config();
    let service = JwtService::from_config(&config).unwrap();
    let user_id = Uuid::new_v4();

    let token = service
        .generate_access_token(&user_id, "testuser", vec![], vec![])
        .expect("Token generation should succeed");

    let claims = service
        .validate_access_token(&token)
        .expect("Token validation should succeed");

    // 验证过期时间约为 900 秒（15分钟）
    let exp_duration = claims.exp - claims.iat;
    assert_eq!(exp_duration, 900);
}

#[test]
fn test_token_with_unicode_username() {
    let config = create_test_config();
    let service = JwtService::from_config(&config).unwrap();
    let user_id = Uuid::new_v4();

    let username = "用户名🔒";
    let token = service
        .generate_access_token(&user_id, username, vec![], vec![])
        .expect("Token generation should succeed");

    let claims = service
        .validate_access_token(&token)
        .expect("Token validation should succeed");

    assert_eq!(claims.username, username);
}

#[test]
fn test_different_tokens_for_same_user() {
    let config = create_test_config();
    let service = JwtService::from_config(&config).unwrap();
    let user_id = Uuid::new_v4();

    let token1 = service
        .generate_access_token(&user_id, "testuser", vec![], vec![])
        .expect("First token generation should succeed");

    let token2 = service
        .generate_access_token(&user_id, "testuser", vec![], vec![])
        .expect("Second token generation should succeed");

    // 由于 jti 不同，token 应该不同
    assert_ne!(token1, token2, "Tokens should be different due to unique jti");

    // 但两个 token 都应该有效
    let claims1 = service.validate_access_token(&token1).unwrap();
    let claims2 = service.validate_access_token(&token2).unwrap();

    assert_ne!(claims1.jti, claims2.jti, "JTI should be unique");
}

#[test]
fn test_token_with_empty_roles_and_scopes() {
    let config = create_test_config();
    let service = JwtService::from_config(&config).unwrap();
    let user_id = Uuid::new_v4();

    let token = service
        .generate_access_token(&user_id, "testuser", vec![], vec![])
        .expect("Token generation with empty roles/scopes should succeed");

    let claims = service
        .validate_access_token(&token)
        .expect("Token validation should succeed");

    assert_eq!(claims.roles.len(), 0);
    assert_eq!(claims.scopes.len(), 0);
}

#[test]
fn test_refresh_token_expiration() {
    let config = create_test_config();
    let service = JwtService::from_config(&config).unwrap();
    let user_id = Uuid::new_v4();

    let token = service
        .generate_refresh_token(&user_id, "testuser")
        .expect("Refresh token generation should succeed");

    let claims = service
        .validate_refresh_token(&token)
        .expect("Refresh token validation should succeed");

    // 刷新 token 的过期时间应该更长
    let exp_duration = claims.exp - claims.iat;
    assert_eq!(exp_duration, 604800); // 7 天
}

#[test]
fn test_token_tampering_detection() {
    let config = create_test_config();
    let service = JwtService::from_config(&config).unwrap();
    let user_id = Uuid::new_v4();

    let mut token = service
        .generate_access_token(&user_id, "testuser", vec![], vec![])
        .expect("Token generation should succeed");

    // 篡改 token (修改最后一个字符)
    let last_char = token.chars().last().unwrap();
    let new_char = if last_char == 'a' { 'b' } else { 'a' };
    token.pop();
    token.push(new_char);

    // 篡改后的 token 应该无效
    assert!(
        service.validate_access_token(&token).is_err(),
        "Tampered token should be invalid"
    );
}

#[test]
fn test_validate_token_method() {
    let config = create_test_config();
    let service = JwtService::from_config(&config).unwrap();
    let user_id = Uuid::new_v4();

    let access_token = service
        .generate_access_token(&user_id, "testuser", vec![], vec![])
        .expect("Token generation should succeed");

    // validate_token 应该能验证任何类型的 token
    let claims = service
        .validate_token(&access_token)
        .expect("Token validation should succeed");

    assert_eq!(claims.sub, user_id.to_string());
    assert_eq!(claims.token_type, "access");

    let refresh_token = service
        .generate_refresh_token(&user_id, "testuser")
        .expect("Refresh token generation should succeed");

    let claims = service
        .validate_token(&refresh_token)
        .expect("Refresh token validation should succeed");

    assert_eq!(claims.sub, user_id.to_string());
    assert_eq!(claims.token_type, "refresh");
}
