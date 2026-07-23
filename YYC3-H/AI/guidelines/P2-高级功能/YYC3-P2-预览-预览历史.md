# YYC3 P2-预览-预览历史

@file P2-高级功能/YYC3-P2-预览-预览历史.md | @author YanYuCloudCube Team | @version v1.0.0 | @tags P2,preview,history

## 功能目标
预览快照管理、版本对比(LCS diff)、版本回滚/撤销、时间线展示、差异查看器、导出

## 核心类型
```typescript
interface PreviewSnapshot {
  id: string; name: string; description?: string; content: string;
  createdAt: number; createdBy: string; tags: string[];
  metadata: SnapshotMetadata; size: number; isAuto: boolean;
}
```

## 核心组件
- **SnapshotManager**: createSnapshot/getAllSnapshots/deleteSnapshot/searchSnapshots + 自动快照(max 50)
- **VersionComparator**: compareSnapshots → LCS diff 算法 + Levenshtein 相似度
- **RollbackManager**: rollbackToSnapshot/undoRollback + 回滚历史记录
- **VersionTimeline**: 按日期分组 + 搜索过滤 + 标签过滤
- **DiffViewer**: split/unified 视图 + 空白字符显示 + 添加/删除/修改行高亮
- **HistoryExporter**: JSON/HTML 报告/PDF 导出

## 验收: 快照CRUD/自动快照/版本对比/回滚撤销/时间线/差异查看/导出正常
