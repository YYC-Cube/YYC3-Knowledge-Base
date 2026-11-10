// @ts-nocheck
/**
 * @file: SnapshotViewController.test.ts
 * @description: SnapshotViewController单元测试
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { SnapshotViewController } from "../SnapshotViewController";

describe("SnapshotViewController", () => {
  let controller: SnapshotViewController;
  let onViewChange: ReturnType<typeof vi.fn>;
  let onSyncChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onViewChange = vi.fn();
    onSyncChange = vi.fn();
    controller = new SnapshotViewController({
      onViewChange,
      onSyncChange,
    });
  });

  // ================================================================
  // 视图管理测试
  // ================================================================

  describe("视图管理", () => {
    it("应该添加视图", () => {
      const result = controller.addView("view1", "snapshot1");
      const view = controller.getViewState("view1");

      expect(view).toBeDefined();
      expect(view?.viewId).toBe("view1");
      expect(view?.snapshotId).toBe("snapshot1");
      expect(view?.visible).toBe(true);
      expect(onViewChange).toHaveBeenCalledWith("view1", view);
    });

    it("应该添加多个视图", () => {
      controller.addView("view1", "snapshot1");
      controller.addView("view2", "snapshot2");
      controller.addView("view3", "snapshot3");

      expect(controller.getViewCount()).toBe(3);
    });

    it("应该移除视图", () => {
      controller.addView("view1", "snapshot1");
      const result = controller.removeView("view1");

      expect(result).toBe(true);
      expect(controller.getViewCount()).toBe(0);
    });

    it("应该获取所有视图", () => {
      controller.addView("view1", "snapshot1");
      controller.addView("view2", "snapshot2");

      const views = controller.getAllViews();
      expect(views.length).toBe(2);
    });
  });

  // ================================================================
  // 视图位置更新测试
  // ================================================================

  describe("视图位置更新", () => {
    beforeEach(() => {
      controller.addView("view1", "snapshot1");
      controller.addView("view2", "snapshot2");
    });

    it("应该更新视图位置", () => {
      const result = controller.updateViewPosition("view1", {
        scrollX: 100,
        scrollY: 200,
      });

      expect(result).toBe(true);
      const view = controller.getViewState("view1");
      expect(view?.position.scrollX).toBe(100);
      expect(view?.position.scrollY).toBe(200);
    });

    it("应该同步滚动位置", () => {
      controller.setSyncScroll(true);
      onViewChange.mockClear();

      controller.updateViewPosition("view1", {
        scrollX: 100,
        scrollY: 200,
      });

      expect(onViewChange).toHaveBeenCalled();

      // 检查view2是否同步了滚动
      const view2 = controller.getViewState("view2");
      expect(view2?.position.scrollX).toBe(100);
      expect(view2?.position.scrollY).toBe(200);
    });

    it("应该同步缩放级别", () => {
      controller.setSyncZoom(true);
      onViewChange.mockClear();

      controller.updateViewPosition("view1", {
        zoom: 150,
      });

      expect(onViewChange).toHaveBeenCalled();

      // 检查view2是否同步了缩放
      const view2 = controller.getViewState("view2");
      expect(view2?.position.zoom).toBe(150);
    });

    it("应该不更新不存在的视图", () => {
      const result = controller.updateViewPosition("invalid", {
        scrollX: 100,
      });

      expect(result).toBe(false);
    });
  });

  // ================================================================
  // 视图激活测试
  // ================================================================

  describe("视图激活", () => {
    beforeEach(() => {
      controller.addView("view1", "snapshot1");
      controller.addView("view2", "snapshot2");
    });

    it("应该激活视图", () => {
      const result = controller.activateView("view1");
      expect(result).toBe(true);

      const view1 = controller.getViewState("view1");
      expect(view1?.active).toBe(true);

      const view2 = controller.getViewState("view2");
      expect(view2?.active).toBe(false);
    });

    it("应该获取激活的视图ID", () => {
      controller.activateView("view1");
      const activeId = controller.getActiveViewId();
      expect(activeId).toBe("view1");
    });

    it("应该在没有激活视图时返回undefined", () => {
      const activeId = controller.getActiveViewId();
      expect(activeId).toBeUndefined();
    });
  });

  // ================================================================
  // 视图可见性测试
  // ================================================================

  describe("视图可见性", () => {
    beforeEach(() => {
      controller.addView("view1", "snapshot1");
    });

    it("应该设置视图可见性", () => {
      const result = controller.setViewVisible("view1", false);
      expect(result).toBe(true);

      const view = controller.getViewState("view1");
      expect(view?.visible).toBe(false);
    });

    it("不应该同步隐藏视图", () => {
      controller.addView("view2", "snapshot2");
      controller.setSyncScroll(true);
      onViewChange.mockClear();

      controller.setViewVisible("view1", false);
      controller.updateViewPosition("view2", { scrollX: 100 });

      // view1应该不同步，因为不可见
      const view1 = controller.getViewState("view1");
      expect(view1?.position.scrollX).toBe(0);
    });
  });

  // ================================================================
  // 缩放控制测试
  // ================================================================

  describe("缩放控制", () => {
    beforeEach(() => {
      controller.addView("view1", "snapshot1");
      controller.addView("view2", "snapshot2");
    });

    it("应该放大所有视图", () => {
      controller.zoomInAll();

      const view1 = controller.getViewState("view1");
      const view2 = controller.getViewState("view2");

      expect(view1?.position.zoom).toBe(125);
      expect(view2?.position.zoom).toBe(125);
    });

    it("应该缩小所有视图", () => {
      controller.zoomOutAll();

      const view1 = controller.getViewState("view1");
      const view2 = controller.getViewState("view2");

      expect(view1?.position.zoom).toBe(75);
      expect(view2?.position.zoom).toBe(75);
    });

    it("应该重置所有视图缩放", () => {
      controller.updateViewPosition("view1", { zoom: 150 });
      controller.resetAllZoom();

      const view1 = controller.getViewState("view1");
      const view2 = controller.getViewState("view2");

      expect(view1?.position.zoom).toBe(100);
      expect(view2?.position.zoom).toBe(100);
    });

    it("应该缩放到适配", () => {
      const result = controller.zoomToFit(800, 1600);

      expect(result).toBe(true);
      const view1 = controller.getViewState("view1");
      const view2 = controller.getViewState("view2");

      expect(view1?.position.zoom).toBe(50);
      expect(view2?.position.zoom).toBe(50);
    });
  });

  // ================================================================
  // 同步状态测试
  // ================================================================

  describe("同步状态", () => {
    it("应该设置滚动同步", () => {
      controller.setSyncScroll(false);
      expect(controller.getSyncState().scroll).toBe(false);
      expect(onSyncChange).toHaveBeenCalledWith("scroll", false);

      controller.setSyncScroll(true);
      expect(controller.getSyncState().scroll).toBe(true);
      expect(onSyncChange).toHaveBeenCalledWith("scroll", true);
    });

    it("应该设置缩放同步", () => {
      controller.setSyncZoom(false);
      expect(controller.getSyncState().zoom).toBe(false);
      expect(onSyncChange).toHaveBeenCalledWith("zoom", false);

      controller.setSyncZoom(true);
      expect(controller.getSyncState().zoom).toBe(true);
      expect(onSyncChange).toHaveBeenCalledWith("zoom", true);
    });

    it("应该更新比较配置", () => {
      controller.updateComparisonConfig({ sideBySide: false, syncScroll: false });

      const config = controller.getComparisonConfig();
      expect(config.sideBySide).toBe(false);
      expect(config.syncScroll).toBe(false);
    });
  });

  // ================================================================
  // 视图比较测试
  // ================================================================

  describe("视图比较", () => {
    beforeEach(() => {
      controller.setSyncScroll(false);
      controller.setSyncZoom(false);
      controller.addView("view1", "snapshot1");
      controller.addView("view2", "snapshot2");
    });

    it("应该比较视图差异", () => {
      controller.updateViewPosition("view1", { scrollX: 100, scrollY: 200, zoom: 100 });
      controller.updateViewPosition("view2", { scrollX: 150, scrollY: 250, zoom: 150 });

      const diff = controller.compareViews("view1", "view2");

      expect(diff).toBeDefined();
      expect(diff?.scrollDiff.x).toBe(50);
      expect(diff?.scrollDiff.y).toBe(50);
      expect(diff?.zoomDiff).toBe(50);
      expect(diff?.hasDifferences).toBe(true);
    });

    it("应该检测无差异", () => {
      controller.updateViewPosition("view1", { scrollX: 100, scrollY: 200, zoom: 100 });
      controller.updateViewPosition("view2", { scrollX: 100, scrollY: 200, zoom: 100 });

      const diff = controller.compareViews("view1", "view2");

      expect(diff?.hasDifferences).toBe(false);
    });

    it("应该处理不存在的视图", () => {
      const diff = controller.compareViews("view1", "invalid");
      expect(diff).toBeNull();
    });
  });

  // ================================================================
  // 清空和销毁测试
  // ================================================================

  describe("清空和销毁", () => {
    beforeEach(() => {
      controller.addView("view1", "snapshot1");
      controller.addView("view2", "snapshot2");
      controller.addView("view3", "snapshot3");
    });

    it("应该清空所有视图", () => {
      controller.clearAllViews();
      expect(controller.getViewCount()).toBe(0);
    });

    it("应该销毁控制器", () => {
      controller.destroy();
      expect(controller.getViewCount()).toBe(0);
    });
  });
});
