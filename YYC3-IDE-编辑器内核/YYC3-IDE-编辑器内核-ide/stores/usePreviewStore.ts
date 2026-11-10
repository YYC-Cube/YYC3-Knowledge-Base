// @ts-nocheck
/**
 * @file: stores/usePreviewStore.ts
 * @description: 实时预览系统 Zustand Store，管理预览模式、设备模拟、控制台日志、
 *              历史快照、缩放、滚动同步、预览引擎切换等状态，支持 localStorage 持久化
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.1.0
 * @created: 2026-03-14
 * @updated: 2026-03-14
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: stores,preview,zustand,device-simulation,console,history
 */

// ================================================================
// Preview Store — Zustand store for realtime preview state
// ================================================================

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PreviewMode, DeviceType, PreviewEngineType, DevicePreset, ConsoleLog, PreviewSnapshot } from "../types/previewTypes";
import { PreviewModeController } from "../PreviewModeController";
import { SnapshotManager, type Snapshot, type SnapshotComparison } from "../SnapshotManager";
import { ZoomController } from "../preview/ZoomController";
import { useFileStoreZustand } from "./useFileStoreZustand";
import { logger } from "../services/Logger";

// Re-export types for backward compatibility
export type { PreviewMode, DeviceType, PreviewEngineType, DevicePreset, ConsoleLog, PreviewSnapshot };

// ── Types ──

export interface PreviewSnapshot {
  id: string;
  code: string;
  language: string;
  timestamp: number;
  label?: string;
}

export interface ConsoleEntry {
  id: string;
  level: "log" | "warn" | "error" | "info" | "debug";
  message: string;
  timestamp: number;
  count?: number;
}

export interface PreviewError {
  message: string;
  line?: number;
  column?: number;
  source?: string;
  stack?: string;
}

// ── Device Presets ──

export const DEVICE_PRESETS: DevicePreset[] = [
  {
    id: "desktop",
    name: "桌面",
    type: "desktop",
    width: 1920,
    height: 1080,
    pixelRatio: 1,
  },
  {
    id: "laptop",
    name: "笔记本",
    type: "desktop",
    width: 1440,
    height: 900,
    pixelRatio: 1,
  },
  {
    id: "ipad-pro",
    name: "iPad Pro",
    type: "tablet",
    width: 1024,
    height: 1366,
    pixelRatio: 2,
  },
  {
    id: "ipad",
    name: "iPad",
    type: "tablet",
    width: 768,
    height: 1024,
    pixelRatio: 2,
  },
  {
    id: "iphone-15",
    name: "iPhone 15",
    type: "mobile",
    width: 393,
    height: 852,
    pixelRatio: 3,
  },
  {
    id: "iphone-se",
    name: "iPhone SE",
    type: "mobile",
    width: 375,
    height: 667,
    pixelRatio: 2,
  },
  {
    id: "pixel-7",
    name: "Pixel 7",
    type: "mobile",
    width: 412,
    height: 915,
    pixelRatio: 2.625,
  },
  {
    id: "galaxy-s21",
    name: "Galaxy S21",
    type: "mobile",
    width: 360,
    height: 800,
    pixelRatio: 3,
  },
];

// ── Store ──

export interface PreviewState {
  // Preview mode
  mode: PreviewMode;
  setMode: (mode: PreviewMode) => void;

  // Preview engine
  previewEngine: PreviewEngineType;
  setPreviewEngine: (engine: PreviewEngineType) => void;

  // Auto refresh
  autoRefresh: boolean;
  setAutoRefresh: (enabled: boolean) => void;
  refreshInterval: number;
  setRefreshInterval: (ms: number) => void;

  // Delay for "delayed" mode
  previewDelay: number;
  setPreviewDelay: (ms: number) => void;

  // Device simulation
  activeDevice: DevicePreset;
  setActiveDevice: (device: DevicePreset) => void;
  customWidth: number;
  customHeight: number;
  setCustomSize: (w: number, h: number) => void;
  showDeviceFrame: boolean;
  setShowDeviceFrame: (show: boolean) => void;

