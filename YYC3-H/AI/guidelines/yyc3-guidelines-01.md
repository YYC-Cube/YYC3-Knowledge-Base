You are a senior database performance specialist and query optimization expert with deep expertise in database indexing, query analysis, and performance tuning for large-scale applications.
Your Role & Expertise

You are an experienced database architect who specializes in:
- **Query Optimization**: Query planning, execution analysis, performance tuning
- **Indexing Strategies**: Index design, composite indexes, index maintenance
- **Caching Systems**: Query caching, result caching, cache invalidation
- **Performance Analysis**: Slow query detection, query profiling, performance metrics
- **Database Systems**: PostgreSQL, MySQL, MongoDB, Redis, SQLite
- **Batch Operations**: Bulk inserts, batch updates, transaction optimization
- **Pagination**: Efficient pagination, cursor-based pagination, offset optimization
- **Best Practices**: Query patterns, anti-patterns, performance monitoring

### Code Standards

**IMPORTANT**: Please ensure all generated code files follow the team requirements specified in: `guidelines/YYC3-Code-header.md`

All code files must include proper file headers with:
- @file: File name/path
- @description: Clear description of file purpose
- @author: YanYuCloudCube Team <admin@0379.email>
- @version: Semantic version (v1.0.0)
- @created: Creation date (YYYY-MM-DD)
- @updated: Last update date (YYYY-MM-DD)
- @status: File status (draft/dev/test/stable/deprecated)
- @license: License type
- @copyright: Copyright notice
- @tags: Relevant tags for categorization

---

## 📋 文档信息

| 字段 | 内容 |
|------|------|
| @file | P2-高级功能/YYC3-P2-数据库-查询优化.md |
| @description | 数据库查询优化策略和实现，包含索引优化、查询缓存等 |
| @author | YanYuCloudCube Team <admin@0379.email> |
| @version | v1.0.0 |
| @created | 2026-03-14 |
| @updated | 2026-03-14 |
| @status | stable |
| @license | MIT |
| @copyright | Copyright (c) 2026 YanYuCloudCube Team |
| @tags P2,database,query,optimization |

---

## 🎯 功能目标

### 核心目标

1. **索引优化**：智能索引创建和管理
2. **查询缓存**：高效的查询结果缓存
3. **查询分析**：查询性能分析
4. **慢查询监控**：慢查询检测和优化
5. **批量操作**：高效的批量数据处理
6. **分页优化**：优化的分页查询

---

## 🏗️ 架构设计

### 1. 优化架构

```
Query Optimization/
├── IndexManager         # 索引管理器
├── QueryCache          # 查询缓存
├── QueryAnalyzer       # 查询分析器
├── SlowQueryMonitor    # 慢查询监控
├── BatchOperation      # 批量操作
└── PaginationOptimizer # 分页优化器
```

### 2. 数据流

```
Query (查询)
    ↓ analyze
QueryAnalyzer (查询分析器)
    ↓ optimize
Optimized Query (优化查询)
    ↓ execute
Database (数据库)
    ↓ cache
QueryCache (查询缓存)
```

---

## 💻 核心实现

### 1. 索引管理器

```typescript
// src/database/optimization/IndexManager.ts
import { databaseProvider } from '../DatabaseProvider';

export interface IndexConfig {
  table: string;
  columns: string[];
  unique?: boolean;
  name?: string;
  type?: 'btree' | 'hash' | 'gin' | 'gist';
}

export interface IndexStats {
  name: string;
  table: string;
  columns: string[];
  size: number;
  scans: number;
  tuplesRead: number;
  tuplesFetched: number;
}

export class IndexManager {
  /**
   * 创建索引
   */
  async createIndex(config: ConnectionConfig, indexConfig: IndexConfig): Promise<void> {
    const indexName = indexConfig.name || `idx_${indexConfig.table}_${indexConfig.columns.join('_')}`;
    const unique = indexConfig.unique ? 'UNIQUE' : '';
    const type = indexConfig.type ? `USING ${indexConfig.type}` : '';

    const sql = `
      CREATE ${unique} INDEX ${indexName}
      ${type}
      ON ${indexConfig.table} (${indexConfig.columns.join(', ')})
    `;

    await databaseProvider.query(config, sql);
  }

  /**
   * 删除索引
   */
  async dropIndex(config: ConnectionConfig, indexName: string): Promise<void> {
    const sql = `DROP INDEX IF EXISTS ${indexName}`;
    await databaseProvider.query(config, sql);
  }

  /**
   * 获取索引列表
   */
  async getIndexes(config: ConnectionConfig, table: string): Promise<IndexStats[]> {
    const sql = `
      SELECT
        indexname as name,
        tablename as table,
        indexdef as definition,
        pg_relation_size(indexrelid) as size
      FROM pg_indexes
      WHERE tablename = $1
    `;

    const result = await databaseProvider.query(config, sql, [table]);
    return result;
  }

  /**
   * 分析索引使用情况
   */
  async analyzeIndexUsage(config: ConnectionConfig, indexName: string): Promise<IndexStats> {
    const sql = `
      SELECT
        schemaname,
        tablename,
        indexname,
        idx_scan as scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
      FROM pg_stat_user_indexes
      WHERE indexname = $1
    `;

    const result = await databaseProvider.query(config, sql, [indexName]);
    return result[0];
  }

  /**
   * 重建索引
   */
  async reindex(config: ConnectionConfig, indexName: string): Promise<void> {
    const sql = `REINDEX INDEX ${indexName}`;
    await databaseProvider.query(config, sql);
  }

  /**
   * 推荐索引
   */
  async recommendIndexes(config: ConnectionConfig, table: string): Promise<IndexConfig[]> {
    const sql = `
      SELECT
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation
      FROM pg_stats
      WHERE tablename = $1
        AND n_distinct > 100
        AND correlation < 0.9
      ORDER BY n_distinct DESC
      LIMIT 10
    `;

    const result = await databaseProvider.query(config, sql, [table]);
    return result.map((row: any) => ({
      table,
      columns: [row.attname],
      unique: false,
      type: 'btree',
    }));
  }
}

export const indexManager = new IndexManager();
```

### 2. 查询缓存

```typescript
// src/database/optimization/QueryCache.ts
import LRUCache from 'lru-cache';

export interface CacheKey {
  sql: string;
  params: any[];
}

export interface CacheEntry {
  result: any[];
  timestamp: number;
  hitCount: number;
}

export class QueryCache {
  private cache: LRUCache<string, CacheEntry>;
  private ttl: number;
  private maxSize: number;

  constructor(ttl: number = 60000, maxSize: number = 1000) {
    this.ttl = ttl;
    this.maxSize = maxSize;
    this.cache = new LRUCache({
      max: maxSize,
      ttl: ttl,
      updateAgeOnGet: true,
    });
  }

  /**
   * 生成缓存键
   */
  private generateKey(key: CacheKey): string {
    return `${key.sql}:${JSON.stringify(key.params)}`;
  }

  /**
   * 获取缓存
   */
  get(key: CacheKey): any[] | null {
    const cacheKey = this.generateKey(key);
    const entry = this.cache.get(cacheKey);

    if (entry) {
      entry.hitCount++;
      return entry.result;
    }

    return null;
  }

  /**
   * 设置缓存
   */
  set(key: CacheKey, result: any[]): void {
    const cacheKey = this.generateKey(key);
    const entry: CacheEntry = {
      result,
      timestamp: Date.now(),
      hitCount: 0,
    };

    this.cache.set(cacheKey, entry);
  }

  /**
   * 删除缓存
   */
  delete(key: CacheKey): void {
    const cacheKey = this.generateKey(key);
    this.cache.delete(cacheKey);
  }

  /**
   * 清除缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计
   */
  getStats(): { size: number; hits: number; misses: number } {
    return {
      size: this.cache.size,
      hits: this.cache.calculatedSize,
      misses: 0,
    };
  }

  /**
   * 清除过期缓存
   */
  clearExpired(): void {
    const now = Date.now();
    const keys = this.cache.keys();

    for (const key of keys) {
      const entry = this.cache.get(key);
      if (entry && now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

export const queryCache = new QueryCache(60000, 1000);
```

### 3. 查询分析器

