//! 模型验证单元测试
//!
//! 测试数据模型的验证功能

use ops_service::models::asset::*;
use ops_service::models::auth::*;
use ops_service::models::role::*;
use ops_service::models::user::*;
use serde_json;
use uuid::Uuid;

// ==================== User 模型测试 ====================

#[test]
fn test_user_status_from_string() {
    // 测试从字符串转换用户状态
    let enabled: UserStatus = "enabled".to_string().into();
    assert_eq!(enabled, UserStatus::Enabled);

    let disabled: UserStatus = "disabled".to_string().into();
    assert_eq!(disabled, UserStatus::Disabled);

    let locked: UserStatus = "locked".to_string().into();
    assert_eq!(locked, UserStatus::Locked);

    // 测试大小写不敏感
    let enabled_upper: UserStatus = "ENABLED".to_string().into();
    assert_eq!(enabled_upper, UserStatus::Enabled);

    // 测试未知状态默认为 Disabled
    let unknown: UserStatus = "unknown".to_string().into();
    assert_eq!(unknown, UserStatus::Disabled);
}

#[test]
fn test_user_status_to_string() {
    assert_eq!(String::from(UserStatus::Enabled), "enabled");
    assert_eq!(String::from(UserStatus::Disabled), "disabled");
    assert_eq!(String::from(UserStatus::Locked), "locked");
}

#[test]
fn test_user_status_round_trip() {
    let statuses = vec![
        UserStatus::Enabled,
        UserStatus::Disabled,
        UserStatus::Locked,
    ];

    for status in statuses {
        let string: String = status.clone().into();
        let converted: UserStatus = string.into();
        assert_eq!(status, converted);
    }
}

#[test]
fn test_create_user_request_deserialization() {
    // 测试反序列化（只有 Deserialize trait）
    let json = r#"{
        "username":"testuser",
        "email":"test@example.com",
        "password":"TestPassword123!",
        "full_name":"Test User",
        "department":"Engineering"
    }"#;
    let req: CreateUserRequest = serde_json::from_str(json).unwrap();

    assert_eq!(req.username, "testuser");
    assert_eq!(req.email, Some("test@example.com".to_string()));
    assert_eq!(req.password, "TestPassword123!");
    assert_eq!(req.full_name, Some("Test User".to_string()));
    assert_eq!(req.department, Some("Engineering".to_string()));
}

#[test]
fn test_create_user_request_minimal() {
    let json = r#"{"username":"testuser","password":"TestPass123!"}"#;
    let req: CreateUserRequest = serde_json::from_str(json).unwrap();

    assert_eq!(req.username, "testuser");
    assert_eq!(req.password, "TestPass123!");
    assert!(req.email.is_none());
    assert!(req.full_name.is_none());
    assert!(req.department.is_none());
}

#[test]
fn test_update_user_request_partial() {
    let json = r#"{"email":"new@example.com"}"#;
    let req: UpdateUserRequest = serde_json::from_str(json).unwrap();

    assert_eq!(req.email, Some("new@example.com".to_string()));
    assert!(req.full_name.is_none());
    assert!(req.department.is_none());
    assert!(req.status.is_none());
}

#[test]
fn test_user_response_excludes_sensitive_data() {
    let user_response = UserResponse {
        id: Uuid::new_v4(),
        username: "testuser".to_string(),
        email: Some("test@example.com".to_string()),
        status: "enabled".to_string(),
        full_name: Some("Test User".to_string()),
        department: Some("Engineering".to_string()),
        must_change_password: false,
        created_at: chrono::Utc::now(),
    };

    // 验证结构体不包含 password_hash 字段
    let json = serde_json::to_string(&user_response).unwrap();
    assert!(!json.contains("password_hash"));
}

#[test]
fn test_change_password_request() {
    let json = r#"{"old_password":"OldPass123!","new_password":"NewPass123!"}"#;
    let req: ChangePasswordRequest = serde_json::from_str(json).unwrap();

    assert_eq!(req.old_password, "OldPass123!");
    assert_eq!(req.new_password, "NewPass123!");
}

// ==================== Auth 模型测试 ====================

#[test]
fn test_login_request_deserialization() {
    let json = r#"{"username":"admin","password":"secret"}"#;
    let req: LoginRequest = serde_json::from_str(json).unwrap();

    assert_eq!(req.username, "admin");
    assert_eq!(req.password, "secret");
}