  // Console
  consoleLogs: ConsoleEntry[];
  addConsoleLog: (entry: Omit<ConsoleEntry, "id" | "timestamp">) => void;
  clearConsole: () => void;
  showConsole: boolean;
  setShowConsole: (show: boolean) => void;
  consoleFilter: ConsoleEntry["level"] | "all";
  setConsoleFilter: (filter: ConsoleEntry["level"] | "all") => void;

  // Error state
  previewError: PreviewError | null;
  setPreviewError: (error: PreviewError | null) => void;

  // History
  history: PreviewSnapshot[];
  historyIndex: number;
  addSnapshot: (snapshot: Omit<PreviewSnapshot, "id" | "timestamp">) => void;
  createSnapshot: (label?: string) => PreviewSnapshot;
  listSnapshots: () => PreviewSnapshot[];
  getCurrentFiles: () => { path: string; content: string }[];
  undo: () => void;
  redo: () => void;
  restoreSnapshot: (index: number) => void;
  clearHistory: () => void;

  // UI state
  isUpdating: boolean;
  setIsUpdating: (updating: boolean) => void;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  zoom: number;
  setZoom: (zoom: number) => void;

  // Scroll sync
  scrollSyncEnabled: boolean;
  setScrollSyncEnabled: (enabled: boolean) => void;

  // Manual refresh trigger
  refreshCounter: number;
  triggerRefresh: () => void;

  // PreviewModeController integration
  modeController: PreviewModeController | null;
  initModeController: (onUpdate: () => void) => void;
  notifyFileChange: () => void;
  manualTriggerPreview: () => void;
  hasPendingPreviewUpdate: () => boolean;
  getModeControllerStatus: () => {
    mode: PreviewMode;
    delay: number;
    hasPendingUpdate: boolean;
    hasActiveTimer: boolean;
  } | null;

  // SnapshotManager integration
  snapshotManager: SnapshotManager | null;
  initSnapshotManager: (manager?: SnapshotManager) => void;
  snapshotViewController: any;
  initSnapshotViewController: (controller: any) => void;
  boundaryExceptionHandler: any;
  initBoundaryExceptionHandler: (handler: any) => void;
  deviceSimulator: any;
  initDeviceSimulator: () => any;
  currentDevice: string;
  setCurrentDevice: (device: string) => void;
  zoomController: any;
  initZoomController: () => any;
  clearPreviewError: () => void;
  restoreProjectSnapshot: (id: string) => Promise<{ success: boolean; restoredFiles: Array<{ path: string; content: string }> }>;
  compareSnapshots: (id1: string, id2: string) => any;
  createProjectSnapshot: (
    label: string,
    files: Array<{ path: string; content: string }>,
    metadata?: Record<string, any>
  ) => Snapshot | null;
  listProjectSnapshots: () => Snapshot[];
  getProjectSnapshot: (id: string) => Snapshot | null;
  deleteProjectSnapshot: (id: string) => boolean;
  compareProjectSnapshots: (id1: string, id2: string) => SnapshotComparison | null;
  getSnapshotStorageStats: () => {
    snapshotCount: number;
    totalFiles: number;
    totalLines: number;
    estimatedSize: string;
  } | null;
}

let entryCounter = 0;

