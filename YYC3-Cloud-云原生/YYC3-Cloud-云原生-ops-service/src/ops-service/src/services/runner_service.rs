//! Runner 调度服务 (P2.1)
//!
//! 负责根据构建类型和能力标签选择最合适的 Runner

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use tracing::{debug, info, warn};
use uuid::Uuid;

/// Runner 调度服务
pub struct RunnerScheduler {
    db: PgPool,
}

/// Runner 候选者信息
#[derive(Debug, Clone)]
struct RunnerCandidate {
    id: Uuid,
    name: String,
    #[allow(dead_code)]
    capabilities: Vec<String>,
    max_concurrent_jobs: i32,
    #[allow(dead_code)]
    current_jobs: i32,
    #[allow(dead_code)]
    status: String,
    /// 负载得分 (越低越好)
    load_score: f32,
}

/// 调度结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduleResult {
    /// 选中的 Runner ID
    pub runner_id: Uuid,
    /// Runner 名称
    pub runner_name: String,
    /// 路由键
    pub routing_key: String,
}

impl RunnerScheduler {
    /// 创建新的调度服务
    pub fn new(db: PgPool) -> Self {
        Self { db }
    }

    /// 调度 Runner 执行构建任务
    ///
    /// # 参数
    /// - `build_type`: 构建类型 (node, java, rust, frontend 等)
    /// - `required_capabilities`: 必需的能力标签
    ///
    /// # 返回
    /// 选中的 Runner 信息，如果没有可用的 Runner 则返回错误
    pub async fn schedule_build(
        &self,
        build_type: &str,
        required_capabilities: &[String],
    ) -> Result<ScheduleResult> {
        info!(
            build_type = %build_type,
            capabilities = ?required_capabilities,
            "Scheduling build task"
        );

        // 查找所有可用的 Runner
        let candidates = self
            .find_candidates(build_type, required_capabilities)
            .await?;

        if candidates.is_empty() {
            warn!(
                build_type = %build_type,
                "No available runners found"
            );
            return Err(anyhow::anyhow!("No available runners for build type: {}", build_type));
        }

        // 选择最佳 Runner
        let selected = self.select_best_runner(&candidates)?;

        // 生成定向路由键：build.<type>.<runner_name>
        // 这样只有目标 runner 会收到此任务
        let routing_key = format!("build.{}.{}", build_type, selected.name);

        info!(
            runner_id = %selected.id,
            runner_name = %selected.name,
            routing_key = %routing_key,
            load_score = %selected.load_score,
            "Runner selected for build"
        );

        Ok(ScheduleResult {
            runner_id: selected.id,
            runner_name: selected.name.clone(),
            routing_key,
        })
    }

    /// 查找所有符合条件且可用的 Runner 候选者
    async fn find_candidates(
        &self,
        build_type: &str,
        required_capabilities: &[String],
    ) -> Result<Vec<RunnerCandidate>> {
        // 将构建类型也作为必需的能力标签之一
        let mut all_required = required_capabilities.to_vec();
        all_required.push(build_type.to_string());
        all_required.push("general".to_string()); // 通用能力

        // 查询状态为 active 的 Runner
        // 使用 JSONB 包含查询能力标签
        let rows = sqlx::query(
            "SELECT id, name, capabilities, max_concurrent_jobs, current_jobs, status
             FROM runners
             WHERE status = 'active'
             AND last_heartbeat > NOW() - INTERVAL '2 minutes'",
        )
        .fetch_all(&self.db)
        .await
        .context("Failed to query runners")?;

        let mut candidates = Vec::new();

        for row in rows {
            let id: Uuid = row.get("id");
            let name: String = row.get("name");
            let capabilities_json: serde_json::Value = row.get("capabilities");
            let capabilities: Vec<String> =
                serde_json::from_value(capabilities_json).unwrap_or_default();
            let max_concurrent_jobs: i32 = row.get("max_concurrent_jobs");
            let current_jobs: i32 = row.get("current_jobs");

            // 检查是否有至少一个匹配的能力标签
            let has_matching_capability = all_required.iter().any(|req| {
                capabilities.contains(req) || capabilities.contains(&"general".to_string())
            });

            if !has_matching_capability {
                debug!(
                    runner_id = %id,
                    runner_name = %name,
                    capabilities = ?capabilities,
                    "Runner skipped: no matching capabilities"
                );
                continue;
            }

            // 检查是否还有可用容量
            if current_jobs >= max_concurrent_jobs {
                debug!(
                    runner_id = %id,
                    runner_name = %name,
                    current_jobs = current_jobs,
                    max_concurrent_jobs = max_concurrent_jobs,
                    "Runner skipped: at capacity"
                );
                continue;
            }

            // 计算负载得分
            let load_score = Self::calculate_load_score(current_jobs, max_concurrent_jobs);

            candidates.push(RunnerCandidate {
                id,
                name,
                capabilities,
                max_concurrent_jobs,
                current_jobs,
                status: "active".to_string(),
                load_score,
            });
        }

        debug!(
            total_candidates = candidates.len(),
            build_type = %build_type,
            "Found runner candidates"
        );

        Ok(candidates)
    }

