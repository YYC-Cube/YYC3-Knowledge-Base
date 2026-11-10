//! Password hashing and verification using Argon2id

use crate::{config::AppConfig, error::AppError};
use argon2::{
    password_hash::{
        rand_core::OsRng, PasswordHash, PasswordHasher as _, PasswordVerifier, SaltString,
    },
    Algorithm, Argon2, Params, Version,
};

/// Password hasher with configurable parameters
pub struct PasswordHasher {
    argon2: Argon2<'static>,
}

impl PasswordHasher {
    /// Create hasher with default parameters (OWASP recommended)
    pub fn new() -> Self {
        // OWASP recommended parameters (as of 2024)
        // m=64MiB, t=3 iterations, p=4 lanes
        let params = Params::new(65536, 3, 4, None).expect("Invalid Argon2 params");

        let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

        Self { argon2 }
    }

    /// Hash a password
    pub fn hash(&self, password: &str) -> Result<String, AppError> {
        let salt = SaltString::generate(&mut OsRng);

        let password_hash = self
            .argon2
            .hash_password(password.as_bytes(), &salt)
            .map_err(|e| {
                tracing::error!("Failed to hash password: {:?}", e);
                AppError::Internal(format!("Failed to hash password: {}", e))
            })?
            .to_string();

        Ok(password_hash)
    }

    /// Verify a password against a hash
    pub fn verify(&self, password: &str, hash: &str) -> Result<(), AppError> {
        let parsed_hash = PasswordHash::new(hash).map_err(|e| {
            tracing::debug!("Failed to parse password hash: {:?}", e);
            AppError::Internal(format!("Failed to parse password hash: {}", e))
        })?;

        self.argon2
            .verify_password(password.as_bytes(), &parsed_hash)
            .map_err(|_| AppError::Unauthorized)
    }

    /// Validate password against policy
    pub fn validate_password_policy(password: &str, config: &AppConfig) -> Result<(), AppError> {
        let policy = &config.security;

        // Check length
        if password.len() < policy.password_min_length {
            return Err(AppError::BadRequest(format!(
                "Password must be at least {} characters",
                policy.password_min_length
            )));
        }

        // Check uppercase
        if policy.password_require_uppercase && !password.chars().any(|c| c.is_uppercase()) {
            return Err(AppError::BadRequest(
                "Password must contain at least one uppercase letter".to_string(),
            ));
        }

        // Check digit
        if policy.password_require_digit && !password.chars().any(|c| c.is_ascii_digit()) {
            return Err(AppError::BadRequest(
                "Password must contain at least one digit".to_string(),
            ));
        }

        // Check special character
        if policy.password_require_special {
            let has_special = password.chars().any(|c| !c.is_alphanumeric());
            if !has_special {
                return Err(AppError::BadRequest(
                    "Password must contain at least one special character".to_string(),
                ));
            }
        }

        Ok(())
    }
}

impl Default for PasswordHasher {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_and_verify() {
        let hasher = PasswordHasher::new();
        let password = "TestPassword123!";

        let hash = hasher.hash(password).unwrap();
        hasher.verify(password, &hash).unwrap();
    }

    #[test]
    fn test_verify_fails_with_wrong_password() {
        let hasher = PasswordHasher::new();
        let password = "TestPassword123!";

        let hash = hasher.hash(password).unwrap();
        assert!(hasher.verify("WrongPassword", &hash).is_err());
    }

    #[test]
    fn test_hash_is_different_each_time() {
        let hasher = PasswordHasher::new();
        let password = "TestPassword123!";

        let hash1 = hasher.hash(password).unwrap();
        let hash2 = hasher.hash(password).unwrap();

        // Hashes should be different due to salt
        assert_ne!(hash1, hash2);

        // But both should verify correctly
        hasher.verify(password, &hash1).unwrap();
        hasher.verify(password, &hash2).unwrap();
    }

    #[test]
    fn test_password_policy_validation() {
        let config = AppConfig {
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
                jwt_secret: secrecy::SecretString::from("test_secret_key_32_characters_long!".to_string()),
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
                default_password: secrecy::SecretString::from("".to_string()),
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
                amqp_url: secrecy::SecretString::from("amqp://localhost:5672".to_string()),
                vhost: "/".to_string(),
                build_exchange: "ops.build".to_string(),
                runner_exchange: "ops.runner".to_string(),
                pool_size: 5,
                publish_timeout_secs: 10,
            },
            runner_docker: crate::config::RunnerDockerConfig::default(),
            metrics: crate::config::MetricsConfig::default(),
        };

        // Valid password
        assert!(PasswordHasher::validate_password_policy("Test1234", &config).is_ok());

        // Too short
        assert!(PasswordHasher::validate_password_policy("Test1", &config).is_err());

        // No uppercase
        assert!(PasswordHasher::validate_password_policy("test1234", &config).is_err());

        // No digit
        assert!(PasswordHasher::validate_password_policy("Testtest", &config).is_err());
    }
}
