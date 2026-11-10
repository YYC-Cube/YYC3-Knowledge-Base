// @ts-nocheck
/**
 * @file: PreviewModeController.integration.test.ts
 * @description: PreviewModeController 集成测试 - 测试编辑器到预览的完整流程
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: test
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: test,integration,preview-mode,controller
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { usePreviewStore } from "../stores/usePreviewStore";
import { PreviewModeController } from "../PreviewModeController";

// ================================================================
// Integration Tests - PreviewModeController with usePreviewStore
// ================================================================

describe("PreviewModeController Integration", () => {
  beforeEach(() => {
    // Reset store state
    usePreviewStore.setState({
      mode: "realtime",
      previewDelay: 500,
      modeController: null,
    });
  });

  afterEach(() => {
    // Clean up controller
    const controller = usePreviewStore.getState().modeController;
    if (controller) {
      controller.destroy();
    }
  });

  // ── Test 2.1.3.1: Editor → Preview Mode → Preview Update Flow ──

  describe("Editor → Preview Mode → Preview Update Flow", () => {
    it("should trigger preview update in realtime mode when editor changes", () => {
      const onUpdate = vi.fn();
      const { initModeController, notifyFileChange } = usePreviewStore.getState();

      // Initialize controller
      initModeController(onUpdate);

      // Set to realtime mode
      usePreviewStore.getState().setMode("realtime");

      // Simulate editor change
      notifyFileChange();

      // Should immediately trigger update
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    it("should mark pending update in manual mode when editor changes", () => {
      const onUpdate = vi.fn();
      const { initModeController, notifyFileChange, hasPendingPreviewUpdate } = usePreviewStore.getState();

      // Initialize controller
      initModeController(onUpdate);

      // Set to manual mode
      usePreviewStore.getState().setMode("manual");

      // Simulate editor change
      notifyFileChange();

      // Should NOT trigger update immediately
      expect(onUpdate).not.toHaveBeenCalled();

      // Should have pending update
      expect(hasPendingPreviewUpdate()).toBe(true);
    });

    it("should schedule delayed update in delayed mode when editor changes", async () => {
      const onUpdate = vi.fn();
      const { initModeController, notifyFileChange } = usePreviewStore.getState();

      // Initialize controller with short delay for testing
      usePreviewStore.setState({ previewDelay: 100 });
      initModeController(onUpdate);

      // Set to delayed mode
      usePreviewStore.getState().setMode("delayed");

      // Simulate editor change
      notifyFileChange();

      // Should NOT trigger update immediately
      expect(onUpdate).not.toHaveBeenCalled();

      // Wait for delay
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should trigger update after delay
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    it("should debounce multiple rapid changes in delayed mode", async () => {
      const onUpdate = vi.fn();
      const { initModeController, notifyFileChange } = usePreviewStore.getState();

      // Initialize controller with short delay
      usePreviewStore.setState({ previewDelay: 100 });
      initModeController(onUpdate);

      // Set to delayed mode
      usePreviewStore.getState().setMode("delayed");

      // Simulate multiple rapid changes
      notifyFileChange();
      await new Promise(resolve => setTimeout(resolve, 30));
      notifyFileChange();
      await new Promise(resolve => setTimeout(resolve, 30));
      notifyFileChange();

      // Should NOT have triggered yet
      expect(onUpdate).not.toHaveBeenCalled();

      // Wait for delay
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should trigger only once
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });
  });

  // ── Test 2.1.3.2: Manual Mode Manual Trigger ──

  describe("Manual Mode Manual Trigger", () => {
    it("should trigger update manually when pending update exists", () => {
      const onUpdate = vi.fn();
      const { initModeController, notifyFileChange, manualTriggerPreview } = usePreviewStore.getState();

      // Initialize controller
      initModeController(onUpdate);

      // Set to manual mode
      usePreviewStore.getState().setMode("manual");

      // Simulate editor change
      notifyFileChange();

      // Verify pending update
      expect(usePreviewStore.getState().hasPendingPreviewUpdate()).toBe(true);

      // Manually trigger
      manualTriggerPreview();

      // Should trigger update
      expect(onUpdate).toHaveBeenCalledTimes(1);

      // Pending update should be cleared
      expect(usePreviewStore.getState().hasPendingPreviewUpdate()).toBe(false);
    });

    it("should ignore manual trigger when no pending update", () => {
      const onUpdate = vi.fn();
      const { initModeController, manualTriggerPreview } = usePreviewStore.getState();

      // Initialize controller
      initModeController(onUpdate);

      // Set to manual mode
      usePreviewStore.getState().setMode("manual");

      // Manually trigger without pending update
      manualTriggerPreview();

      // Should NOT trigger update
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it("should accumulate pending updates in manual mode", () => {
      const onUpdate = vi.fn();
      const { initModeController, notifyFileChange, manualTriggerPreview } = usePreviewStore.getState();

      // Initialize controller
      initModeController(onUpdate);

      // Set to manual mode
      usePreviewStore.getState().setMode("manual");

      // Simulate multiple editor changes
      notifyFileChange();
      notifyFileChange();
      notifyFileChange();

      // Should have pending update
      expect(usePreviewStore.getState().hasPendingPreviewUpdate()).toBe(true);

      // Manually trigger once
      manualTriggerPreview();

      // Should trigger only one update
      expect(onUpdate).toHaveBeenCalledTimes(1);

      // Pending update should be cleared
      expect(usePreviewStore.getState().hasPendingPreviewUpdate()).toBe(false);

      // Manual trigger again should do nothing
      manualTriggerPreview();
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });
  });

  // ── Test 2.1.3.3: Delayed Mode Timer Test ──

  describe("Delayed Mode Timer Test", () => {
    it("should respect custom delay time", async () => {
      const onUpdate = vi.fn();
      const { initModeController, notifyFileChange } = usePreviewStore.getState();

      // Initialize controller with custom delay
      usePreviewStore.setState({ previewDelay: 200 });
      initModeController(onUpdate);

      // Set to delayed mode
      usePreviewStore.getState().setMode("delayed");

      // Simulate editor change
      notifyFileChange();

      // Wait for 100ms (less than delay)
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(onUpdate).not.toHaveBeenCalled();

      // Wait for another 150ms (total 250ms, more than delay)
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    it("should update delay time dynamically", async () => {
      const onUpdate = vi.fn();
      const { initModeController, notifyFileChange } = usePreviewStore.getState();

      // Initialize controller with initial delay
      usePreviewStore.setState({ previewDelay: 200 });
      initModeController(onUpdate);

      // Set to delayed mode
      usePreviewStore.getState().setMode("delayed");

      // Update delay time
      usePreviewStore.getState().setPreviewDelay(100);

      // Simulate editor change
      notifyFileChange();

      // Wait for 150ms (more than new delay)
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    it("should cancel previous timer on new change", async () => {
      const onUpdate = vi.fn();
      const { initModeController, notifyFileChange } = usePreviewStore.getState();

      // Initialize controller
      usePreviewStore.setState({ previewDelay: 100 });
      initModeController(onUpdate);

      // Set to delayed mode
      usePreviewStore.getState().setMode("delayed");

      // First change
      notifyFileChange();

      // Wait for 50ms (less than delay)
      await new Promise(resolve => setTimeout(resolve, 50));

      // Second change (should reset timer)
      notifyFileChange();

      // Wait for 80ms (total 130ms from first change, but only 80ms from second)
      // Should NOT have triggered yet
      await new Promise(resolve => setTimeout(resolve, 80));
      expect(onUpdate).not.toHaveBeenCalled();

      // Wait for another 30ms (total 110ms from second change)
      await new Promise(resolve => setTimeout(resolve, 30));
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    it("should clear timer when switching modes", async () => {
      const onUpdate = vi.fn();
      const { initModeController, notifyFileChange } = usePreviewStore.getState();

      // Initialize controller
      usePreviewStore.setState({ previewDelay: 200 });
      initModeController(onUpdate);

      // Set to delayed mode
      usePreviewStore.getState().setMode("delayed");

      // Simulate editor change
      notifyFileChange();

      // Switch to realtime mode before delay
      usePreviewStore.getState().setMode("realtime");

      // Wait for delay time
      await new Promise(resolve => setTimeout(resolve, 250));

      // Should NOT have triggered from delayed mode timer
      expect(onUpdate).not.toHaveBeenCalled();
    });
  });

  // ── Test 2.1.3.4: Mode Switching ──

  describe("Mode Switching Integration", () => {
    it("should switch from realtime to manual mode correctly", () => {
      const onUpdate = vi.fn();
      const { initModeController, notifyFileChange, manualTriggerPreview } = usePreviewStore.getState();

      // Initialize controller
      initModeController(onUpdate);

      // Start in realtime mode
      usePreviewStore.getState().setMode("realtime");

      // Change in realtime mode - should trigger immediately
      notifyFileChange();
      expect(onUpdate).toHaveBeenCalledTimes(1);

      // Switch to manual mode
      usePreviewStore.getState().setMode("manual");

      // Change in manual mode - should not trigger
      notifyFileChange();
      expect(onUpdate).toHaveBeenCalledTimes(1); // Still 1
      expect(usePreviewStore.getState().hasPendingPreviewUpdate()).toBe(true);

      // Manual trigger
      manualTriggerPreview();
      expect(onUpdate).toHaveBeenCalledTimes(2);
    });

    it("should switch from delayed to realtime mode correctly", async () => {
      const onUpdate = vi.fn();
      const { initModeController, notifyFileChange } = usePreviewStore.getState();

      // Initialize controller
      usePreviewStore.setState({ previewDelay: 200 });
      initModeController(onUpdate);

      // Start in delayed mode
      usePreviewStore.getState().setMode("delayed");

      // Change in delayed mode
      notifyFileChange();

      // Switch to realtime mode before delay
      usePreviewStore.getState().setMode("realtime");

      // Timer should be cleared, no update yet
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(onUpdate).not.toHaveBeenCalled();

      // New change in realtime mode should trigger immediately
      notifyFileChange();
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    it("should maintain controller status across mode switches", () => {
      const onUpdate = vi.fn();
      const { initModeController, getModeControllerStatus } = usePreviewStore.getState();

      // Initialize controller
      initModeController(onUpdate);

      // Check initial status
      let status = getModeControllerStatus();
      expect(status).not.toBeNull();
      expect(status?.mode).toBe("realtime");

      // Switch to manual mode
      usePreviewStore.getState().setMode("manual");
      status = getModeControllerStatus();
      expect(status?.mode).toBe("manual");

      // Switch to delayed mode
      usePreviewStore.getState().setMode("delayed");
      status = getModeControllerStatus();
      expect(status?.mode).toBe("delayed");

      // Switch back to realtime
      usePreviewStore.getState().setMode("realtime");
      status = getModeControllerStatus();
      expect(status?.mode).toBe("realtime");
    });
  });

  // ── Test 2.1.3.5: State Persistence ──

  describe("State Persistence", () => {
    it("should persist mode preference", () => {
      const { setMode } = usePreviewStore.getState();

      // Set mode
      setMode("manual");

      // Verify persisted in store
      expect(usePreviewStore.getState().mode).toBe("manual");
    });

    it("should persist delay preference", () => {
      const { setPreviewDelay } = usePreviewStore.getState();

      // Set delay
      setPreviewDelay(1000);

      // Verify persisted in store
      expect(usePreviewStore.getState().previewDelay).toBe(1000);
    });

    it("should initialize controller with persisted settings", () => {
      const onUpdate = vi.fn();

      // Set persisted settings
      usePreviewStore.setState({
        mode: "delayed",
        previewDelay: 800,
      });

      // Initialize controller
      const { initModeController, getModeControllerStatus } = usePreviewStore.getState();
      initModeController(onUpdate);

      // Verify controller uses persisted settings
      const status = getModeControllerStatus();
      expect(status?.mode).toBe("delayed");
      expect(status?.delay).toBe(800);
    });
  });

  // ── Test 2.1.3.6: Error Handling ──

  describe("Error Handling", () => {
    it("should handle error in update callback", () => {
      const onUpdate = vi.fn(() => {
        throw new Error("Update failed");
      });
      const { initModeController, notifyFileChange } = usePreviewStore.getState();

      // Initialize controller
      initModeController(onUpdate);

      // Set to realtime mode
      usePreviewStore.getState().setMode("realtime");

      // Should not throw
      expect(() => notifyFileChange()).not.toThrow();

      // Should have attempted update
      expect(onUpdate).toHaveBeenCalled();
    });

    it("should fallback to direct trigger if controller not initialized", () => {
      const { notifyFileChange, triggerRefresh } = usePreviewStore.getState();

      // Spy on triggerRefresh
      const refreshSpy = vi.spyOn(usePreviewStore.getState(), "triggerRefresh");

      // Try to notify without initializing controller
      notifyFileChange();

      // Should have called triggerRefresh as fallback
      expect(refreshSpy).toHaveBeenCalled();
    });
  });
});
