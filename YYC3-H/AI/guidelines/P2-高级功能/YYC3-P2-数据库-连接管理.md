# YYC3 P2-数据库-连接管理

@file P2-高级功能/YYC3-P2-数据库-连接管理.md | @author YanYuCloudCube Team | @version v1.0.0 | @tags P2,database,connection

## 功能目标
多数据库支持(PostgreSQL/MySQL/MongoDB)、连接池管理、连接监控、自动重连、安全管理

## 核心接口
```typescript
interface ConnectionConfig {
  type: DatabaseType; host: string; port: number; database: string;
  username: string; password: string; ssl?: boolean;
  pool?: { min: number; max: number; acquireTimeout: number; idleTimeout: number };
}
interface ConnectionStatus {
  connected: boolean; lastConnected?: Date; lastError?: string;
  poolSize: number; activeConnections: number; idleConnections: number;
}
```

## ConnectionManager
- createConnection → 按 type 分发创建 pg.Pool / mysql2.createPool / MongoClient
- getConnection/releaseConnection → 连接池 acquire/release
- closeConnection → drain + clear + end
- getConnectionStatus → 检测连接可用性
- startMonitoring → 每 5 秒检查状态

## DatabaseProvider
- connect/disconnect/getStatus/query/transaction 统一接口

## QueryBuilder
- 链式调用: select().from().where().join().orderBy().groupBy().limit().offset().build()

## 验收: 多数据库支持/连接池/监控/自动重连/事务正常