    /// 从候选者中选择最佳 Runner
    ///
    /// 选择策略：
    /// 1. 优先选择负载较低的 Runner
    /// 2. 如果负载相同，优先选择并发上限较高的 Runner
    /// 3. 如果仍然相同，按名称字典序选择（保证一致性）
    fn select_best_runner(&self, candidates: &[RunnerCandidate]) -> Result<RunnerCandidate> {
        // 按负载得分升序排序（负载越低越好）
        let mut sorted = candidates.to_vec();
        sorted.sort_by(|a, b| {
            // 首先按负载得分排序
            match a
                .load_score
                .partial_cmp(&b.load_score)
                .unwrap_or(std::cmp::Ordering::Equal)
            {
                std::cmp::Ordering::Equal => {
                    // 负载相同时，按最大并发数降序排序
                    // 选择容量更大的 Runner
                    b.max_concurrent_jobs
                        .cmp(&a.max_concurrent_jobs)
                        .then_with(|| a.name.cmp(&b.name))
                }
                other => other,
            }
        });

        sorted
            .into_iter()
            .next()
            .ok_or_else(|| anyhow::anyhow!("No runner candidates available"))
    }

    /// 计算负载得分
    ///
    /// 得分 = 当前任务数 / 最大并发数
    /// 值越低表示负载越轻
    fn calculate_load_score(current_jobs: i32, max_concurrent_jobs: i32) -> f32 {
        if max_concurrent_jobs <= 0 {
            return 1.0; // 满载
        }
        current_jobs as f32 / max_concurrent_jobs as f32
    }

    /// 根据名称获取 Runner（用于直接派发）
    pub async fn get_runner_by_name(&self, name: &str) -> Result<Option<RunnerInfo>> {
        let row = sqlx::query(
            "SELECT id, name, capabilities, status, max_concurrent_jobs, current_jobs
             FROM runners
             WHERE name = $1 AND status = 'active'",
        )
        .bind(name)
        .fetch_optional(&self.db)
        .await
        .context("Failed to query runner by name")?;

        if let Some(row) = row {
            let capabilities_json: serde_json::Value = row.get("capabilities");
            let capabilities: Vec<String> =
                serde_json::from_value(capabilities_json).unwrap_or_default();

            Ok(Some(RunnerInfo {
                id: row.get("id"),
                name: row.get("name"),
                capabilities,
                status: row.get("status"),
                max_concurrent_jobs: row.get("max_concurrent_jobs"),
                current_jobs: row.get("current_jobs"),
            }))
        } else {
            Ok(None)
        }
    }

    /// 增加 Runner 的当前任务计数
    pub async fn increment_current_jobs(&self, runner_id: Uuid) -> Result<()> {
        sqlx::query("UPDATE runners SET current_jobs = current_jobs + 1 WHERE id = $1")
            .bind(runner_id)
            .execute(&self.db)
            .await
            .context("Failed to increment current jobs")?;
        Ok(())
    }

