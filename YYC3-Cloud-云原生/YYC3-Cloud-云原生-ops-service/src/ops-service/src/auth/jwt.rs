//! JWT token generation and validation
//! Implements access token + refresh token pattern

use crate::{config::AppConfig, error::AppError};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use secrecy::ExposeSecret;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// JWT claims for access tokens
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    /// Subject (user ID)
    pub sub: String,

    /// Username
    pub username: String,

    /// Token type (access or refresh)
    pub token_type: String,

    /// User roles
    pub roles: Vec<String>,

    /// Scopes
    pub scopes: Vec<String>,

    /// Issued at
    pub iat: i64,

    /// Expiration
    pub exp: i64,

    /// JWT ID (unique token identifier)
    pub jti: String,
}

/// Token pair response
#[derive(Debug, Serialize)]
pub struct TokenPair {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: u64, // seconds until access token expires
}

/// JWT service
pub struct JwtService {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
    access_token_exp_secs: u64,
    refresh_token_exp_secs: u64,
}

impl JwtService {
    /// Create JWT service from config
    pub fn from_config(config: &AppConfig) -> Result<Self, AppError> {
        let secret = config.security.jwt_secret.expose_secret();

        // Ensure secret is at least 32 bytes for HS256
        if secret.len() < 32 {
            return Err(AppError::Config("JWT secret too short (min 32 chars)".to_string()));
        }

        let encoding_key = EncodingKey::from_secret(secret.as_bytes());
        let decoding_key = DecodingKey::from_secret(secret.as_bytes());

        Ok(Self {
            encoding_key,
            decoding_key,
            access_token_exp_secs: config.security.access_token_exp_secs,
            refresh_token_exp_secs: config.security.refresh_token_exp_secs,
        })
    }

    /// Generate access token
    pub fn generate_access_token(
        &self,
        user_id: &Uuid,
        username: &str,
        roles: Vec<String>,
        scopes: Vec<String>,
    ) -> Result<String, AppError> {
        let now = Utc::now();
        let expiration = now + Duration::seconds(self.access_token_exp_secs as i64);

        let claims = Claims {
            sub: user_id.to_string(),
            username: username.to_string(),
            token_type: "access".to_string(),
            roles,
            scopes,
            iat: now.timestamp(),
            exp: expiration.timestamp(),
            jti: Uuid::new_v4().to_string(),
        };

        encode(&Header::default(), &claims, &self.encoding_key).map_err(|e| {
            tracing::error!("Failed to encode access token: {:?}", e);
            AppError::Internal(format!("Failed to encode access token: {}", e))
        })
    }

    /// Generate refresh token
    pub fn generate_refresh_token(
        &self,
        user_id: &Uuid,
        username: &str,
    ) -> Result<String, AppError> {
        let now = Utc::now();
        let expiration = now + Duration::seconds(self.refresh_token_exp_secs as i64);

        let claims = Claims {
            sub: user_id.to_string(),
            username: username.to_string(),
            token_type: "refresh".to_string(),
            roles: vec![],
            scopes: vec![],
            iat: now.timestamp(),
            exp: expiration.timestamp(),
            jti: Uuid::new_v4().to_string(),
        };

        encode(&Header::default(), &claims, &self.encoding_key).map_err(|e| {
            tracing::error!("Failed to encode refresh token: {:?}", e);
            AppError::Internal(format!("Failed to encode refresh token: {}", e))
        })
    }

    /// Generate token pair
    pub fn generate_token_pair(
        &self,
        user_id: &Uuid,
        username: &str,
        roles: Vec<String>,
        scopes: Vec<String>,
    ) -> Result<TokenPair, AppError> {
        let access_token = self.generate_access_token(user_id, username, roles, scopes)?;

        let refresh_token = self.generate_refresh_token(user_id, username)?;

        Ok(TokenPair {
            access_token,
            refresh_token,
            expires_in: self.access_token_exp_secs,
        })
    }

    /// Validate and decode token
    pub fn validate_token(&self, token: &str) -> Result<Claims, AppError> {
        Ok(decode::<Claims>(token, &self.decoding_key, &Validation::new(Algorithm::HS256))
            .map_err(|e| {
                tracing::debug!("Token validation failed: {:?}", e);
                AppError::Unauthorized
            })?
            .claims)
    }