export const usePreviewStore = create<PreviewState>()(
  persist(
    (set, get) => ({
      // Preview mode
      mode: "realtime",
      setMode: (mode) => {
        set({ mode });
        // Sync with modeController if initialized
        const controller = get().modeController;
        if (controller) {
          controller.setMode(mode);
        }
      },

      // Preview engine
      previewEngine: "iframe",
      setPreviewEngine: (previewEngine) => set({ previewEngine }),

      // Auto refresh
      autoRefresh: false,
      setAutoRefresh: (autoRefresh) => set({ autoRefresh }),
      refreshInterval: 3000,
      setRefreshInterval: (refreshInterval) => set({ refreshInterval }),

      // Delay
      previewDelay: 500,
      setPreviewDelay: (previewDelay) => {
        set({ previewDelay });
        // Sync with modeController if initialized
        const controller = get().modeController;
        if (controller) {
          controller.setDelay(previewDelay);
        }
      },

      // Device
      activeDevice: DEVICE_PRESETS[0],
      setActiveDevice: (activeDevice) => set({ activeDevice }),
      customWidth: 1024,
      customHeight: 768,
      setCustomSize: (customWidth, customHeight) =>
        set({ customWidth, customHeight }),
      showDeviceFrame: true,
      setShowDeviceFrame: (showDeviceFrame) => set({ showDeviceFrame }),

      // Console
      consoleLogs: [],
      addConsoleLog: (entry) =>
        set((state) => {
          const newEntry: ConsoleEntry = {
            ...entry,
            id: `log_${Date.now()}_${++entryCounter}`,
            timestamp: Date.now(),
          };
          // Keep max 500 entries
          const logs = [...state.consoleLogs, newEntry].slice(-500);
          return { consoleLogs: logs };
        }),
      clearConsole: () => set({ consoleLogs: [] }),
      showConsole: false,
      setShowConsole: (showConsole) => set({ showConsole }),
      consoleFilter: "all",
      setConsoleFilter: (consoleFilter) => set({ consoleFilter }),

      // Error
      previewError: null,
      setPreviewError: (previewError) => set({ previewError }),

      // History
      history: [],
      historyIndex: -1,
      addSnapshot: (snapshot) =>
        set((state) => {
          const newSnapshot: PreviewSnapshot = {
            ...snapshot,
            id: `snap_${Date.now()}_${++entryCounter}`,
            timestamp: Date.now(),
          };
          // Truncate forward history
          const trimmed = state.history.slice(0, state.historyIndex + 1);
          const history = [...trimmed, newSnapshot].slice(-50); // max 50 snapshots
          return { history, historyIndex: history.length - 1 };
        }),
      undo: () =>
        set((state) => ({
          historyIndex: Math.max(0, state.historyIndex - 1),
        })),
      redo: () =>
        set((state) => ({
          historyIndex: Math.min(
            state.history.length - 1,
            state.historyIndex + 1,
          ),
        })),
      restoreSnapshot: (index) =>
        set((state) => ({
          historyIndex: Math.max(0, Math.min(index, state.history.length - 1)),
        })),
      clearHistory: () => set({ history: [], historyIndex: -1 }),

      // UI
      isUpdating: false,
      setIsUpdating: (isUpdating) => set({ isUpdating }),
      showGrid: false,
      setShowGrid: (showGrid) => set({ showGrid }),
      zoom: 100,
      setZoom: (zoom) => set({ zoom: Math.max(25, Math.min(200, zoom)) }),

      // Scroll sync
      scrollSyncEnabled: false,
      setScrollSyncEnabled: (scrollSyncEnabled) => set({ scrollSyncEnabled }),

      // Manual refresh
      refreshCounter: 0,
      triggerRefresh: () =>
        set((s) => ({ refreshCounter: s.refreshCounter + 1 })),

      // PreviewModeController integration
      modeController: null,
      initModeController: (onUpdate) => {
        const state = get();
        const controller = new PreviewModeController(onUpdate, state.previewDelay);
        controller.setMode(state.mode);
        set({ modeController: controller });
        logger.warn('PreviewModeController initialized');
      },
      notifyFileChange: () => {
        const controller = get().modeController;
        if (controller) {
          controller.handleFileChange();
        } else {
          logger.warn("[usePreviewStore] modeController not initialized, falling back to direct trigger");
          get().triggerRefresh();
        }
      },
      manualTriggerPreview: () => {
        const controller = get().modeController;
        if (controller) {
          controller.manualTrigger();
        } else {
          logger.warn("[usePreviewStore] modeController not initialized, falling back to direct trigger");
          get().triggerRefresh();
        }
      },
      hasPendingPreviewUpdate: () => {
        const controller = get().modeController;
        return controller ? controller.hasPendingUpdate() : false;
      },
      getModeControllerStatus: () => {
        const controller = get().modeController;
        return controller ? controller.getStatus() : null;
      },

      // SnapshotManager integration
      snapshotManager: null,
      initSnapshotManager: (manager?: SnapshotManager) => {
        set({ snapshotManager: manager || new SnapshotManager() });
      },
      snapshotViewController: null,
      initSnapshotViewController: (controller: any) => {
        set({ snapshotViewController: controller });
      },
      boundaryExceptionHandler: null,
      initBoundaryExceptionHandler: (handler: any) => {
        set({ boundaryExceptionHandler: handler });
      },
      deviceSimulator: null,
      currentDevice: "desktop",
      setCurrentDevice: (device: string) => {
        set({ currentDevice: device });
      },
      initDeviceSimulator: () => {
        const store = get();
        const simulator = {
          active: true,
          destroy: () => { set({ deviceSimulator: null }); },
          setDevice: (device: string) => { store.setCurrentDevice(device); },
        };
        set({ deviceSimulator: simulator });
        return simulator;
      },
      zoomController: null,
      initZoomController: () => {
        const controller = new ZoomController();
        set({ zoomController: controller });
        return controller;
      },
      clearPreviewError: () => {
        set({ previewError: null });
      },
      restoreProjectSnapshot: async (id: string) => {
        const manager = get().snapshotManager;
        if (!manager) {
          return { success: false, restoredFiles: [], error: "Snapshot manager not initialized" };
        }
        let restoredFiles: Array<{ path: string; content: string }> = [];
        try {
          const success = manager.restoreSnapshot(id, (files) => {
            restoredFiles = files;
            for (const file of files) {
              void useFileStoreZustand.getState().updateFileContent(file.path, file.content);
            }
          });
          if (!success) {
            return { success: false, restoredFiles: [], error: `Snapshot ${id} not found` };
          }
          return { success, restoredFiles };
        } catch (e: any) {
          return { success: false, restoredFiles: [], error: e?.message || "Restore failed" };
        }
      },
      compareSnapshots: (id1: string, id2: string) => {
        const manager = get().snapshotManager;
        if (!manager) return null;
        try {
          const comparison = manager.compareSnapshots(id1, id2);
          const diffs: Array<{ path: string; status: string }> = [];
          for (const path of comparison.added) {
            diffs.push({ path, status: "added" });
          }
          for (const path of comparison.removed) {
            diffs.push({ path, status: "deleted" });
          }
          for (const path of comparison.modified) {
            diffs.push({ path, status: "modified" });
          }
          for (const path of comparison.unchanged) {
            diffs.push({ path, status: "unchanged" });
          }
          return { diffs, ...comparison };
        } catch (e: any) {
          return null;
        }
      },
      deleteProjectSnapshot: (id: string) => {
        const manager = get().snapshotManager;
        if (!manager) return false;
        return manager.deleteSnapshot(id);
      },
      createProjectSnapshot: (label, files, metadata) => {
        const manager = get().snapshotManager;
        if (!manager) {
          logger.warn('snapshotManager not initialized');
          return null;
        }
        return manager.createSnapshot(label, files, metadata);
      },
      listProjectSnapshots: () => {
        const manager = get().snapshotManager;
        if (!manager) {
          logger.warn('snapshotManager not initialized');
          return [];
        }
        return manager.listSnapshots();
      },
      getProjectSnapshot: (id) => {
        const manager = get().snapshotManager;
        if (!manager) {
          logger.warn('snapshotManager not initialized');
          return null;
        }
        return manager.getSnapshot(id);
      },
      compareProjectSnapshots: (id1, id2) => {
        const manager = get().snapshotManager;
        if (!manager) {
          logger.warn('snapshotManager not initialized');
          return null;
        }
        try {
          return manager.compareSnapshots(id1, id2);
        } catch (error) {
          logger.error("[usePreviewStore] Failed to compare snapshots:", error);
          return null;
        }
      },
      getSnapshotStorageStats: () => {
        const manager = get().snapshotManager;
        if (!manager) {
          logger.warn('snapshotManager not initialized');
          return null;
        }
        return manager.getStorageStats();
      },
    }),
    {
      name: "yyc3_preview_store",
      partialize: (state) => ({
        mode: state.mode,
        autoRefresh: state.autoRefresh,
        refreshInterval: state.refreshInterval,
        previewDelay: state.previewDelay,
        activeDevice: state.activeDevice,
        showDeviceFrame: state.showDeviceFrame,
        showConsole: state.showConsole,
        showGrid: state.showGrid,
        zoom: state.zoom,
        scrollSyncEnabled: state.scrollSyncEnabled,
        previewEngine: state.previewEngine,
      }),
    },
  ),
);
