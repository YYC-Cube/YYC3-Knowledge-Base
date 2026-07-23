/**
 * Ollama 模型调用工具类
 * 功能增强：
 * - 支持流式响应（返回 AsyncGenerator）
 * - 细化错误类型（网络错误、API 错误、响应解析错误）
 * - 严格类型定义（匹配 Ollama API 实际响应结构）
 * - 日志增强（请求/响应内容调试）
 */

// 匹配 Ollama API 响应结构（非流式）
type OllamaChatResponse = {
  response: {
    content: string;
    // 可扩展：添加 model、created_at 等字段
  };
  // 可扩展：添加 model、usage 等信息
};

// 流式响应的单条数据结构
type OllamaStreamChunk = {
  response: {
    content: string;
    done: boolean; // 是否结束
  };
};

type OllamaMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type OllamaRequest = {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
};

/**
 * 调用 Ollama 模型（支持流式/非流式）
 * @param model 模型名称（如 llama3:70b）
 * @param prompt 用户提示词
 * @param stream 是否启用流式响应
 * @returns 非流式：string | undefined；流式：AsyncGenerator<string>
 */
export const callOllamaModel = async (
  model: string,
  prompt: string,
  stream = false
): Promise<string | undefined | AsyncGenerator<string>> => {
  const requestBody: OllamaRequest = {
    model,
    messages: [{ role: 'user', content: prompt }],
    stream,
  };

  try {
    // 发起请求
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // 网络错误处理
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Ollama API 响应异常 [${response.status}]: ${errorText}`
      );
    }

    // 流式响应处理
    if (stream) {
      return handleStreamResponse(response);
    }

    // 非流式响应处理
    const data: OllamaChatResponse = await response.json();
    if (!data || !data.response || !data.response.content) {
      throw new Error('Ollama 响应结构异常（缺少 content）');
    }

    // 调试日志
    console.debug('[Ollama] 非流式响应:', data.response.content);
    return data.response.content;

  } catch (error) {
    // 统一错误处理
    console.error('[Ollama] 模型调用失败:', error);
    return undefined;
  }
};

/**
 * 处理流式响应（返回 AsyncGenerator，供前端逐字渲染）
 * @param response fetch 响应对象
 * @returns AsyncGenerator<string> 流式内容生成器
 */
const handleStreamResponse = async function* (
  response: Response
): AsyncGenerator<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('流式响应体为空');
  }

  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // 解析流式数据（Ollama 流式响应为换行分隔的 JSON）
    const text = new TextDecoder().decode(value);
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;

      try {
        const chunk: OllamaStreamChunk = JSON.parse(line);
        if (chunk.response.content) {
          result += chunk.response.content;
          // 逐段 yield 内容（前端可做打字机效果）
          yield chunk.response.content;
        }
        if (chunk.response.done) {
          // 调试日志
          console.debug('[Ollama] 流式响应完成:', result);
          return;
        }
      } catch (parseError) {
        console.warn('[Ollama] 流式数据解析异常:', line, parseError);
      }
    }
  }
};