```typescript
// src/database/optimization/QueryAnalyzer.ts
import { databaseProvider } from '../DatabaseProvider';

export interface QueryAnalysis {
  sql: string;
  executionTime: number;
  rowsReturned: number;
  rowsScanned: number;
  indexUsed: string | null;
  recommendations: string[];
}

export class QueryAnalyzer {
  /**
   * 分析查询
   */
  async analyzeQuery(config: ConnectionConfig, sql: string, params?: any[]): Promise<QueryAnalysis> {
    const startTime = Date.now();

    // 执行 EXPLAIN ANALYZE
    const explainSql = `EXPLAIN ANALYZE ${sql}`;
    const result = await databaseProvider.query(config, explainSql, params);

    const executionTime = Date.now() - startTime;
    const analysis = this.parseExplainResult(result);

    return {
      sql,
      executionTime,
      ...analysis,
    };
  }

  /**
   * 解析 EXPLAIN 结果
   */
  private parseExplainResult(result: any[]): any {
    const recommendations: string[] = [];
    let indexUsed: string | null = null;
    let rowsReturned = 0;
    let rowsScanned = 0;

    for (const row of result) {
      const plan = row['QUERY PLAN'];

      // 检查是否使用索引
      if (plan.includes('Index Scan')) {
        const match = plan.match(/Index Scan using (\w+)/);
        if (match) {
          indexUsed = match[1];
        }
      }

      // 检查是否为全表扫描
      if (plan.includes('Seq Scan')) {
        recommendations.push('考虑为查询条件添加索引以避免全表扫描');
      }

      // 检查是否为嵌套循环
      if (plan.includes('Nested Loop')) {
        recommendations.push('考虑使用 JOIN 优化或添加索引');
      }

      // 检查是否为排序操作
      if (plan.includes('Sort')) {
        recommendations.push('考虑为排序字段添加索引');
      }

      // 提取行数信息
      const rowsMatch = plan.match(/rows=(\d+)/);
      if (rowsMatch) {
        rowsScanned += parseInt(rowsMatch[1]);
      }

      const loopsMatch = plan.match(/loops=(\d+)/);
      if (loopsMatch) {
        rowsReturned += parseInt(loopsMatch[1]);
      }
    }

    return {
      rowsReturned,
      rowsScanned,
      indexUsed,
      recommendations,
    };
  }

  /**
   * 优化查询
   */
  async optimizeQuery(config: ConnectionConfig, sql: string): Promise<string> {
    const analysis = await this.analyzeQuery(config, sql);
    let optimizedSql = sql;

    // 应用优化建议
    for (const recommendation of analysis.recommendations) {
      if (recommendation.includes('索引')) {
        // 添加索引建议
        console.log('建议:', recommendation);
      }
    }

    return optimizedSql;
  }
}

export const queryAnalyzer = new QueryAnalyzer();
```

### 4. 慢查询监控

```typescript
// src/database/optimization/SlowQueryMonitor.ts
import { databaseProvider } from '../DatabaseProvider';

export interface SlowQuery {
  id: string;
  sql: string;
  duration: number;
  timestamp: Date;
  params?: any[];
}

export class SlowQueryMonitor {
  private slowQueries: SlowQuery[] = [];
  private threshold: number;
  private maxQueries: number;

  constructor(threshold: number = 1000, maxQueries: number = 100) {
    this.threshold = threshold;
    this.maxQueries = maxQueries;
  }

  /**
   * 监控查询
   */
  async monitorQuery(
    config: ConnectionConfig,
    sql: string,
    params?: any[]
  ): Promise<any[]> {
    const startTime = Date.now();
    const result = await databaseProvider.query(config, sql, params);
    const duration = Date.now() - startTime;

    // 检查是否为慢查询
    if (duration > this.threshold) {
      this.addSlowQuery({
        id: Date.now().toString(),
        sql,
        duration,
        timestamp: new Date(),
        params,
      });
    }

    return result;
  }

  /**
   * 添加慢查询
   */
  private addSlowQuery(query: SlowQuery): void {
    this.slowQueries.push(query);

    // 保持最大查询数量
    if (this.slowQueries.length > this.maxQueries) {
      this.slowQueries.shift();
    }
  }

  /**
   * 获取慢查询列表
   */
  getSlowQueries(): SlowQuery[] {
    return [...this.slowQueries];
  }

  /**
   * 获取慢查询统计
   */
  getSlowQueryStats(): {
    total: number;
    avgDuration: number;
    maxDuration: number;
    minDuration: number;
  } {
    if (this.slowQueries.length === 0) {
      return {
        total: 0,
        avgDuration: 0,
        maxDuration: 0,
        minDuration: 0,
      };
    }

    const durations = this.slowQueries.map((q) => q.duration);
    const total = durations.reduce((sum, d) => sum + d, 0);
    const avgDuration = total / durations.length;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);

    return {
      total: this.slowQueries.length,
      avgDuration,
      maxDuration,
      minDuration,
    };
  }

  /**
   * 清除慢查询
   */
  clearSlowQueries(): void {
    this.slowQueries = [];
  }
}

export const slowQueryMonitor = new SlowQueryMonitor(1000, 100);
```

### 5. 批量操作

```typescript
// src/database/optimization/BatchOperation.ts
import { databaseProvider } from '../DatabaseProvider';

export interface BatchInsertOptions {
  table: string;
  columns: string[];
  data: any[][];
  batchSize?: number;
}

export class BatchOperation {
  /**
   * 批量插入
   */
  async batchInsert(
    config: ConnectionConfig,
    options: BatchInsertOptions
  ): Promise<void> {
    const { table, columns, data, batchSize = 1000 } = options;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      await this.insertBatch(config, table, columns, batch);
    }
  }

  /**
   * 插入批次
   */
  private async insertBatch(
    config: ConnectionConfig,
    table: string,
    columns: string[],
    data: any[][]
  ): Promise<void> {
    const placeholders = data.map((_, index) => {
      const values = columns.map((_, colIndex) => `$${index * columns.length + colIndex + 1}`);
      return `(${values.join(', ')})`;
    }).join(', ');

    const sql = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES ${placeholders}
    `;

    const params = data.flat();
    await databaseProvider.query(config, sql, params);
  }

  /**
   * 批量更新
   */
  async batchUpdate(
    config: ConnectionConfig,
    table: string,
    updates: { id: string | number; data: any }[],
    batchSize: number = 1000
  ): Promise<void> {
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      await this.updateBatch(config, table, batch);
    }
  }

  /**
   * 更新批次
   */
  private async updateBatch(
    config: ConnectionConfig,
    table: string,
    updates: { id: string | number; data: any }[]
  ): Promise<void> {
    const cases = updates.map((u) => {
      const values = Object.entries(u.data).map(([key, value]) => {
        return `WHEN ${u.id} THEN $${value}`;
      });
      return values.join(' ');
    }).join(' ');

    const ids = updates.map((u) => u.id).join(', ');

    const sql = `
      UPDATE ${table}
      SET ${Object.keys(updates[0].data).map((key) => {
        return `${key} = CASE id ${cases} END`;
      }).join(', ')}
      WHERE id IN (${ids})
    `;

    await databaseProvider.query(config, sql);
  }

  /**
   * 批量删除
   */
  async batchDelete(
    config: ConnectionConfig,
    table: string,
    ids: (string | number)[],
    batchSize: number = 1000
  ): Promise<void> {
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      await this.deleteBatch(config, table, batch);
    }
  }

  /**
   * 删除批次
   */
  private async deleteBatch(
    config: ConnectionConfig,
    table: string,
    ids: (string | number)[]
  ): Promise<void> {
    const sql = `DELETE FROM ${table} WHERE id IN (${ids.join(', ')})`;
    await databaseProvider.query(config, sql);
  }
}

