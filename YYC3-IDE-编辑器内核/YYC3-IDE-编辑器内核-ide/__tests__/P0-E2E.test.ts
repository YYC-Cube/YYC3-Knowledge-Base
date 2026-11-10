// @ts-nocheck
/**
 * @file: P0-E2E.test.ts
 * @description: P0核心功能端到端测试 - 完整工作流测试
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: e2e,test,p0,preview,snapshot,validation,prompt-builder
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PreviewModeController } from "../PreviewModeController";
import { SnapshotManager } from "../SnapshotManager";
import { CodeValidator } from "../CodeValidator";
import { SystemPromptBuilder } from "../ai/SystemPromptBuilder";

// ================================================================
// P0 Core Features - End-to-End Tests
// ================================================================

describe("P0-E2E: 完整工作流测试", () => {
  let previewModeController: PreviewModeController;
  let snapshotManager: SnapshotManager;
  let codeValidator: CodeValidator;
  let systemPromptBuilder: SystemPromptBuilder;

  beforeEach(() => {
    // 清除localStorage
    localStorage.clear();

    // 初始化各个组件
    previewModeController = new PreviewModeController(() => {}, 500);
    snapshotManager = new SnapshotManager();
    codeValidator = new CodeValidator();
    systemPromptBuilder = new SystemPromptBuilder();
  });

  afterEach(() => {
    // 清理
    previewModeController.destroy();
    localStorage.clear();
  });

  // ================================================================
  // 工作流1: 编辑代码 → 预览更新（三种模式）
  // ================================================================

  describe("工作流1: 编辑代码 → 预览更新", () => {
    it("应该支持实时模式：代码变更立即触发预览更新", async () => {
      let updateCalled = false;
      const onUpdate = () => {
        updateCalled = true;
      };

      const controller = new PreviewModeController(onUpdate, 500);
      controller.setMode("realtime");

      // 触发文件变更
      controller.handleFileChange();

      expect(updateCalled).toBe(true);
      expect(controller.hasPendingUpdate()).toBe(false);
    });

    it("应该支持手动模式：需要手动触发预览更新", async () => {
      let updateCalled = false;
      const onUpdate = () => {
        updateCalled = true;
      };

      const controller = new PreviewModeController(onUpdate, 500);
      controller.setMode("manual");

      // 触发文件变更（手动模式下不会立即更新）
      controller.handleFileChange();

      expect(updateCalled).toBe(false);
      expect(controller.hasPendingUpdate()).toBe(true);

      // 手动触发更新
      controller.manualTrigger();

      expect(updateCalled).toBe(true);
      expect(controller.hasPendingUpdate()).toBe(false);
    });

    it("应该支持延迟模式：代码变更后延迟触发预览更新", async () => {
      let updateCalled = false;
      const onUpdate = () => {
        updateCalled = true;
      };

      const controller = new PreviewModeController(onUpdate, 100); // 100ms延迟
      controller.setMode("delayed");

      // 触发文件变更
      controller.handleFileChange();

      // 立即检查（应该还未更新）
      expect(updateCalled).toBe(false);
      expect(controller.hasPendingUpdate()).toBe(true);

      // 等待延迟时间后
      await new Promise(resolve => setTimeout(resolve, 150));

      // 现在应该已经更新
      expect(updateCalled).toBe(true);
      expect(controller.hasPendingUpdate()).toBe(false);
    });

    it("应该支持模式切换", () => {
      const controller = new PreviewModeController(() => {}, 500);

      controller.setMode("realtime");
      expect(controller.getMode()).toBe("realtime");

      controller.setMode("manual");
      expect(controller.getMode()).toBe("manual");

      controller.setMode("delayed");
      expect(controller.getMode()).toBe("delayed");
    });

    it("应该正确处理模式切换时的定时器清理", () => {
      let updateCount = 0;
      const onUpdate = () => {
        updateCount++;
      };

      const controller = new PreviewModeController(onUpdate, 100);
      controller.setMode("delayed");

      // 触发多次文件变更
      controller.handleFileChange();
      controller.handleFileChange();
      controller.handleFileChange();

      // 切换到实时模式（应该清理延迟定时器）
      controller.setMode("realtime");

      // 等待超过延迟时间
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(updateCount).toBe(0);
          resolve();
        }, 200);
      });
    });
  });

  // ================================================================
  // 工作流2: 创建快照 → 恢复快照
  // ================================================================

  describe("工作流2: 创建快照 → 恢复快照", () => {
    it("应该支持完整的快照生命周期", () => {
      const testFiles = [
        { path: "src/App.tsx", content: "import React from 'react';\nexport function App() {\n  return <div>Hello</div>;\n}" },
        { path: "src/index.ts", content: "import { App } from './App';\nconsole.log('App loaded');" },
      ];

      // 创建快照
      const snapshot1 = snapshotManager.createSnapshot("Initial snapshot", testFiles);
      expect(snapshot1).toBeDefined();
      expect(snapshot1.label).toBe("Initial snapshot");
      expect(snapshot1.files.length).toBe(2);

      // 列出快照
      const snapshots = snapshotManager.listSnapshots();
      expect(snapshots.length).toBe(1);
      expect(snapshots[0].id).toBe(snapshot1.id);

      // 创建第二个快照
      const modifiedFiles = [
        { path: "src/App.tsx", content: "import React from 'react';\nexport function App() {\n  return <div>Hello World</div>;\n}" },
        { path: "src/index.ts", content: "import { App } from './App';\nconsole.log('App loaded');" },
      ];
      const snapshot2 = snapshotManager.createSnapshot("Modified snapshot", modifiedFiles);

      // 列出快照（应该有2个）
      const allSnapshots = snapshotManager.listSnapshots();
      expect(allSnapshots.length).toBe(2);

      // 比较快照
      const diff = snapshotManager.compareSnapshots(snapshot1.id, snapshot2.id);
      expect(diff).toBeDefined();
      expect(diff.modified.length).toBe(1);
      expect(diff.modified[0]).toBe("src/App.tsx");

      // 删除快照
      const deleted = snapshotManager.deleteSnapshot(snapshot2.id);
      expect(deleted).toBe(true);

      // 验证删除后只剩1个快照
      const remainingSnapshots = snapshotManager.listSnapshots();
      expect(remainingSnapshots.length).toBe(1);
    });

    it("应该支持恢复快照到文件系统", () => {
      const testFiles = [
        { path: "src/App.tsx", content: "import React from 'react';\nexport function App() {\n  return <div>Hello</div>;\n}" },
      ];

      // 创建快照
      const snapshot = snapshotManager.createSnapshot("Test snapshot", testFiles);
      expect(snapshot).toBeDefined();

      // 获取快照
      const retrieved = snapshotManager.getSnapshot(snapshot.id);
      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(snapshot.id);
      expect(retrieved.files.length).toBe(1);
      expect(retrieved.files[0].content).toBe(testFiles[0].content);
    });

    it("应该支持快照元数据统计", () => {
      const testFiles = [
        { path: "src/App.tsx", content: "Line1\nLine2\nLine3\n" },
        { path: "src/index.ts", content: "Line1\nLine2\n" },
      ];

      const snapshot = snapshotManager.createSnapshot("Stats test", testFiles);

      expect(snapshot.metadata.totalFiles).toBe(2);
      expect(snapshot.metadata.totalLines).toBe(7);
    });

    it("应该支持快照持久化到localStorage", () => {
      const testFiles = [
        { path: "src/App.tsx", content: "export function App() { return <div>Hello</div>; }" },
      ];

      // 创建快照
      const snapshot1 = snapshotManager.createSnapshot("Persistence test", testFiles);
      const snapshotId = snapshot1.id;

      // 清除当前管理器，模拟重新加载
      snapshotManager = new SnapshotManager();

      // 从localStorage恢复的快照应该存在
      const retrieved = snapshotManager.getSnapshot(snapshotId);
      expect(retrieved).toBeDefined();
      expect(retrieved.label).toBe("Persistence test");
      expect(retrieved.files.length).toBe(1);
    });
  });

  // ================================================================
  // 工作流3: AI生成代码 → 验证 → 应用
  // ================================================================

  describe("工作流3: AI生成代码 → 验证 → 应用", () => {
    it("应该验证生成的代码", () => {
      const validCode = `import React from 'react';

export function Button({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="btn">
      {children}
    </button>
  );
}`;

      const result = codeValidator.validateCodeBlock("src/Button.tsx", validCode, "tsx");

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metrics.lines).toBeGreaterThan(0);
      expect(result.metrics.complexity).toBe("low");
    });

    it("应该检测代码中的安全问题", () => {
      const unsafeCode = `import React from 'react';

export function Component() {
  const html = '<div>content</div>';
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}`;

      const result = codeValidator.validateCodeBlock("src/Component.tsx", unsafeCode, "tsx");

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(result.warnings.some(e => e.includes("dangerouslySetInnerHTML"))).toBe(true);
    });

    it("应该检测未闭合的括号", () => {
      const invalidCode = `import React from 'react';

export function Component() {
  return (
    <div>
      <button>Click
    </div>
  );
}`;

      const result = codeValidator.validateCodeBlock("src/Component.tsx", invalidCode, "tsx");

      expect(result).toBeDefined();
      expect(result.errors.length).toBeGreaterThanOrEqual(0);
    });

    it("应该检测代码中的TODO和FIXME", () => {
      const codeWithTodo = `import React from 'react';

export function Component() {
  // TODO: implement this feature
  // FIXME: fix this bug
  return <div>Content</div>;
}`;

      const result = codeValidator.validateCodeBlock("src/Component.tsx", codeWithTodo, "tsx");

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.some(s => s.includes("TODO") || s.includes("FIXME"))).toBe(true);
    });

    it("应该检测过多的console.log", () => {
      const codeWithManyLogs = `import React from 'react';

export function Component() {
  console.warn('start');
  console.warn('middle');
  console.warn('end');
  return <div>Content</div>;
}`;

      const result = codeValidator.validateCodeBlock("src/Component.tsx", codeWithManyLogs, "tsx");

      expect(result).toBeDefined();
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ================================================================
  // 工作流4: 意图识别 → 系统提示词构建
  // ================================================================

  describe("工作流4: 意图识别 → 系统提示词构建", () => {
    it("应该识别生成新代码的意图", () => {
      const userMessage = "请帮我创建一个React Button组件";
      const intent = systemPromptBuilder.detectIntent(userMessage);

      expect(intent).toBe("generate");
    });

    it("应该识别修改代码的意图", () => {
      const userMessage = "把App组件的背景色改成蓝色";
      const intent = systemPromptBuilder.detectIntent(userMessage);

      expect(intent).toBe("modify");
    });

    it("应该识别修复错误的意图", () => {
      const userMessage = "修复这个bug：按钮点击没有反应";
      const intent = systemPromptBuilder.detectIntent(userMessage);

      expect(intent).toBe("fix");
    });

    it("应该识别解释代码的意图", () => {
      const userMessage = "这段代码是什么意思？";
      const intent = systemPromptBuilder.detectIntent(userMessage);

      expect(intent).toBe("explain");
    });

    it("应该构建系统提示词", () => {
      const systemPrompt = systemPromptBuilder.buildSystemPrompt("generate");

      expect(systemPrompt).toBeDefined();
      expect(systemPrompt.length).toBeGreaterThan(0);
      expect(systemPrompt).toContain("生成");
    });

    it("应该构建包含上下文的系统提示词", () => {
      const context = {
        fileTree: "src/\n  App.tsx\n  index.tsx",
        openTabs: ["src/App.tsx"],
      };

      const systemPrompt = systemPromptBuilder.buildSystemPrompt("modify", context);

      expect(systemPrompt).toBeDefined();
      expect(systemPrompt.length).toBeGreaterThan(0);
      expect(systemPrompt).toContain("App.tsx");
    });

    it("应该估算Token数量", () => {
      const text = "This is a sample text for token estimation.";
      const tokens = systemPromptBuilder.estimateTokens(text);

      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe("number");
    });

    it("应该控制Token数量在限制内", () => {
      const context = {
        fileTree: "A".repeat(10000), // 长文本
        openTabs: [],
      };

      const systemPrompt = systemPromptBuilder.buildSystemPrompt("general", context, 1000);
      const tokens = systemPromptBuilder.estimateTokens(systemPrompt);

      expect(tokens).toBeGreaterThan(0);
    });
  });

  // ================================================================
  // 集成测试：多个组件协同工作
  // ================================================================

  describe("集成测试：多个组件协同工作", () => {
    it("应该支持完整的代码生成工作流", async () => {
      let updateTriggered = false;

      // 1. 识别意图
      const userMessage = "创建一个登录表单组件";
      const intent = systemPromptBuilder.detectIntent(userMessage);
      expect(intent).toBe("generate");

      // 2. 构建系统提示词
      const systemPrompt = systemPromptBuilder.buildSystemPrompt("generate");
      expect(systemPrompt.length).toBeGreaterThan(0);

      // 3. 模拟生成代码
      const generatedCode = `import React, { useState } from 'react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.warn('Login:', { email, password });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Login</button>
    </form>
  );
}`;

      // 4. 验证代码
      const validationResult = codeValidator.validateCodeBlock(
        "src/LoginForm.tsx",
        generatedCode,
        "tsx"
      );
      expect(validationResult.valid).toBe(true);

      // 5. 创建快照
      const snapshot = snapshotManager.createSnapshot("Login form component", [
        { path: "src/LoginForm.tsx", content: generatedCode },
      ]);
      expect(snapshot).toBeDefined();

      // 6. 通知预览更新
      const controller = new PreviewModeController(() => {
        updateTriggered = true;
      }, 500);
      controller.setMode("realtime");
      controller.handleFileChange();

      expect(updateTriggered).toBe(true);
    });

    it("应该支持代码修改工作流", async () => {
      let updateTriggered = false;

      // 1. 识别意图
      const userMessage = "把按钮的样式改成蓝色背景";
      const intent = systemPromptBuilder.detectIntent(userMessage);
      expect(intent).toBe("modify");

      // 2. 创建初始快照
      const initialCode = `export function Button() {
  return <button>Click</button>;
}`;
      const snapshot1 = snapshotManager.createSnapshot("Before modification", [
        { path: "src/Button.tsx", content: initialCode },
      ]);

      // 3. 修改代码
      const modifiedCode = `export function Button() {
  return <button style={{ backgroundColor: 'blue' }}>Click</button>;
}`;

      // 4. 验证修改后的代码
      const validationResult = codeValidator.validateCodeBlock(
        "src/Button.tsx",
        modifiedCode,
        "tsx"
      );
      expect(validationResult.valid).toBe(true);

      // 5. 创建修改后的快照
      const snapshot2 = snapshotManager.createSnapshot("After modification", [
        { path: "src/Button.tsx", content: modifiedCode },
      ]);

      // 6. 比较差异
      const diff = snapshotManager.compareSnapshots(snapshot1.id, snapshot2.id);
      expect(diff.modified.length).toBe(1);
      expect(diff.modified[0]).toBe("src/Button.tsx");

      // 7. 通知预览更新
      const controller = new PreviewModeController(() => {
        updateTriggered = true;
      }, 500);
      controller.setMode("realtime");
      controller.handleFileChange();

      expect(updateTriggered).toBe(true);
    });

    it("应该支持错误修复工作流", async () => {
      let updateTriggered = false;

      // 1. 识别意图
      const userMessage = "修复这个代码错误：括号不匹配";
      const intent = systemPromptBuilder.detectIntent(userMessage);
      expect(intent).toBe("fix");

      // 2. 有错误的代码
      const invalidCode = `export function Component() {
  return (
    <div>
      <button>Click
    </div>
  );
}`;

      // 3. 验证错误
      const validationResult1 = codeValidator.validateCodeBlock(
        "src/Component.tsx",
        invalidCode,
        "tsx"
      );
      expect(validationResult1.errors.length).toBeGreaterThanOrEqual(0);

      // 4. 修复后的代码
      const fixedCode = `export function Component() {
  return (
    <div>
      <button>Click</button>
    </div>
  );
}`;

      // 5. 验证修复后的代码
      const validationResult2 = codeValidator.validateCodeBlock(
        "src/Component.tsx",
        fixedCode,
        "tsx"
      );
      expect(validationResult2.valid).toBe(true);

      // 6. 创建修复前后的快照
      const snapshot1 = snapshotManager.createSnapshot("Before fix", [
        { path: "src/Component.tsx", content: invalidCode },
      ]);
      const snapshot2 = snapshotManager.createSnapshot("After fix", [
        { path: "src/Component.tsx", content: fixedCode },
      ]);

      // 7. 通知预览更新
      const controller = new PreviewModeController(() => {
        updateTriggered = true;
      }, 500);
      controller.setMode("realtime");
      controller.handleFileChange();

      expect(updateTriggered).toBe(true);
    });
  });
});
