# 代码智能补全功能使用指南

## 概述

这个Monaco Editor代码智能补全功能为Arduino/C++开发提供了两种智能补全方式：

1. **本地代码分析补全** - 通过分析Arduino SDK和库文件中的.h和.cpp文件，提供函数、类、变量等的智能提示
2. **AI驱动的代码补全** - 通过云端大模型分析代码上下文，提供智能的代码建议和模板

## 功能特性

### 本地代码分析补全
- 自动解析Arduino SDK和库文件
- 支持函数、类、变量的智能提示
- 提供详细的函数签名和参数信息
- 显示符号来源文件信息

### AI代码补全
- 基于上下文的智能代码建议
- 支持代码片段和模板补全
- Tab键快速接受AI建议
- 智能缓存机制，提高响应速度
- 可配置的AI模型和参数

## 使用方法

### 1. 初始化
```typescript
// 在组件中注入服务
constructor(
  private codeIntelligenceService: CodeIntelligenceService
) {}

// 初始化智能补全功能
await this.codeIntelligenceService.initialize(sdkPath, librariesPath);
```

### 2. Monaco Editor集成
```typescript
// 注册补全提供器
const completionDisposable = monaco.languages.registerCompletionItemProvider('cpp', {
  provideCompletionItems: async (model, position, context, token) => {
    return await this.codeIntelligenceService.getCompletionItems(model, position, context, token);
  },
  triggerCharacters: ['.', '->', '::', '(', ' ']
});
```

### 3. AI配置
```typescript
// 配置AI功能
this.codeIntelligenceService.updateAIConfig({
  enabled: true,
  apiEndpoint: 'https://your-ai-api.com/completion',
  apiKey: 'your-api-key',
  timeout: 5000,
  model: 'gpt-3.5-turbo',
  temperature: 0.3
});
```

## AI API接口规范

### 请求格式
```typescript
interface AICompletionRequest {
  code: string;
  position: {
    line: number;
    column: number;
  };
  context: {
    beforeCursor: string;
    afterCursor: string;
    fileName?: string;
    language: string;
  };
}
```

### 响应格式
```typescript
interface AICompletionResponse {
  suggestions: Array<{
    text: string;
    description?: string;
    confidence: number;
    type: 'completion' | 'suggestion' | 'snippet';
  }>;
}
```

### 示例API实现（Node.js/Express）

```javascript
app.post('/api/completion', async (req, res) => {
  try {
    const { code, position, context } = req.body;
    
    // 调用你的AI模型API
    const response = await callAIModel({
      prompt: generatePrompt(code, context),
      maxTokens: 100,
      temperature: 0.3
    });
    
    const suggestions = parseAIResponse(response);
    
    res.json({ suggestions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 常用Arduino代码模板

系统内置了以下常用的Arduino代码模板，会根据上下文自动触发：

### 基础结构
- `setup` → Arduino setup函数模板
- `loop` → Arduino loop函数模板

### 串口通信
- `serial` → Serial相关函数
- `Serial.begin()` → 初始化串口
- `Serial.println()` → 串口输出

### 数字I/O
- `pinMode()` → 设置引脚模式
- `digitalWrite()` → 数字输出
- `digitalRead()` → 数字输入

### 模拟I/O
- `analogWrite()` → PWM输出
- `analogRead()` → 模拟输入

### 控制结构
- `for` → for循环模板
- `if` → if语句模板
- `while` → while循环模板

## 配置选项

### AI配置参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| enabled | boolean | true | 是否启用AI补全 |
| apiEndpoint | string | localhost:3000 | AI API端点 |
| apiKey | string | - | API密钥（可选） |
| timeout | number | 5000 | 请求超时时间（毫秒） |
| maxCacheSize | number | 100 | 最大缓存条目数 |
| model | string | code-completion | AI模型名称 |
| temperature | number | 0.3 | 生成温度（0-1） |

### 性能优化

1. **缓存机制** - AI补全结果会被缓存30秒，避免重复请求
2. **批量解析** - 本地符号一次性解析，提高启动速度
3. **异步处理** - 所有耗时操作都是异步的，不会阻塞UI
4. **智能触发** - 只在特定字符输入时触发补全

## 故障排除

### 常见问题

1. **本地补全不工作**
   - 检查SDK和库文件路径是否正确
   - 确保文件具有读取权限
   - 查看控制台是否有解析错误

2. **AI补全无响应**
   - 检查网络连接
   - 验证API端点是否可访问
   - 检查API密钥是否正确
   - 查看控制台网络错误信息

3. **补全速度慢**
   - 减少缓存大小设置
   - 降低API超时时间
   - 检查网络延迟

### 调试技巧

```typescript
// 开启调试模式
console.log('当前符号数量:', this.codeIntelligenceService.getSymbolsCount());
console.log('缓存状态:', this.codeIntelligenceService.getCacheStats());

// 搜索特定符号
const results = this.codeIntelligenceService.searchSymbols('digitalWrite');
console.log('找到的符号:', results);

// 清除缓存重新测试
this.codeIntelligenceService.clearAICache();
```

## 扩展开发

### 添加自定义补全提供器

```typescript
// 注册自定义补全
const customDisposable = monaco.languages.registerCompletionItemProvider('cpp', {
  provideCompletionItems: (model, position) => {
    // 你的自定义逻辑
    return {
      suggestions: [
        {
          label: 'myFunction',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'myFunction(${1:param})',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
        }
      ]
    };
  }
});
```

### 集成其他AI服务

你可以轻松集成其他AI服务（如OpenAI、Claude等）：

```typescript
// 自定义AI API调用
private async callCustomAI(request: AICompletionRequest): Promise<AICompletionResponse> {
  const response = await fetch('https://api.openai.com/v1/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      prompt: this.buildPrompt(request),
      max_tokens: 100
    })
  });
  
  return this.parseOpenAIResponse(await response.json());
}
```

## 最佳实践

1. **定期更新符号库** - 当添加新的库时，记得调用`updateLocalSymbols()`
2. **合理设置缓存** - 根据用户使用频率调整缓存大小
3. **监控API使用** - 记录AI API调用次数和成本
4. **提供离线支持** - 确保在无网络时本地补全仍可用
5. **用户反馈** - 收集用户对补全建议的反馈，持续改进

## 许可证

本功能遵循项目的开源许可证。