    /// Validate access token specifically
    pub fn validate_access_token(&self, token: &str) -> Result<Claims, AppError> {
        let claims = self.validate_token(token)?;

        if claims.token_type != "access" {
            tracing::debug!("Token type mismatch: expected 'access', got '{}'", claims.token_type);
            return Err(AppError::Unauthorized);
        }

        Ok(claims)
    }

    /// Validate refresh token specifically
    pub fn validate_refresh_token(&self, token: &str) -> Result<Claims, AppError> {
        let claims = self.validate_token(token)?;

        if claims.token_type != "refresh" {
            tracing::debug!("Token type mismatch: expected 'refresh', got '{}'", claims.token_type);
            return Err(AppError::Unauthorized);
        }

        Ok(claims)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use secrecy::SecretString;

    // Mock config for testing
    fn test_config() -> AppConfig {
        AppConfig {
            server: crate::config::ServerConfig {
                addr: "127.0.0.1:3000".to_string(),
                graceful_shutdown_timeout_secs: 30,
            },
            database: crate::config::DatabaseConfig {
                url: secrecy::SecretString::from("postgresql://localhost/test".to_string()),
                max_connections: 10,
                min_connections: 1,
                acquire_timeout_secs: 30,
                idle_timeout_secs: 600,
                max_lifetime_secs: 1800,
                auto_create_if_missing: true,
            },
            logging: crate::config::LoggingConfig {
                level: "info".to_string(),
                format: "json".to_string(),
            },
            security: crate::config::SecurityConfig {
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
            ssh: crate::config::SshConfig {
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
            concurrency: crate::config::ConcurrencyConfig {
                global_limit: 100,
                group_limit: None,
                environment_limit: None,
                production_limit: None,
                acquire_timeout_secs: 30,
                strategy: "queue".to_string(),
                queue_max_length: 1000,
            },
            rabbitmq: crate::config::RabbitMqConfig {
                amqp_url: SecretString::from("amqp://localhost:5672".to_string()),
                vhost: "/".to_string(),
                build_exchange: "ops.build".to_string(),
                runner_exchange: "ops.runner".to_string(),
                pool_size: 5,
                publish_timeout_secs: 10,
            },
            runner_docker: crate::config::RunnerDockerConfig::default(),
            metrics: crate::config::MetricsConfig::default(),
        }
    }

    #[test]
    fn test_generate_and_validate_access_token() {
        let service = JwtService::from_config(&test_config()).unwrap();
        let user_id = Uuid::new_v4();

        let token = service
            .generate_access_token(&user_id, "testuser", vec!["admin".to_string()], vec![])
            .unwrap();

        let claims = service.validate_access_token(&token).unwrap();
        assert_eq!(claims.sub, user_id.to_string());
        assert_eq!(claims.username, "testuser");
        assert_eq!(claims.token_type, "access");
        assert!(claims.roles.contains(&"admin".to_string()));
    }

    #[test]
    fn test_generate_and_validate_refresh_token() {
        let service = JwtService::from_config(&test_config()).unwrap();
        let user_id = Uuid::new_v4();

        let token = service
            .generate_refresh_token(&user_id, "testuser")
            .unwrap();

        let claims = service.validate_refresh_token(&token).unwrap();
        assert_eq!(claims.sub, user_id.to_string());
        assert_eq!(claims.username, "testuser");
        assert_eq!(claims.token_type, "refresh");
    }

    #[test]
    fn test_token_type_validation() {
        let service = JwtService::from_config(&test_config()).unwrap();
        let user_id = Uuid::new_v4();

        let access_token = service
            .generate_access_token(&user_id, "testuser", vec![], vec![])
            .unwrap();

        // Should fail: trying to validate access token as refresh token
        assert!(service.validate_refresh_token(&access_token).is_err());

        let refresh_token = service
            .generate_refresh_token(&user_id, "testuser")
            .unwrap();

        // Should fail: trying to validate refresh token as access token
        assert!(service.validate_access_token(&refresh_token).is_err());
    }

    #[test]
    fn test_invalid_token_fails() {
        let service = JwtService::from_config(&test_config()).unwrap();
        assert!(service.validate_access_token("invalid_token").is_err());
        assert!(service.validate_refresh_token("invalid_token").is_err());
    }
}
