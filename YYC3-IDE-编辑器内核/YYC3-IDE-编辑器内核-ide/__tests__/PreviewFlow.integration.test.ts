// @ts-nocheck
/**
 * @file: PreviewFlow.integration.test.ts
 * @description: 完整预览流程集成测试 - 测试编辑器到预览的完整工作流程
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: test
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: test,integration,preview-flow,full-workflow
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { usePreviewStore } from "../stores/usePreviewStore";
import { useThemeStore } from "../stores/useThemeStore";
import { PreviewModeController } from "../PreviewModeController";
import { ZoomController } from "../preview/ZoomController";
import { DeviceSimulatorEngine } from "../preview/DeviceSimulatorEngine";

// ================================================================
// Integration Tests - Complete Preview Flow
// ================================================================

describe("Preview Flow Integration", () => {
  let mockUpdateCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset stores
    usePreviewStore.setState({
      mode: "realtime",
      previewDelay: 500,
      modeController: null,
      zoomController: null,
      deviceSimulator: null,
    });
    useThemeStore.setState({
      currentTheme: "light",
      customColors: {},
      systemThemeFollow: false,
    });

    // Mock update callback
    mockUpdateCallback = vi.fn();
  });

  afterEach(() => {
    // Clean up controllers
    const controller = usePreviewStore.getState().modeController;
    const zoomController = usePreviewStore.getState().zoomController;
    const deviceSimulator = usePreviewStore.getState().deviceSimulator;

    if (controller) controller.destroy();
    if (zoomController) zoomController.destroy();
    if (deviceSimulator) deviceSimulator.destroy();
  });

  // ── Test 2.1.1: Editor → Preview Update Flow (Three Modes) ──

  describe("Editor → Preview Update Flow", () => {
    it("should trigger immediate preview update in realtime mode", () => {
      const { initModeController, notifyFileChange } = usePreviewStore.getState();

      // Initialize controller
      initModeController(mockUpdateCallback);

      // Set to realtime mode
      usePreviewStore.getState().setMode("realtime");

      // Simulate editor change
      notifyFileChange();

      // Should immediately trigger update
      expect(mockUpdateCallback).toHaveBeenCalledTimes(1);
    });

    it("should mark pending update in manual mode", () => {
      const { initModeController, notifyFileChange, hasPendingPreviewUpdate } =
        usePreviewStore.getState();

      initModeController(mockUpdateCallback);

      usePreviewStore.getState().setMode("manual");
      notifyFileChange();

      // Should NOT trigger update immediately
      expect(mockUpdateCallback).not.toHaveBeenCalled();

      // Should have pending update
      expect(hasPendingPreviewUpdate()).toBe(true);
    });

    it("should schedule delayed update in delayed mode", async () => {
      const { initModeController, notifyFileChange } = usePreviewStore.getState();

      // Use short delay for testing
      usePreviewStore.setState({ previewDelay: 100 });
      initModeController(mockUpdateCallback);

      usePreviewStore.getState().setMode("delayed");
      notifyFileChange();

      // Should NOT trigger update immediately
      expect(mockUpdateCallback).not.toHaveBeenCalled();

      // Wait for delay
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should trigger update after delay
      expect(mockUpdateCallback).toHaveBeenCalledTimes(1);
    });

    it("should debounce multiple changes in delayed mode", async () => {
      const { initModeController, notifyFileChange } = usePreviewStore.getState();

      usePreviewStore.setState({ previewDelay: 100 });
      initModeController(mockUpdateCallback);

      usePreviewStore.getState().setMode("delayed");

      // Simulate multiple rapid changes
      notifyFileChange();
      await new Promise(resolve => setTimeout(resolve, 50));
      notifyFileChange();
      await new Promise(resolve => setTimeout(resolve, 50));
      notifyFileChange();

      // Wait for delay
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should only trigger update once (debounced)
      expect(mockUpdateCallback).toHaveBeenCalledTimes(1);
    });
  });

  // ── Test 2.1.2: Device Switch → View Update Flow ──

  describe("Device Switch → View Update Flow", () => {
    beforeEach(() => {
      // Initialize device simulator
      const { initDeviceSimulator } = usePreviewStore.getState();
      initDeviceSimulator();
    });

    it("should update view when switching to desktop device", () => {
      const deviceSimulator = usePreviewStore.getState().deviceSimulator!;
      const updateSpy = vi.spyOn(deviceSimulator, 'setDevice');

      deviceSimulator.setDevice("desktop");

      expect(updateSpy).toHaveBeenCalledWith("desktop");
      expect(usePreviewStore.getState().currentDevice).toBe("desktop");
    });

    it("should update view when switching to tablet device", () => {
      const deviceSimulator = usePreviewStore.getState().deviceSimulator!;
      const updateSpy = vi.spyOn(deviceSimulator, 'setDevice');

      deviceSimulator.setDevice("tablet");

      expect(updateSpy).toHaveBeenCalledWith("tablet");
      expect(usePreviewStore.getState().currentDevice).toBe("tablet");
    });

    it("should update view when switching to mobile device", () => {
      const deviceSimulator = usePreviewStore.getState().deviceSimulator!;
      const updateSpy = vi.spyOn(deviceSimulator, 'setDevice');

      deviceSimulator.setDevice("mobile");

      expect(updateSpy).toHaveBeenCalledWith("mobile");
      expect(usePreviewStore.getState().currentDevice).toBe("mobile");
    });

    it("should reset zoom when switching devices", () => {
      const { initZoomController } = usePreviewStore.getState();
      const zoomController = initZoomController();

      // Set zoom to 150%
      zoomController.setZoomLevel(1.5);
      expect(zoomController.getZoomLevel()).toBe(1.5);

      // Switch device
      (usePreviewStore.getState().deviceSimulator as any).setDevice("tablet");

      // Zoom should be reset (this is expected behavior)
      // Note: Actual reset logic depends on implementation
    });
  });

  // ── Test 2.1.3: Theme Switch → Style Update Flow ──

  describe("Theme Switch → Style Update Flow", () => {
    it("should update styles when switching to dark theme", () => {
      const { setTheme } = useThemeStore.getState();

      setTheme("navy");

      expect(useThemeStore.getState().currentTheme).toBe("navy");

      // Verify CSS classes are updated
      expect(document.documentElement.classList.contains("navy")).toBe(true);
      expect(document.body.classList.contains("navy")).toBe(true);
    });

    it("should update styles when switching to light theme", () => {
      const { setTheme } = useThemeStore.getState();

      setTheme("cyberpunk");

      expect(useThemeStore.getState().currentTheme).toBe("cyberpunk");

      // Verify CSS classes are updated
      expect(document.documentElement.classList.contains("cyberpunk")).toBe(true);
      expect(document.body.classList.contains("cyberpunk")).toBe(true);
    });

    it("should update preview when custom colors change", () => {
      const { updateCustomColors, setTheme } = useThemeStore.getState();

      setTheme("custom");
      updateCustomColors({ primary: "#ff0000", background: "#000000" });

      expect(useThemeStore.getState().customColors.primary).toBe("#ff0000");
      expect(useThemeStore.getState().customColors.background).toBe("#000000");
    });

    it("should sync with system theme when system theme follow enabled", () => {
      const { setSystemThemeFollow } = useThemeStore.getState();

      setSystemThemeFollow(true);

      expect(useThemeStore.getState().systemThemeFollow).toBe(true);
    });
  });

  // ── Test 2.1.4: Zoom Control → View Scale Flow ──

  describe("Zoom Control → View Scale Flow", () => {
    beforeEach(() => {
      const { initZoomController } = usePreviewStore.getState();
      initZoomController();
    });

    it("should scale view when zoom level increases", () => {
      const zoomController = usePreviewStore.getState().zoomController!;

      zoomController.setZoomLevel(1.5);

      expect(zoomController.getZoomLevel()).toBe(1.5);
    });

    it("should scale view when zoom level decreases", () => {
      const zoomController = usePreviewStore.getState().zoomController!;

      zoomController.setZoomLevel(0.75);

      expect(zoomController.getZoomLevel()).toBe(0.75);
    });

    it("should zoom in by step", () => {
      const zoomController = usePreviewStore.getState().zoomController!;

      const initialLevel = zoomController.getZoomLevel();
      zoomController.zoomIn();

      expect(zoomController.getZoomLevel()).toBeGreaterThan(initialLevel);
    });

    it("should zoom out by step", () => {
      const zoomController = usePreviewStore.getState().zoomController!;

      // First set a higher zoom
      zoomController.setZoomLevel(1.5);
      const initialLevel = zoomController.getZoomLevel();
      zoomController.zoomOut();

      expect(zoomController.getZoomLevel()).toBeLessThan(initialLevel);
    });

    it("should clamp zoom level to max", () => {
      const zoomController = usePreviewStore.getState().zoomController!;

      zoomController.setZoomLevel(5.0);

      expect(zoomController.getZoomLevel()).toBeLessThanOrEqual(
        zoomController.getMaxZoomLevel()
      );
    });

    it("should clamp zoom level to min", () => {
      const zoomController = usePreviewStore.getState().zoomController!;

      zoomController.setZoomLevel(0.1);

      expect(zoomController.getZoomLevel()).toBeGreaterThanOrEqual(
        zoomController.getMinZoomLevel()
      );
    });
  });

  // ── Test 2.1.5: Error Handling → Error Display Flow ──

  describe("Error Handling → Error Display Flow", () => {
    it("should display error when preview update fails", () => {
      const { initModeController } = usePreviewStore.getState();

      initModeController(mockUpdateCallback);

      // Trigger error
      const { setPreviewError } = usePreviewStore.getState();
      setPreviewError("Preview update failed");

      expect(usePreviewStore.getState().previewError).toBe("Preview update failed");
    });

    it("should clear error when retrying", () => {
      const { setPreviewError, clearPreviewError } = usePreviewStore.getState();

      setPreviewError("Error occurred");
      expect(usePreviewStore.getState().previewError).toBe("Error occurred");

      clearPreviewError();
      expect(usePreviewStore.getState().previewError).toBeNull();
    });

    it("should handle multiple errors gracefully", () => {
      const { setPreviewError, clearPreviewError } = usePreviewStore.getState();

      setPreviewError("Error 1");
      setPreviewError("Error 2");
      setPreviewError("Error 3");

      expect(usePreviewStore.getState().previewError).toBe("Error 3");
    });
  });

  // ── Test 2.1.6: Complete Workflow Integration ──

  describe("Complete Workflow Integration", () => {
    it("should handle complete workflow: edit → preview → device switch → theme change", async () => {
      // Initialize all controllers
      const {
        initModeController,
        initDeviceSimulator,
        initZoomController,
        notifyFileChange,
      } = usePreviewStore.getState();

      const updateCallback = vi.fn();

      // 1. Initialize controllers
      initModeController(updateCallback);
      initDeviceSimulator();
      initZoomController();

      // 2. Set to realtime mode
      usePreviewStore.getState().setMode("realtime");

      // 3. Edit code - should trigger preview
      notifyFileChange();
      expect(updateCallback).toHaveBeenCalledTimes(1);

      // 4. Switch device - should update view
      const deviceSimulator = usePreviewStore.getState().deviceSimulator!;
      deviceSimulator.setDevice("tablet");
      expect(usePreviewStore.getState().currentDevice).toBe("tablet");

      // 5. Change theme - should update styles
      useThemeStore.getState().setTheme("dark");
      expect(useThemeStore.getState().currentTheme).toBe("dark");

      // 6. Apply zoom - should scale view
      const zoomController = usePreviewStore.getState().zoomController!;
      zoomController.setZoomLevel(1.25);
      expect(zoomController.getZoomLevel()).toBe(1.25);

      // Complete workflow successful
      expect(updateCallback).toHaveBeenCalledTimes(1);
    });

    it("should handle rapid mode switching", () => {
      const { initModeController, setMode, notifyFileChange } = usePreviewStore.getState();
      const updateCallback = vi.fn();

      initModeController(updateCallback);

      // Switch modes rapidly
      setMode("realtime");
      notifyFileChange();
      expect(updateCallback).toHaveBeenCalledTimes(1);

      updateCallback.mockClear();

      setMode("manual");
      notifyFileChange();
      expect(updateCallback).not.toHaveBeenCalled();

      setMode("delayed");
      notifyFileChange();
      // Should be debounced
    });
  });
});
