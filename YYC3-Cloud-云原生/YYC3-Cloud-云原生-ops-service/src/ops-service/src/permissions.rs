//! 统一权限常量定义
//!
//! 所有权限必须在此处定义并与数据库 seed 保持一致。
//! 格式: `resource.action`
//!
//! 权限分类:
//! - 普通资源权限: `resource.read`, `resource.write`
//! - 敏感扩展权限: `resource.output_detail`, `resource.download`
//! - 全局/跨作用域权限: `resource.read_all`, `resource.admin`

/// 资产权限
pub mod asset {
    pub const READ: &str = "asset.read";
    pub const WRITE: &str = "asset.write";
}

/// 作业权限
pub mod job {
    pub const READ: &str = "job.read";
    pub const EXECUTE: &str = "job.execute";
    pub const APPROVE: &str = "job.approve";
    pub const OUTPUT_DETAIL: &str = "job.output_detail";
    pub const READ_ALL: &str = "job.read_all";
}

/// 审批权限
pub mod approval {
    pub const READ: &str = "approval.read";
    pub const APPROVE: &str = "approval.approve";
}

/// 构建权限
pub mod build {
    pub const READ: &str = "build.read";
    pub const EXECUTE: &str = "build.execute";
    pub const OUTPUT_DETAIL: &str = "build.output_detail";
}

/// Runner 权限
pub mod runner {
    pub const READ: &str = "runner.read";
    pub const WRITE: &str = "runner.write";
}

/// 产物权限
pub mod artifact {
    pub const READ: &str = "artifact.read";
    pub const WRITE: &str = "artifact.write";
    pub const DOWNLOAD: &str = "artifact.download";
}

/// 审计权限
pub mod audit {
    pub const READ: &str = "audit.read";
    pub const ADMIN: &str = "audit.admin";
}

/// 用户管理权限
pub mod user {
    pub const READ: &str = "user.read";
    pub const WRITE: &str = "user.write";
}

/// 角色管理权限
pub mod role {
    pub const READ: &str = "role.read";
    pub const WRITE: &str = "role.write";
}

/// 角色绑定权限
pub mod role_binding {
    pub const WRITE: &str = "role_binding.write";
}

/// 系统管理权限
pub mod system {
    pub const ADMIN: &str = "system.admin";
}
