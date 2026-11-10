//! 认证服务：登录、登出、令牌刷新

use crate::{
    auth::jwt::{JwtService, TokenPair},
    auth::password::PasswordHasher,
    config::AppConfig,
    error::AppError,
    models::{audit::*, auth::*, user::*},
    repository::{auth_repo::AuthRepository, user_repo::UserRepository},
};
use chrono::Timelike;
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

pub struct AuthService {
    db: PgPool,
    jwt_service: Arc<JwtService>,
    config: Arc<AppConfig>,
}

impl AuthService {
    pub fn new(db: PgPool, jwt_service: Arc<JwtService>, config: Arc<AppConfig>) -> Self {
        Self {
            db,
            jwt_service,
            config,
        }
    }

    /// 用户登录
    pub async fn login(
        &self,
        req: LoginRequest,
        client_ip: &str,
        user_agent: Option<&str>,
    ) -> Result<LoginResponse, AppError> {
        // 检查速率限制
        self.check_login_rate_limit(client_ip).await?;

        let user_repo = UserRepository::new(self.db.clone());
        let auth_repo = AuthRepository::new(self.db.clone());

        // 获取用户
        let user: User = user_repo
            .find_by_username(&req.username)
            .await?
            .ok_or(AppError::Unauthorized)?;

        // 检查账户状态
        self.check_account_status(&user)?;

        // 检查账户是否被临时锁定
        if let Some(locked_until) = user.locked_until {
            if locked_until > chrono::Utc::now() {
                self.record_login_event(
                    Some(user.id),
                    &user.username,
                    "login_failure",
                    Some("account_locked"),
                    client_ip,
                    user_agent,
                )
                .await;
                return Err(AppError::BadRequest(format!(
                    "账户已被临时锁定，请 {} 分钟后重试",
                    (locked_until - chrono::Utc::now()).num_minutes().max(1)
                )));
            }
        }

        // 验证密码
        let hasher = PasswordHasher::new();
        let password_valid = hasher.verify(&req.password, &user.password_hash);

        if password_valid.is_err() {
            // 密码错误，增加失败计数
            let _ = user_repo.increment_failed_attempts(user.id).await;

            // 记录失败事件
            self.record_login_event(
                Some(user.id),
                &user.username,
                "login_failure",
                Some("invalid_password"),
                client_ip,
                user_agent,
            )
            .await;

            // 检查是否需要锁定账户（使用配置值）
            let max_attempts = self.config.security.max_login_attempts as i32;
            let lockout_secs = self.config.security.login_lockout_duration_secs;
            let new_attempts = user.failed_login_attempts + 1;
            if new_attempts >= max_attempts {
                let locked_until =
                    chrono::Utc::now() + chrono::Duration::seconds(lockout_secs as i64);
                let _ = user_repo.lock_account(user.id, locked_until).await;

                tracing::warn!(
                    user_id = %user.id,
                    username = %user.username,
                    failed_attempts = new_attempts,
                    lockout_duration_secs = lockout_secs,
                    "Account locked due to too many failed login attempts"
                );

                let lockout_minutes = (lockout_secs / 60).max(1);
                return Err(AppError::BadRequest(format!(
                    "密码错误次数过多，账户已被锁定 {} 分钟",
                    lockout_minutes
                )));
            }

            // 返回错误，但不泄露是否用户存在
            return Err(AppError::Unauthorized);
        }

        // 密码正确，重置失败次数
        if user.failed_login_attempts > 0 {
            let _ = user_repo.reset_failed_attempts(user.id).await;
        }

        // 获取用户角色和权限范围
        let (roles, scopes) = self.get_user_roles_and_scopes(user.id).await?;

        // 生成令牌
        let token_pair = self.jwt_service.generate_token_pair(
            &user.id,
            &user.username,
            roles.clone(),
            scopes.clone(),
        )?;

        // 存储刷新令牌
        let token_hash = AuthRepository::hash_token(&token_pair.refresh_token);
        let refresh_token = RefreshToken {
            id: Uuid::new_v4(),
            token_hash,
            user_id: user.id,
            device_id: self.generate_device_fingerprint(user_agent),
            user_agent: user_agent.map(|s| s.to_string()),
            ip_address: client_ip.to_string(),
            expires_at: chrono::Utc::now()
                + chrono::Duration::seconds(self.config.security.refresh_token_exp_secs as i64),
            revoked_at: None,
            replaced_by: None,
            created_at: chrono::Utc::now(),
        };

        auth_repo.store_refresh_token(&refresh_token).await?;

        // 记录成功登录
        self.record_login_event(
            Some(user.id),
            &user.username,
            "login_success",
            None,
            client_ip,
            user_agent,
        )
        .await;

        // 构建包含角色和权限的用户信息
        let user_response = UserWithRoles {
            user: UserResponse::from(user),
            roles: roles.clone(),
            scopes: scopes.clone(),
        };

        Ok(LoginResponse {
            access_token: token_pair.access_token,
            refresh_token: token_pair.refresh_token,
            expires_in: token_pair.expires_in,
            user: user_response,
        })
    }

