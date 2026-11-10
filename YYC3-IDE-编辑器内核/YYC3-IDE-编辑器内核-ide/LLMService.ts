/**
 * @file: LLMService.ts
 * @description: 真实 LLM API 调用层 — 统一数据源来自 providers.ts
 *              仅支持 Zai-Plan (智谱) + Ollama (本地运行时检测)
 *              采用 OpenAI-compatible chat/completions 接口 + Ollama 原生接口，支持 SSE 流式响应
 * @author: YanYuCloudCube Team <admin@039.email>
 * @version: v2.0.0
 * @created: 2026-03-06
 * @updated: 2026-04-16
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: llm,api,streaming,sse,providers,zhipu,ollama
 */

import { logger } from "./services/Logger";
import { BUILTIN_PROVIDERS, type ProviderDef } from "./constants/providers";
import { getAIDegradationService, type DegradationLevel } from "./services/AIDegradationService";

export type ProviderId = "zai-plan" | "ollama";

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  nameEn: string;
  baseUrl: string;
  authType: "none" | "bearer";
  apiKey?: string;
  models: ProviderModel[];
  isLocal: boolean;
  detected: boolean;
  description: string;
  docsUrl: string;
}

export interface ProviderModel {
  id: string; // API model id
  name: string; // 显示名
  type: "llm" | "code" | "vision" | "embedding";
  maxTokens: number;
  contextWindow?: number;
  description?: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: string) => void;
}

// ── Provider 定义：从 providers.ts 统一数据源转换 ──

/**
 * 将 providers.ts 的 ProviderDef 转换为 LLMService 需要的 ProviderConfig 格式
 * 这是唯一的数据源转换点，确保全局一致性
 */
export function convertToProviderConfig(def: ProviderDef): ProviderConfig {
  return {
    id: def.id as ProviderId,
    name: def.name,
    nameEn: def.shortName,
    baseUrl: def.baseURL,
    authType: def.apiKeyPlaceholder ? "bearer" : "none",
    isLocal: def.id === "ollama",
    detected: def.id === "ollama", // Ollama 标记为需要检测
    description: def.description,
    docsUrl: def.docsUrl,
    models: def.models.map((m) => ({
      id: m.id,
      name: m.name,
      type: "llm" as const,
      maxTokens: 8192,
      contextWindow: m.contextWindow ? parseInt(m.contextWindow.replace("K", "")) * 1000 : 128000,
      description: m.description,
    })),
  };
}

/**
 * 获取供应商配置列表 — 唯一入口，从 providers.ts 转换
 */
export function getProviderConfigs(): ProviderConfig[] {
  return BUILTIN_PROVIDERS.map(convertToProviderConfig);
}

/**
 * 根据 ID 获取单个供应商配置
 */
export function getProviderConfig(providerId: ProviderId): ProviderConfig | undefined {
  const def = BUILTIN_PROVIDERS.find((p) => p.id === providerId);
  return def ? convertToProviderConfig(def) : undefined;
}

// ── API Key 存储 (localStorage) ──

const KEY_PREFIX = "yyc3_llm_key_";

/** 获取指定供应商的 API Key，未设置时返回空字符串 */
export function getApiKey(providerId: ProviderId): string {
  try {
    return localStorage.getItem(`${KEY_PREFIX}${providerId}`) || "";
  } catch {
    return "";
  }
}

/** 设置指定供应商的 API Key，key 为空时移除 */
export function setApiKey(providerId: ProviderId, key: string): void {
  try {
    if (key) {
      localStorage.setItem(`${KEY_PREFIX}${providerId}`, key);
    } else {
      localStorage.removeItem(`${KEY_PREFIX}${providerId}`);
    }
  } catch { /* empty */ }
}

/** 检查指定供应商是否已配置 API Key */
export function hasApiKey(providerId: ProviderId): boolean {
  return !!getApiKey(providerId);
}

