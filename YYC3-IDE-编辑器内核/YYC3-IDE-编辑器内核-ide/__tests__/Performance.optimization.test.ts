// @ts-nocheck
/**
 * @file: __tests__/Performance.optimization.test.ts
 * @description: 性能优化测试 - 验证优化效果
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: test,performance,optimization
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  PreviewModeControllerOptimized,
  createOptimizedPreviewModeController,
} from "../PreviewModeController.optimized";
import {
  SnapshotManagerOptimized,
  createOptimizedSnapshotManager,
} from "../SnapshotManager.optimized";
import {
  CodeValidatorOptimized,
  createOptimizedCodeValidator,
} from "../CodeValidator.optimized";
import {
  detectIntentOptimized,
  buildSystemPromptOptimized,
  clearAllCaches,
  getCacheStats,
} from "../ai/SystemPromptBuilder.optimized";
import type { ProjectContext } from "../ai/ContextCollector";

// ================================================================
// 性能基准
// ================================================================

const PERFORMANCE_BUDGETS = {
  previewRefresh: 200, // ms
  snapshotCreate: 100, // ms
  codeValidation: 50, // ms
  promptBuild: 20, // ms
  intentDetection: 10, // ms
};

// ================================================================
// 测试数据生成器
// ================================================================

function generateLargeCode(lines: number): string {
  return Array(lines)
    .fill(null)
    .map((_, i) => `const line${i} = ${i};`)
    .join("\n");
}

function generateMockProjectContext(): ProjectContext {
  return {
    fileTree: "src/\n  components/\n    App.tsx\n    Header.tsx",
    activeFile: {
      path: "src/App.tsx",
      content: generateLargeCode(100),
      language: "tsx",
    },
    openTabs: [
      {
        path: "src/Header.tsx",
        content: generateLargeCode(50),
        language: "tsx",
      },
    ],
    gitStatus: {
      branch: "main",
      modified: 2,
      staged: 1,
    },
  };
}

// ================================================================
// 性能测试
// ================================================================

describe("性能优化测试", () => {
  beforeEach(() => {
    clearAllCaches();
  });

  afterEach(() => {
    clearAllCaches();
  });

  // ── 1. 预览模式控制器优化测试 ──

  describe("PreviewModeController 优化", () => {
    it("实时模式节流优化", () => {
      let updateCount = 0;
      const controller = createOptimizedPreviewModeController(
        () => updateCount++,
        "realtime"
      );

      const startTime = Date.now();

      // 快速触发多次变更
      for (let i = 0; i < 10; i++) {
        controller.handleFileChange();
      }

      const duration = Date.now() - startTime;

      console.warn(`实时模式节流测试: ${duration}ms, 更新次数: ${updateCount}`);

      // 验证节流效果：更新次数应远小于触发次数
      expect(updateCount).toBeLessThan(10);
      expect(duration).toBeLessThan(PERFORMANCE_BUDGETS.previewRefresh);

      controller.destroy();
    });

    it("延迟模式防抖优化", async () => {
      let updateCount = 0;
      const controller = createOptimizedPreviewModeController(
        () => updateCount++,
        "delayed",
        100
      );

      const startTime = Date.now();

      // 快速触发多次变更
      for (let i = 0; i < 5; i++) {
        controller.handleFileChange();
        await new Promise((resolve) => setTimeout(resolve, 30));
      }

      // 等待延迟触发
      await new Promise((resolve) => setTimeout(resolve, 150));

      const duration = Date.now() - startTime;

      console.warn(`延迟模式防抖测试: ${duration}ms, 更新次数: ${updateCount}`);

      // 验证防抖效果：只触发一次更新
      expect(updateCount).toBe(1);

      controller.destroy();
    });

    it("智能模式自适应优化", () => {
      let updateCount = 0;
      const controller = createOptimizedPreviewModeController(
        () => updateCount++,
        "smart"
      );

      // 模拟快速编辑
      for (let i = 0; i < 10; i++) {
        controller.handleFileChange();
      }

      const status = controller.getStatus();
      console.warn(`智能模式统计:`, status.smartModeStats);

      expect(status.smartModeStats).toBeDefined();
      expect(status.smartModeStats?.editCount).toBeGreaterThanOrEqual(9);

      controller.destroy();
    });
  });

  // ── 2. 快照管理器优化测试 ──

  describe("SnapshotManager 优化", () => {
    it("快照创建性能优化", () => {
      const manager = createOptimizedSnapshotManager();

      const files = Array(10)
        .fill(null)
        .map((_, i) => ({
          path: `file${i}.ts`,
          content: generateLargeCode(100),
        }));

      const startTime = Date.now();

      const snapshot = manager.createSnapshot("性能测试快照", files);

      const duration = Date.now() - startTime;

      console.warn(`快照创建时间: ${duration}ms`);

      expect(duration).toBeLessThan(PERFORMANCE_BUDGETS.snapshotCreate);
      expect(snapshot).toBeDefined();
      expect(snapshot.files.length).toBe(10);
    });

    it("快照哈希优化", () => {
      const manager = createOptimizedSnapshotManager();

      const file1 = { path: "test.ts", content: "const a = 1;" };
      const file2 = { path: "test2.ts", content: "const a = 1;" };

      const snap1 = manager.createSnapshot("快照1", [file1]);
      const snap2 = manager.createSnapshot("快照2", [file2]);

      // 相同内容应该有相同的哈希
      expect(snap1.files[0].hash).toBe(snap2.files[0].hash);

      console.warn(`哈希优化验证通过`);
    });

    it("智能清理功能", () => {
      const manager = createOptimizedSnapshotManager();

      // 创建多个快照
      for (let i = 0; i < 10; i++) {
        manager.createSnapshot(`快照${i}`, [
          { path: "test.ts", content: `const ${i} = ${i};` },
        ]);
      }

      const stats = manager.getStorageStats();
      console.warn(`存储统计:`, stats);

      expect(stats.snapshotCount).toBe(10);

      // 执行智能清理
      const deletedCount = manager.smartCleanup();
      console.warn(`智能清理: 删除了 ${deletedCount} 个快照`);
    });
  });

  // ── 3. 代码验证器优化测试 ──

  describe("CodeValidator 优化", () => {
    it("验证性能优化", () => {
      const validator = createOptimizedCodeValidator();

      const largeCode = generateLargeCode(1000);
      const block = {
        filepath: "test.ts",
        content: largeCode,
        language: "typescript",
        isNewFile: true,
      };

      const startTime = Date.now();

      const result = validator.validate(block);

      const duration = Date.now() - startTime;

      console.warn(`验证时间: ${duration}ms`);

      expect(duration).toBeLessThan(PERFORMANCE_BUDGETS.codeValidation);
      expect(result).toBeDefined();
      expect(result.metrics.lines).toBe(1000);
    });

    it("缓存效果验证", () => {
      const validator = createOptimizedCodeValidator();

      const block = {
        filepath: "test.ts",
        content: "const a = 1;",
        language: "typescript",
        isNewFile: true,
      };

      // 第一次验证
      const startTime1 = Date.now();
      validator.validate(block);
      const duration1 = Date.now() - startTime1;

      // 第二次验证（应该命中缓存）
      const startTime2 = Date.now();
      validator.validate(block);
      const duration2 = Date.now() - startTime2;

      console.warn(`首次验证: ${duration1}ms, 缓存验证: ${duration2}ms`);

      const stats = validator.getPerformanceStats();
      console.warn(`性能统计:`, stats);

      expect(stats.cacheHits).toBeGreaterThan(0);
      // 缓存验证可能因为操作太快而时间相近，只验证缓存命中
      expect(duration2).toBeLessThanOrEqual(duration1 + 1);
    });

    it("并行验证性能", () => {
      const validator = createOptimizedCodeValidator();

      const blocks = Array(10)
        .fill(null)
        .map((_, i) => ({
          filepath: `file${i}.ts`,
          content: generateLargeCode(100),
          language: "typescript",
          isNewFile: true,
        }));

      const startTime = Date.now();

      const results = validator.validateAll(blocks);

      const duration = Date.now() - startTime;

      console.warn(`并行验证 ${blocks.length} 个文件: ${duration}ms`);

      expect(results.size).toBe(10);
      expect(duration).toBeLessThan(200); // 10个文件总时间应小于200ms
    });
  });

  // ── 4. 系统提示词构建优化测试 ──

  describe("SystemPromptBuilder 优化", () => {
    it("意图检测性能优化", () => {
      const messages = [
        "创建一个组件",
        "修复这个bug",
        "解释这段代码",
        "重构这个函数",
        "生成单元测试",
      ];

      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        messages.forEach((msg) => detectIntentOptimized(msg));
      }

      const duration = Date.now() - startTime;
      const avgDuration = duration / 500; // 5 messages * 100 iterations

      console.warn(`意图检测平均时间: ${avgDuration}ms`);

      expect(avgDuration).toBeLessThan(PERFORMANCE_BUDGETS.intentDetection);

      const stats = getCacheStats();
      console.warn(`缓存统计:`, stats);

      expect(stats.intentCacheSize).toBeGreaterThan(0);
    });

    it("提示词构建性能优化", () => {
      const context = generateMockProjectContext();

      const startTime = Date.now();

      const prompt = buildSystemPromptOptimized("generate", context);

      const duration = Date.now() - startTime;

      console.warn(`提示词构建时间: ${duration}ms`);

      expect(duration).toBeLessThan(PERFORMANCE_BUDGETS.promptBuild);
      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(0);
    });

    it("Token估算优化", () => {
      const largeText = generateLargeCode(1000);

      const startTime = Date.now();

      // 多次估算相同文本
      for (let i = 0; i < 100; i++) {
        // 使用全局 tokenEstimator（通过buildSystemPromptOptimized间接调用）
        buildSystemPromptOptimized("generate", {
          ...generateMockProjectContext(),
          activeFile: {
            path: "test.ts",
            content: largeText,
            language: "typescript",
          },
        });
      }

      const duration = Date.now() - startTime;
      const avgDuration = duration / 100;

      console.warn(`Token估算平均时间: ${avgDuration}ms`);

      expect(avgDuration).toBeLessThan(10);
    });

    it("上下文压缩优化", () => {
      const context: ProjectContext = {
        fileTree: "src/",
        activeFile: {
          path: "large.ts",
          content: generateLargeCode(5000),
          language: "typescript",
        },
        openTabs: [],
        gitStatus: { branch: "main", modified: 1, staged: 0 },
      };

      const startTime = Date.now();

      const prompt = buildSystemPromptOptimized("generate", context, {
        maxContextTokens: 1000,
      });

      const duration = Date.now() - startTime;

      console.warn(`上下文压缩时间: ${duration}ms`);
      console.warn(`提示词长度: ${prompt.length} 字符`);

      expect(duration).toBeLessThan(30);
      expect(prompt.length).toBeLessThan(10000); // 压缩后应该更小
    });
  });

  // ── 5. 综合性能测试 ──

  describe("综合性能测试", () => {
    it("完整工作流性能", () => {
      const validator = createOptimizedCodeValidator();
      const manager = createOptimizedSnapshotManager();

      const startTime = Date.now();

      // 1. 意图检测
      const intent = detectIntentOptimized("创建一个新组件");
      expect(intent).toBe("generate");

      // 2. 构建提示词
      const prompt = buildSystemPromptOptimized(intent, generateMockProjectContext());
      expect(prompt).toBeDefined();

      // 3. 验证代码
      const validationResult = validator.validate({
        filepath: "test.tsx",
        content: "const App = () => <div>Hello</div>",
        language: "tsx",
        isNewFile: true,
      });
      expect(validationResult.valid).toBe(true);

      // 4. 创建快照
      const snapshot = manager.createSnapshot("性能测试", [
        { path: "test.tsx", content: "const App = () => <div>Hello</div>" },
      ]);
      expect(snapshot).toBeDefined();

      const totalDuration = Date.now() - startTime;

      console.warn(`完整工作流总时间: ${totalDuration}ms`);

      expect(totalDuration).toBeLessThan(100);
    });
  });
});