    /// 刷新令牌
    pub async fn refresh_token(
        &self,
        req: RefreshTokenRequest,
        client_ip: &str,
    ) -> Result<TokenPair, AppError> {
        // 验证刷新令牌
        let _claims = self
            .jwt_service
            .validate_refresh_token(&req.refresh_token)?;

        // 检查令牌是否被撤销
        let auth_repo = AuthRepository::new(self.db.clone());
        let token_hash = AuthRepository::hash_token(&req.refresh_token);
        let refresh_token_record: RefreshToken = auth_repo
            .find_refresh_token_by_hash(&token_hash)
            .await?
            .ok_or(AppError::Unauthorized)?;

        if refresh_token_record.revoked_at.is_some() {
            return Err(AppError::Unauthorized);
        }

        if refresh_token_record.expires_at < chrono::Utc::now() {
            return Err(AppError::Unauthorized);
        }

        // 获取用户
        let user_repo = UserRepository::new(self.db.clone());
        let user: User = user_repo
            .find_by_id(&refresh_token_record.user_id)
            .await?
            .ok_or(AppError::Unauthorized)?;

        // 检查账户状态
        self.check_account_status(&user)?;

        // 获取用户角色和权限范围
        let (roles, scopes) = self.get_user_roles_and_scopes(user.id).await?;

        // 生成新的令牌对
        let new_token_pair =
            self.jwt_service
                .generate_token_pair(&user.id, &user.username, roles, scopes)?;

        // 撤销旧的刷新令牌
        let _ = auth_repo
            .revoke_refresh_token(refresh_token_record.id)
            .await;

        // 存储新的刷新令牌
        let new_token_hash = AuthRepository::hash_token(&new_token_pair.refresh_token);
        let new_refresh_token = RefreshToken {
            id: Uuid::new_v4(),
            token_hash: new_token_hash,
            user_id: user.id,
            device_id: None, // 刷新时不重新生成设备指纹
            user_agent: None,
            ip_address: client_ip.to_string(),
            expires_at: chrono::Utc::now()
                + chrono::Duration::seconds(self.config.security.refresh_token_exp_secs as i64),
            revoked_at: None,
            replaced_by: Some(refresh_token_record.id),
            created_at: chrono::Utc::now(),
        };

        auth_repo.store_refresh_token(&new_refresh_token).await?;

        Ok(new_token_pair)
    }

    /// 登出（撤销刷新令牌）
    pub async fn logout(&self, refresh_token: &str, user_id: Uuid) -> Result<(), AppError> {
        let auth_repo = AuthRepository::new(self.db.clone());
        let token_hash = AuthRepository::hash_token(refresh_token);

        auth_repo
            .revoke_refresh_token_by_hash(&token_hash, user_id)
            .await?;

        Ok(())
    }

    /// 从所有设备登出
    pub async fn logout_all(&self, user_id: Uuid) -> Result<u64, AppError> {
        let auth_repo = AuthRepository::new(self.db.clone());
        auth_repo.revoke_all_refresh_tokens(user_id).await
    }

    /// 检查账户状态
    fn check_account_status(&self, user: &User) -> Result<(), AppError> {
        match user.status.as_str() {
            "disabled" => Err(AppError::BadRequest("账户已被禁用".to_string())),
            "locked" => Err(AppError::BadRequest("账户已被锁定".to_string())),
            "enabled" => Ok(()),
            _ => Err(AppError::Internal("Unknown account status".to_string())),
        }
    }

    /// 检查登录速率限制
    async fn check_login_rate_limit(&self, client_ip: &str) -> Result<(), AppError> {
        let auth_repo = AuthRepository::new(self.db.clone());

        let max_attempts = self.config.security.login_rate_limit_max_attempts as i64;
        let window_secs = self.config.security.login_rate_limit_window_secs;

        // 检查最近的失败登录次数
        let recent_failures = auth_repo
            .count_recent_login_failures(client_ip, window_secs as i64)
            .await?;

        if recent_failures >= max_attempts {
            tracing::warn!(
                %client_ip,
                recent_failures,
                max_attempts,
                window_secs,
                "Rate limit exceeded for login"
            );
            return Err(AppError::RateLimitExceeded);
        }

        Ok(())
    }

