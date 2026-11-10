//! 审计服务单元测试
//!
//! 测试审计日志记录和查询功能

use ops_service::services::audit_service::{AuditAction, AuditLogParams};
use uuid::Uuid;

#[test]
fn test_audit_action_display() {
    // 测试所有审计操作的字符串表示
    assert_eq!(AuditAction::UserCreate.as_str(), "user.create");
    assert_eq!(AuditAction::UserUpdate.as_str(), "user.update");
    assert_eq!(AuditAction::UserDelete.as_str(), "user.delete");
    assert_eq!(AuditAction::UserLogin.as_str(), "user.login");
    assert_eq!(AuditAction::UserLogout.as_str(), "user.logout");

    assert_eq!(AuditAction::AssetGroupCreate.as_str(), "asset.group.create");
    assert_eq!(AuditAction::HostCreate.as_str(), "asset.host.create");

    assert_eq!(AuditAction::JobCreate.as_str(), "job.create");
    assert_eq!(AuditAction::JobExecute.as_str(), "job.execute");

    assert_eq!(AuditAction::BuildCreate.as_str(), "build.create");
    assert_eq!(AuditAction::ArtifactDownload.as_str(), "artifact.download");

    assert_eq!(AuditAction::RoleCreate.as_str(), "role.create");
    assert_eq!(AuditAction::RoleBindingCreate.as_str(), "role_binding.create");

    assert_eq!(AuditAction::ApprovalCreate.as_str(), "approval.create");
    assert_eq!(AuditAction::ApprovalApprove.as_str(), "approval.approve");
}

#[test]
fn test_audit_action_coverage() {
    // 确保所有审计操作都有对应的字符串表示
    let actions = [
        AuditAction::UserCreate,
        AuditAction::UserUpdate,
        AuditAction::UserDelete,
        AuditAction::UserLogin,
        AuditAction::UserLogout,
        AuditAction::UserPasswordChange,
        AuditAction::AssetGroupCreate,
        AuditAction::AssetGroupUpdate,
        AuditAction::AssetGroupDelete,
        AuditAction::HostCreate,
        AuditAction::HostUpdate,
        AuditAction::HostDelete,
        AuditAction::JobCreate,
        AuditAction::JobCancel,
        AuditAction::JobRetry,
        AuditAction::JobExecute,
        AuditAction::JobOutputView,
        AuditAction::BuildCreate,
        AuditAction::BuildExecute,
        AuditAction::ArtifactDownload,
        AuditAction::RoleCreate,
        AuditAction::RoleUpdate,
        AuditAction::RoleDelete,
        AuditAction::RoleBindingCreate,
        AuditAction::RoleBindingDelete,
        AuditAction::ApprovalCreate,
        AuditAction::ApprovalApprove,
        AuditAction::ApprovalReject,
        AuditAction::ApprovalCancel,
        AuditAction::ApprovalGroupCreate,
        AuditAction::ApprovalGroupUpdate,
        AuditAction::ApprovalGroupDelete,
    ];

    for action in actions {
        let str_repr = action.as_str();
        assert!(!str_repr.is_empty());
        assert!(str_repr.contains('.'));
    }
}

#[test]
fn test_audit_action_categories() {
    // 测试审计操作的分类
    let user_actions = vec![
        AuditAction::UserCreate.as_str(),
        AuditAction::UserUpdate.as_str(),
        AuditAction::UserDelete.as_str(),
        AuditAction::UserLogin.as_str(),
        AuditAction::UserLogout.as_str(),
        AuditAction::UserPasswordChange.as_str(),
    ];

    for action in user_actions {
        assert!(action.starts_with("user."));
    }

    let asset_actions = vec![
        AuditAction::AssetGroupCreate.as_str(),
        AuditAction::HostCreate.as_str(),
        AuditAction::HostDelete.as_str(),
    ];

    for action in asset_actions {
        assert!(action.starts_with("asset."));
    }

    let job_actions = vec![
        AuditAction::JobCreate.as_str(),
        AuditAction::JobExecute.as_str(),
        AuditAction::JobCancel.as_str(),
    ];

    for action in job_actions {
        assert!(action.starts_with("job."));
    }
}

