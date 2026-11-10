//! SSH执行模块
//! P2 阶段：SSH连接管理和命令执行

pub mod executor;

// 重新导出 common 的类型
pub use common::{execution::ExecutionResult, ssh::*};

// 重新导出执行器
pub use executor::SSHClient;