/** 从环境变量初始化 API Key（仅当 localStorage 中未配置时） */
export function initializeApiKeysFromEnv(): void {
  const envMappings: Array<{ providerId: ProviderId; envKey: string }> = [
    { providerId: "zai-plan", envKey: "VITE_ZHIPU_API_KEY" },
  ];

  for (const { providerId, envKey } of envMappings) {
    const envValue = (import.meta as any).env?.[envKey];
    if (envValue && !hasApiKey(providerId)) {
      setApiKey(providerId, envValue);
      logger.info(`Initialized API key for ${providerId} from env ${envKey}`);
    }
  }
}

// ── Ollama 本地探测 ──

/** 探测本地 Ollama 服务，返回可用状态和模型列表 */
export async function detectOllama(): Promise<{
  available: boolean;
  models: ProviderModel[];
}> {
  try {
    logger.warn('Attempting to detect Ollama at http://localhost:11434/api/tags');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch("http://localhost:11434/api/tags", {
      signal: controller.signal,
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
      },
    });
    clearTimeout(timeoutId);

    logger.warn('[LLMService] Ollama response status:', res.status, String(res.ok));

    if (!res.ok) {
      logger.warn('[LLMService] Ollama response not OK:', res.status, res.statusText);
      return { available: false, models: [] };
    }

    const data = await res.json();
    logger.warn('[LLMService] Ollama detected models:', data.models?.length || 0);

    const models: ProviderModel[] = (data.models || []).map((m: any) => ({
      id: m.name || m.model,
      name: (m.name || m.model).split(":")[0],
      type: /code|coder|starcoder|deepseek-coder/i.test(m.name)
        ? ("code" as const)
        : ("llm" as const),
      maxTokens: 4096,
      contextWindow: m.details?.parameter_size
        ? parseInt(m.details.parameter_size)
        : undefined,
      description: `${m.details?.family || "Local"} · ${m.details?.parameter_size || "?"}`,
    }));

    return { available: true, models };
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      logger.warn('Ollama detection timeout after 3s');
    } else if (error?.message?.includes('Failed to fetch')) {
      logger.warn('Ollama not reachable - service may not be running or CORS not configured');
    } else {
      logger.warn('[LLMService] Ollama detection error:', error?.message || error);
    }
    return { available: false, models: [] };
  }
}

// ── 模型连通性测试 ──

export interface ConnectivityTestResult {
  success: boolean;
  latencyMs: number;
  modelId: string;
  providerId: ProviderId;
  reply?: string; // first few chars of the model's reply
  error?: string; // human-readable error reason
  errorCode?: string; // HTTP status or error type
  timestamp: number;
}

/**
 * Send a minimal "ping" message to the model and measure round-trip time.
 * Uses a very short prompt so the response is fast and cheap.
 */
export async function testModelConnectivity(
  provider: ProviderConfig,
  modelId: string,
  options?: { timeoutMs?: number },
): Promise<ConnectivityTestResult> {
  const timeoutMs = options?.timeoutMs ?? 15000;
  const start = Date.now();
  const base: Omit<ConnectivityTestResult, "success" | "latencyMs"> = {
    modelId,
    providerId: provider.id,
    timestamp: Date.now(),
  };

  // 1) For non-Ollama providers, check if API key is configured
  if (provider.authType === "bearer" && !getApiKey(provider.id)) {
    return {
      ...base,
      success: false,
      latencyMs: Date.now() - start,
      error: `未配置 ${provider.name} 的 API Key`,
      errorCode: "NO_API_KEY",
    };
  }

  // 2) Build a minimal chat request
  const endpoint = getChatEndpoint(provider);
  const headers = buildHeaders(provider);

  const body: any = {
    model: modelId,
    messages: [{ role: "user", content: "Hi" }],
    temperature: 0,
    max_tokens: 8,
    stream: false,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const latencyMs = Date.now() - start;

    if (!res.ok) {
      let errBody = "";
      try {
        errBody = await res.text();
      } catch { /* empty */ }
      // Parse common error patterns
      let reason = `HTTP ${res.status}`;
      if (res.status === 401 || res.status === 403) {
        reason = "认证失败 — API Key 无效或已过期";
      } else if (res.status === 404) {
        reason = `模型 "${modelId}" 不存在或端点路径错误`;
      } else if (res.status === 429) {
        reason = "请求频率超限 — 请稍后重试";
      } else if (
        res.status === 500 ||
        res.status === 502 ||
        res.status === 503
      ) {
        reason = `服务端错误 (${res.status}) — 模型服务可能未就绪`;
      } else if (errBody) {
        // Try to extract a short message
        try {
          const parsed = JSON.parse(errBody);
          reason =
            parsed.error?.message || parsed.message || parsed.error || reason;
        } catch {
          reason = errBody.slice(0, 120);
        }
      }
      return {
        ...base,
        success: false,
        latencyMs,
        error: reason,
        errorCode: `HTTP_${res.status}`,
      };
    }

    // Parse response
    const data = await res.json();
    let reply = "";
    if (provider.id === "ollama") {
      reply = data.message?.content || "";
    } else {
      reply = data.choices?.[0]?.message?.content || "";
    }

    return {
      ...base,
      success: true,
      latencyMs,
      reply: reply.slice(0, 50),
    };
  } catch (err: any) {
    clearTimeout(timer);
    const latencyMs = Date.now() - start;

    if (err.name === "AbortError") {
      return {
        ...base,
        success: false,
        latencyMs,
        error: `请求超时 (${(timeoutMs / 1000).toFixed(0)}s) — 模型未响应`,
        errorCode: "TIMEOUT",
      };
    }

    // Network-level errors
    let reason = err.message || "未知网络错误";
    if (/failed to fetch|network|cors|blocked/i.test(reason)) {
      reason = `网络连接失败 — 可能是 CORS 限制或服务未运行 (${provider.baseUrl})`;
    }

    return {
      ...base,
      success: false,
      latencyMs,
      error: reason,
      errorCode: "NETWORK",
    };
  }
}