    /// 减少 Runner 的当前任务计数
    pub async fn decrement_current_jobs(&self, runner_id: Uuid) -> Result<()> {
        sqlx::query(
            "UPDATE runners SET current_jobs = GREATEST(0, current_jobs - 1) WHERE id = $1",
        )
        .bind(runner_id)
        .execute(&self.db)
        .await
        .context("Failed to decrement current jobs")?;
        Ok(())
    }

    /// 获取所有活跃 Runner 的状态摘要
    pub async fn get_active_runners_summary(&self) -> Result<Vec<RunnerSummary>> {
        let rows = sqlx::query(
            "SELECT id, name, capabilities, status, max_concurrent_jobs, current_jobs,
                    COALESCE(last_heartbeat > NOW() - INTERVAL '2 minutes', false) as is_healthy
             FROM runners
             WHERE status IN ('active', 'maintenance')
             ORDER BY name",
        )
        .fetch_all(&self.db)
        .await
        .context("Failed to query runners summary")?;

        let mut summaries = Vec::new();
        for row in rows {
            let capabilities_json: serde_json::Value = row.get("capabilities");
            let capabilities: Vec<String> =
                serde_json::from_value(capabilities_json).unwrap_or_default();

            summaries.push(RunnerSummary {
                id: row.get("id"),
                name: row.get("name"),
                capabilities,
                status: row.get("status"),
                max_concurrent_jobs: row.get("max_concurrent_jobs"),
                current_jobs: row.get("current_jobs"),
                is_healthy: row.get("is_healthy"),
                load_percent: Self::calculate_load_percent(
                    row.get("current_jobs"),
                    row.get("max_concurrent_jobs"),
                ),
            });
        }

        Ok(summaries)
    }

    fn calculate_load_percent(current_jobs: i32, max_concurrent_jobs: i32) -> i32 {
        if max_concurrent_jobs <= 0 {
            return 100;
        }
        ((current_jobs as f32 / max_concurrent_jobs as f32) * 100.0) as i32
    }
}

/// Runner 信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunnerInfo {
    pub id: Uuid,
    pub name: String,
    pub capabilities: Vec<String>,
    pub status: String,
    pub max_concurrent_jobs: i32,
    pub current_jobs: i32,
}

/// Runner 状态摘要
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunnerSummary {
    pub id: Uuid,
    pub name: String,
    pub capabilities: Vec<String>,
    pub status: String,
    pub max_concurrent_jobs: i32,
    pub current_jobs: i32,
    pub is_healthy: bool,
    pub load_percent: i32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_load_score() {
        // 空闲
        assert_eq!(RunnerScheduler::calculate_load_score(0, 10), 0.0);
        // 半载
        assert_eq!(RunnerScheduler::calculate_load_score(5, 10), 0.5);
        // 满载
        assert_eq!(RunnerScheduler::calculate_load_score(10, 10), 1.0);
    }

    #[tokio::test]
    async fn test_select_best_runner() {
        let candidates = vec![
            RunnerCandidate {
                id: Uuid::new_v4(),
                name: "runner-1".to_string(),
                capabilities: vec!["node".to_string()],
                max_concurrent_jobs: 5,
                current_jobs: 2,
                status: "active".to_string(),
                load_score: 0.4,
            },
            RunnerCandidate {
                id: Uuid::new_v4(),
                name: "runner-2".to_string(),
                capabilities: vec!["node".to_string()],
                max_concurrent_jobs: 10,
                current_jobs: 3,
                status: "active".to_string(),
                load_score: 0.3,
            },
        ];

        let scheduler = RunnerScheduler {
            db: sqlx::PgPool::connect_lazy("postgres://localhost/postgres").unwrap(),
        };

        // 应该选择 runner-2，因为负载更低
        let selected = scheduler.select_best_runner(&candidates).unwrap();
        assert_eq!(selected.name, "runner-2");
    }
}
