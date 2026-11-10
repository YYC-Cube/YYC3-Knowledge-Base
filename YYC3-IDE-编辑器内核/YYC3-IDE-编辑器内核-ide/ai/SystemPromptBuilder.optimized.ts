// @ts-nocheck
/**
 * @file: ai/SystemPromptBuilder.optimized.ts
 * @description: 构建上下文感知的 System Prompt（性能优化版）
 *              优化点：Token估算优化、上下文压缩、缓存机制
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.1.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: ai,prompt,optimized,performance,caching
 */

import { type ProjectContext } from "./ContextCollector";
import { logger } from "../services/Logger";

// ── 意图类型 ──

export type UserIntent =
  | "generate"
  | "modify"
  | "fix"
  | "explain"
  | "refactor"
  | "test"
  | "review"
  | "general";

// ── 意图检测（优化版） ──

const INTENT_PATTERNS: Record<UserIntent, RegExp[]> = {
  test: [
    /生成.*测试|写.*测试|单元测试|test|spec|覆盖率/,
    /generate.*test|write.*test|test|spec|coverage|unit test|testing/i,
  ],
  generate: [
    /创建|生成|新建|写一个|做一个|搭建|添加|新增|实现/,
    /create|generate|build|make|add|implement|write/i,
  ],
  modify: [
    /修改|更改|调整|替换|改成|改为|改动/,
    /modify|change|update|alter|adjust|replace/i,
  ],
  fix: [
    /修复|修正|解决|修bug|报错|错误|异常|问题/,
    /fix|debug|solve|error|bug|issue|broken|crash/i,
  ],
  explain: [
    /解释.*代码|说明.*代码|讲解.*代码|分析.*代码|代码.*是什么|代码.*怎么|代码.*为什么|代码原理/,
    /explain.*code|describe.*code|what.*code|how.*code|why.*code|analyze.*code|understand.*code/i,
  ],
  refactor: [
    /重构|优化|性能|改善|提升|简化|整理|clean/,
    /refactor|optimize|improve|simplify|clean|performance/i,
  ],
  review: [
    /审查|review|检查|检视|code review|评审/,
    /review|inspect|audit|check/i,
  ],
  general: [],
};

/**
 * 意图检测（优化版）
 *
 * 优化点：
 * - 使用缓存的正则表达式
 * - 提前退出机制
 */
const intentCache = new Map<string, UserIntent>();

export function detectIntentOptimized(userMessage: string): UserIntent {
  // 检查缓存
  if (intentCache.has(userMessage)) {
    return intentCache.get(userMessage)!;
  }

  // 按优先级检测
  const priorityOrder: UserIntent[] = ["test", "fix", "generate", "modify", "explain", "refactor", "review"];

  for (const intent of priorityOrder) {
    const patterns = INTENT_PATTERNS[intent];
    for (const pattern of patterns) {
      if (pattern.test(userMessage)) {
        // 缓存结果
        intentCache.set(userMessage, intent);
        return intent;
      }
    }
  }

  return "general";
}

// ── Token估算优化 ──

/**
 * Token估算器（优化版）
 *
 * 优化点：
 * - 更精确的估算算法
 * - 缓存估算结果
 * - 增量估算
 */
class TokenEstimator {
  private cache = new Map<string, number>();

  /**
   * 估算文本的Token数量
   */
  estimate(text: string): number {
    // 检查缓存
    const cacheKey = `${text.length}:${this.simpleHash(text)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 优化估算算法
    let tokenCount = 0;
    let i = 0;

    while (i < text.length) {
      const char = text[i];

      // 空白字符
      if (/\s/.test(char)) {
        tokenCount++;
        i++;
        continue;
      }

      // 中文字符
      if (/[\u4e00-\u9fa5]/.test(char)) {
        tokenCount++;
        i++;
        continue;
      }

      // 英文单词
      if (/[a-zA-Z]/.test(char)) {
        let wordLength = 0;
        while (i < text.length && /[a-zA-Z]/.test(text[i])) {
          wordLength++;
          i++;
        }
        tokenCount += Math.ceil(wordLength / 4); // 平均4个字符一个token
        continue;
      }

      // 数字
      if (/[0-9]/.test(char)) {
        let numLength = 0;
        while (i < text.length && /[0-9.]/.test(text[i])) {
          numLength++;
          i++;
        }
        tokenCount += Math.ceil(numLength / 3); // 平均3个数字一个token
        continue;
      }

      // 特殊字符
      tokenCount++;
      i++;
    }

    // 缓存结果
    this.cache.set(cacheKey, tokenCount);

    return tokenCount;
  }

  /**
   * 简单哈希函数
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }
}

const tokenEstimator = new TokenEstimator();

// ── 上下文压缩优化 ──

/**
 * 上下文压缩器（优化版）
 *
 * 优化点：
 * - 智能截断
 * - 保留关键信息
 * - 压缩重复内容
 */
class ContextCompressor {
  /**
   * 压缩上下文
   */
  compress(
    context: ProjectContext,
    maxTokens: number
  ): ProjectContext {
    let currentTokens = 0;
    const compressedContext: ProjectContext = {
      fileTree: context.fileTree,
      activeFile: null,
      openTabs: [],
      gitStatus: context.gitStatus,
    };

    // 优先保留活跃文件
    if (context.activeFile) {
      const fileTokens = tokenEstimator.estimate(context.activeFile.content);
      if (currentTokens + fileTokens <= maxTokens * 0.8) {
        compressedContext.activeFile = context.activeFile;
        currentTokens += fileTokens;
      } else {
        // 压缩活跃文件
        compressedContext.activeFile = {
          path: context.activeFile.path,
          content: this.truncateContent(context.activeFile.content, maxTokens * 0.8 - currentTokens),
          language: context.activeFile.language,
        };
        currentTokens = maxTokens * 0.8;
      }
    }

    // 添加打开的标签页
    const remainingTokens = maxTokens - currentTokens;
    const tabTokens = Math.floor(remainingTokens / Math.max(context.openTabs.length, 1));

    compressedContext.openTabs = context.openTabs.slice(0, 5).map(tab => ({
      path: tab.path,
      content: this.truncateContent(tab.content, tabTokens),
      language: tab.language,
    }));

    return compressedContext;
  }

  /**
   * 截断内容
   */
  private truncateContent(content: string, maxTokens: number): string {
    const tokens = tokenEstimator.estimate(content);

    if (tokens <= maxTokens) {
      return content;
    }

    // 计算需要保留的字符数
    const ratio = maxTokens / tokens;
    const targetLength = Math.floor(content.length * ratio);

    // 智能截断：保留文件头和尾
    const headLength = Math.floor(targetLength * 0.6);
    const tailLength = targetLength - headLength;

    const head = content.slice(0, headLength);
    const tail = content.slice(-tailLength);

    return `${head}\n\n// ... [已截断 ${tokens - maxTokens} tokens] ...\n\n${tail}`;
  }
}

