//! 构建任务执行引擎

use anyhow::{Context, Result};
use chrono::Utc;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::OnceCell;
use tracing::{error, info, warn};
use uuid::Uuid;

use crate::config::RunnerConfig;
use crate::docker::DockerExecutor;
use crate::messages::*;
use crate::publisher::{ArtifactStorage, MessagePublisher};

/// 工作空间管理器
pub struct WorkspaceManager {
    base_dir: PathBuf,
    cleanup_policy: CleanupPolicy,
    /// 最大工作空间大小（MB）
    max_size_mb: Option<usize>,
}

/// 工作空间清理策略
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CleanupPolicy {
    /// 执行后立即清理
    Immediate,
    /// 保留一段时间后清理（秒）
    AfterDuration(u64),
    /// 保留最近 N 个
    RetainRecent(usize),
    /// 手动清理
    Manual,
}

impl WorkspaceManager {
    /// 创建新的工作空间管理器
    #[allow(dead_code)]
    pub fn new(base_dir: String, retain_count: usize, max_size_mb: Option<usize>) -> Result<Self> {
        let base_dir = PathBuf::from(base_dir);
        fs::create_dir_all(&base_dir).context("Failed to create workspace base directory")?;

        Ok(Self {
            base_dir,
            cleanup_policy: CleanupPolicy::RetainRecent(retain_count),
            max_size_mb,
        })
    }

    /// 从配置创建
    pub fn from_config(config: &RunnerConfig) -> Result<Self> {
        let retain_count = std::env::var("WORKSPACE_RETAIN_COUNT")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(5);

        let max_size_mb = std::env::var("WORKSPACE_MAX_SIZE_MB")
            .ok()
            .and_then(|v| v.parse().ok());

        // 从环境变量读取清理策略
        let cleanup_policy = match std::env::var("WORKSPACE_CLEANUP_POLICY").as_deref() {
            Ok("immediate") => CleanupPolicy::Immediate,
            Ok("manual") => CleanupPolicy::Manual,
            Ok(duration) => {
                // 尝试解析为秒数
                if let Ok(secs) = duration.parse::<u64>() {
                    CleanupPolicy::AfterDuration(secs)
                } else {
                    CleanupPolicy::RetainRecent(retain_count)
                }
            }
            _ => CleanupPolicy::RetainRecent(retain_count),
        };

        Ok(Self {
            base_dir: PathBuf::from(&config.execution.workspace_base_dir),
            cleanup_policy,
            max_size_mb,
        })
    }

    /// 设置清理策略
    #[allow(dead_code)]
    pub fn set_cleanup_policy(&mut self, policy: CleanupPolicy) {
        self.cleanup_policy = policy;
    }

    /// 获取当前清理策略
    #[allow(dead_code)]
    pub fn cleanup_policy(&self) -> CleanupPolicy {
        self.cleanup_policy
    }

    /// 创建新的工作空间
    pub fn create_workspace(&self, job_id: Uuid, task_id: Uuid) -> Result<PathBuf> {
        let workspace_name = format!("{}_{}", job_id, task_id);
        let workspace_path = self.base_dir.join(&workspace_name);

        fs::create_dir_all(&workspace_path).context("Failed to create workspace directory")?;

        info!("Created workspace: {:?}", workspace_path);
        Ok(workspace_path)
    }

    /// 清理指定工作空间（根据策略决定是否清理）
    pub fn cleanup_workspace(&self, workspace: &Path) -> Result<()> {
        if !workspace.exists() {
            return Ok(());
        }

        // 根据清理策略决定是否执行清理
        match self.cleanup_policy {
            CleanupPolicy::Manual => {
                info!("Cleanup policy is Manual, skipping workspace cleanup: {:?}", workspace);
                return Ok(());
            }
            CleanupPolicy::Immediate => {
                // 立即清理
            }
            CleanupPolicy::AfterDuration(_) | CleanupPolicy::RetainRecent(_) => {
                // 这些策略由 cleanup_old_workspaces 处理
                return Ok(());
            }
        }

        self.force_cleanup_workspace(workspace)
    }