export const batchOperation = new BatchOperation();
```

---

## ✅ 验收标准

### 功能完整性

- ✅ 索引优化功能正常
- ✅ 查询缓存高效
- ✅ 查询分析准确
- ✅ 慢查询监控完善
- ✅ 批量操作高效

### 性能优化

- ✅ 查询性能提升明显
- ✅ 缓存命中率高
- ✅ 索引使用合理
- ✅ 批量操作高效

### 代码质量

- ✅ 代码结构清晰
- ✅ 类型定义完整
- ✅ 注释文档完整
- ✅ 代码可维护性好
- ✅ 测试覆盖充分
YYC3-P1-AI-智能代码生成.md
You are a senior AI code generation specialist and intelligent development tools architect with deep expertise in AI-powered code generation, code analysis, and developer productivity enhancement.
Your Role & Expertise

You are an experienced AI developer who specializes in:
- **AI Code Generation**: LLM-based code generation, code completion, code refactoring
- **Code Analysis**: Static analysis, code quality assessment, bug detection
- **Code Optimization**: Performance optimization, code simplification, best practices
- **Testing**: Automated test generation, test coverage analysis, test optimization
- **Documentation**: Code documentation generation, API documentation, inline comments
- **Developer Experience**: IDE integration, real-time suggestions, intelligent autocomplete
- **Code Patterns**: Design patterns, architectural patterns, code templates
- **Best Practices**: Clean code, SOLID principles, code maintainability

### Code Standards

**IMPORTANT**: Please ensure all generated code files follow the team requirements specified in: `guidelines/YYC3-Code-header.md`

All code files must include proper file headers with:
- @file: File name/path
- @description: Clear description of file purpose
- @author: YanYuCloudCube Team <admin@0379.email>
- @version: Semantic version (v1.0.0)
- @created: Creation date (YYYY-MM-DD)
- @updated: Last update date (YYYY-MM-DD)
- @status: File status (draft/dev/test/stable/deprecated)
- @license: License type
- @copyright: Copyright notice
- @tags: Relevant tags for categorization

---

## 📋 文档信息

| 字段 | 内容 |
|------|------|
| @file | P1-核心功能/YYC3-P1-AI-智能代码生成.md |
| @description | AI 智能代码生成功能设计和实现，包含代码生成、代码补全、代码优化等 |
| @author | YanYuCloudCube Team <admin@0379.email> |
| @version | v1.0.0 |
| @created | 2026-03-14 |
| @updated | 2026-03-14 |
| @status | stable |
| @license | MIT |
| @copyright | Copyright (c) 2026 YanYuCloudCube Team |
| @tags P1,AI,code,generation |

---

## 🎯 功能目标

### 核心目标

1. **代码生成**：根据描述生成代码
2. **代码补全**：智能代码自动补全
3. **代码优化**：优化代码质量和性能
4. **代码解释**：解释代码功能
5. **代码重构**：重构代码结构
6. **代码测试**：生成测试代码

---

## 🏗️ 架构设计

### 1. 功能架构

```
AI Code Generation/
├── CodeGenerator          # 代码生成器
├── CodeCompleter         # 代码补全器
├── CodeOptimizer         # 代码优化器
├── CodeExplainer         # 代码解释器
├── CodeRefactor         # 代码重构器
└── CodeTestGenerator     # 测试代码生成器
```

### 2. 数据流

```
User Input (用户输入)
    ↓ AI Prompt
AI Provider (AI 提供商)
    ↓ AI Response
Code Generator (代码生成器)
    ↓ Generated Code
Editor (编辑器)
```

---

## 💻 核心实现

### 1. 代码生成器

```typescript
// src/ai/code/CodeGenerator.ts
import { aiProviderManager } from '../AIProviderManager';
import type { AIRequestConfig } from '@/types';

export interface CodeGenerationOptions {
  /** 代码语言 */
  language: string;
  /** 代码描述 */
  description: string;
  /** 代码上下文 */
  context?: string;
  /** 是否包含注释 */
  includeComments?: boolean;
  /** 代码风格 */
  style?: 'functional' | 'object-oriented' | 'procedural';
  /** 是否包含错误处理 */
  includeErrorHandling?: boolean;
}

export class CodeGenerator {
  /**
   * 生成代码
   */
  async generateCode(options: CodeGenerationOptions): Promise<string> {
    const {
      language,
      description,
      context = '',
      includeComments = true,
      style = 'object-oriented',
      includeErrorHandling = true,
    } = options;

    const systemPrompt = this.buildSystemPrompt(language, style, includeComments, includeErrorHandling);
    const userPrompt = this.buildUserPrompt(description, context);

    const config: AIRequestConfig = {
      provider: await aiProviderManager.selectProvider(),
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 4096,
      stream: false,
    };

    const response = await aiProviderManager.request(config);
    return response.content;
  }

  /**
   * 流式生成代码
   */
  async generateCodeStream(
    options: CodeGenerationOptions,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    const {
      language,
      description,
      context = '',
      includeComments = true,
      style = 'object-oriented',
      includeErrorHandling = true,
    } = options;

    const systemPrompt = this.buildSystemPrompt(language, style, includeComments, includeErrorHandling);
    const userPrompt = this.buildUserPrompt(description, context);

    const config: AIRequestConfig = {
      provider: await aiProviderManager.selectProvider(),
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 4096,
      stream: true,
    };

    await aiProviderManager.streamRequest(config, onChunk, onComplete, onError);
  }

  /**
   * 构建系统提示词
   */
  private buildSystemPrompt(
    language: string,
    style: string,
    includeComments: boolean,
    includeErrorHandling: boolean
  ): string {
    let prompt = `You are an expert ${language} programmer. Generate clean, efficient, and well-structured code.\n\n`;

    prompt += `Code Style: ${style}\n`;
    prompt += includeComments ? 'Include clear and helpful comments.\n' : 'Do not include comments.\n';
    prompt += includeErrorHandling ? 'Include proper error handling.\n' : 'Do not include error handling.\n';

    prompt += `\nGuidelines:\n`;
    prompt += `- Write production-ready code\n`;
    prompt += `- Follow best practices and conventions\n`;
    prompt += `- Use meaningful variable and function names\n`;
    prompt += `- Keep code DRY (Don't Repeat Yourself)\n`;
    prompt += `- Write modular and reusable code\n`;

    return prompt;
  }

  /**
   * 构建用户提示词
   */
  private buildUserPrompt(description: string, context: string): string {
    let prompt = '';

    if (context) {
      prompt += `Context:\n${context}\n\n`;
    }

    prompt += `Task:\n${description}\n\n`;
    prompt += `Please generate the code that fulfills the above requirements. Only output the code, no explanations.`;

    return prompt;
  }
}

export const codeGenerator = new CodeGenerator();
```

### 2. 代码补全器

```typescript
// src/ai/code/CodeCompleter.ts
import { aiProviderManager } from '../AIProviderManager';
import type { AIRequestConfig } from '@/types';

export interface CodeCompletionOptions {
  /** 代码语言 */
  language: string;
  /** 当前代码 */
  code: string;
  /** 光标位置 */
  cursorPosition: { line: number; column: number };
  /** 补全类型 */
  type?: 'inline' | 'block' | 'function' | 'class';
  /** 最大补全长度 */
  maxLength?: number;
}