// ── 获取聊天完成的 endpoint ──

export function getChatEndpoint(provider: ProviderConfig): string {
  if (provider.id === "ollama") {
    return `${provider.baseUrl}/api/chat`;
  }
  // Zai-Plan 使用代理 URL 避免跨域
  if (provider.id === "zai-plan") {
    return `/api/zhipu/chat/completions`;
  }
  // 默认 OpenAI-compatible 格式
  return `${provider.baseUrl}/chat/completions`;
}

// ── 构建请求 headers ──

export function buildHeaders(provider: ProviderConfig): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (provider.authType === "bearer") {
    const key = getApiKey(provider.id);
    if (key) {
      headers["Authorization"] = `Bearer ${key}`;
    }
  }

  return headers;
}

// ── 非流式调用 ──

export async function chatCompletion(
  provider: ProviderConfig,
  modelId: string,
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const endpoint = getChatEndpoint(provider);
  const headers = buildHeaders(provider);

  const body: any = {
    model: modelId,
    messages,
    temperature: options?.temperature ?? 0.7,
    stream: false,
  };

  if (options?.maxTokens) {
    body.max_tokens = options.maxTokens;
  }

  // Ollama uses a slightly different format
  if (provider.id === "ollama") {
    body.stream = false;
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`[${provider.name}] API 错误 ${res.status}: ${errText}`);
  }

  const data = await res.json();

  // Ollama response format
  if (provider.id === "ollama") {
    return data.message?.content || "";
  }

  // OpenAI-compatible format
  return data.choices?.[0]?.message?.content || "";
}

// ── 流式调用 (SSE) ──