    /// 强制清理指定工作空间（忽略策略）
    pub fn force_cleanup_workspace(&self, workspace: &Path) -> Result<()> {
        if !workspace.exists() {
            return Ok(());
        }

        // 检查大小限制
        if let Some(max_mb) = self.max_size_mb {
            if let Ok(size_mb) = self.get_workspace_size_mb(workspace) {
                if size_mb > max_mb as u64 {
                    warn!(
                        "Workspace exceeds size limit: {} MB > {} MB, forcing cleanup",
                        size_mb, max_mb
                    );
                    // 继续清理
                } else {
                    info!("Workspace within size limit, keeping: {:?}", workspace);
                    return Ok(());
                }
            }
        }

        // 尝试多次清理，处理文件占用问题
        for attempt in 1..=3 {
            match fs::remove_dir_all(workspace) {
                Ok(_) => {
                    info!("Cleaned up workspace: {:?}", workspace);
                    return Ok(());
                }
                Err(e) if attempt < 3 => {
                    warn!(
                        "Cleanup attempt {} failed for {:?}: {}, retrying...",
                        attempt, workspace, e
                    );
                    std::thread::sleep(Duration::from_millis(500));
                }
                Err(e) => {
                    warn!("Failed to cleanup workspace {:?}: {}", workspace, e);
                    return Err(e.into());
                }
            }
        }

        Ok(())
    }

    /// 清理旧工作空间（根据当前策略）
    pub fn cleanup_old_workspaces(&self) -> Result<()> {
        let entries: Vec<_> = fs::read_dir(&self.base_dir)
            .context("Failed to read workspace directory")?
            .filter_map(|e| e.ok())
            .filter(|e| {
                e.path().is_dir()
                    && e.path()
                        .file_name()
                        .and_then(|n| n.to_str())
                        .map(|n| n.contains('_'))
                        .unwrap_or(false)
            })
            .collect();

        match self.cleanup_policy {
            CleanupPolicy::Immediate => {
                // Immediate 策略在创建工作空间后立即清理，这里不做处理
                Ok(())
            }
            CleanupPolicy::Manual => {
                // 手动清理策略，不自动清理
                Ok(())
            }
            CleanupPolicy::AfterDuration(duration_secs) => {
                // 清理超过指定时间的工作空间
                let cutoff_time = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs()
                    - duration_secs;

                let mut cleaned = 0;
                for entry in &entries {
                    if let Ok(metadata) = entry.metadata() {
                        if let Ok(modified) = metadata.modified() {
                            let modified_secs = modified
                                .duration_since(std::time::UNIX_EPOCH)
                                .unwrap()
                                .as_secs();
                            if modified_secs < cutoff_time {
                                if let Err(e) = self.force_cleanup_workspace(&entry.path()) {
                                    warn!(
                                        "Failed to cleanup old workspace {:?}: {}",
                                        entry.path(),
                                        e
                                    );
                                } else {
                                    cleaned += 1;
                                }
                            }
                        }
                    }
                }
                info!("Cleaned {} workspaces older than {}s", cleaned, duration_secs);
                Ok(())
            }
            CleanupPolicy::RetainRecent(retain) => {
                if entries.len() <= retain {
                    return Ok(());
                }

                // 按修改时间排序
                let mut entries_with_time: Vec<_> = entries
                    .iter()
                    .filter_map(|e| {
                        e.metadata()
                            .ok()
                            .and_then(|m| m.modified().ok())
                            .map(|t| (e, t))
                    })
                    .collect();

                entries_with_time.sort_by(|a, b| b.1.cmp(&a.1));

                // 删除旧的工作空间
                let mut cleaned = 0;
                for (entry, _) in entries_with_time.iter().skip(retain) {
                    let path = entry.path();
                    if let Err(e) = self.force_cleanup_workspace(&path) {
                        warn!("Failed to cleanup old workspace {:?}: {}", path, e);
                    } else {
                        cleaned += 1;
                    }
                }

                info!("Cleaned {} old workspaces, retained {} most recent", cleaned, retain);
                Ok(())
            }
        }
    }

    /// 获取工作空间大小（MB）
    pub fn get_workspace_size_mb(&self, workspace: &Path) -> Result<u64> {
        let total_size = self.dir_size(workspace)?;
        Ok(total_size / 1024 / 1024)
    }

