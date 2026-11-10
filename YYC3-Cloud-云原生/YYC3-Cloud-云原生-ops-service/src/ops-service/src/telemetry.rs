//! 日志与追踪系统
//! 初始化结构化日志和指标收集

use crate::config::AppConfig;
use metrics_exporter_prometheus::{PrometheusBuilder, PrometheusHandle};
use std::sync::OnceLock;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter, Layer};

static PROMETHEUS_HANDLE: OnceLock<PrometheusHandle> = OnceLock::new();

/// 初始化日志与追踪系统
pub fn init_telemetry(config: &AppConfig) {
    // 从环境变量构建过滤器
    let env_filter =
        EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new(&config.logging.level));

    // 根据配置选择日志格式
    let log_layer = match config.logging.format.to_lowercase().as_str() {
        "json" => {
            // JSON 格式（生产环境）
            tracing_subscriber::fmt::layer()
                .json()
                .with_target(false)
                .with_span_events(tracing_subscriber::fmt::format::FmtSpan::CLOSE)
                .boxed()
        }
        "pretty" => {
            // 美化格式（开发环境）
            tracing_subscriber::fmt::layer()
                .pretty()
                .with_target(false)
                .boxed()
        }
        _ => {
            // 默认格式
            tracing_subscriber::fmt::layer().with_target(false).boxed()
        }
    };

    // 初始化 subscriber
    tracing_subscriber::registry()
        .with(env_filter)
        .with(log_layer)
        .init();

    tracing::info!(
        version = env!("CARGO_PKG_VERSION"),
        level = %config.logging.level,
        format = %config.logging.format,
        "Telemetry initialized"
    );
}

/// 初始化指标收集器
pub fn init_metrics() {
    let builder = PrometheusBuilder::new();

    match builder.install_recorder() {
        Ok(handle) => {
            let _ = PROMETHEUS_HANDLE.set(handle);
            tracing::debug!("Metrics initialized");
        }
        Err(e) => {
            tracing::warn!(error = %e, "Failed to initialize Prometheus metrics recorder");
        }
    }
}

pub fn prometheus_handle() -> Option<&'static PrometheusHandle> {
    PROMETHEUS_HANDLE.get()
}