#[test]
fn test_audit_log_params_structure() {
    let subject_id = Uuid::new_v4();
    let resource_id = Uuid::new_v4();

    let params = AuditLogParams {
        subject_id,
        subject_type: "user",
        subject_name: Some("testuser"),
        action: "user.create",
        resource_type: "user",
        resource_id: Some(resource_id),
        resource_name: Some("testuser"),
        changes: Some(serde_json::json!({"field": "value"})),
        changes_summary: Some("Created user"),
        source_ip: Some("127.0.0.1"),
        user_agent: Some("test-agent"),
        trace_id: Some("trace-123"),
        result: "success",
        error_message: None,
    };

    assert_eq!(params.subject_id, subject_id);
    assert_eq!(params.subject_type, "user");
    assert_eq!(params.subject_name, Some("testuser"));
    assert_eq!(params.action, "user.create");
    assert_eq!(params.resource_type, "user");
    assert_eq!(params.resource_id, Some(resource_id));
    assert_eq!(params.result, "success");
    assert!(params.error_message.is_none());
}

#[test]
fn test_audit_log_params_with_error() {
    let params = AuditLogParams {
        subject_id: Uuid::new_v4(),
        subject_type: "user",
        subject_name: None,
        action: "user.delete",
        resource_type: "user",
        resource_id: Some(Uuid::new_v4()),
        resource_name: None,
        changes: None,
        changes_summary: None,
        source_ip: None,
        user_agent: None,
        trace_id: None,
        result: "failure",
        error_message: Some("User not found"),
    };

    assert_eq!(params.result, "failure");
    assert_eq!(params.error_message, Some("User not found"));
}

#[test]
fn test_audit_log_params_minimal() {
    // 测试最小化的审计日志参数
    let params = AuditLogParams {
        subject_id: Uuid::new_v4(),
        subject_type: "system",
        subject_name: None,
        action: "system.startup",
        resource_type: "system",
        resource_id: None,
        resource_name: None,
        changes: None,
        changes_summary: None,
        source_ip: None,
        user_agent: None,
        trace_id: None,
        result: "success",
        error_message: None,
    };

    // 所有必需字段都应该存在
    assert!(!params.subject_id.is_nil());
    assert!(!params.subject_type.is_empty());
    assert!(!params.action.is_empty());
    assert!(!params.resource_type.is_empty());
    assert!(!params.result.is_empty());
}

#[test]
fn test_audit_action_equality() {
    // 测试同一操作的字符串表示一致性
    assert_eq!(AuditAction::UserLogin.as_str(), AuditAction::UserLogin.as_str());
    assert_eq!(AuditAction::JobExecute.as_str(), AuditAction::JobExecute.as_str());

    // 不同操作应该有不同的字符串表示
    assert_ne!(AuditAction::UserLogin.as_str(), AuditAction::UserLogout.as_str());
    assert_ne!(AuditAction::JobCreate.as_str(), AuditAction::JobExecute.as_str());
}

#[test]
fn test_audit_log_params_with_json_changes() {
    let changes = serde_json::json!({
        "old": {"status": "active"},
        "new": {"status": "inactive"},
        "fields": ["status", "updated_at"]
    });

    let params = AuditLogParams {
        subject_id: Uuid::new_v4(),
        subject_type: "user",
        subject_name: Some("admin"),
        action: "user.update",
        resource_type: "user",
        resource_id: Some(Uuid::new_v4()),
        resource_name: Some("admin"),
        changes: Some(changes.clone()),
        changes_summary: Some("Updated user status"),
        source_ip: Some("192.168.1.1"),
        user_agent: Some("Mozilla/5.0"),
        trace_id: Some("trace-abc-123"),
        result: "success",
        error_message: None,
    };

    assert!(params.changes.is_some());
    let changes_value = params.changes.unwrap();
    assert!(changes_value.is_object());
}