export class CodeCompleter {
  /**
   * 生成代码补全
   */
  async completeCode(options: CodeCompletionOptions): Promise<string> {
    const {
      language,
      code,
      cursorPosition,
      type = 'inline',
      maxLength = 100,
    } = options;

    const prompt = this.buildPrompt(language, code, cursorPosition, type);

    const config: AIRequestConfig = {
      provider: await aiProviderManager.selectProvider(),
      model: 'gpt-4',
      messages: [
        { role: 'system', content: this.buildSystemPrompt(language) },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      maxTokens: maxLength,
      stream: false,
    };

    const response = await aiProviderManager.request(config);
    return response.content;
  }

  /**
   * 流式代码补全
   */
  async completeCodeStream(
    options: CodeCompletionOptions,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    const {
      language,
      code,
      cursorPosition,
      type = 'inline',
      maxLength = 100,
    } = options;

    const prompt = this.buildPrompt(language, code, cursorPosition, type);

    const config: AIRequestConfig = {
      provider: await aiProviderManager.selectProvider(),
      model: 'gpt-4',
      messages: [
        { role: 'system', content: this.buildSystemPrompt(language) },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      maxTokens: maxLength,
      stream: true,
    };

    await aiProviderManager.streamRequest(config, onChunk, onComplete, onError);
  }

  /**
   * 构建系统提示词
   */
  private buildSystemPrompt(language: string): string {
    return `You are an expert ${language} programmer. Complete the code at the cursor position. Only provide the completion, no explanations.`;
  }

  /**
   * 构建提示词
   */
  private buildPrompt(
    language: string,
    code: string,
    cursorPosition: { line: number; column: number },
    type: string
  ): string {
    const lines = code.split('\n');
    const prefix = lines.slice(0, cursorPosition.line).join('\n') + '\n';
    const currentLine = lines[cursorPosition.line];
    const suffix = lines.slice(cursorPosition.line + 1).join('\n');

    let prompt = `Language: ${language}\n`;
    prompt += `Completion Type: ${type}\n\n`;
    prompt += `Code:\n\`\`\`${language}\n${prefix}${currentLine.slice(0, cursorPosition.column)}<CURSOR>${currentLine.slice(cursorPosition.column)}\n${suffix}\n\`\`\`\n\n`;
    prompt += `Complete the code at <CURSOR>. Only output the completion, no explanations.`;

    return prompt;
  }
}

export const codeCompleter = new CodeCompleter();
```

### 3. 代码优化器

```typescript
// src/ai/code/CodeOptimizer.ts
import { aiProviderManager } from '../AIProviderManager';
import type { AIRequestConfig } from '@/types';

export interface CodeOptimizationOptions {
  /** 代码语言 */
  language: string;
  /** 原始代码 */
  code: string;
  /** 优化目标 */
  goals?: ('performance' | 'readability' | 'maintainability' | 'security')[];
  /** 是否保留注释 */
  keepComments?: boolean;
}

export class CodeOptimizer {
  /**
   * 优化代码
   */
  async optimizeCode(options: CodeOptimizationOptions): Promise<{ optimizedCode: string; explanation: string }> {
    const {
      language,
      code,
      goals = ['performance', 'readability'],
      keepComments = true,
    } = options;

    const prompt = this.buildPrompt(language, code, goals, keepComments);

    const config: AIRequestConfig = {
      provider: await aiProviderManager.selectProvider(),
      model: 'gpt-4',
      messages: [
        { role: 'system', content: this.buildSystemPrompt(language) },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      maxTokens: 4096,
      stream: false,
    };

    const response = await aiProviderManager.request(config);
    const { optimizedCode, explanation } = this.parseResponse(response.content);

    return { optimizedCode, explanation };
  }

  /**
   * 构建系统提示词
   */
  private buildSystemPrompt(language: string): string {
    return `You are an expert ${language} programmer and code reviewer. Optimize the given code for better performance, readability, and maintainability.`;
  }

  /**
   * 构建提示词
   */
  private buildPrompt(
    language: string,
    code: string,
    goals: string[],
    keepComments: boolean
  ): string {
    let prompt = `Language: ${language}\n`;
    prompt += `Optimization Goals: ${goals.join(', ')}\n`;
    prompt += `Keep Comments: ${keepComments ? 'Yes' : 'No'}\n\n`;
    prompt += `Original Code:\n\`\`\`${language}\n${code}\n\`\`\`\n\n`;
    prompt += `Please optimize the code. Provide:\n`;
    prompt += `1. The optimized code\n`;
    prompt += `2. A brief explanation of the changes made\n\n`;
    prompt += `Format your response as:\n`;
    prompt += `OPTIMIZED_CODE:\n\`\`\`${language}\n[optimized code here]\n\`\`\`\n\n`;
    prompt += `EXPLANATION:\n[explanation here]`;

    return prompt;
  }

  /**
   * 解析响应
   */
  private parseResponse(content: string): { optimizedCode: string; explanation: string } {
    const optimizedCodeMatch = content.match(/OPTIMIZED_CODE:\n```(?:\w+)?\n([\s\S]*?)\n```/);
    const explanationMatch = content.match(/EXPLANATION:\n([\s\S]*)/);

    return {
      optimizedCode: optimizedCodeMatch?.[1]?.trim() || '',
      explanation: explanationMatch?.[1]?.trim() || '',
    };
  }
}

export const codeOptimizer = new CodeOptimizer();
```

### 4. 代码解释器

```typescript
// src/ai/code/CodeExplainer.ts
import { aiProviderManager } from '../AIProviderManager';
import type { AIRequestConfig } from '@/types';

export interface CodeExplanationOptions {
  /** 代码语言 */
  language: string;
  /** 代码 */
  code: string;
  /** 解释详细程度 */
  detailLevel?: 'brief' | 'detailed' | 'comprehensive';
  /** 目标受众 */
  audience?: 'beginner' | 'intermediate' | 'expert';
}

export class CodeExplainer {
  /**
   * 解释代码
   */
  async explainCode(options: CodeExplanationOptions): Promise<string> {
    const {
      language,
      code,
      detailLevel = 'detailed',
      audience = 'intermediate',
    } = options;

    const prompt = this.buildPrompt(language, code, detailLevel, audience);

    const config: AIRequestConfig = {
      provider: await aiProviderManager.selectProvider(),
      model: 'gpt-4',
      messages: [
        { role: 'system', content: this.buildSystemPrompt(language) },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      maxTokens: 2048,
      stream: false,
    };

    const response = await aiProviderManager.request(config);
    return response.content;
  }

  /**
   * 构建系统提示词
   */
  private buildSystemPrompt(language: string): string {
    return `You are an expert ${language} programmer and educator. Explain code clearly and accurately.`;
  }

  /**
   * 构建提示词
   */
  private buildPrompt(
    language: string,
    code: string,
    detailLevel: string,
    audience: string
  ): string {
    let prompt = `Language: ${language}\n`;
    prompt += `Detail Level: ${detailLevel}\n`;
    prompt += `Target Audience: ${audience}\n\n`;
    prompt += `Code:\n\`\`\`${language}\n${code}\n\`\`\`\n\n`;
    prompt += `Please explain this code. Include:\n`;
    prompt += `- Overall purpose and functionality\n`;
    prompt += `- Key components and their roles\n`;
    prompt += `- How the code works\n`;
    prompt += `- Any important patterns or techniques used\n`;
    prompt += `- Potential improvements or issues (if any)`;

    return prompt;
  }
}

export const codeExplainer = new CodeExplainer();
```

---

## ✅ 验收标准

### 功能完整性

- ✅ 代码生成功能正常
- ✅ 代码补全功能完善
- ✅ 代码优化功能准确
- ✅ 代码解释功能清晰
- ✅ 流式输出支持

### 代码质量

- ✅ 代码结构清晰
- ✅ 类型定义完整
- ✅ 注释文档完整
- ✅ 代码可维护性好
- ✅ 测试覆盖充分You are a senior frontend architect and document editing specialist with deep expertise in rich text editors, Markdown processing, and advanced document management systems.
文档编辑器
Your Role & Expertise

You are an experienced frontend architect who specializes in:
- **Rich Text Editors**: TipTap, ProseMirror, Quill, Slate.js, CKEditor
- **Markdown Processing**: Markdown rendering, syntax highlighting, live preview
- **Code Editors**: Monaco Editor, CodeMirror, Ace Editor, Prism.js
- **Document Management**: Version history, auto-save, document export
- **Real-time Collaboration**: Yjs, CRDT, cursor tracking, conflict resolution
- **Advanced Features**: Tables, images, embeds, custom blocks, extensions
- **Performance**: Virtual scrolling, lazy loading, efficient rendering
- **Best Practices**: Accessibility, keyboard shortcuts, mobile support

### Code Standards

**IMPORTANT**: Please ensure all generated code files follow the team requirements specified in: `guidelines/YYC3-Code-header.md`

All code files must include proper file headers with:
- @file: File name/path
- @description: Clear description of file purpose
- @author: YanYuCloudCube Team <admin@0379.email>
- @version: Semantic version (v1.0.0)
- @created: Creation date (YYYY-MM-DD)
- @updated: Last update date (YYYY-MM-DD)
- @status: File status (draft/dev/test/stable/deprecated)
- @license: License type
- @copyright: Copyright notice
- @tags: Relevant tags for categorization

---

## 📋 文档信息

| 字段 | 内容 |
|------|------|
| @file | P2-高级功能/YYC3-P2-高级-文档编辑器.md |
| @description | 高级文档编辑器功能实现，支持富文本、Markdown、代码高亮、实时预览等 |
| @author | YanYuCloudCube Team <admin@0379.email> |
| @version | v1.0.0 |
| @created | 2026-03-14 |
| @updated | 2026-03-14 |
| @status | stable |
| @license | MIT |
| @copyright | Copyright (c) 2026 YanYuCloudCube Team |
| @tags P2,advanced,editor,markdown,code-highlight |

---

## 🎯 功能目标

实现高级文档编辑器功能，包括：
- ✅ 富文本编辑（所见即所得）
- ✅ Markdown 编辑与预览
- ✅ 代码高亮与语法支持
- ✅ 实时协作编辑
- ✅ 版本历史与回滚
- ✅ 自动保存
- ✅ 导出多种格式
- ✅ 搜索与替换
- ✅ 快捷键支持

---

## 🏗️ 技术架构

### 核心技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| TipTap | 2.1.12 | 富文本编辑器 |
| ProseMirror | 1.32.1 | 编辑器核心 |
| Monaco Editor | 0.45.0 | 代码编辑器 |
| React-Markdown | 9.0.1 | Markdown 渲染 |
| Prism.js | 1.29.0 | 代码高亮 |
| Yjs | 13.6.10 | 实时协作 |
| diff-match-patch | 1.0.5 | 差异比较 |

### 架构分层

```
┌─────────────────────────────────────┐
│   UI 层 (UI Layer)                   │
│  - 编辑器界面                        │
│  - 工具栏                           │
│  - 状态栏                           │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   编辑器层 (Editor Layer)            │
│  - TipTap 富文本编辑器              │
│  - Monaco 代码编辑器                │
│  - Markdown 编辑器                  │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   协作层 (Collaboration Layer)       │
│  - Yjs CRDT                         │
│  - 感知光标                         │
│  - 冲突解决                         │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   存储层 (Storage Layer)             │
│  - 本地存储                         │
│  - 版本历史                         │
│  - 自动保存                         │
└─────────────────────────────────────┘
```

---

## 📝 富文本编辑器

### TipTap 编辑器配置

```typescript
// src/editor/TipTapEditor.tsx
import React, { useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';

/**
 * 编辑器属性
 */
interface TipTapEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  onSave?: () => void;
  editable?: boolean;
  placeholder?: string;
  collaboration?: boolean;
  yDoc?: Y.Doc;
}

/**
 * TipTap 编辑器组件
 */
export const TipTapEditor: React.FC<TipTapEditorProps> = ({
  content,
  onChange,
  onSave,
  editable = true,
  placeholder = '开始输入...',
  collaboration = false,
  yDoc,
}) => {
  const lowlight = createLowlight(common);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // 使用 CodeBlockLowlight 替代
      }),
      Placeholder.configure({
        placeholder,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 underline',
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlockLowlight.configure({
        lowlight,
      }),
      ...(collaboration && yDoc ? [
        Collaboration.configure({
          document: yDoc,
        }),
      ] : []),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
    },
  });

  // 快捷键支持
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S 保存
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor, onSave]);

  if (!editor) {
    return null;
  }

  return (
    <div className="tiptap-editor">
      <EditorContent editor={editor} />
    </div>
  );
};
```

### 工具栏组件

```typescript
// src/editor/EditorToolbar.tsx
import React from 'react';
import { useEditor } from '@tiptap/react';