    /// 计算目录大小（字节）
    fn dir_size(&self, path: &Path) -> Result<u64> {
        let mut total = 0;
        if path.is_dir() {
            for entry in fs::read_dir(path)? {
                let entry = entry?;
                let entry_path = entry.path();
                if entry_path.is_dir() {
                    total += self.dir_size(&entry_path)?;
                } else {
                    total += entry.metadata()?.len();
                }
            }
        } else {
            total = fs::metadata(path)?.len();
        }
        Ok(total)
    }

    /// 清理所有工作空间（紧急情况）
    #[allow(dead_code)]
    pub fn cleanup_all(&self) -> Result<()> {
        let entries: Vec<_> = fs::read_dir(&self.base_dir)
            .context("Failed to read workspace directory")?
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .collect();

        let mut cleaned = 0;
        for path in entries {
            if path.is_dir() {
                if let Err(e) = self.force_cleanup_workspace(&path) {
                    warn!("Failed to cleanup {:?}: {}", path, e);
                } else {
                    cleaned += 1;
                }
            }
        }

        info!("Cleaned up all {} workspaces", cleaned);
        Ok(())
    }
}

/// 构建执行引擎
pub struct BuildExecutor {
    config: Arc<RunnerConfig>,
    workspace_manager: WorkspaceManager,
    artifact_storage: Option<ArtifactStorage>,
    docker_executor: OnceCell<DockerExecutor>,
}

impl BuildExecutor {
    /// 创建新的执行引擎
    pub fn new(config: Arc<RunnerConfig>) -> Result<Self> {
        let workspace_manager = WorkspaceManager::from_config(&config)?;

        // 初始化产物存储
        let artifact_storage = match ArtifactStorage::from_env() {
            Ok(storage) => {
                info!("Artifact storage initialized: type={}", storage.storage_type);
                Some(storage)
            }
            Err(e) => {
                warn!("Failed to initialize artifact storage: {}, artifacts will be local only", e);
                None
            }
        };

        // 启动时清理旧工作空间
        if let Err(e) = workspace_manager.cleanup_old_workspaces() {
            warn!("Failed to cleanup old workspaces on startup: {}", e);
        }

        Ok(Self {
            config,
            workspace_manager,
            artifact_storage,
            docker_executor: OnceCell::new(),
        })
    }

    async fn try_get_docker_executor(&self) -> Option<&DockerExecutor> {
        if !self.config.runner.docker_supported {
            return None;
        }

        if !self.config.execution.is_docker_enabled() {
            return None;
        }

        let docker_cfg = self.config.execution.docker_config()?;

        let docker_cfg = docker_cfg.clone();
        match self
            .docker_executor
            .get_or_try_init(|| async { DockerExecutor::new(docker_cfg).await })
            .await
        {
            Ok(executor) => {
                if executor.is_available() {
                    Some(executor)
                } else {
                    None
                }
            }
            Err(e) => {
                warn!("Docker executor initialization failed: {}", e);
                None
            }
        }
    }

    /// 清理资源（用于关闭时调用）
    #[allow(dead_code)]
    pub async fn cleanup(&self) -> Result<()> {
        info!("Starting executor cleanup...");

        // 清理 Docker 容器
        if let Some(executor) = self.docker_executor.get() {
            if let Err(e) = executor.cleanup_containers().await {
                warn!("Failed to cleanup Docker containers: {}", e);
            }
        }

        // 清理旧工作空间
        if let Err(e) = self.workspace_manager.cleanup_old_workspaces() {
            warn!("Failed to cleanup old workspaces: {}", e);
        }

        info!("Executor cleanup completed");
        Ok(())
    }