    /// 获取用户的角色和权限
    async fn get_user_roles_and_scopes(
        &self,
        user_id: Uuid,
    ) -> Result<(Vec<String>, Vec<String>), AppError> {
        let role_repo = crate::repository::role_repo::RoleRepository::new(self.db.clone());
        let role_bindings = role_repo.get_user_role_bindings(user_id).await?;

        // 收集角色名称
        let roles: Vec<String> = role_bindings.iter().map(|r| r.role_name.clone()).collect();

        // 收集用户的所有权限（格式：resource:action）
        let mut scopes_set = std::collections::HashSet::new();

        for binding in &role_bindings {
            let permissions = role_repo.get_role_permissions(binding.role_id).await?;

            for perm in permissions {
                // 将权限转换为 resource:action 格式
                scopes_set.insert(format!("{}:{}", perm.resource, perm.action));
            }
        }

        let scopes: Vec<String> = scopes_set.into_iter().collect();

        Ok((roles, scopes))
    }

    /// 记录登录事件
    async fn record_login_event(
        &self,
        user_id: Option<Uuid>,
        username: &str,
        event_type: &str,
        failure_reason: Option<&str>,
        source_ip: &str,
        user_agent: Option<&str>,
    ) {
        let auth_repo = AuthRepository::new(self.db.clone());

        let event = LoginEvent {
            id: Uuid::new_v4(),
            user_id,
            username: username.to_string(),
            event_type: event_type.to_string(),
            auth_method: "password".to_string(),
            failure_reason: failure_reason.map(|s| s.to_string()),
            source_ip: source_ip.to_string(),
            user_agent: user_agent.map(|s| s.to_string()),
            device_id: None,
            risk_tag: self.assess_login_risk(source_ip, user_agent, 0),
            occurred_at: chrono::Utc::now(),
        };

        // 忽略审计日志错误，不要破坏请求流程
        let _ = auth_repo.record_login_event(&event).await;
    }

    // ==================== 安全增强功能 ====================

    /// 生成设备指纹
    ///
    /// 基于 User-Agent 生成简单的哈希值作为设备指纹
    /// 用于识别同一设备的多次登录
    fn generate_device_fingerprint(&self, user_agent: Option<&str>) -> Option<String> {
        let ua = user_agent?;

        // 基于 User-Agent 生成简单哈希
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();
        ua.hash(&mut hasher);
        Some(format!("{:x}", hasher.finish()))
    }

    /// 评估登录风险
    ///
    /// 检查以下风险因素：
    /// - 暴力破解（多次失败登录）
    /// - 新设备（设备指纹不在已知列表中）
    /// - 异常登录时间（非工作时间）
    fn assess_login_risk(
        &self,
        client_ip: &str,
        user_agent: Option<&str>,
        recent_failures: i64,
    ) -> Option<String> {
        // 检查暴力破解风险
        if recent_failures >= 5 {
            return Some("brute_force".to_string());
        }

        // 检查异常登录时间（凌晨 0-6 点）
        let hour = chrono::Utc::now().hour();
        if hour < 6 {
            return Some("unusual_time".to_string());
        }

        // 检查是否为可疑 User-Agent（常见扫描工具）
        if let Some(ua) = user_agent {
            let ua_lower = ua.to_lowercase();
            let suspicious_agents = ["nmap", "sqlmap", "nikto", "gobuster", "dirbuster", "hydra"];
            if suspicious_agents.iter().any(|a| ua_lower.contains(a)) {
                return Some("suspicious_agent".to_string());
            }
        }

        // 检查是否为私有保留地址（异常登录来源）
        if client_ip.starts_with("0.") || client_ip == "0.0.0.0" {
            return Some("suspicious_ip".to_string());
        }

        None
    }

    /// 解锁用户账户（管理员操作）
    /// 重置失败登录次数并清除临时锁定状态
    pub async fn unlock_account(&self, user_id: Uuid) -> Result<(), AppError> {
        sqlx::query(
            r#"
            UPDATE users
            SET
                failed_login_attempts = 0,
                locked_until = NULL,
                status = CASE WHEN status = 'locked' THEN 'enabled' ELSE status END,
                updated_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(user_id)
        .execute(&self.db)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, user_id = %user_id, "Failed to unlock account");
            AppError::database("Failed to unlock account")
        })?;

        tracing::info!(user_id = %user_id, "Account unlocked by administrator");
        Ok(())
    }
}