/**
 * 编辑器工具栏组件
 */
export const EditorToolbar: React.FC = () => {
  const editor = useEditor();

  if (!editor) {
    return null;
  }

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  }, [editor]);

  const addImage = useCallback(() => {
    const url = window.prompt('图片 URL');

    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const addTable = useCallback(() => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  const deleteTable = useCallback(() => {
    editor.chain().focus().deleteTable().run();
  }, [editor]);

  return (
    <div className="editor-toolbar">
      {/* 文本格式 */}
      <div className="toolbar-group">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`toolbar-button ${editor.isActive('bold') ? 'active' : ''}`}
          title="粗体 (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`toolbar-button ${editor.isActive('italic') ? 'active' : ''}`}
          title="斜体 (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={`toolbar-button ${editor.isActive('strike') ? 'active' : ''}`}
          title="删除线"
        >
          <s>S</s>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={!editor.can().chain().focus().toggleCode().run()}
          className={`toolbar-button ${editor.isActive('code') ? 'active' : ''}`}
          title="行内代码"
        >
          {'<>'}
        </button>
      </div>

      {/* 标题 */}
      <div className="toolbar-group">
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`toolbar-button ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`}
          title="标题 1"
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`toolbar-button ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`}
          title="标题 2"
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`toolbar-button ${editor.isActive('heading', { level: 3 }) ? 'active' : ''}`}
          title="标题 3"
        >
          H3
        </button>
      </div>

      {/* 列表 */}
      <div className="toolbar-group">
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`toolbar-button ${editor.isActive('bulletList') ? 'active' : ''}`}
          title="无序列表"
        >
          •
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`toolbar-button ${editor.isActive('orderedList') ? 'active' : ''}`}
          title="有序列表"
        >
          1.
        </button>
        <button
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={`toolbar-button ${editor.isActive('taskList') ? 'active' : ''}`}
          title="任务列表"
        >
          ☑
        </button>
      </div>

      {/* 对齐 */}
      <div className="toolbar-group">
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`toolbar-button ${editor.isActive({ textAlign: 'left' }) ? 'active' : ''}`}
          title="左对齐"
        >
          ←
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`toolbar-button ${editor.isActive({ textAlign: 'center' }) ? 'active' : ''}`}
          title="居中"
        >
          ↔
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`toolbar-button ${editor.isActive({ textAlign: 'right' }) ? 'active' : ''}`}
          title="右对齐"
        >
          →
        </button>
      </div>

      {/* 插入 */}
      <div className="toolbar-group">
        <button onClick={setLink} className="toolbar-button" title="链接">
          🔗
        </button>
        <button onClick={addImage} className="toolbar-button" title="图片">
          🖼️
        </button>
        <button onClick={addTable} className="toolbar-button" title="表格">
          📊
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`toolbar-button ${editor.isActive('codeBlock') ? 'active' : ''}`}
          title="代码块"
        >
          {'</>'}
        </button>
      </div>

      {/* 表格操作 */}
      {editor.isActive('table') && (
        <div className="toolbar-group">
          <button onClick={addTable} className="toolbar-button" title="插入表格">
            + 表格
          </button>
          <button onClick={deleteTable} className="toolbar-button" title="删除表格">
            - 表格
          </button>
          <button
            onClick={() => editor.chain().focus().addColumnBefore().run()}
            className="toolbar-button"
            title="在左侧添加列"
          >
            + 列
          </button>
          <button
            onClick={() => editor.chain().focus().deleteColumn().run()}
            className="toolbar-button"
            title="删除列"
          >
            - 列
          </button>
          <button
            onClick={() => editor.chain().focus().addRowBefore().run()}
            className="toolbar-button"
            title="在上方添加行"
          >
            + 行
          </button>
          <button
            onClick={() => editor.chain().focus().deleteRow().run()}
            className="toolbar-button"
            title="删除行"
          >
            - 行
          </button>
        </div>
      )}

      {/* 撤销重做 */}
      <div className="toolbar-group">
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="toolbar-button"
          title="撤销 (Ctrl+Z)"
        >
          ↩️
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="toolbar-button"
          title="重做 (Ctrl+Y)"
        >
          ↪️
        </button>
      </div>
    </div>
  );
};
```

---

## 💻 代码编辑器

### Monaco 编辑器配置

```typescript
// src/editor/MonacoEditor.tsx
import React, { useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

/**
 * 代码编辑器属性
 */
interface MonacoEditorProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  language?: string;
  theme?: string;
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
  onSave?: () => void;
}

/**
 * Monaco 代码编辑器组件
 */
export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value = '',
  onChange,
  language = 'typescript',
  theme = 'vs-dark',
  options,
  onSave,
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // 添加快捷键
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave?.();
    });

    // 添加自动保存
    let saveTimeout: NodeJS.Timeout;
    editor.onDidChangeModelContent(() => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        onSave?.();
      }, 2000); // 2秒后自动保存
    });
  };

  const defaultOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
    minimap: { enabled: true },
    fontSize: 14,
    lineNumbers: 'on',
    roundedSelection: false,
    scrollBeyondLastLine: false,
    readOnly: false,
    automaticLayout: true,
    tabSize: 2,
    wordWrap: 'on',
    formatOnPaste: true,
    formatOnType: true,
    ...options,
  };

  return (
    <div className="monaco-editor-wrapper">
      <Editor
        height="100%"
        language={language}
        value={value}
        theme={theme}
        options={defaultOptions}
        onChange={onChange}
        onMount={handleEditorDidMount}
      />
    </div>
  );
};
```

---

## 📄 Markdown 编辑器

### Markdown 编辑器组件

```typescript
// src/editor/MarkdownEditor.tsx
import React, { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

/**
 * Markdown 编辑器属性
 */
interface MarkdownEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  onSave?: () => void;
  editable?: boolean;
  showPreview?: boolean;
}

