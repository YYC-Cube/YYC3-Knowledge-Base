# Markdown Diff 追踪功能

## 概述

此功能会自动追踪和记录 markdown 内容的每次变更，生成详细的 diff 记录并持久化到本地文件。

## 功能特性

### 1. 自动 Diff 追踪
- 每次保存 markdown 内容时，自动计算与上一版本的差异
- 使用 `diff` npm 包进行行级别的差异比较
- 如果内容没有变化，自动跳过记录

### 2. 差异统计
每条记录包含以下统计信息：
- **additions**: 新增的行数
- **deletions**: 删除的行数
- **totalChanges**: 总变更行数

### 3. 持久化存储
差异记录保存在 `plan-diff-history.json` 文件中：
```
{workspace}/.../plans/{conversationId}/
├── plan.md                    # 原始 markdown
├── plan-new.md                # 更新后的 markdown
├── plan.json                  # plan 元数据
└── plan-diff-history.json     # diff 历史记录（新增）
```

### 4. 历史记录管理
- 保留最近 100 条差异记录
- 超过限制时自动删除最旧的记录
- 每条记录包含完整的旧内容和新内容

## 数据结构

### MarkdownDiffRecord
```typescript
interface MarkdownDiffRecord {
  conversationId: string;      // 对话ID
  timestamp: number;            // Unix 时间戳
  timeString: string;           // ISO 8601 时间字符串
  oldContent: string;           // 修改前的内容
  newContent: string;           // 修改后的内容
  changes: Change[];            // diff 详情
  stats: {
    additions: number;          // 新增行数
    deletions: number;          // 删除行数
    totalChanges: number;       // 总变更数
  };
}
```

### MarkdownDiffHistory
```typescript
interface MarkdownDiffHistory {
  conversationId: string;       // 对话ID
  records: MarkdownDiffRecord[]; // 差异记录列表
  lastUpdated: number;          // 最后更新时间
}
```

## 使用场景

1. **版本追踪**: 查看 markdown 内容的历史变更
2. **回滚恢复**: 通过历史记录恢复到之前的版本
3. **变更审计**: 了解谁在什么时候做了什么修改
4. **协作分析**: 分析多人协作时的内容变化

## API

### saveDiffRecord
```typescript
/**
 * 计算并保存 markdown 差异记录
 */
export const saveDiffRecord = async (
  genieExtensionPath: string,
  conversationId: string,
  oldContent: string,
  newContent: string
): Promise<void>
```

### readDiffHistory
```typescript
/**
 * 读取差异历史
 */
export const readDiffHistory = async (
  genieExtensionPath: string,
  conversationId: string
): Promise<MarkdownDiffHistory | null>
```

## 工作流程

```
用户编辑 markdown
    ↓
触发保存事件
    ↓
读取旧内容（从 plan-new.md）
    ↓
计算 diff（使用 diffLines）
    ↓
生成差异统计
    ↓
创建 MarkdownDiffRecord
    ↓
追加到 plan-diff-history.json
    ↓
限制历史记录数量（最多 100 条）
    ↓
持久化到磁盘
```

## 性能考虑

1. **异步处理**: 所有 I/O 操作都是异步的，不会阻塞主线程
2. **失败隔离**: diff 记录失败不会影响主保存流程
3. **增量存储**: 只追加新记录，不重写整个历史
4. **大小限制**: 限制历史记录数量，避免文件过大

## 示例输出

```json
{
  "conversationId": "abc123",
  "records": [
    {
      "conversationId": "abc123",
      "timestamp": 1732614000000,
      "timeString": "2024-11-26T10:00:00.000Z",
      "oldContent": "# 标题\n\n这是旧内容",
      "newContent": "# 标题\n\n这是新内容\n\n增加了一段",
      "changes": [
        { "count": 2, "value": "# 标题\n\n" },
        { "count": 1, "removed": true, "value": "这是旧内容" },
        { "count": 1, "added": true, "value": "这是新内容\n\n增加了一段" }
      ],
      "stats": {
        "additions": 1,
        "deletions": 1,
        "totalChanges": 2
      }
    }
  ],
  "lastUpdated": 1732614000000
}
```

## 测试方法

1. 打开一个 plan.md 文件
2. 在 Lexical Editor 中编辑内容
3. 保存更改
4. 检查对应的 `plan-diff-history.json` 文件
5. 验证差异记录是否正确生成

## 注意事项

- 首次编辑时，`oldContent` 为空字符串
- 如果内容完全相同，不会生成差异记录
- diff 操作失败不会抛出错误，只会记录日志
- 历史记录文件可能会很大，定期清理旧记录