    /// 执行构建任务
    pub async fn execute(
        &self,
        task: BuildTaskMessage,
        publisher: &MessagePublisher,
    ) -> Result<()> {
        info!("Starting build execution: job={}, task={}", task.job_id, task.task_id);

        // 发送接收状态
        publisher
            .publish_build_status(&task, BuildStatus::Received, None, None, None)
            .await?;

        // 创建 workspace
        let workspace = self
            .workspace_manager
            .create_workspace(task.job_id, task.task_id)?;

        // 发送准备中状态
        publisher
            .publish_build_status(&task, BuildStatus::Preparing, None, None, None)
            .await?;

        // 克隆代码
        if let Err(e) = self
            .clone_code(&workspace, &task.project, publisher, &task)
            .await
        {
            let _ = publisher
                .publish_error(&task, &e.to_string(), ErrorCategory::Network)
                .await;
            self.cleanup_workspace(&workspace).await;
            return Err(e);
        }

        // 发送执行中状态
        publisher
            .publish_build_status(&task, BuildStatus::Running, None, None, None)
            .await?;

        // 执行构建步骤
        let mut all_succeeded = true;
        let mut artifacts = Vec::new();

        for step in &task.steps {
            let step_result = self.execute_step(&workspace, &task, step, publisher).await;

            match step_result {
                Ok(Some(artifact)) => {
                    artifacts.push(artifact);
                }
                Ok(None) => {
                    // 步骤成功，无产物
                }
                Err(e) => {
                    error!("Step {} failed: {}", step.name, e);
                    all_succeeded = false;

                    if !step.continue_on_failure {
                        break;
                    }
                }
            }
        }

        // 清理 workspace
        self.cleanup_workspace(&workspace).await;

        // 发送最终状态
        let final_status = if all_succeeded {
            BuildStatus::Succeeded
        } else {
            BuildStatus::Failed
        };

        publisher
            .publish_build_status(&task, final_status.clone(), None, None, None)
            .await?;

        info!(
            "Build execution completed: job={}, task={}, status={:?}",
            task.job_id, task.task_id, final_status
        );

        // 定期清理旧工作空间
        let _ = self.workspace_manager.cleanup_old_workspaces();

        Ok(())
    }

    /// 克隆代码
    async fn clone_code(
        &self,
        workspace: &Path,
        project: &ProjectInfo,
        _publisher: &MessagePublisher,
        _task: &BuildTaskMessage,
    ) -> Result<()> {
        info!("Cloning repository: {} (branch: {})", project.repository_url, project.branch);

        // 处理 file:// 协议：去掉前缀使用本地路径
        let repo_url = if project.repository_url.starts_with("file://") {
            project.repository_url.strip_prefix("file://").unwrap()
        } else {
            &project.repository_url
        };

        let output = Command::new("git")
            .args([
                "clone",
                "--depth",
                "1",
                "--branch",
                &project.branch,
                repo_url,
                workspace.to_str().unwrap(),
            ])
            .output()
            .context("Failed to execute git clone")?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            anyhow::bail!("Git clone failed: {}", stderr);
        }