#[test]
fn test_refresh_token_request() {
    let json = r#"{"refresh_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test"}"#;
    let req: RefreshTokenRequest = serde_json::from_str(json).unwrap();

    assert_eq!(req.refresh_token, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test");
}

#[test]
fn test_logout_request() {
    let json = r#"{"refresh_token":"token123"}"#;
    let req: LogoutRequest = serde_json::from_str(json).unwrap();

    assert_eq!(req.refresh_token, "token123");
}

// ==================== Role 模型测试 ====================

#[test]
fn test_create_role_request() {
    let json = r#"{"name":"editor","description":"Can edit content"}"#;
    let req: CreateRoleRequest = serde_json::from_str(json).unwrap();

    assert_eq!(req.name, "editor");
    assert_eq!(req.description, Some("Can edit content".to_string()));
}

#[test]
fn test_create_role_request_without_description() {
    let json = r#"{"name":"viewer"}"#;
    let req: CreateRoleRequest = serde_json::from_str(json).unwrap();

    assert_eq!(req.name, "viewer");
    assert!(req.description.is_none());
}

#[test]
fn test_assign_role_request() {
    let user_id = Uuid::new_v4();
    let role_id = Uuid::new_v4();

    let json = format!(
        r#"{{"user_id":"{}","role_id":"{}","scope_type":"group","scope_value":"web-servers"}}"#,
        user_id, role_id
    );
    let req: AssignRoleRequest = serde_json::from_str(&json).unwrap();

    assert_eq!(req.user_id, user_id);
    assert_eq!(req.role_id, role_id);
    assert_eq!(req.scope_type, "group");
    assert_eq!(req.scope_value, Some("web-servers".to_string()));
}

#[test]
fn test_role_binding_scope_types() {
    // 测试支持的范围类型
    let scope_types = vec!["global", "group", "environment"];

    for scope_type in scope_types {
        let json = format!(
            r#"{{"user_id":"00000000-0000-0000-0000-000000000001","role_id":"00000000-0000-0000-0000-000000000002","scope_type":"{}"}}"#,
            scope_type
        );
        let req: AssignRoleRequest = serde_json::from_str(&json).unwrap();

        assert_eq!(req.scope_type, scope_type);
    }
}

// ==================== Asset 模型测试 ====================

#[test]
fn test_create_host_request_defaults() {
    let json = r#"{
        "identifier":"host-01",
        "address":"192.168.1.100",
        "group_id":"00000000-0000-0000-0000-000000000001",
        "environment":"production"
    }"#;

    let req: CreateHostRequest = serde_json::from_str(json).unwrap();

    assert_eq!(req.identifier, "host-01");
    assert_eq!(req.address, "192.168.1.100");
    assert_eq!(req.port, 22); // 默认端口
    assert!(req.tags.is_empty()); // 默认空标签
    assert_eq!(req.status, "active"); // 默认状态
}

#[test]
fn test_create_host_request_with_all_fields() {
    let json = r#"{
        "identifier":"web-01",
        "display_name":"Web Server 01",
        "address":"10.0.0.100",
        "port":2222,
        "group_id":"00000000-0000-0000-0000-000000000001",
        "environment":"production",
        "tags":["linux","web"],
        "owner_id":"00000000-0000-0000-0000-000000000002",
        "status":"active",
        "notes":"Main web server",
        "os_type":"Linux",
        "os_version":"Ubuntu 22.04"
    }"#;

    let req: CreateHostRequest = serde_json::from_str(json).unwrap();

    assert_eq!(req.identifier, "web-01");
    assert_eq!(req.port, 2222);
    assert_eq!(req.tags.len(), 2);
    assert_eq!(req.tags[0], "linux");
}

#[test]
fn test_update_host_request_with_version() {
    let json = r#"{
        "display_name":"Updated Name",
        "version":1
    }"#;

    let req: UpdateHostRequest = serde_json::from_str(json).unwrap();

    assert_eq!(req.display_name, Some("Updated Name".to_string()));
    assert_eq!(req.version, 1);
}

#[test]
fn test_host_list_filters() {
    let json = r#"{
        "environment":"production",
        "status":"active",
        "tags":["linux"],
        "search":"web"
    }"#;

    let filters: HostListFilters = serde_json::from_str(json).unwrap();

    assert!(filters.group_id.is_none());
    assert_eq!(filters.environment, Some("production".to_string()));
    assert_eq!(filters.status, Some("active".to_string()));
    assert_eq!(filters.tags, Some(vec!["linux".to_string()]));
    assert_eq!(filters.search, Some("web".to_string()));
}

#[test]
fn test_create_group_request() {
    let parent_id = Uuid::new_v4();

    // 构建 JSON 字符串，使用 serde_json::json! 宏更安全
    let json_value = serde_json::json!({
        "name": "web-servers",
        "description": "Web server group",
        "environment": "production",
        "parent_id": parent_id
    });
    let json = json_value.to_string();
    let req: CreateGroupRequest = serde_json::from_str(&json).unwrap();

    assert_eq!(req.name, "web-servers");
    assert_eq!(req.environment, "production");
    assert!(req.parent_id.is_some());
}