export async function chatCompletionStream(
  provider: ProviderConfig,
  modelId: string,
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  options?: { temperature?: number; maxTokens?: number; signal?: AbortSignal },
): Promise<void> {
  const endpoint = getChatEndpoint(provider);
  const headers = buildHeaders(provider);

  const body: any = {
    model: modelId,
    messages,
    temperature: options?.temperature ?? 0.7,
    stream: true,
  };

  if (options?.maxTokens) {
    body.max_tokens = options.maxTokens;
  }

  let res: Response;

  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: options?.signal,
    });
  } catch (err: any) {
    if (err.name === "AbortError") {
      callbacks.onError("请求已取消");
      return;
    }
    callbacks.onError(`网络错误: ${err.message}`);
    return;
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    callbacks.onError(`[${provider.name}] API 错误 ${res.status}: ${errText}`);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError("无法获取响应流");
    return;
  }

  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE lines
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed || trimmed === ":" || trimmed.startsWith(": ")) continue;

        // Handle Ollama streaming (JSON per line, not SSE)
        if (provider.id === "ollama") {
          try {
            const json = JSON.parse(trimmed);
            const token = json.message?.content || "";
            if (token) {
              fullText += token;
              callbacks.onToken(token);
            }
            if (json.done) {
              callbacks.onDone(fullText);
              return;
            }
          } catch { /* empty */ }
          continue;
        }

        // Standard SSE format: data: {...}
        if (!trimmed.startsWith("data:")) continue;

        const dataStr = trimmed.slice(5).trim();

        if (dataStr === "[DONE]") {
          callbacks.onDone(fullText);
          return;
        }

        try {
          const json = JSON.parse(dataStr);
          const delta = json.choices?.[0]?.delta;
          const token = delta?.content || "";
          if (token) {
            fullText += token;
            callbacks.onToken(token);
          }

          // Check finish_reason
          if (json.choices?.[0]?.finish_reason) {
            // Don't return yet, wait for [DONE]
          }
        } catch {
          // Skip unparseable chunks
        }
      }
    }

    // If we exit the loop without [DONE], still call onDone
    if (fullText) {
      callbacks.onDone(fullText);
    }
  } catch (err: any) {
    if (err.name === "AbortError") {
      callbacks.onDone(fullText);
    } else {
      callbacks.onError(`流式读取错误: ${err.message}`);
    }
  } finally {
    reader.releaseLock();
  }
}

// ── 辅助: 从完成文本中提取代码块 ──

/** 从完成文本中提取第一个代码块，返回语言标识和代码内容 */
export function extractCodeBlock(
  text: string,
): { lang: string; code: string } | null {
  const match = text.match(/```(\w*)\n([\s\S]*?)```/);
  if (match) {
    return {
      lang: match[1] || "tsx",
      code: match[2].trim(),
    };
  }
  return null;
}

// ── 降级封装：自动切换 provider ──

export interface ResilientChatOptions {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  onDegradation?: (from: ProviderId, to: ProviderId, level: DegradationLevel) => void;
  onRecovery?: (providerId: ProviderId) => void;
}

export async function resilientChatCompletion(
  messages: ChatMessage[],
  options?: ResilientChatOptions,
): Promise<string> {
  const service = getAIDegradationService();

  if (options?.onDegradation) {
    const origOnDegradation = service.getState;
    const unsub = service.subscribe((state) => {
      if (state.switchCount > 0 && state.lastSwitchAt) {
        options.onDegradation?.(
          state.providers.find(p => p.level === "unavailable")?.providerId || "zai-plan" as ProviderId,
          state.currentProviderId || "ollama" as ProviderId,
          state.currentLevel,
        );
      }
    });
    try {
      const result = await service.chatCompletion(messages, {
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
      });
      return result;
    } finally {
      unsub();
    }
  }

  return service.chatCompletion(messages, {
    temperature: options?.temperature,
    maxTokens: options?.maxTokens,
  });
}

export async function resilientChatCompletionStream(
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  options?: ResilientChatOptions,
): Promise<void> {
  const service = getAIDegradationService();
  return service.chatCompletionStream(messages, callbacks, {
    temperature: options?.temperature,
    maxTokens: options?.maxTokens,
    signal: options?.signal,
  });
}

export function getDegradationState() {
  return getAIDegradationService().getState();
}

export function startDegradationHealthChecks() {
  getAIDegradationService().startHealthChecks();
}

export function stopDegradationHealthChecks() {
  getAIDegradationService().stopHealthChecks();
}

// ── AI 语义意图分类 ──

export interface AIIntentResult {
  mode: "designer" | "ai-workspace";
  confidence: number;
  category: string;
  summary: string;
  suggestion: string;
}