        // 检出指定 commit
        if !project.commit.is_empty() {
            let output = Command::new("git")
                .args([
                    "-C",
                    workspace.to_str().unwrap(),
                    "checkout",
                    &project.commit,
                ])
                .output()
                .context("Failed to checkout commit")?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                warn!("Failed to checkout commit {}: {}", project.commit, stderr);
            }
        }

        info!("Repository cloned successfully");
        Ok(())
    }

    /// 执行单个构建步骤
    async fn execute_step(
        &self,
        workspace: &Path,
        task: &BuildTaskMessage,
        step: &BuildStep,
        publisher: &MessagePublisher,
    ) -> Result<Option<BuildArtifact>> {
        info!("Executing step: {}", step.name);

        let started_at = Utc::now();

        // 发送步骤开始状态
        publisher
            .publish_step_status(task, step, StepStatus::Running, started_at, None, None, None)
            .await?;

        // 设置环境变量
        let mut envs: HashMap<String, String> = std::env::vars().collect();
        for (k, v) in &task.build.env_vars {
            envs.insert(k.clone(), v.clone());
        }

        let docker_executor = self.try_get_docker_executor().await;

        let (status, artifact) = if let Some(docker_executor) = docker_executor {
            match docker_executor.execute_step(step, workspace, envs).await {
                Ok(step_result) => {
                    let completed_at = Utc::now();
                    if step_result.success {
                        // 发布标准输出
                        if !step_result.stdout.is_empty() {
                            publisher
                                .publish_log(
                                    task,
                                    step,
                                    &step_result.stdout,
                                    LogLevel::Info,
                                    0,
                                    true,
                                )
                                .await?;
                        }
                        // 发布标准错误（如果有）
                        if !step_result.stderr.is_empty() {
                            publisher
                                .publish_log(
                                    task,
                                    step,
                                    &step_result.stderr,
                                    LogLevel::Warn,
                                    0,
                                    true,
                                )
                                .await?;
                        }

                        let artifact = if step.produces_artifact {
                            self.create_and_upload_artifact(workspace, task, step, publisher)
                                .await?
                        } else {
                            None
                        };

                        publisher
                            .publish_step_status(
                                task,
                                step,
                                StepStatus::Succeeded,
                                started_at,
                                Some(completed_at),
                                Some(step_result.exit_code),
                                artifact.clone(),
                            )
                            .await?;

                        (StepStatus::Succeeded, artifact)
                    } else {
                        // 失败时合并 stdout 和 stderr
                        let output = if step_result.stderr.is_empty() {
                            step_result.stdout.clone()
                        } else if step_result.stdout.is_empty() {
                            step_result.stderr.clone()
                        } else {
                            format!("{}\n{}", step_result.stdout, step_result.stderr)
                        };
                        publisher
                            .publish_log(task, step, &output, LogLevel::Error, 0, true)
                            .await?;

                        publisher
                            .publish_step_status(
                                task,
                                step,
                                StepStatus::Failed,
                                started_at,
                                Some(completed_at),
                                Some(step_result.exit_code),
                                None,
                            )
                            .await?;

                        (StepStatus::Failed, None)
                    }
                }
                Err(e) => {
                    let completed_at = Utc::now();
                    error!("Docker step execution failed: {}", e);
                    let error_msg = format!("Execution error: {}", e);
                    publisher
                        .publish_log(task, step, &error_msg, LogLevel::Error, 0, true)
                        .await?;

                    publisher
                        .publish_step_status(
                            task,
                            step,
                            StepStatus::Failed,
                            started_at,
                            Some(completed_at),
                            None,
                            None,
                        )
                        .await?;

                    (StepStatus::Failed, None)
                }
            }
        } else {
            // 确定执行命令（native 模式下脚本落盘）
            let command = if let Some(cmd) = &step.command {
                cmd.clone()
            } else if let Some(script) = &step.script {
                let script_path = workspace.join(format!(".step_{}.sh", step.id));
                fs::write(&script_path, script).context("Failed to write script file")?;

                #[cfg(unix)]
                {
                    Command::new("chmod")
                        .args(["+x", script_path.to_str().unwrap()])
                        .output()
                        .context("Failed to make script executable")?;
                }

                format!("sh {}", script_path.display())
            } else {
                anyhow::bail!("Step must have either command or script");
            };

            let work_dir = if let Some(dir) = &step.working_dir {
                workspace.join(dir)
            } else {
                workspace.to_path_buf()
            };

            let timeout = step
                .timeout_secs
                .map(Duration::from_secs)
                .unwrap_or_else(|| self.config.step_timeout());

            let result = tokio::time::timeout(
                timeout,
                tokio::task::spawn_blocking({
                    let command = command.clone();
                    let work_dir = work_dir.clone();
                    move || {
                        let mut cmd = Command::new("sh");
                        cmd.args(["-c", &command])
                            .current_dir(&work_dir)
                            .envs(&envs);
                        cmd.output()
                    }
                }),
            )
            .await;

            let completed_at = Utc::now();

            let exec_result: std::result::Result<std::process::Output, std::io::Error> =
                match result {
                    Ok(inner_result) => inner_result.map_err(std::io::Error::other)?,
                    Err(_) => Err(std::io::Error::new(
                        std::io::ErrorKind::TimedOut,
                        "Command execution timed out",
                    )),
                };

            match exec_result {
                Ok(output) => {
                    if output.status.success() {
                        let stdout = String::from_utf8_lossy(&output.stdout);
                        publisher
                            .publish_log(task, step, &stdout, LogLevel::Info, 0, true)
                            .await?;

                        let artifact = if step.produces_artifact {
                            self.create_and_upload_artifact(workspace, task, step, publisher)
                                .await?
                        } else {
                            None
                        };

                        publisher
                            .publish_step_status(
                                task,
                                step,
                                StepStatus::Succeeded,
                                started_at,
                                Some(completed_at),
                                Some(output.status.code().unwrap_or(0)),
                                artifact.clone(),
                            )
                            .await?;

                        (StepStatus::Succeeded, artifact)
                    } else {
                        let stdout = String::from_utf8_lossy(&output.stdout);
                        let stderr = String::from_utf8_lossy(&output.stderr);
                        let log_content = format!("{}\n{}", stdout, stderr);
                        publisher
                            .publish_log(task, step, &log_content, LogLevel::Error, 0, true)
                            .await?;

                        publisher
                            .publish_step_status(
                                task,
                                step,
                                StepStatus::Failed,
                                started_at,
                                Some(completed_at),
                                Some(output.status.code().unwrap_or(1)),
                                None,
                            )
                            .await?;

                        (StepStatus::Failed, None)
                    }
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => {
                    warn!("Step execution timed out after {:?}", timeout);
                    let timeout_msg = format!("Execution timed out after {:?}", timeout);
                    publisher
                        .publish_log(task, step, &timeout_msg, LogLevel::Error, 0, true)
                        .await?;

                    publisher
                        .publish_step_status(
                            task,
                            step,
                            StepStatus::Timeout,
                            started_at,
                            Some(completed_at),
                            None,
                            None,
                        )
                        .await?;

                    (StepStatus::Timeout, None)
                }
                Err(ref e) => {
                    error!("Command execution failed: {}", e);
                    let error_msg = format!("Execution error: {}", e);
                    publisher
                        .publish_log(task, step, &error_msg, LogLevel::Error, 0, true)
                        .await?;

                    publisher
                        .publish_step_status(
                            task,
                            step,
                            StepStatus::Failed,
                            started_at,
                            Some(completed_at),
                            None,
                            None,
                        )
                        .await?;

                    (StepStatus::Failed, None)
                }
            }
        };

        if status == StepStatus::Failed && !step.continue_on_failure {
            anyhow::bail!("Step {} failed and continue_on_failure is false", step.name);
        }

        Ok(artifact)
    }

    /// 创建并上传构建产物
    async fn create_and_upload_artifact(
        &self,
        workspace: &Path,
        task: &BuildTaskMessage,
        step: &BuildStep,
        publisher: &MessagePublisher,
    ) -> Result<Option<BuildArtifact>> {
        // 查找可能的产物文件
        let artifact_patterns = vec!["target/release/*", "dist/*", "build/*", "*.jar", "*.zip"];

        for pattern in &artifact_patterns {
            if pattern.contains('*') {
                // 使用 glob 查找
                if let Ok(paths) = glob::glob(&workspace.join(pattern).to_string_lossy()) {
                    for path in paths.filter_map(|p| p.ok()).take(1) {
                        if let Some(artifact) = self.upload_artifact(&path, task, step).await? {
                            // 发布产物信息
                            publisher.publish_artifact(task, step, &artifact).await?;
                            return Ok(Some(artifact));
                        }
                    }
                }
            } else {
                let pattern_path = workspace.join(pattern);
                if pattern_path.exists() {
                    if let Some(artifact) = self.upload_artifact(&pattern_path, task, step).await? {
                        publisher.publish_artifact(task, step, &artifact).await?;
                        return Ok(Some(artifact));
                    }
                }
            }
        }

        Ok(None)
    }

    /// 上传单个产物
    async fn upload_artifact(
        &self,
        artifact_path: &Path,
        task: &BuildTaskMessage,
        step: &BuildStep,
    ) -> Result<Option<BuildArtifact>> {
        let metadata = fs::metadata(artifact_path)?;
        let size = metadata.len();

        // 计算 SHA256
        let content = fs::read(artifact_path)?;
        let hash = Sha256::digest(&content);
        let sha256 = hex::encode(hash);

        let artifact_name = step.name.clone();
        let artifact_type = task.build.build_type.clone();
        let version = task.project.commit.clone();

        // 尝试上传到存储
        let _download_url = if let Some(storage) = &self.artifact_storage {
            let remote_path = format!(
                "{}/{}/{}/{}",
                task.project.name,
                task.build.build_type,
                version,
                artifact_path.file_name().unwrap().to_string_lossy()
            );

            match storage.upload(artifact_path, &remote_path).await {
                Ok(result) => {
                    info!(
                        "Artifact uploaded: {} -> {} ({} bytes)",
                        artifact_name, result.url, result.size
                    );
                    result.url
                }
                Err(e) => {
                    warn!("Failed to upload artifact to storage: {}, using local path", e);
                    artifact_path.to_string_lossy().to_string()
                }
            }
        } else {
            artifact_path.to_string_lossy().to_string()
        };

        let artifact = BuildArtifact {
            path: artifact_path.to_string_lossy().to_string(),
            name: artifact_name,
            artifact_type,
            size,
            sha256,
            version,
        };

        info!("Created artifact: {:?} ({} bytes)", artifact.name, artifact.size);
        Ok(Some(artifact))
    }

    /// 清理工作空间
    async fn cleanup_workspace(&self, workspace: &Path) {
        if self.config.execution.cleanup_workspace {
            if let Err(e) = self.workspace_manager.cleanup_workspace(workspace) {
                warn!("Failed to cleanup workspace {:?}: {}", workspace, e);
            }
        } else {
            info!("Workspace cleanup disabled, keeping: {:?}", workspace);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;

    fn create_test_config() -> RunnerConfig {
        RunnerConfig {
            runner: crate::config::RunnerInfo {
                name: "test-runner".to_string(),
                capabilities: vec![],
                docker_supported: false,
                max_concurrent_jobs: 1,
                outbound_allowlist: vec![],
                environment: "test".to_string(),
            },
            control_plane: crate::config::ControlPlaneConfig {
                api_url: "http://localhost:3000".to_string(),
                api_key: "test-key".to_string(),
                heartbeat_interval_secs: 30,
            },
            message_queue: crate::config::MessageQueueConfig {
                amqp_url: "amqp://localhost:5672".to_string(),
                vhost: "/".to_string(),
                exchange: "ops.build".to_string(),
                queue_prefix: "test-runner".to_string(),
                prefetch: 1,
            },
            execution: crate::config::ExecutionConfig {
                workspace_base_dir: "/tmp/ops-runner-test-workspace".to_string(),
                task_timeout_secs: 1800,
                step_timeout_secs: 300,
                cleanup_workspace: true,
                cache_dir: None,
                docker: None,
            },
        }
    }

    #[test]
    fn test_workspace_manager_creation() {
        let temp_dir = "/tmp/test-workspace-manager";
        let manager = WorkspaceManager::new(temp_dir.to_string(), 3, Some(1000)).unwrap();

        assert_eq!(manager.base_dir, PathBuf::from(temp_dir));
        assert_eq!(manager.cleanup_policy(), CleanupPolicy::RetainRecent(3));
    }

    #[test]
    fn test_workspace_create() {
        let manager =
            WorkspaceManager::new("/tmp/test-workspace-create".to_string(), 3, None).unwrap();

        let job_id = Uuid::new_v4();
        let task_id = Uuid::new_v4();
        let workspace = manager.create_workspace(job_id, task_id).unwrap();

        assert!(workspace.exists());
        assert!(workspace.is_dir());

        // 清理
        let _ = fs::remove_dir_all(workspace);
        let _ = fs::remove_dir_all("/tmp/test-workspace-create");
    }

    #[test]
    fn test_workspace_cleanup() {
        let manager =
            WorkspaceManager::new("/tmp/test-workspace-cleanup".to_string(), 3, None).unwrap();

        let job_id = Uuid::new_v4();
        let task_id = Uuid::new_v4();
        let workspace = manager.create_workspace(job_id, task_id).unwrap();

        assert!(workspace.exists());

        manager.force_cleanup_workspace(&workspace).unwrap();

        assert!(!workspace.exists());

        let _ = fs::remove_dir_all("/tmp/test-workspace-cleanup");
    }

    #[test]
    fn test_artifact_storage_creation() {
        let storage = ArtifactStorage::new(
            "local".to_string(),
            Some("/tmp/artifacts".to_string()),
            None,
            None,
            None,
        );

        assert_eq!(storage.storage_type, "local");
    }

    #[test]
    fn test_executor_creation() {
        let config = Arc::new(create_test_config());
        let executor = BuildExecutor::new(config);

        assert!(executor.is_ok());
        let executor = executor.unwrap();
        assert_eq!(executor.config.runner.name, "test-runner");
    }

    #[test]
    fn test_cleanup_policy() {
        let policies = vec![
            CleanupPolicy::Immediate,
            CleanupPolicy::AfterDuration(3600),
            CleanupPolicy::RetainRecent(5),
            CleanupPolicy::Manual,
        ];

        for policy in policies {
            match policy {
                CleanupPolicy::Immediate => assert!(matches!(policy, CleanupPolicy::Immediate)),
                CleanupPolicy::AfterDuration(d) => assert_eq!(d, 3600),
                CleanupPolicy::RetainRecent(n) => assert_eq!(n, 5),
                CleanupPolicy::Manual => assert!(matches!(policy, CleanupPolicy::Manual)),
            }
        }
    }
}