#[test]
fn test_create_group_request_without_parent() {
    let json = r#"{
        "name":"standalone-group",
        "environment":"dev"
    }"#;

    let req: CreateGroupRequest = serde_json::from_str(json).unwrap();

    assert_eq!(req.name, "standalone-group");
    assert!(req.parent_id.is_none());
}

#[test]
fn test_update_group_request_partial() {
    let json = r#"{"description":"Updated description"}"#;
    let req: UpdateGroupRequest = serde_json::from_str(json).unwrap();

    assert_eq!(req.description, Some("Updated description".to_string()));
    assert!(req.name.is_none());
    assert!(req.environment.is_none());
}

// ==================== 模型序列化测试 ====================

#[test]
fn test_user_with_roles_serialization() {
    let user_with_roles = UserWithRoles {
        user: UserResponse {
            id: Uuid::new_v4(),
            username: "admin".to_string(),
            email: Some("admin@example.com".to_string()),
            status: "enabled".to_string(),
            full_name: Some("Admin User".to_string()),
            department: None,
            must_change_password: false,
            created_at: chrono::Utc::now(),
        },
        roles: vec!["admin".to_string(), "editor".to_string()],
        scopes: vec!["users:read".to_string(), "users:write".to_string()],
    };

    let json = serde_json::to_string(&user_with_roles).unwrap();
    let json_obj: serde_json::Value = serde_json::from_str(&json).unwrap();

    assert_eq!(json_obj["username"], "admin");
    assert_eq!(json_obj["roles"].as_array().unwrap().len(), 2);
    assert_eq!(json_obj["scopes"].as_array().unwrap().len(), 2);
}

#[test]
fn test_permission_summary_serialization() {
    let perm = PermissionSummary {
        resource: "users".to_string(),
        action: "write".to_string(),
        description: Some("Can write users".to_string()),
    };

    let json = serde_json::to_string(&perm).unwrap();
    let json_obj: serde_json::Value = serde_json::from_str(&json).unwrap();

    assert_eq!(json_obj["resource"], "users");
    assert_eq!(json_obj["action"], "write");
}

// ==================== UUID 验证测试 ====================

#[test]
fn test_uuid_parsing_in_models() {
    let uuid_str = "00000000-0000-0000-0000-000000000001";
    let parsed = Uuid::parse_str(uuid_str);

    assert!(parsed.is_ok());
    let uuid = parsed.unwrap();
    assert_eq!(uuid.to_string(), uuid_str);
}

#[test]
fn test_invalid_uuid_rejection() {
    let invalid_uuid = "not-a-uuid";
    let parsed = Uuid::parse_str(invalid_uuid);

    assert!(parsed.is_err());
}

#[test]
fn test_model_with_optional_uuid() {
    let valid_uuid = Some(Uuid::new_v4());
    let no_uuid: Option<Uuid> = None;

    assert!(valid_uuid.is_some());
    assert!(no_uuid.is_none());
}

// ==================== 特殊字符测试 ====================

#[test]
fn test_model_with_unicode_characters() {
    let json = r#"{
        "username":"用户名",
        "email":"test@example.com",
        "password":"Test123!",
        "full_name":"张三",
        "department":"工程部"
    }"#;
    let req: CreateUserRequest = serde_json::from_str(json).unwrap();

    assert_eq!(req.username, "用户名");
    assert_eq!(req.full_name, Some("张三".to_string()));
}

#[test]
fn test_model_with_special_characters_in_description() {
    let json = r#"{
        "name":"role-with-special-chars",
        "description":"Role with special chars: @#$%^&*()"
    }"#;
    let req: CreateRoleRequest = serde_json::from_str(json).unwrap();

    assert_eq!(req.description, Some("Role with special chars: @#$%^&*()".to_string()));
}

// ==================== 空值和边界测试 ====================

#[test]
fn test_model_with_empty_string() {
    let json = r#"{"username":"","password":"test"}"#;
    let req: CreateUserRequest = serde_json::from_str(json).unwrap();

    assert_eq!(req.username, "");
    assert!(req.email.is_none());
}

#[test]
fn test_model_with_null_values() {
    let json = r#"{
        "username":"testuser",
        "password":"Test123!",
        "email":null,
        "full_name":null,
        "department":null
    }"#;

    let req: CreateUserRequest = serde_json::from_str(json).unwrap();

    assert_eq!(req.username, "testuser");
    assert!(req.email.is_none());
    assert!(req.full_name.is_none());
    assert!(req.department.is_none());
}