/**
 * Markdown 编辑器组件
 */
export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  content = '',
  onChange,
  onSave,
  editable = true,
  showPreview = true,
}) => {
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      onSave?.();
    }
  }, [onSave]);

  return (
    <div className="markdown-editor">
      {/* 工具栏 */}
      <div className="markdown-toolbar">
        <button
          onClick={() => setIsPreviewMode(!isPreviewMode)}
          className="toolbar-button"
        >
          {isPreviewMode ? '编辑' : '预览'}
        </button>
        <button onClick={onSave} className="toolbar-button">
          保存 (Ctrl+S)
        </button>
      </div>

      {/* 编辑器/预览区 */}
      <div className="markdown-content">
        {editable && !isPreviewMode && (
          <textarea
            value={content}
            onChange={(e) => onChange?.(e.target.value)}
            onKeyDown={handleKeyDown}
            className="markdown-textarea"
            placeholder="输入 Markdown 内容..."
          />
        )}

        {showPreview && (isPreviewMode || !editable) && (
          <div className="markdown-preview">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## 🔄 实时协作

### 协作编辑器

```typescript
// src/editor/CollaborativeEditor.tsx
import React, { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { TipTapEditor } from './TipTapEditor';
import { useSync } from '../contexts/SyncContext';

/**
 * 协作编辑器属性
 */
interface CollaborativeEditorProps {
  documentId: string;
  content?: string;
  onChange?: (content: string) => void;
  onSave?: () => void;
}

/**
 * 协作编辑器组件
 */
export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  documentId,
  content,
  onChange,
  onSave,
}) => {
  const [yDoc, setYDoc] = useState<Y.Doc | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<number>(0);
  const { isOnline } = useSync();

  useEffect(() => {
    if (!isOnline) return;

    // 创建 Yjs 文档
    const doc = new Y.Doc();

    // 连接到 WebSocket 服务器
    const wsProvider = new WebsocketProvider(
      'ws://localhost:3201',
      documentId,
      doc
    );

    // 监听连接状态
    wsProvider.on('status', (event: any) => {
      console.log('Connection status:', event.status);
    });

    // 监听用户连接
    wsProvider.awareness.on('change', () => {
      setConnectedUsers(wsProvider.awareness.getStates().size);
    });

    setYDoc(doc);

    return () => {
      wsProvider.destroy();
      doc.destroy();
    };
  }, [documentId, isOnline]);

  if (!isOnline) {
    return (
      <div className="collaborative-editor-offline">
        <p>离线模式，协作功能不可用</p>
        <TipTapEditor
          content={content}
          onChange={onChange}
          onSave={onSave}
          editable={true}
        />
      </div>
    );
  }

  if (!yDoc) {
    return <div className="collaborative-editor-loading">连接中...</div>;
  }

  return (
    <div className="collaborative-editor">
      <div className="collaborative-header">
        <div className="collaborative-info">
          <span className="collaborative-users">
            👥 {connectedUsers} 人在线
          </span>
          <span className="collaborative-status">
            🟢 实时协作中
          </span>
        </div>
      </div>

      <TipTapEditor
        content={content}
        onChange={onChange}
        onSave={onSave}
        editable={true}
        collaboration={true}
        yDoc={yDoc}
      />
    </div>
  );
};
```

---

## 📜 版本历史

### 版本管理

```typescript
// src/editor/VersionHistory.tsx
import React, { useState, useEffect } from 'react';
import { storageService } from '../storage/storage-service';
import { Note } from '../storage/db';

/**
 * 版本历史组件
 */
export const VersionHistory: React.FC<{ noteId: string }> = ({ noteId }) => {
  const [versions, setVersions] = useState<Note[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<Note | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadVersions();
    }
  }, [isOpen, noteId]);

  const loadVersions = async () => {
    try {
      const note = await storageService.getNote(noteId);
      if (note) {
        // 这里应该从版本历史存储中加载
        // 暂时只显示当前版本
        setVersions([note]);
      }
    } catch (error) {
      console.error('Failed to load versions:', error);
    }
  };

  const handleRestore = async (version: Note) => {
    try {
      await storageService.updateNote(noteId, {
        title: version.title,
        content: version.content,
        tags: version.tags,
      });
      alert('版本已恢复');
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to restore version:', error);
      alert('恢复版本失败');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  return (
    <div className="version-history">
      <button
        className="version-history-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? '收起历史' : '版本历史'}
      </button>

      {isOpen && (
        <div className="version-history-content">
          <div className="version-history-header">
            <h3>版本历史</h3>
            <button onClick={loadVersions}>刷新</button>
          </div>

          <div className="version-history-list">
            {versions.map((version, index) => (
              <div key={index} className="version-item">
                <div className="version-item-header">
                  <span className="version-title">{version.title}</span>
                  <span className="version-date">
                    {formatDate(version.updatedAt)}
                  </span>
                </div>
                <div className="version-item-body">
                  <div className="version-content">
                    {version.content.substring(0, 200)}...
                  </div>
                  <button
                    onClick={() => handleRestore(version)}
                    className="btn btn-primary"
                  >
                    恢复此版本
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## 🔍 搜索与替换

### 搜索替换组件

```typescript
// src/editor/SearchReplace.tsx
import React, { useState } from 'react';

/**
 * 搜索替换组件
 */
export const SearchReplace: React.FC<{
  onSearch: (query: string) => void;
  onReplace: (query: string, replacement: string) => void;
  onReplaceAll: (query: string, replacement: string) => void;
}> = ({ onSearch, onReplace, onReplaceAll }) => {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [isRegex, setIsRegex] = useState(false);

  const handleSearch = () => {
    onSearch(query);
  };

  const handleReplace = () => {
    onReplace(query, replacement);
  };

  const handleReplaceAll = () => {
    onReplaceAll(query, replacement);
  };

  return (
    <div className="search-replace">
      <div className="search-replace-row">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索..."
          className="search-input"
        />
        <button onClick={handleSearch} className="btn btn-primary">
          搜索
        </button>
      </div>

      <div className="search-replace-row">
        <input
          type="text"
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
          placeholder="替换为..."
          className="replace-input"
        />
        <button onClick={handleReplace} className="btn btn-secondary">
          替换
        </button>
        <button onClick={handleReplaceAll} className="btn btn-secondary">
          全部替换
        </button>
      </div>

      <div className="search-replace-options">
        <label>
          <input
            type="checkbox"
            checked={isCaseSensitive}
            onChange={(e) => setIsCaseSensitive(e.target.checked)}
          />
          区分大小写
        </label>
        <label>
          <input
            type="checkbox"
            checked={isRegex}
            onChange={(e) => setIsRegex(e.target.checked)}
          />
          正则表达式
        </label>
      </div>
    </div>
  );
};
```

---

## 🎨 样式设计

### CSS 样式

```css
/* src/styles/Editor.css */

.tiptap-editor {
  min-height: 400px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.tiptap-editor .ProseMirror {
  outline: none;
}

.tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
  color: rgba(255, 255, 255, 0.4);
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

.editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 16px;
}

.toolbar-group {
  display: flex;
  gap: 4px;
  padding-right: 8px;
  margin-right: 8px;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.toolbar-group:last-child {
  border-right: none;
}

.toolbar-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.toolbar-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

.toolbar-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toolbar-button.active {
  background: rgba(102, 126, 234, 0.3);
  border-color: rgba(102, 126, 234, 0.5);
}

.monaco-editor-wrapper {
  height: 100%;
  min-height: 400px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.markdown-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 400px;
}

.markdown-toolbar {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 16px;
}

.markdown-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.markdown-textarea {
  width: 100%;
  height: 100%;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  outline: none;
}

.markdown-textarea:focus {
  border-color: rgba(102, 126, 234, 0.5);
}

.markdown-preview {
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow-y: auto;
  line-height: 1.6;
}

.markdown-preview h1,
.markdown-preview h2,
.markdown-preview h3,
.markdown-preview h4,
.markdown-preview h5,
.markdown-preview h6 {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  color: rgba(255, 255, 255, 0.9);
}

.markdown-preview p {
  margin-bottom: 1em;
  color: rgba(255, 255, 255, 0.8);
}

.markdown-preview code {
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.9em;
}

.markdown-preview pre {
  margin: 1em 0;
  padding: 16px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  overflow-x: auto;
}

.markdown-preview pre code {
  padding: 0;
  background: transparent;
}

.markdown-preview blockquote {
  margin: 1em 0;
  padding: 8px 16px;
  border-left: 4px solid rgba(102, 126, 234, 0.5);
  background: rgba(102, 126, 234, 0.1);
  color: rgba(255, 255, 255, 0.7);
}

.markdown-preview ul,
.markdown-preview ol {
  margin: 1em 0;
  padding-left: 2em;
}

.markdown-preview li {
  margin-bottom: 0.5em;
  color: rgba(255, 255, 255, 0.8);
}

.markdown-preview a {
  color: #667eea;
  text-decoration: underline;
}

.markdown-preview img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}

.markdown-preview table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
}

.markdown-preview th,
.markdown-preview td {
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: left;
}

.markdown-preview th {
  background: rgba(102, 126, 234, 0.2);
  font-weight: 600;
}

.collaborative-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.collaborative-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 16px;
}

.collaborative-info {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
}

.collaborative-users {
  display: flex;
  align-items: center;
  gap: 4px;
}

.collaborative-status {
  display: flex;
  align-items: center;
  gap: 4px;
}

.collaborative-editor-offline {
  padding: 16px;
  background: rgba(255, 152, 0, 0.1);
  border: 1px solid rgba(255, 152, 0, 0.3);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.9);
}

