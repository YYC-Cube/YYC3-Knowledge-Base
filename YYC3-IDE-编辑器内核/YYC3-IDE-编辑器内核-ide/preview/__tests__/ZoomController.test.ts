// @ts-nocheck
/**
 * @file: ZoomController.test.ts
 * @description: ZoomController单元测试
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ZoomController } from "../ZoomController";

describe("ZoomController", () => {
  let controller: ZoomController;
  let onZoomChange: ReturnType<typeof vi.fn>;
  let onZoomLimit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onZoomChange = vi.fn();
    onZoomLimit = vi.fn();
    controller = new ZoomController({
      onZoomChange,
      onZoomLimit,
    });
  });

  // ================================================================
  // 基本缩放功能测试
  // ================================================================

  describe("基本缩放功能", () => {
    it("应该初始化为100%缩放", () => {
      expect(controller.getCurrentZoom()).toBe(100);
    });

    it("应该设置有效的缩放级别", () => {
      const result = controller.setZoom(150);
      expect(result).toBe(true);
      expect(controller.getCurrentZoom()).toBe(150);
      expect(onZoomChange).toHaveBeenCalledWith(150);
    });

    it("应该拒绝超出范围的缩放", () => {
      const result1 = controller.setZoom(10);
      expect(result1).toBe(false);
      expect(controller.getCurrentZoom()).toBe(100);

      const result2 = controller.setZoom(300);
      expect(result2).toBe(false);
      expect(controller.getCurrentZoom()).toBe(100);
    });

    it("应该限制缩放值", () => {
      expect(controller.clampZoom(10)).toBe(25);
      expect(controller.clampZoom(300)).toBe(200);
      expect(controller.clampZoom(150)).toBe(150);
    });

    it("应该验证缩放值", () => {
      expect(controller.isValidZoom(50)).toBe(true);
      expect(controller.isValidZoom(100)).toBe(true);
      expect(controller.isValidZoom(200)).toBe(true);
      expect(controller.isValidZoom(10)).toBe(false);
      expect(controller.isValidZoom(300)).toBe(false);
    });
  });

  // ================================================================
  // 放大和缩小测试
  // ================================================================

  describe("放大和缩小", () => {
    it("应该放大", () => {
      controller.setZoom(100);
      const result = controller.zoomIn();
      expect(result).toBe(true);
      expect(controller.getCurrentZoom()).toBe(125);
      expect(onZoomChange).toHaveBeenCalledWith(125);
    });

    it("应该缩小", () => {
      controller.setZoom(100);
      const result = controller.zoomOut();
      expect(result).toBe(true);
      expect(controller.getCurrentZoom()).toBe(75);
      expect(onZoomChange).toHaveBeenCalledWith(75);
    });

    it("应该在达到最大值时停止放大", () => {
      controller.setZoom(200);
      const result = controller.zoomIn();
      expect(result).toBe(false);
      expect(controller.getCurrentZoom()).toBe(200);
      expect(onZoomLimit).toHaveBeenCalledWith(200, true);
    });

    it("应该在达到最小值时停止缩小", () => {
      controller.setZoom(25);
      const result = controller.zoomOut();
      expect(result).toBe(false);
      expect(controller.getCurrentZoom()).toBe(25);
      expect(onZoomLimit).toHaveBeenCalledWith(25, false);
    });

    it("应该可以多次放大", () => {
      controller.setZoom(50);
      controller.zoomIn();
      expect(controller.getCurrentZoom()).toBe(75);
      controller.zoomIn();
      expect(controller.getCurrentZoom()).toBe(100);
    });

    it("应该可以多次缩小", () => {
      controller.setZoom(100);
      controller.zoomOut();
      expect(controller.getCurrentZoom()).toBe(75);
      controller.zoomOut();
      expect(controller.getCurrentZoom()).toBe(50);
    });
  });

  // ================================================================
  // 重置和预设值测试
  // ================================================================

  describe("重置和预设值", () => {
    it("应该重置缩放到100%", () => {
      controller.setZoom(150);
      const result = controller.resetZoom();
      expect(result).toBe(true);
      expect(controller.getCurrentZoom()).toBe(100);
    });

    it("应该设置预设缩放级别", () => {
      const result = controller.setPresetZoom("150");
      expect(result).toBe(true);
      expect(controller.getCurrentZoom()).toBe(150);
    });

    it("应该获取下一个预设缩放级别", () => {
      controller.setZoom(100);
      const next = controller.getNextPresetZoom();
      expect(next).toBe(125);
    });

    it("应该在最大值时返回null", () => {
      controller.setZoom(200);
      const next = controller.getNextPresetZoom();
      expect(next).toBeNull();
    });

    it("应该获取上一个预设缩放级别", () => {
      controller.setZoom(150);
      const prev = controller.getPreviousPresetZoom();
      expect(prev).toBe(125);
    });

    it("应该在最小值时返回null", () => {
      controller.setZoom(25);
      const prev = controller.getPreviousPresetZoom();
      expect(prev).toBeNull();
    });
  });

  // ================================================================
  // 适配视图测试
  // ================================================================

  describe("适配视图", () => {
    it("应该缩放到适配宽度", () => {
      const result = controller.zoomToFit(800, 1600);
      expect(result).toBe(true);
      expect(controller.getCurrentZoom()).toBe(50);
    });

    it("应该限制适配缩放", () => {
      const result1 = controller.zoomToFit(100, 10000); // 应该限制在25%
      expect(result1).toBe(true);
      expect(controller.getCurrentZoom()).toBe(25);

      const result2 = controller.zoomToFit(10000, 100); // 应该限制在200%
      expect(result2).toBe(true);
      expect(controller.getCurrentZoom()).toBe(200);
    });
  });

  // ================================================================
  // 历史记录测试
  // ================================================================

  describe("历史记录", () => {
    it("应该记录缩放历史", () => {
      controller.setZoom(150);
      controller.setZoom(175);
      controller.setZoom(200);

      const state = controller.getState();
      expect(state.history.length).toBe(4); // 初始 + 3次更改
      expect(state.historyIndex).toBe(3);
    });

    it("应该可以撤销缩放", () => {
      controller.setZoom(150);
      controller.setZoom(175);
      const result = controller.undoZoom();
      expect(result).toBe(true);
      expect(controller.getCurrentZoom()).toBe(150);
    });

    it("应该在开始时无法撤销", () => {
      const result = controller.undoZoom();
      expect(result).toBe(false);
      expect(controller.getCurrentZoom()).toBe(100);
    });

    it("应该可以重做缩放", () => {
      controller.setZoom(150);
      controller.setZoom(175);
      controller.undoZoom();
      const result = controller.redoZoom();
      expect(result).toBe(true);
      expect(controller.getCurrentZoom()).toBe(175);
    });

    it("应该在结束时无法重做", () => {
      const result = controller.redoZoom();
      expect(result).toBe(false);
    });

    it("应该清除历史记录", () => {
      controller.setZoom(150);
      controller.clearHistory();
      const state = controller.getState();
      expect(state.history.length).toBe(1);
      expect(state.history[0]).toBe(150);
    });
  });

  // ================================================================
  // 状态查询测试
  // ================================================================

  describe("状态查询", () => {
    it("应该正确报告状态", () => {
      controller.setZoom(100);
      const state = controller.getState();
      expect(state.currentZoom).toBe(100);
      expect(state.isCustom).toBe(false);
      expect(state.isAtMin).toBe(false);
      expect(state.isAtMax).toBe(false);
    });

    it("应该识别自定义缩放", () => {
      controller.setZoom(87);
      const state = controller.getState();
      expect(state.isCustom).toBe(true);
    });

    it("应该正确报告是否可以放大", () => {
      controller.setZoom(100);
      expect(controller.canZoomIn()).toBe(true);

      controller.setZoom(200);
      expect(controller.canZoomIn()).toBe(false);
    });

    it("应该正确报告是否可以缩小", () => {
      controller.setZoom(100);
      expect(controller.canZoomOut()).toBe(true);

      controller.setZoom(25);
      expect(controller.canZoomOut()).toBe(false);
    });

    it("应该获取缩放比例", () => {
      controller.setZoom(100);
      expect(controller.getScale()).toBe(1);

      controller.setZoom(50);
      expect(controller.getScale()).toBe(0.5);

      controller.setZoom(200);
      expect(controller.getScale()).toBe(2);
    });
  });

  // ================================================================
  // 配置测试
  // ================================================================

  describe("配置", () => {
    it("应该使用自定义配置", () => {
      const controller2 = new ZoomController({
        initialZoom: 50,
        minZoom: 10,
        maxZoom: 300,
        zoomStep: 10,
      });

      expect(controller2.getCurrentZoom()).toBe(50);
      expect(controller2.canZoomIn()).toBe(true);
      expect(controller2.canZoomOut()).toBe(true);
    });

    it("应该更新配置", () => {
      controller.updateConfig({ maxZoom: 150 });
      controller.setZoom(150);
      expect(controller.getCurrentZoom()).toBe(150);
      expect(controller.canZoomIn()).toBe(false);
    });

    it("应该在配置更新时调整超出范围的缩放", () => {
      controller.setZoom(150);
      controller.updateConfig({ maxZoom: 100 });
      expect(controller.getCurrentZoom()).toBe(100);
    });
  });

  // ================================================================
  // 销毁测试
  // ================================================================

  describe("销毁", () => {
    it("应该清除历史记录", () => {
      controller.setZoom(150);
      controller.destroy();
      const state = controller.getState();
      expect(state.history.length).toBe(1);
    });

    it("应该移除回调", () => {
      controller.setZoom(150);
      controller.destroy();
      controller.setZoom(200);
      expect(onZoomChange).toHaveBeenCalledTimes(1); // 只在销毁前调用一次
    });
  });
});