#[test]
fn test_audit_action_names_consistency() {
    // 确保审计操作名称遵循点分隔格式
    let all_actions = [
        // 用户相关
        ("user.create", AuditAction::UserCreate),
        ("user.update", AuditAction::UserUpdate),
        ("user.delete", AuditAction::UserDelete),
        ("user.login", AuditAction::UserLogin),
        ("user.logout", AuditAction::UserLogout),
        ("user.password_change", AuditAction::UserPasswordChange),
        // 资产相关
        ("asset.group.create", AuditAction::AssetGroupCreate),
        ("asset.group.update", AuditAction::AssetGroupUpdate),
        ("asset.group.delete", AuditAction::AssetGroupDelete),
        ("asset.host.create", AuditAction::HostCreate),
        ("asset.host.update", AuditAction::HostUpdate),
        ("asset.host.delete", AuditAction::HostDelete),
        // 作业相关
        ("job.create", AuditAction::JobCreate),
        ("job.cancel", AuditAction::JobCancel),
        ("job.retry", AuditAction::JobRetry),
        ("job.execute", AuditAction::JobExecute),
        ("job.output_view", AuditAction::JobOutputView),
        // 构建相关
        ("build.create", AuditAction::BuildCreate),
        ("build.execute", AuditAction::BuildExecute),
        ("artifact.download", AuditAction::ArtifactDownload),
        // 权限相关
        ("role.create", AuditAction::RoleCreate),
        ("role.update", AuditAction::RoleUpdate),
        ("role.delete", AuditAction::RoleDelete),
        ("role_binding.create", AuditAction::RoleBindingCreate),
        ("role_binding.delete", AuditAction::RoleBindingDelete),
        // 审批相关
        ("approval.create", AuditAction::ApprovalCreate),
        ("approval.approve", AuditAction::ApprovalApprove),
        ("approval.reject", AuditAction::ApprovalReject),
        ("approval.cancel", AuditAction::ApprovalCancel),
        ("approval_group.create", AuditAction::ApprovalGroupCreate),
        ("approval_group.update", AuditAction::ApprovalGroupUpdate),
        ("approval_group.delete", AuditAction::ApprovalGroupDelete),
    ];

    for (expected, action) in all_actions {
        assert_eq!(action.as_str(), expected);
    }
}

#[test]
fn test_audit_log_params_unicode_support() {
    // 测试 Unicode 字符支持
    let params = AuditLogParams {
        subject_id: Uuid::new_v4(),
        subject_type: "user",
        subject_name: Some("用户名🔒"),
        action: "user.create",
        resource_type: "user",
        resource_id: Some(Uuid::new_v4()),
        resource_name: Some("用户张三"),
        changes: None,
        changes_summary: Some("创建用户 👤"),
        source_ip: Some("127.0.0.1"),
        user_agent: Some("测试浏览器"),
        trace_id: Some("追踪-id-123"),
        result: "success",
        error_message: None,
    };

    assert_eq!(params.subject_name, Some("用户名🔒"));
    assert_eq!(params.changes_summary, Some("创建用户 👤"));
}

#[test]
fn test_audit_action_variety() {
    // 确保我们有足够多样化的审计操作
    let user_actions_count = 6; // UserCreate, UserUpdate, UserDelete, UserLogin, UserLogout, UserPasswordChange
    let asset_actions_count = 6; // AssetGroupCreate, Update, Delete, HostCreate, Update, Delete
    let job_actions_count = 5; // JobCreate, Cancel, Retry, Execute, OutputView
    let build_actions_count = 3; // BuildCreate, BuildExecute, ArtifactDownload
    let role_actions_count = 5; // RoleCreate, Update, Delete, RoleBindingCreate, Delete
    let approval_actions_count = 7; // ApprovalCreate, Approve, Reject, Cancel, ApprovalGroupCreate, Update, Delete

    let total_expected = user_actions_count
        + asset_actions_count
        + job_actions_count
        + build_actions_count
        + role_actions_count
        + approval_actions_count;

    // 验证我们有正确数量的审计操作
    let defined_actions = [
        AuditAction::UserCreate,
        AuditAction::UserUpdate,
        AuditAction::UserDelete,
        AuditAction::UserLogin,
        AuditAction::UserLogout,
        AuditAction::UserPasswordChange,
        AuditAction::AssetGroupCreate,
        AuditAction::AssetGroupUpdate,
        AuditAction::AssetGroupDelete,
        AuditAction::HostCreate,
        AuditAction::HostUpdate,
        AuditAction::HostDelete,
        AuditAction::JobCreate,
        AuditAction::JobCancel,
        AuditAction::JobRetry,
        AuditAction::JobExecute,
        AuditAction::JobOutputView,
        AuditAction::BuildCreate,
        AuditAction::BuildExecute,
        AuditAction::ArtifactDownload,
        AuditAction::RoleCreate,
        AuditAction::RoleUpdate,
        AuditAction::RoleDelete,
        AuditAction::RoleBindingCreate,
        AuditAction::RoleBindingDelete,
        AuditAction::ApprovalCreate,
        AuditAction::ApprovalApprove,
        AuditAction::ApprovalReject,
        AuditAction::ApprovalCancel,
        AuditAction::ApprovalGroupCreate,
        AuditAction::ApprovalGroupUpdate,
        AuditAction::ApprovalGroupDelete,
    ];

    assert_eq!(defined_actions.len() as i32, total_expected);
}

// 注意：AuditService 的实际功能测试需要数据库连接，
// 这些测试应该放在 integration tests 中
// 这里只测试不依赖数据库的结构性测试