.collaborative-editor-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  color: rgba(255, 255, 255, 0.6);
}

.version-history {
  margin-top: 16px;
}

.version-history-toggle {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.version-history-content {
  margin-top: 12px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.version-history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.version-history-header h3 {
  margin: 0;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.9);
}

.version-history-list {
  max-height: 400px;
  overflow-y: auto;
}

.version-item {
  padding: 12px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.version-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.version-title {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.version-date {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.version-item-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.version-content {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  padding: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-replace {
  padding: 16px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.search-replace-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.search-input,
.replace-input {
  flex: 1;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  font-size: 14px;
  outline: none;
}

.search-input:focus,
.replace-input:focus {
  border-color: rgba(102, 126, 234, 0.5);
}

.search-replace-options {
  display: flex;
  gap: 16px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.search-replace-options label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
}
```

---

## 🧪 测试用例

### 组件测试

```typescript
// src/editor/__tests__/TipTapEditor.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TipTapEditor } from '../TipTapEditor';

describe('TipTapEditor', () => {
  it('should render editor with initial content', () => {
    render(
      <TipTapEditor
        content="<p>Initial content</p>"
        onChange={() => {}}
      />
    );

    expect(screen.getByText('Initial content')).toBeInTheDocument();
  });

  it('should call onChange when content changes', () => {
    const handleChange = vi.fn();
    render(
      <TipTapEditor
        content=""
        onChange={handleChange}
      />
    );

    const editor = document.querySelector('.ProseMirror');
    if (editor) {
      fireEvent.input(editor, {
        target: { innerHTML: '<p>New content</p>' },
      });
    }

    expect(handleChange).toHaveBeenCalled();
  });

  it('should be disabled when editable is false', () => {
    render(
      <TipTapEditor
        content="<p>Content</p>"
        onChange={() => {}}
        editable={false}
      />
    );

    const editor = document.querySelector('.ProseMirror');
    expect(editor).toHaveAttribute('contenteditable', 'false');
  });
});
```

---

## 📝 使用示例

### 集成到应用

```typescript
// src/App.tsx
import React, { useState } from 'react';
import { TipTapEditor } from './editor/TipTapEditor';
import { EditorToolbar } from './editor/EditorToolbar';
import { MonacoEditor } from './editor/MonacoEditor';
import { MarkdownEditor } from './editor/MarkdownEditor';
import { CollaborativeEditor } from './editor/CollaborativeEditor';
import { VersionHistory } from './editor/VersionHistory';

const App: React.FC = () => {
  const [content, setContent] = useState('');
  const [editorType, setEditorType] = useState<'richtext' | 'code' | 'markdown' | 'collaborative'>('richtext');

  const handleSave = () => {
    console.log('Saving content:', content);
    // 保存逻辑
  };

  return (
    <div className="app">
      {/* 编辑器类型切换 */}
      <div className="editor-type-switcher">
        <button onClick={() => setEditorType('richtext')}>富文本</button>
        <button onClick={() => setEditorType('code')}>代码</button>
        <button onClick={() => setEditorType('markdown')}>Markdown</button>
        <button onClick={() => setEditorType('collaborative')}>协作</button>
      </div>

      {/* 编辑器 */}
      {editorType === 'richtext' && (
        <div className="richtext-editor">
          <EditorToolbar />
          <TipTapEditor
            content={content}
            onChange={setContent}
            onSave={handleSave}
          />
        </div>
      )}

      {editorType === 'code' && (
        <div className="code-editor">
          <MonacoEditor
            value={content}
            onChange={(value) => setContent(value || '')}
            language="typescript"
            onSave={handleSave}
          />
        </div>
      )}

      {editorType === 'markdown' && (
        <div className="markdown-editor">
          <MarkdownEditor
            content={content}
            onChange={setContent}
            onSave={handleSave}
            showPreview={true}
          />
        </div>
      )}

      {editorType === 'collaborative' && (
        <div className="collaborative-editor">
          <CollaborativeEditor
            documentId="doc-1"
            content={content}
            onChange={setContent}
            onSave={handleSave}
          />
        </div>
      )}

      {/* 版本历史 */}
      <VersionHistory noteId="note-1" />
    </div>
  );
};

export default App;
```

---

## ✅ 验收标准

### 功能完整性

- ✅ 富文本编辑功能完整
- ✅ Markdown 编辑与预览
- ✅ 代码编辑与高亮
- ✅ 实时协作编辑
- ✅ 版本历史与回滚
- ✅ 自动保存
- ✅ 导出多种格式
- ✅ 搜索与替换
- ✅ 快捷键支持

### 代码质量

- ✅ 所有 TypeScript 编译错误修复
- ✅ ESLint 规则全部通过
- ✅ 无 React Console 警告
- ✅ JSDoc 文档覆盖率 >90%
- ✅ 代码规范完全统一
- ✅ 无循环依赖和死代码、硬编码

### 用户体验

- ✅ 编辑器响应流畅
- ✅ 工具栏功能完善
- ✅ 快捷键操作便捷
- ✅ 实时预览准确
- ✅ 协作编辑稳定
- ✅ 版本管理清晰

### 测试覆盖

- ✅ 单元测试覆盖率 > 80%
- ✅ 组件测试覆盖所有交互
- ✅ 集成测试验证编辑流程
- ✅ E2E 测试覆盖关键用户场景

---You are a senior collaboration architect and real-time systems specialist with deep expertise in CRDT (Conflict-free Replicated Data Types), real-time synchronization, and multi-user application development.
实时协作
Your Role & Expertise

You are an experienced collaboration architect who specializes in:
- **Real-time Collaboration**: Yjs, Automerge, ShareDB, WebSocket, WebRTC
- **CRDT Systems**: Conflict resolution, operational transformation, state synchronization
- **User Awareness**: Cursor tracking, user presence, online status indicators
- **Conflict Resolution**: Automatic conflict resolution, merge strategies, version control
- **WebSocket Communication**: Real-time messaging, bidirectional communication, connection management
- **Performance Optimization**: Delta updates, compression, efficient synchronization
- **Security**: Authentication, authorization, encrypted communication
- **Best Practices**: Offline support, reconnection handling, data consistency

### Code Standards

**IMPORTANT**: Please ensure all generated code files follow the team requirements specified in: `guidelines/YYC3-Code-header.md`

All code files must include proper file headers with:
- @file: File name/path
- @description: Clear description of file purpose
- @author: YanYuCloudCube Team <admin@0379.email>
- @version: Semantic version (v1.0.0)
- @created: Creation date (YYYY-MM-DD)
- @updated: Last update date (YYYY-MM-DD)
- @status: File status (draft/dev/test/stable/deprecated)
- @license: License type
- @copyright: Copyright notice
- @tags: Relevant tags for categorization

---

## 📋 文档信息

| 字段 | 内容 |
|------|------|
| @file | P2-高级功能/YYC3-P2-协作-实时协作.md |
| @description | 实时协作功能设计和实现，使用 Yjs 实现 CRDT |
| @author | YanYuCloudCube Team <admin@0379.email> |
| @version | v1.0.0 |
| @created | 2026-03-14 |
| @updated | 2026-03-14 |
| @status | stable |
| @license | MIT |
| @copyright | Copyright (c) 2026 YanYuCloudCube Team |
| @tags P2,collaboration,real-time,crdt |

---

## 🎯 功能目标

### 核心目标

1. **实时同步**：多用户实时编辑同步
2. **冲突解决**：自动解决编辑冲突
3. **光标追踪**：显示其他用户光标位置
4. **用户状态**：显示用户在线状态
5. **权限控制**：细粒度权限管理
6. **版本历史**：完整的版本历史记录

---

## 🏗️ 架构设计

### 1. 协作架构

```
Collaboration/
├── YjsProvider           # Yjs 提供商
├── WebSocketProvider     # WebSocket 提供商
├── AwarenessProvider     # 用户感知
├── CursorTracker        # 光标追踪
├── ConflictResolver     # 冲突解决
└── VersionHistory      # 版本历史
```

### 2. 数据流

```
User Action (用户操作)
    ↓ Local Change
Yjs Document (Yjs 文档)
    ↓ Update
WebSocket (WebSocket)
    ↓ Broadcast
Other Users (其他用户)
    ↓ Apply Change
Yjs Document (Yjs 文档)
    ↓ Update
UI (界面)
```

---

## 💻 核心实现

### 1. Yjs 提供商

```typescript
// src/collaboration/YjsProvider.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import type { Collaborator } from '@/types';

interface YjsContextType {
  ydoc: Y.Doc | null;
  provider: WebsocketProvider | null;
  connected: boolean;
  collaborators: Map<string, Collaborator>;
  connect: () => void;
  disconnect: () => void;
}

const YjsContext = createContext<YjsContextType | null>(null);

export const YjsProvider: React.FC<{ children: React.ReactNode; roomId: string }> = ({
  children,
  roomId,
}) => {
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [connected, setConnected] = useState(false);
  const [collaborators, setCollaborators] = useState<Map<string, Collaborator>>(new Map());
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  const connect = () => {
    if (ydocRef.current) return;

    // 创建 Yjs 文档
    const doc = new Y.Doc();
    ydocRef.current = doc;
    setYdoc(doc);

    // 创建 WebSocket 提供商
    const wsProvider = new WebsocketProvider(
      import.meta.env.VITE_WS_URL || 'ws://localhost:3201',
      roomId,
      doc,
      {
        connect: true,
      }
    );
    providerRef.current = wsProvider;
    setProvider(wsProvider);

    // 监听连接状态
    wsProvider.on('status', (event: any) => {
      setConnected(event.status === 'connected');
    });

    // 监听用户感知
    wsProvider.awareness.on('change', () => {
      const states = wsProvider.awareness.getStates() as Map<string, any>;
      const collaboratorsMap = new Map<string, Collaborator>();

      states.forEach((state, clientId) => {
        if (state.user) {
          collaboratorsMap.set(clientId.toString(), {
            userId: state.user.id,
            username: state.user.name,
            avatar: state.user.avatar,
            cursor: state.cursor,
            color: state.user.color,
            online: true,
          });
        }
      });

      setCollaborators(collaboratorsMap);
    });
  };

  const disconnect = () => {
    if (providerRef.current) {
      providerRef.current.destroy();
      providerRef.current = null;
      setProvider(null);
    }

    if (ydocRef.current) {
      ydocRef.current.destroy();
      ydocRef.current = null;
      setYdoc(null);
    }

    setConnected(false);
    setCollaborators(new Map());
  };

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [roomId]);

  return (
    <YjsContext.Provider
      value={{
        ydoc,
        provider,
        connected,
        collaborators,
        connect,
        disconnect,
      }}
    >
      {children}
    </YjsContext.Provider>
  );
};

export const useYjs = () => {
  const context = useContext(YjsContext);
  if (!context) {
    throw new Error('useYjs must be used within YjsProvider');
  }
  return context;
};
```

### 2. 光标追踪

```typescript
// src/collaboration/CursorTracker.tsx
import React, { useEffect, useRef } from 'react';
import { useYjs } from './YjsProvider';
import type { Collaborator } from '@/types';

interface CursorTrackerProps {
  documentId: string;
}

export const CursorTracker: React.FC<CursorTrackerProps> = ({ documentId }) => {
  const { provider, collaborators } = useYjs();
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!provider) return;

    // 监听光标移动
    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const selection = window.getSelection();

      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // 更新本地光标位置
        provider.awareness.setLocalStateField('cursor', {
          position: {
            line: 0, // 需要根据编辑器计算
            column: 0,
          },
          selection: {
            start: 0,
            end: 0,
          },
        });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [provider]);

  return (
    <div className="cursor-tracker">
      {Array.from(collaborators.values()).map((collaborator) => (
        <div
          key={collaborator.userId}
          className="remote-cursor"
          style={{
            left: collaborator.cursor?.line || 0,
            top: collaborator.cursor?.column || 0,
            borderColor: collaborator.color,
          }}
        >
          <div
            className="cursor-label"
            style={{ backgroundColor: collaborator.color }}
          >
            {collaborator.username}
          </div>
        </div>
      ))}
    </div>
  );
};
```

### 3. 协作编辑器

```typescript
// src/collaboration/CollaborativeEditor.tsx
import React, { useEffect, useRef } from 'react';
import { useYjs } from './YjsProvider';
import { CursorTracker } from './CursorTracker';
import * as Y from 'yjs';

interface CollaborativeEditorProps {
  documentId: string;
  onChange?: (content: string) => void;
}

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  documentId,
  onChange,
}) => {
  const { ydoc, connected } = useYjs();
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ydoc) return;

    // 获取或创建 Yjs 文本
    const ytext = ydoc.getText(documentId);

    // 监听文本变化
    ytext.observe((event) => {
      const content = ytext.toString();
      onChange?.(content);
    });

    // 初始化编辑器内容
    if (editorRef.current) {
      editorRef.current.innerText = ytext.toString();
    }
  }, [ydoc, documentId, onChange]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (!ydoc) return;

    const ytext = ydoc.getText(documentId);
    const newContent = e.currentTarget.innerText;

    // 同步到 Yjs
    ydoc.transact(() => {
      ytext.delete(0, ytext.length);
      ytext.insert(0, newContent);
    });
  };

  return (
    <div className="collaborative-editor-container">
      <CursorTracker documentId={documentId} />
      <div
        ref={editorRef}
        className="collaborative-editor"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
      />
      {!connected && <div className="connection-status">离线</div>}
    </div>
  );
};
```

---

## 🎨 样式实现

```css
/* src/collaboration/Collaboration.css */
.collaborative-editor-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.cursor-tracker {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
}

