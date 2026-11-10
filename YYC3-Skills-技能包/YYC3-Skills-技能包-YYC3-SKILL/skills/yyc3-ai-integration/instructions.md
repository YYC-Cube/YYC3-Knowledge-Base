# YYC3 AI能力集成指南

> **万象归元于云枢 | 深栈智启新纪元**

## 核心AI模型

### GLM-4.7（主要）

- 上下文窗口：131,072 tokens
- 提供者：zai
- 适用场景：代码生成、数据分析、长文本处理

### OpenAI GPT-4.1（辅助）

- 上下文窗口：100,000 tokens
- 代码理解准确率：54.6%
- 适用场景：复杂推理、代码分析

## 集成方式

### 1. 基础调用

```typescript
import { zai } from '@zai/sdk';

export async function chat(message: string) {
  const completion = await zai.chat.completions.create({
    model: 'glm-4.7',
    messages: [{ role: 'user', content: message }],
    temperature: 0.7,
    max_tokens: 2000
  });

  return completion.choices[0].message.content;
}
```

### 2. 流式响应

```typescript
export async function chatStream(message: string) {
  const stream = await zai.chat.completions.create({
    model: 'glm-4.7',
    messages: [{ role: 'user', content: message }],
    stream: true
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '');
  }
}
```

### 3. Function Calling

```typescript
export async function analyzeWithTools(query: string) {
  const completion = await zai.chat.completions.create({
    model: 'glm-4.7',
    messages: [{ role: 'user', content: query }],
    tools: [
      {
        type: 'function',
        function: {
          name: 'search_database',
          description: '搜索数据库',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string' }
            }
          }
        }
      }
    ]
  });

  return completion;
}
```

## RAG系统架构

### 1. 文档切分

```typescript
export async function splitDocuments(docs: Document[]) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200
  });
  return await splitter.splitDocuments(docs);
}
```

### 2. 向量化

```typescript
export async function embedDocuments(chunks: Document[]) {
  const embeddings = await zai.embeddings.create({
    model: 'glm-4.7-embeddings',
    input: chunks.map(c => c.pageContent)
  });
  return embeddings;
}
```

### 3. 检索生成

```typescript
export async function generateAnswer(query: string, context: string) {
  const completion = await zai.chat.completions.create({
    model: 'glm-4.7',
    messages: [{
      role: 'user',
      content: `基于以下上下文回答问题：\n\n${context}\n\n问题：${query}`
    }]
  });
  return completion.choices[0].message.content;
}
```

## 最佳实践

### 1. 错误处理

- 实现重试机制
- 超时控制
- 降级策略

### 2. 性能优化

- 流式响应
- 结果缓存
- 批量处理

### 3. 安全考虑

- API密钥管理
- 内容过滤
- 访问控制
