//! 数据模型模块
//! P0 阶段暂无业务模型，P1 阶段添加用户、资产等模型
//! P2 阶段添加作业系统与构建系统模型
//! P3 阶段添加审批流与实时能力模型

pub mod approval;
pub mod asset;
pub mod audit;
pub mod auth;
pub mod build;
pub mod job;
pub mod role;
pub mod runner_config;
pub mod user;