const INTENT_SYSTEM_PROMPT = `你是一个用户意图分类器。根据用户输入判断其意图属于以下哪个类别：

A) "designer" — 用户想要 **创建/构建** 某个界面、应用、组件、页面、系统、网站、工具。
   关键信号：帮我做/做一个/搭建/创建/设计/开发、项目类名词（仪表板、管理系统、商城、官网等）

B) "ai-workspace" — 用户想要 **咨询/学习/分析/讨论/调试** 技术问题。
   关键信号：问句、怎么/为什么/什么是、帮我解释/分析/优化、比较/对比、概念性讨论

请严格按以下 JSON 格式回复，不要输出任何其他内容：
{"mode":"designer 或 ai-workspace","confidence":0.0到1.0的数字,"category":"简短分类标签","summary":"一句话总结识别结果","suggestion":"一句话操作建议"}`;

/**
 * Use a real LLM to classify user intent (designer vs ai-workspace).
 * Attempts to find any available provider with a configured API key.
 * Returns null if no provider is available — caller should fall back to regex.
 */
export async function analyzeIntentAI(
  userInput: string,
  options?: { timeoutMs?: number },
): Promise<AIIntentResult | null> {
  const timeoutMs = options?.timeoutMs ?? 8000;

  // Find a usable provider + model from localStorage config
  const provider = findAvailableProvider();
  if (!provider) return null;

  const { config, modelId } = provider;

  try {
    const endpoint = getChatEndpoint(config);
    const headers = buildHeaders(config);

    const body: any = {
      model: modelId,
      messages: [
        { role: "system", content: INTENT_SYSTEM_PROMPT },
        { role: "user", content: userInput },
      ],
      temperature: 0.1,
      max_tokens: 200,
      stream: false,
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return null;

    const data = await res.json();
    let content = "";
    if (config.id === "ollama") {
      content = data.message?.content || "";
    } else {
      content = data.choices?.[0]?.message?.content || "";
    }

    // Parse JSON from response (tolerate markdown code blocks)
    const jsonStr = content
      .replace(/```json\s*/i, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(jsonStr);

    // Validate
    if (parsed.mode !== "designer" && parsed.mode !== "ai-workspace")
      return null;
    const confidence =
      typeof parsed.confidence === "number"
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.8;

    return {
      mode: parsed.mode,
      confidence,
      category: parsed.category || "AI 分类",
      summary:
        parsed.summary ||
        (parsed.mode === "designer"
          ? "AI 识别为创建意图"
          : "AI 识别为咨询意图"),
      suggestion: parsed.suggestion || "正在导航到对应工作台",
    };
  } catch {
    return null;
  }
}

/**
 * Find the first available provider that has a configured API key (or is Ollama).
 * Reads from localStorage — usable outside of React context.
 * Prefers YYC³ merged-v3 when available via Ollama.
 */
export function findAvailableProvider(): {
  config: ProviderConfig;
  modelId: string;
} | null {
  const configs = getProviderConfigs();

  // Read active model from localStorage
  const activeModelRaw = localStorage.getItem("yyc3_active_model");
  if (activeModelRaw) {
    try {
      const parsed = JSON.parse(activeModelRaw);
      if (parsed.providerId && parsed.modelId) {
        const cfg = configs.find((p) => p.id === parsed.providerId);
        if (cfg) {
          const hasKey = cfg.authType === "none" || !!getApiKey(cfg.id);
          if (hasKey)
            return {
              config: { ...cfg, apiKey: getApiKey(cfg.id) },
              modelId: parsed.modelId,
            };
        }
      }
    } catch { /* empty */ }
  }

  // Fallback: scan providers (local-first — Ollama before cloud)
  // YYC³ merged-v3 defined as first model in ollama's model list
  const preferredOrder: ProviderId[] = ["ollama", "zai-plan"];

  for (const pid of preferredOrder) {
    const cfg = configs.find((p) => p.id === pid);
    if (!cfg) continue;
    const hasKey = cfg.authType === "none" || !!getApiKey(pid);
    if (!hasKey) continue;

    // Pick first model or a default
    const defaultModelId =
      pid === "zai-plan"
        ? "glm-5"
        : pid === "ollama"
          ? cfg.models[0]?.id || "" // 首选 YYC³ merged-v3（providers.ts 中排首位）
          : "";

    if (defaultModelId || pid === "ollama") {
      return {
        config: { ...cfg, apiKey: getApiKey(pid) },
        modelId: defaultModelId,
      };
    }
  }

  return null;
}
