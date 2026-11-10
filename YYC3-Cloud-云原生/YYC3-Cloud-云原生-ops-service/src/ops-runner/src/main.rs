//! ops-runner - 构建作业执行代理
//!
//! ops-runner 是一个独立的代理程序，运行在构建机器上，负责执行构建作业。
//! 它通过 RabbitMQ 接收来自控制面的构建任务，执行构建步骤，并将结果回传。

mod client;
mod config;
mod docker;
mod executor;
mod messages;
mod publisher;
mod worker;

use anyhow::{Context, Result};
use clap::Parser;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tokio::time;
use tracing::{error, info, warn};
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

use client::ControlPlaneClient;
use config::RunnerConfig;
use worker::TaskWorker;

/// ops-runner - 构建作业执行代理
#[derive(Parser, Debug)]
#[command(name = "ops-runner")]
#[command(version = env!("CARGO_PKG_VERSION"))]
#[command(author = "ops-system")]
#[command(about = "Build job execution agent for ops-system", long_about = None)]
struct Args {
    /// 配置文件路径（可选，未指定时从环境变量读取）
    #[arg(short, long)]
    config: Option<String>,

    /// 详细模式
    #[arg(short, long)]
    verbose: bool,
}

fn print_version() {
    println!("ops-runner {}", env!("CARGO_PKG_VERSION"));
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();

    // 处理 --version 或 -V
    if std::env::args().any(|a| a == "--version" || a == "-V") {
        print_version();
        return Ok(());
    }

    // 初始化日志
    let log_level = if args.verbose {
        "debug".to_string()
    } else {
        std::env::var("RUST_LOG").unwrap_or_else(|_| "info".to_string())
    };

    tracing_subscriber::registry()
        .with(fmt::layer())
        .with(EnvFilter::new(log_level))
        .init();

    info!("ops-runner starting...");
    print_version();

    // 加载配置
    let config = if let Some(path) = &args.config {
        info!("Loading config from file: {}", path);
        let content = std::fs::read_to_string(path)
            .context(format!("Failed to read config file: {}", path))?;
        match path.ends_with(".json") {
            true => serde_json::from_str(&content).context("Failed to parse JSON config")?,
            false => toml::from_str(&content).context("Failed to parse TOML config")?,
        }
    } else {
        RunnerConfig::from_env()?
    };

    info!("Runner name: {}", config.runner.name);
    info!("Capabilities: {:?}", config.runner.capabilities);
    info!("Control plane: {}", config.control_plane.api_url);

    // 创建控制面客户端
    let mut client = ControlPlaneClient::new(config.clone());

    // 注册 Runner
    let mut config = config;
    let _runner_id = loop {
        match client.register().await {
            Ok(id) => {
                info!("Registered successfully with ID: {}", id);
                // 如果控制面返回了 Docker 配置，应用到本地配置
                if let Some(docker_cfg) = client.get_docker_config().await {
                    info!("Applying Docker configuration from control plane");
                    config.apply_docker_config(docker_cfg);
                }
                break id;
            }
            Err(e) => {
                error!("Registration failed: {}", e);
                warn!("Retrying in 10 seconds...");
                time::sleep(Duration::from_secs(10)).await;
            }
        }
    };

    // 获取心跳间隔
    let heartbeat_interval = config.heartbeat_interval();

    // 共享当前作业计数
    let current_jobs = Arc::new(AtomicUsize::new(0));

    // 配置更新通知通道
    let _config_update_rx = client.config_update_receiver();

    // 启动心跳任务
    let config_for_heartbeat = config.clone();
    let current_jobs_hb = current_jobs.clone();
    let heartbeat_handle = tokio::spawn(async move {
        let mut client = ControlPlaneClient::new(config_for_heartbeat);
        *client.current_jobs_mut() = current_jobs_hb;
        let mut interval = time::interval(heartbeat_interval);

        loop {
            interval.tick().await;
            match client.send_heartbeat().await {
                Ok(config_updated) => {
                    if config_updated {
                        info!("Docker configuration was updated from heartbeat");
                    }
                }
                Err(e) => {
                    error!("Heartbeat failed: {}", e);
                }
            }
        }
    });

    // 启动任务 Worker
    let config_arc = Arc::new(config);
    let worker_handle = tokio::spawn(async move {
        loop {
            match TaskWorker::new(config_arc.clone()).await {
                Ok(worker) => {
                    info!("Task worker started");

                    if let Err(e) = worker.run().await {
                        error!("Worker error: {}", e);
                    }

                    warn!("Worker exited, restarting in 5 seconds...");
                    time::sleep(Duration::from_secs(5)).await;
                }
                Err(e) => {
                    error!("Failed to create worker: {}", e);
                    warn!("Retrying in 10 seconds...");
                    time::sleep(Duration::from_secs(10)).await;
                }
            }
        }
    });

    info!("ops-runner is running");

    // 等待任务完成（实际上会一直运行）
    tokio::select! {
        _ = heartbeat_handle => {
            error!("Heartbeat task exited unexpectedly");
        }
        _ = worker_handle => {
            error!("Worker task exited unexpectedly");
        }
    }

    Ok(())
}
