// @ts-nocheck
/**
 * @file: PreviewModeController.test.ts
 * @description: PreviewModeController 单元测试
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PreviewModeController, createPreviewModeController } from "../PreviewModeController";
import type { PreviewMode } from "../../stores/usePreviewStore";

describe("PreviewModeController", () => {
  let controller: PreviewModeController;
  let mockTriggerUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // 使用假的定时器
    vi.useFakeTimers();
    
    // 创建模拟的触发函数
    mockTriggerUpdate = vi.fn();
    
    // 创建控制器实例
    controller = new PreviewModeController(mockTriggerUpdate, 500);
  });

  afterEach(() => {
    // 清理控制器
    controller.destroy();
    
    // 恢复真实的定时器
    vi.useRealTimers();
  });

  // ========================================
  // 构造函数测试
  // ========================================

  describe("constructor", () => {
    it("应该使用默认延迟时间创建控制器", () => {
      const ctrl = new PreviewModeController(mockTriggerUpdate);
      expect(ctrl.getDelay()).toBe(500);
      ctrl.destroy();
    });

    it("应该使用自定义延迟时间创建控制器", () => {
      const ctrl = new PreviewModeController(mockTriggerUpdate, 1000);
      expect(ctrl.getDelay()).toBe(1000);
      ctrl.destroy();
    });

    it("应该默认使用 realtime 模式", () => {
      expect(controller.getMode()).toBe("realtime");
    });
  });

  // ========================================
  // 模式切换测试
  // ========================================

  describe("setMode", () => {
    it("应该正确切换到 manual 模式", () => {
      controller.setMode("manual");
      expect(controller.getMode()).toBe("manual");
    });

    it("应该正确切换到 delayed 模式", () => {
      controller.setMode("delayed");
      expect(controller.getMode()).toBe("delayed");
    });

    it("应该正确切换回 realtime 模式", () => {
      controller.setMode("manual");
      controller.setMode("realtime");
      expect(controller.getMode()).toBe("realtime");
    });

    it("切换模式时应该清除延迟定时器", () => {
      controller.setMode("delayed");
      controller.handleFileChange();
      
      // 在延迟期间切换模式
      controller.setMode("realtime");
      
      // 快进时间
      vi.advanceTimersByTime(600);
      
      // 因为切换了模式，延迟定时器被清除，不应该触发更新
      expect(mockTriggerUpdate).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // 实时模式测试
  // ========================================

  describe("realtime mode", () => {
    beforeEach(() => {
      controller.setMode("realtime");
    });

    it("文件变更应该立即触发更新", () => {
      controller.handleFileChange();
      
      expect(mockTriggerUpdate).toHaveBeenCalledTimes(1);
    });

    it("多次文件变更应该触发多次更新", () => {
      controller.handleFileChange();
      controller.handleFileChange();
      controller.handleFileChange();
      
      expect(mockTriggerUpdate).toHaveBeenCalledTimes(3);
    });
  });

  // ========================================
  // 手动模式测试
  // ========================================

  describe("manual mode", () => {
    beforeEach(() => {
      controller.setMode("manual");
    });

    it("文件变更不应该立即触发更新", () => {
      controller.handleFileChange();
      
      expect(mockTriggerUpdate).not.toHaveBeenCalled();
    });

    it("文件变更应该标记有待处理的更新", () => {
      controller.handleFileChange();
      
      expect(controller.hasPendingUpdate()).toBe(true);
    });

    it("手动触发应该执行更新", () => {
      controller.handleFileChange();
      controller.manualTrigger();
      
      expect(mockTriggerUpdate).toHaveBeenCalledTimes(1);
    });

    it("手动触发后应该清除待处理标记", () => {
      controller.handleFileChange();
      controller.manualTrigger();
      
      expect(controller.hasPendingUpdate()).toBe(false);
    });

    it("没有待处理更新时手动触发应该被忽略", () => {
      controller.manualTrigger();
      
      expect(mockTriggerUpdate).not.toHaveBeenCalled();
    });

    it("多次文件变更应该只标记一次待处理", () => {
      controller.handleFileChange();
      controller.handleFileChange();
      controller.handleFileChange();
      
      controller.manualTrigger();
      
      expect(mockTriggerUpdate).toHaveBeenCalledTimes(1);
    });
  });

  // ========================================
  // 延迟模式测试
  // ========================================

  describe("delayed mode", () => {
    beforeEach(() => {
      controller.setMode("delayed");
    });

    it("文件变更不应该立即触发更新", () => {
      controller.handleFileChange();
      
      expect(mockTriggerUpdate).not.toHaveBeenCalled();
    });

    it("延迟时间后应该触发更新", () => {
      controller.handleFileChange();
      
      // 快进500ms
      vi.advanceTimersByTime(500);
      
      expect(mockTriggerUpdate).toHaveBeenCalledTimes(1);
    });

    it("延迟时间前不应该触发更新", () => {
      controller.handleFileChange();
      
      // 快进400ms（未到达500ms）
      vi.advanceTimersByTime(400);
      
      expect(mockTriggerUpdate).not.toHaveBeenCalled();
    });

    it("多次快速变更应该只触发一次更新（防抖）", () => {
      controller.handleFileChange();
      vi.advanceTimersByTime(200);
      
      controller.handleFileChange();
      vi.advanceTimersByTime(200);
      
      controller.handleFileChange();
      
      // 快进剩余时间
      vi.advanceTimersByTime(500);
      
      expect(mockTriggerUpdate).toHaveBeenCalledTimes(1);
    });

    it("不同延迟时间应该正确工作", () => {
      const customDelayController = new PreviewModeController(
        mockTriggerUpdate,
        1000
      );
      customDelayController.setMode("delayed");
      
      customDelayController.handleFileChange();
      
      // 快进500ms（未到达1000ms）
      vi.advanceTimersByTime(500);
      expect(mockTriggerUpdate).not.toHaveBeenCalled();
      
      // 快进剩余500ms
      vi.advanceTimersByTime(500);
      expect(mockTriggerUpdate).toHaveBeenCalledTimes(1);
      
      customDelayController.destroy();
    });
  });

  // ========================================
  // 延迟时间设置测试
  // ========================================

  describe("setDelay", () => {
    it("应该正确设置延迟时间", () => {
      controller.setDelay(1000);
      expect(controller.getDelay()).toBe(1000);
    });

    it("延迟时间不应该小于100ms", () => {
      controller.setDelay(50);
      expect(controller.getDelay()).toBe(100);
    });

    it("延迟时间不应该大于5000ms", () => {
      controller.setDelay(10000);
      expect(controller.getDelay()).toBe(5000);
    });

    it("设置延迟时间应该在延迟模式中生效", () => {
      controller.setMode("delayed");
      controller.setDelay(1000);
      
      controller.handleFileChange();
      
      vi.advanceTimersByTime(500);
      expect(mockTriggerUpdate).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(500);
      expect(mockTriggerUpdate).toHaveBeenCalledTimes(1);
    });
  });

  // ========================================
  // 状态查询测试
  // ========================================

  describe("getStatus", () => {
    it("应该返回正确的状态信息", () => {
      controller.setMode("manual");
      controller.handleFileChange();
      
      const status = controller.getStatus();
      
      expect(status.mode).toBe("manual");
      expect(status.delay).toBe(500);
      expect(status.hasPendingUpdate).toBe(true);
      expect(status.hasActiveTimer).toBe(false);
    });

    it("延迟模式下应该正确报告定时器状态", () => {
      controller.setMode("delayed");
      controller.handleFileChange();
      
      const status = controller.getStatus();
      
      expect(status.hasActiveTimer).toBe(true);
    });
  });

  // ========================================
  // 重置和销毁测试
  // ========================================

  describe("reset", () => {
    it("重置应该清除待处理更新", () => {
      controller.setMode("manual");
      controller.handleFileChange();
      
      controller.reset();
      
      expect(controller.hasPendingUpdate()).toBe(false);
    });

    it("重置应该清除延迟定时器", () => {
      controller.setMode("delayed");
      controller.handleFileChange();
      
      controller.reset();
      
      vi.advanceTimersByTime(600);
      expect(mockTriggerUpdate).not.toHaveBeenCalled();
    });

    it("重置不应该改变当前模式", () => {
      controller.setMode("manual");
      controller.reset();
      
      expect(controller.getMode()).toBe("manual");
    });
  });

  describe("destroy", () => {
    it("销毁应该清理所有资源", () => {
      controller.setMode("delayed");
      controller.handleFileChange();
      
      controller.destroy();
      
      vi.advanceTimersByTime(600);
      expect(mockTriggerUpdate).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // 工厂函数测试
  // ========================================

  describe("createPreviewModeController", () => {
    it("应该创建带有默认模式的控制器", () => {
      const ctrl = createPreviewModeController(mockTriggerUpdate);
      expect(ctrl.getMode()).toBe("realtime");
      ctrl.destroy();
    });

    it("应该创建带有指定模式的控制器", () => {
      const ctrl = createPreviewModeController(
        mockTriggerUpdate,
        "delayed",
        1000
      );
      expect(ctrl.getMode()).toBe("delayed");
      expect(ctrl.getDelay()).toBe(1000);
      ctrl.destroy();
    });
  });

  // ========================================
  // 边界情况测试
  // ========================================

  describe("edge cases", () => {
    it("应该处理快速的模式切换", () => {
      controller.setMode("manual");
      controller.handleFileChange();
      
      controller.setMode("realtime");
      controller.handleFileChange();
      
      controller.setMode("delayed");
      controller.handleFileChange();
      
      vi.advanceTimersByTime(600);
      
      // 只有 realtime 和 delayed 模式应该触发更新
      expect(mockTriggerUpdate).toHaveBeenCalledTimes(2);
    });

    it("应该处理零延迟时间", () => {
      controller.setDelay(100); // 最小值
      controller.setMode("delayed");
      
      controller.handleFileChange();
      
      vi.advanceTimersByTime(100);
      expect(mockTriggerUpdate).toHaveBeenCalledTimes(1);
    });

    it("应该处理最大延迟时间", () => {
      controller.setDelay(5000); // 最大值
      controller.setMode("delayed");
      
      controller.handleFileChange();
      
      vi.advanceTimersByTime(5000);
      expect(mockTriggerUpdate).toHaveBeenCalledTimes(1);
    });

    it("更新回调抛出错误时应该正常处理", () => {
      const errorMock = vi.fn(() => {
        throw new Error("Update error");
      });
      const errorController = new PreviewModeController(errorMock);
      errorController.setMode("realtime");
      
      // 应该不抛出错误
      expect(() => errorController.handleFileChange()).not.toThrow();
      
      errorController.destroy();
    });
  });
});