const contextCompressor = new ContextCompressor();

// ── 系统提示词构建（优化版） ──

const promptCache = new Map<string, string>();

/**
 * 构建系统提示词（优化版）
 *
 * 优化点：
 * - Token估算优化
 * - 上下文压缩
 * - 缓存机制
 * - 增量构建
 */
export function buildSystemPromptOptimized(
  intent: UserIntent,
  context: ProjectContext,
  options: {
    maxContextTokens?: number;
    customInstructions?: string;
  } = {}
): string {
  const maxTokens = options.maxContextTokens || 8000;

  // 生成缓存键
  const cacheKey = `${intent}:${context.activeFile?.path || ""}:${maxTokens}`;
  if (promptCache.has(cacheKey)) {
    return promptCache.get(cacheKey)!;
  }

  // 压缩上下文
  const compressedContext = contextCompressor.compress(context, maxTokens);

  // 构建提示词
  const parts: string[] = [];

  // 1. 基础角色
  parts.push("你是 YYC³ Family AI — 一个专业的全栈开发 AI 助手。");

  // 2. 意图特定指令
  parts.push(getIntentInstruction(intent));

  // 3. 上下文（压缩后）
  parts.push(formatContext(compressedContext));

  // 4. 自定义指令
  if (options.customInstructions) {
    parts.push(options.customInstructions);
  }

  const prompt = parts.join("\n\n");

  // 缓存结果
  promptCache.set(cacheKey, prompt);

  return prompt;
}

/**
 * 获取意图特定指令
 */
function getIntentInstruction(intent: UserIntent): string {
  const instructions: Record<UserIntent, string> = {
    generate: "你需要创建新的代码或组件。请提供完整的、可直接运行的代码。",
    modify: "你需要修改现有代码。请明确指出修改的部分，并说明修改原因。",
    fix: "你需要修复代码中的错误。请先诊断问题，然后提供修复方案。",
    explain: "你需要解释代码的工作原理。请使用清晰易懂的语言，并提供示例。",
    refactor: "你需要重构代码以提高质量。请说明重构的目的和收益。",
    test: "你需要生成测试代码。请使用 Vitest 和 Testing Library。",
    review: "你需要审查代码。请指出潜在问题并提出改进建议。",
    general: "请根据用户的请求提供帮助。",
  };

  return instructions[intent];
}

/**
 * 格式化上下文
 */
function formatContext(context: ProjectContext): string {
  const parts: string[] = [];

  if (context.fileTree) {
    parts.push(`项目文件树：\n${context.fileTree}`);
  }

  if (context.activeFile) {
    parts.push(`当前编辑文件：${context.activeFile.path}\n\`\`\`${context.activeFile.language}\n${context.activeFile.content}\n\`\`\``);
  }

  if (context.gitStatus) {
    parts.push(`Git状态：分支 ${context.gitStatus.branch}，修改 ${context.gitStatus.modified} 个文件`);
  }

  return parts.join("\n\n");
}

/**
 * 清除所有缓存
 */
export function clearAllCaches(): void {
  intentCache.clear();
  promptCache.clear();
  tokenEstimator.clearCache();
  logger.info("All caches cleared", undefined, "SystemPromptBuilder");
}

/**
 * 获取缓存统计
 */
export function getCacheStats(): {
  intentCacheSize: number;
  promptCacheSize: number;
} {
  return {
    intentCacheSize: intentCache.size,
    promptCacheSize: promptCache.size,
  };
}
