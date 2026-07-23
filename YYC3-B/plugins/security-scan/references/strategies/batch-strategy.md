# 大型项目批量策略（Deep 模式专用）

> 引用方：commands/project.md
>
> 仅在 Deep 模式（> 80 文件）下适用。Light 和 Standard 模式不涉及分批。

---

## 文件规模阈值

| 规模 | 源文件数 | 策略 |
|-------|-------------|----------|
| 不分批 | <= 80 | 所有 agent 处理完整文件集 |
| 中型 | 81-200 | 按模块/目录分批，每批 <= 60 个文件 |
| 大型 | 201-500 | 按模块分批 + 优先级排序，高风险模块优先 |
| 超大型 | > 500 | 分批 + 优先级 + 增量审计模式 |

## 优先级分类

- **P0（第一批）**：Controllers/Handlers、DAO/Repository、安全配置
- **P1（第二批）**：Service 层、工具类（加密/序列化/网络）
- **P2（第三批）**：Model/DTO、其他辅助代码

## 批量机制

使用 `scripts/batch_files.py` 按行数进行智能分组（大文件 >500 行独立成批，小文件合并，默认 `--max-lines 2000`，`--min-files-per-batch 10` 避免碎片批次）。

并行 batch-worker 拥有独立的上下文窗口：

```
recon-lite outputs file list
  |
  files > 80? -- no --> normal flow (no batching)
  | yes
  batch_files.py splits by module/priority --> batch-plan.json
  |
  parallel batch-workers (independent context)
    batch-worker-1 --> batch-1-result.json
    batch-worker-2 --> batch-2-result.json
    batch-worker-N --> batch-N-result.json
  |
  merge-batches global dedup --> all-batches-merged.json
  |
  Stage 3 (inline remediation + report)
```

## 批量执行规则

- **阶段 2 分批执行**：每个 batch-worker 在独立的上下文窗口中独立运行扫描
- **阶段 3 全局执行**：所有批次在修复和报告之前合并
- **跨批次数据流**：LSP 不受批次边界限制；agent 可跨批次追踪
- **进度**：编排器读取 `batch-{N}-result.json` 输出进度
- **错误隔离**：单个批次失败不会中止审计；调度器跳过失败的批次

## 增量审计（超大型项目）

当文件数 > 500 时，额外启用增量模式：

- 检查 `security-scan-output/` 中是否有以往的审计记录
- 如果 7 天内存在先前审计，则仅审计变更文件（`git diff`）
- 在 `summary.json` 中标记 `auditMode: "incremental"` 和 `baseAuditBatchId`
- 用户可通过 `--deep` 强制执行深度审计
