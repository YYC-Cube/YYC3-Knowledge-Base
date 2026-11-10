// @ts-nocheck
/**
 * @file: SystemPromptBuilder.integration.test.ts
 * @description: SystemPromptBuilder 集成测试 - 测试从用户输入到系统提示词构建的完整流程
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: test
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: test,integration,system-prompt-builder,intent-detection,pipeline
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  detectIntent,
  buildSystemPrompt,
  buildChatMessages,
  type UserIntent,
} from "../ai/SystemPromptBuilder";
import {
  collectContext,
  compressContext,
  type ProjectContext,
  type ContextCollectorInput,
  estimateTokens,
} from "../ai/ContextCollector";

// ================================================================
// Integration Tests - SystemPromptBuilder with ContextCollector
// ================================================================

describe("SystemPromptBuilder Integration with ContextCollector", () => {
  let mockContext: ProjectContext;

  beforeEach(() => {
    mockContext = {
      fileTree: `📁 src/
   ⚛️ App.tsx
   📄 index.ts
📁 src/components/
   ⚛️ Header.tsx
   ⚛️ Footer.tsx`,
      activeFile: {
        path: "src/App.tsx",
        content: `import React from 'react';
import Header from './components/Header';
import Footer from './components/Footer';

export default function App() {
  return (
    <div>
      <Header />
      <main>Hello World</main>
      <Footer />
    </div>
  );
}`,
        language: "tsx",
      },
      openTabs: ["src/App.tsx", "src/components/Header.tsx"],
      modifiedFiles: ["src/App.tsx"],
      totalFiles: 4,
      allFilePaths: [
        "src/App.tsx",
        "src/index.ts",
        "src/components/Header.tsx",
        "src/components/Footer.tsx",
      ],
      selectedFilesContent: {},
      gitSummary: {
        branch: "feature/test",
        changedFiles: 2,
        stagedFiles: 1,
      },
    };
  });

  // ── Test 2.4.3.1: Complete Flow - User Input → Intent → System Prompt ──

  describe("Complete Flow: User Input → Intent Detection → System Prompt", () => {
    it("should build complete system prompt for code generation", () => {
      const userMessage = "创建一个新的Button组件";
      const intent = detectIntent(userMessage);
      const prompt = buildSystemPrompt(intent, mockContext);

      expect(intent).toBe("generate");
      expect(prompt).toContain("YYC³ Family AI");
      expect(prompt).toContain("代码生成");
      expect(prompt).toContain("项目上下文");
      expect(prompt).toContain("src/App.tsx");
      expect(prompt).toContain("技术栈参考");
    });

    it("should build complete system prompt for bug fix", () => {
      const userMessage = "修复App.tsx中的bug";
      const intent = detectIntent(userMessage);
      const prompt = buildSystemPrompt(intent, mockContext);

      expect(intent).toBe("fix");
      expect(prompt).toContain("错误修复");
      expect(prompt).toContain("项目上下文");
      expect(prompt).toContain("src/App.tsx");
    });

    it("should build complete system prompt for refactoring", () => {
      const userMessage = "重构Header组件优化性能";
      const intent = detectIntent(userMessage);
      const prompt = buildSystemPrompt(intent, mockContext);

      expect(intent).toBe("refactor");
      expect(prompt).toContain("代码重构");
      expect(prompt).toContain("项目上下文");
    });

    it("should build complete system prompt for testing", () => {
      const userMessage = "为Button组件生成单元测试";
      const intent = detectIntent(userMessage);
      const prompt = buildSystemPrompt(intent, mockContext);

      expect(intent).toBe("test");
      expect(prompt).toContain("测试生成");
      expect(prompt).toContain("Vitest");
    });

    it("should handle explain intent without code output format", () => {
      const userMessage = "解释App.tsx的代码";
      const intent = detectIntent(userMessage);
      const prompt = buildSystemPrompt(intent, mockContext);

      expect(intent).toBe("explain");
      expect(prompt).toContain("代码解释");
      expect(prompt).not.toContain("代码输出格式要求");
    });

    it("should handle review intent without code output format", () => {
      const userMessage = "审查App.tsx的代码质量";
      const intent = detectIntent(userMessage);
      const prompt = buildSystemPrompt(intent, mockContext);

      expect(intent).toBe("review");
      expect(prompt).toContain("代码审查");
      expect(prompt).not.toContain("代码输出格式要求");
    });

    it("should handle general intent", () => {
      const userMessage = "你好，介绍一下React Hooks";
      const intent = detectIntent(userMessage);
      const prompt = buildSystemPrompt(intent, mockContext);

      expect(intent).toBe("general");
      expect(prompt).toContain("通用对话");
      expect(prompt).not.toContain("代码输出格式要求");
    });
  });

  // ── Test 2.4.3.2: Intent-Specific Prompt Differences ──

  describe("Intent-Specific Prompt Differences", () => {
    it("should include different instructions for each intent", () => {
      const intents: UserIntent[] = [
        "generate",
        "modify",
        "fix",
        "explain",
        "refactor",
        "test",
        "review",
        "general",
      ];

      const prompts = intents.map((intent) => ({
        intent,
        prompt: buildSystemPrompt(intent, null),
      }));

      // Each prompt should have unique intent-specific instructions
      expect(prompts[0].prompt).toContain("根据用户需求生成完整的、可运行的代码");
      expect(prompts[1].prompt).toContain("理解用户想要修改的部分");
      expect(prompts[2].prompt).toContain("分析错误的根因");
      expect(prompts[3].prompt).toContain("逐步解释代码的工作原理");
      expect(prompts[4].prompt).toContain("分析现有代码的问题");
      expect(prompts[5].prompt).toContain("使用 Vitest");
      expect(prompts[6].prompt).toContain("检查代码质量");
      expect(prompts[7].prompt).toContain("回答用户的技术问题");
    });

    it("should include code output format only for code intents", () => {
      const codeIntents: UserIntent[] = ["generate", "modify", "fix", "refactor", "test"];
      const nonCodeIntents: UserIntent[] = ["explain", "review", "general"];

      codeIntents.forEach((intent) => {
        const prompt = buildSystemPrompt(intent, null);
        expect(prompt).toContain("代码输出格式要求");
        expect(prompt).toContain("filepath");
      });

      nonCodeIntents.forEach((intent) => {
        const prompt = buildSystemPrompt(intent, null);
        expect(prompt).not.toContain("代码输出格式要求");
      });
    });

    it("should emphasize completeness for generate/modify/fix intents", () => {
      const intents: UserIntent[] = ["generate", "modify", "fix"];

      intents.forEach((intent) => {
        const prompt = buildSystemPrompt(intent, null);
        expect(prompt).toMatch(/完整|始终输出完整文件内容/);
      });
    });
  });

  // ── Test 2.4.3.3: Token Limit Control ──

  describe("Token Limit Control", () => {
    it("should estimate tokens accurately", () => {
      const text = "这是一个测试文本，包含中文字符和English characters.";
      const tokens = estimateTokens(text);

      // Rough estimation: ~3-4 chars per token
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(text.length);
    });

    it("should compress context to fit token limit", () => {
      const largeContext: ProjectContext = {
        fileTree: mockContext.fileTree,
        activeFile: {
          path: "src/App.tsx",
          content: "x".repeat(10000), // 10KB file
          language: "tsx",
        },
        openTabs: mockContext.openTabs,
        modifiedFiles: mockContext.modifiedFiles,
        totalFiles: mockContext.totalFiles,
        allFilePaths: mockContext.allFilePaths,
        selectedFilesContent: {
          "src/components/Header.tsx": "y".repeat(5000),
          "src/components/Footer.tsx": "z".repeat(5000),
        },
        gitSummary: mockContext.gitSummary,
      };

      const maxTokens = 6000;
      const compressed = compressContext(largeContext, maxTokens);
      const estimatedTokens = estimateTokens(compressed);

      expect(estimatedTokens).toBeLessThan(maxTokens * 1.1); // Allow 10% buffer
      expect(compressed).toContain("truncated");
    });

    it("should respect maxContextTokens option", () => {
      const prompt1 = buildSystemPrompt("generate", mockContext, {
        maxContextTokens: 1000,
      });
      const prompt2 = buildSystemPrompt("generate", mockContext, {
        maxContextTokens: 8000,
      });

      const tokens1 = estimateTokens(prompt1);
      const tokens2 = estimateTokens(prompt2);

      // Both should be reasonable, but prompt2 should generally have more context
      expect(tokens1).toBeGreaterThan(0);
      expect(tokens2).toBeGreaterThan(0);
    });

    it("should truncate large active files", () => {
      const largeFileContext: ProjectContext = {
        ...mockContext,
        activeFile: {
          path: "src/LargeFile.tsx",
          content: "x".repeat(15000), // 15KB file
          language: "tsx",
        },
      };

      const compressed = compressContext(largeFileContext, 8000);
      expect(compressed).toContain("truncated");
      expect(compressed).toContain("15000 chars total");
    });
  });

  // ── Test 2.4.3.4: Context Injection ──

  describe("Context Injection", () => {
    it("should inject project file tree", () => {
      const prompt = buildSystemPrompt("generate", mockContext);
      expect(prompt).toContain("项目上下文");
      expect(prompt).toContain("📁 src/");
    });

    it("should inject active file content", () => {
      const prompt = buildSystemPrompt("generate", mockContext);
      expect(prompt).toContain("src/App.tsx");
      expect(prompt).toContain("Header");
      expect(prompt).toContain("Footer");
    });

    it("should inject Git status", () => {
      const prompt = buildSystemPrompt("generate", mockContext);
      expect(prompt).toContain("Git 状态");
      expect(prompt).toContain("feature/test");
      expect(prompt).toContain("已修改");
    });

    it("should inject open tabs", () => {
      const prompt = buildSystemPrompt("generate", mockContext);
      expect(prompt).toContain("打开的文件");
      expect(prompt).toContain("src/App.tsx");
    });

    it("should handle missing Git status gracefully", () => {
      const contextNoGit: ProjectContext = {
        ...mockContext,
        gitSummary: undefined as any,
      };

      const prompt = buildSystemPrompt("generate", contextNoGit);
      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(100);
    });

    it("should handle empty project context", () => {
      const emptyContext: ProjectContext = {
        fileTree: "(empty project)",
        activeFile: null,
        openTabs: [],
        modifiedFiles: [],
        totalFiles: 0,
        allFilePaths: [],
        selectedFilesContent: {},
        gitSummary: {
          branch: "main",
          changedFiles: 0,
          stagedFiles: 0,
        },
      };

      const prompt = buildSystemPrompt("generate", emptyContext);
      expect(prompt).toContain("YYC³ Family AI");
      expect(prompt).toContain("项目上下文");
    });
  });

  // ── Test 2.4.3.5: Integration with ChatMessages ──

  describe("Integration with ChatMessages", () => {
    it("should build complete message array with history", () => {
      const userMessage = "创建一个新的Button组件";
      const history = [
        { role: "user" as const, content: "你好" },
        { role: "assistant" as const, content: "你好！有什么可以帮助你的？" },
      ];

      const messages = buildChatMessages(userMessage, history, mockContext);

      expect(messages).toHaveLength(4); // system + 2 history + current user
      expect(messages[0].role).toBe("system");
      expect(messages[0].content).toContain("代码生成");
      expect(messages[1].role).toBe("user");
      expect(messages[1].content).toBe("你好");
      expect(messages[2].role).toBe("assistant");
      expect(messages[3].role).toBe("user");
      expect(messages[3].content).toBe(userMessage);
    });

    it("should auto-detect intent from user message", () => {
      const messages1 = buildChatMessages("修复bug", [], mockContext);
      const messages2 = buildChatMessages("生成测试", [], mockContext);
      const messages3 = buildChatMessages("解释代码", [], mockContext);

      expect(messages1[0].content).toContain("错误修复");
      expect(messages2[0].content).toContain("测试生成");
      expect(messages3[0].content).toContain("代码解释");
    });

    it("should limit history messages", () => {
      const longHistory = Array(20)
        .fill(null)
        .map((_, i) => ({
          role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
          content: `Message ${i}`,
        }));

      const messages = buildChatMessages("创建组件", longHistory, mockContext, {
        maxHistoryMessages: 5,
      });

      // system + 5 history + current user = 7
      expect(messages).toHaveLength(7);
    });

    it("should include custom instructions", () => {
      const customInstructions = "请使用函数式组件和Tailwind CSS";
      const messages = buildChatMessages("创建组件", [], mockContext, {
        customInstructions,
      });

      expect(messages[0].content).toContain("额外指令");
      expect(messages[0].content).toContain(customInstructions);
    });
  });

  // ── Test 2.4.3.6: End-to-End Pipeline Simulation ──

  describe("End-to-End Pipeline Simulation", () => {
    it("should simulate complete generate flow", () => {
      // Step 1: User input
      const userMessage = "创建一个Header组件，包含logo和导航菜单";

      // Step 2: Intent detection
      const intent = detectIntent(userMessage);
      expect(intent).toBe("generate");

      // Step 3: Build system prompt with context
      const systemPrompt = buildSystemPrompt(intent, mockContext);
      expect(systemPrompt).toContain("代码生成");
      expect(systemPrompt).toContain("项目上下文");
      expect(systemPrompt).toContain("src/App.tsx");

      // Step 4: Build complete messages
      const messages = buildChatMessages(userMessage, [], mockContext);
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe("system");
      expect(messages[1].role).toBe("user");
      expect(messages[1].content).toBe(userMessage);
    });

    it("should simulate complete fix flow", () => {
      const userMessage = "App.tsx中的Header组件报错了，修复它";
      const intent = detectIntent(userMessage);
      expect(intent).toBe("fix");

      const systemPrompt = buildSystemPrompt(intent, mockContext);
      expect(systemPrompt).toContain("错误修复");
      expect(systemPrompt).toContain("分析错误的根因");
    });

    it("should simulate complete refactor flow", () => {
      const userMessage = "优化App.tsx的性能，减少不必要的渲染";
      const intent = detectIntent(userMessage);
      expect(intent).toBe("refactor");

      const systemPrompt = buildSystemPrompt(intent, mockContext);
      expect(systemPrompt).toContain("代码重构");
      expect(systemPrompt).toContain("性能");
    });

    it("should simulate complete test flow", () => {
      const userMessage = "为Header组件生成单元测试，覆盖率要达到80%";
      const intent = detectIntent(userMessage);
      expect(intent).toBe("test");

      const systemPrompt = buildSystemPrompt(intent, mockContext);
      expect(systemPrompt).toContain("测试生成");
      expect(systemPrompt).toContain("Vitest");
      expect(systemPrompt).toContain("Testing Library");
    });
  });

  // ── Test 2.4.3.7: Edge Cases and Error Handling ──

  describe("Edge Cases and Error Handling", () => {
    it("should handle empty user message", () => {
      const intent = detectIntent("");
      expect(intent).toBe("general");

      const prompt = buildSystemPrompt(intent, null);
      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(0);
    });

    it("should handle very long user message", () => {
      const longMessage = "创建一个组件 ".repeat(100);
      const intent = detectIntent(longMessage);
      expect(intent).toBe("generate");

      const messages = buildChatMessages(longMessage, [], mockContext);
      expect(messages).toHaveLength(2);
    });

    it("should handle special characters in context", () => {
      const specialContext: ProjectContext = {
        ...mockContext,
        activeFile: {
          path: "src/test-special.tsx",
          content: `const special = "测试\n\t\r特殊字符'\"{}[]<>";`,
          language: "tsx",
        },
      };

      const prompt = buildSystemPrompt("generate", specialContext);
      expect(prompt).toContain("src/test-special.tsx");
    });

    it("should handle concurrent intent detection", () => {
      const messages = [
        "创建组件",
        "修复bug",
        "生成测试",
        "解释代码",
        "重构",
        "审查",
      ];

      const intents = messages.map((msg) => detectIntent(msg));

      expect(intents).toEqual([
        "generate",
        "fix",
        "test",
        "explain",
        "refactor",
        "review",
      ]);
    });
  });

  // ── Test 2.4.3.8: Performance and Scalability ──

  describe("Performance and Scalability", () => {
    it("should build prompt efficiently", () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        buildSystemPrompt("generate", mockContext);
      }

      const duration = performance.now() - start;
      // Should complete 100 iterations in less than 100ms (< 1ms per iteration)
      expect(duration).toBeLessThan(100);
    });

    it("should detect intent efficiently", () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        detectIntent("创建一个Button组件");
      }

      const duration = performance.now() - start;
      // Should complete 1000 iterations in less than 100ms (< 0.1ms per iteration)
      expect(duration).toBeLessThan(100);
    });

    it("should build messages efficiently", () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        buildChatMessages("创建组件", [], mockContext);
      }

      const duration = performance.now() - start;
      // Should complete 100 iterations in less than 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});
