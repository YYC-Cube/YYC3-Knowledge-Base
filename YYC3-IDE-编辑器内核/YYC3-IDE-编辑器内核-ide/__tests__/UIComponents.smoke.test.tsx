// @ts-nocheck
/**
 * @file: UIComponents.smoke.test.tsx
 * @description: UI组件冒烟测试 - 最基本的渲染测试
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: test
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: test,ui,smoke
 */

import { describe, it, expect, vi } from "vitest";

describe("UI Components - Smoke Test", () => {
  it("should import PreviewModeControl without errors", async () => {
    const { PreviewModeControl } = await import("../PreviewModeControl");
    expect(PreviewModeControl).toBeDefined();
    expect(typeof PreviewModeControl).toBe("function");
  });

  it("should import SnapshotManagerPanel without errors", async () => {
    const { SnapshotManagerPanel } = await import("../SnapshotManagerPanel");
    expect(SnapshotManagerPanel).toBeDefined();
    expect(typeof SnapshotManagerPanel).toBe("function");
  });

  it("should import CodeValidationPanel without errors", async () => {
    const { CodeValidationPanel } = await import("../CodeValidationPanel");
    expect(CodeValidationPanel).toBeDefined();
    expect(typeof CodeValidationPanel).toBe("function");
  });

  it("should have correct component names", async () => {
    const { PreviewModeControl } = await import("../PreviewModeControl");
    const { SnapshotManagerPanel } = await import("../SnapshotManagerPanel");
    const { CodeValidationPanel } = await import("../CodeValidationPanel");

    expect(PreviewModeControl.name).toBe("PreviewModeControl");
    expect(SnapshotManagerPanel.name).toBe("SnapshotManagerPanel");
    expect(CodeValidationPanel.name).toBe("CodeValidationPanel");
  });
});
