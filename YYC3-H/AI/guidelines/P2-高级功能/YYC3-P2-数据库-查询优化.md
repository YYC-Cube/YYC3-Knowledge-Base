# YYC3 P2-数据库-查询优化

@file P2-高级功能/YYC3-P2-数据库-查询优化.md | @author YanYuCloudCube Team | @version v1.0.0 | @tags P2,database,query,optimization

## 功能目标
索引优化、查询缓存、查询分析、慢查询监控、批量操作、分页优化

## 核心组件
- **IndexManager**: createIndex/dropIndex/getIndexes/analyzeIndexUsage/reindex/recommendIndexes
- **QueryCache**: LRU 缓存 (TTL 60s, max 1000)，generateKey/get/set/delete/getStats
- **QueryAnalyzer**: EXPLAIN ANALYZE 解析，检测全表扫描/嵌套循环/排序，生成优化建议
- **SlowQueryMonitor**: 阈值 1000ms，记录慢查询，统计 avg/max/min
- **BatchOperation**: batchInsert/batchUpdate/batchDelete (默认 batchSize 1000)

## 验收: 查询性能提升明显、缓存命中率高、索引推荐合理、批量操作高效