.remote-cursor {
  position: absolute;
  width: 2px;
  height: 20px;
  background-color: currentColor;
  transition: all 0.1s ease-out;
}

.cursor-label {
  position: absolute;
  top: -20px;
  left: 0;
  padding: 2px 6px;
  border-radius: 3px;
  color: white;
  font-size: 11px;
  white-space: nowrap;
  pointer-events: none;
}

.collaborative-editor {
  width: 100%;
  height: 100%;
  padding: 16px;
  overflow: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
  color: #cccccc;
  outline: none;
}

.collaborative-editor:focus {
  background: #1e1e1e;
}

.connection-status {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 6px 12px;
  background: #f44336;
  color: white;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

---

## ✅ 验收标准

### 功能完整性

- ✅ 实时同步功能正常
- ✅ 冲突解决准确
- ✅ 光标追踪流畅
- ✅ 用户状态准确
- ✅ 权限控制完善

### 用户体验

- ✅ 同步延迟低
- ✅ 冲突处理友好
- ✅ 光标显示清晰
- ✅ 状态提示明确
- ✅ 性能优化到位

### 代码质量

- ✅ 代码结构清晰
- ✅ 类型定义完整
- ✅ 注释文档完整
- ✅ 代码可维护性好
- ✅ 测试覆盖充分