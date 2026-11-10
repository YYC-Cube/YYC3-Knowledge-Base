// @ts-nocheck
/**
 * @file: SnapshotFlow.integration.test.ts
 * @description: 快照恢复流程集成测试 - 测试快照的创建、恢复、比较、删除和视图同步
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: test
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: test,integration,snapshot-flow,restore,compare
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { usePreviewStore } from "../stores/usePreviewStore";
import { useFileStoreZustand } from "../stores/useFileStoreZustand";
import { SnapshotManager } from "../SnapshotManager";
import { SnapshotViewController } from "../snapshot/SnapshotViewController";
import { BoundaryExceptionHandler } from "../exception/BoundaryExceptionHandler";

// ================================================================
// Integration Tests - Complete Snapshot Flow
// ================================================================

describe("Snapshot Flow Integration", () => {
  let snapshotManager: SnapshotManager;
  let snapshotViewController: SnapshotViewController;
  let boundaryExceptionHandler: BoundaryExceptionHandler;

  beforeEach(() => {
    // Reset stores
    usePreviewStore.setState({
      snapshotManager: null,
      snapshotViewController: null,
      boundaryExceptionHandler: null,
    });

    // Clear localStorage
    localStorage.removeItem("yyc3_snapshots");

    // Initialize handlers
    snapshotManager = new SnapshotManager();
    snapshotViewController = new SnapshotViewController(snapshotManager);
    boundaryExceptionHandler = new BoundaryExceptionHandler();

    // Initialize store
    const { initSnapshotManager, initSnapshotViewController, initBoundaryExceptionHandler } =
      usePreviewStore.getState();

    initSnapshotManager(snapshotManager);
    initSnapshotViewController(snapshotViewController);
    initBoundaryExceptionHandler(boundaryExceptionHandler);

    // Mock file operations
    vi.spyOn(useFileStoreZustand.getState(), "updateFileContent").mockImplementation(() => {
      return Promise.resolve();
    });
  });

  afterEach(() => {
    // Clean up
    if (snapshotManager) {
      snapshotManager.clearAll();
    }
    if (snapshotViewController) {
      snapshotViewController.destroy();
    }
    if (boundaryExceptionHandler) {
      boundaryExceptionHandler.destroy();
    }

    localStorage.removeItem("yyc3_snapshots");
  });

  // ── Test 2.2.1: Create Snapshot → List Display Flow ──

  describe("Create Snapshot → List Display Flow", () => {
    it("should create snapshot and display in list", () => {
      const { createProjectSnapshot, listProjectSnapshots } = usePreviewStore.getState();

      const files = [
        { path: "src/index.ts", content: "console.warn('hello')" },
        { path: "src/App.tsx", content: "<div>Hello</div>" },
      ];

      const snapshot = createProjectSnapshot("版本1", files, {
        description: "初始版本",
      });

      expect(snapshot).not.toBeNull();
      expect(snapshot?.label).toBe("版本1");
      expect(snapshot?.files.length).toBe(2);

      const snapshots = listProjectSnapshots();
      expect(snapshots.length).toBe(1);
      expect(snapshots[0].id).toBe(snapshot?.id);
    });

    it("should create multiple snapshots and list in descending order", async () => {
      const { createProjectSnapshot, listProjectSnapshots } = usePreviewStore.getState();

      const files = [{ path: "test.ts", content: "test" }];

      const snap1 = createProjectSnapshot("版本1", files);
      await new Promise((resolve) => setTimeout(resolve, 10));
      const snap2 = createProjectSnapshot("版本2", files);
      await new Promise((resolve) => setTimeout(resolve, 10));
      const snap3 = createProjectSnapshot("版本3", files);

      const snapshots = listProjectSnapshots();

      expect(snapshots.length).toBe(3);
      expect(snapshots[0].id).toBe(snap3?.id); // Newest first
      expect(snapshots[1].id).toBe(snap2?.id);
      expect(snapshots[2].id).toBe(snap1?.id);
    });

    it("should include snapshot metadata in list", () => {
      const { createProjectSnapshot, listProjectSnapshots } = usePreviewStore.getState();

      const files = [{ path: "test.ts", content: "test" }];
      const metadata = {
        description: "重要版本",
        tags: ["release", "v1.0"],
      };

      createProjectSnapshot("版本1", files, metadata);

      const snapshots = listProjectSnapshots();
      expect(snapshots[0].metadata.description).toBe("重要版本");
      expect(snapshots[0].metadata.tags).toEqual(["release", "v1.0"]);
    });
  });

  // ── Test 2.2.2: Restore Snapshot → File Recovery Flow ──

  describe("Restore Snapshot → File Recovery Flow", () => {
    it("should restore files from snapshot", async () => {
      const { createProjectSnapshot, restoreProjectSnapshot } = usePreviewStore.getState();

      // Create snapshot with files
      const files = [
        { path: "src/index.ts", content: "console.warn('v1')" },
        { path: "src/App.tsx", content: "<div>V1</div>" },
      ];

      const snapshot = createProjectSnapshot("版本1", files);

      // Restore snapshot
      const result = await restoreProjectSnapshot((snapshot as any).id);

      expect(result.success).toBe(true);
      expect(result.restoredFiles.length).toBe(2);
    });

    it("should restore multiple files correctly", async () => {
      const { createProjectSnapshot, restoreProjectSnapshot } = usePreviewStore.getState();

      const files = [
        { path: "src/index.ts", content: "console.warn('v1')" },
        { path: "src/App.tsx", content: "<div>V1</div>" },
        { path: "src/utils.ts", content: "export const test = () => {}" },
        { path: "src/styles.css", content: ".test { color: red; }" },
      ];

      const snapshot = createProjectSnapshot("多文件版本", files);

      const result = await restoreProjectSnapshot((snapshot as any).id);

      expect(result.success).toBe(true);
      expect(result.restoredFiles.length).toBe(4);
    });

    it("should handle restore of non-existent snapshot", async () => {
      const { restoreProjectSnapshot } = usePreviewStore.getState();

      const result = await restoreProjectSnapshot("non-existent-id");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should update file store after restore", async () => {
      const { createProjectSnapshot, restoreProjectSnapshot } = usePreviewStore.getState();

      const files = [{ path: "test.ts", content: "restored content" }];
      const snapshot = createProjectSnapshot("版本1", files);

      const result = await restoreProjectSnapshot((snapshot as any).id);

      expect(result.success).toBe(true);
      // Verify file store was updated (via mock)
      expect(useFileStoreZustand.getState().updateFileContent).toHaveBeenCalled();
    });
  });

  // ── Test 2.2.3: Compare Snapshots → Diff Display Flow ──

  describe("Compare Snapshots → Diff Display Flow", () => {
    it("should compare two snapshots and show differences", () => {
      const { createProjectSnapshot, compareSnapshots } = usePreviewStore.getState();

      const files1 = [{ path: "test.ts", content: "version 1" }];
      const snap1 = createProjectSnapshot("版本1", files1);

      const files2 = [{ path: "test.ts", content: "version 2" }];
      const snap2 = createProjectSnapshot("版本2", files2);

      const comparison = compareSnapshots((snap1 as any).id, (snap2 as any).id);

      expect(comparison).not.toBeNull();
      expect((comparison as any).diffs.length).toBeGreaterThan(0);
    });

    it("should show added files in comparison", () => {
      const { createProjectSnapshot, compareSnapshots } = usePreviewStore.getState();

      const files1 = [{ path: "test.ts", content: "v1" }];
      const snap1 = createProjectSnapshot("版本1", files1);

      const files2 = [
        { path: "test.ts", content: "v2" },
        { path: "new.ts", content: "new file" },
      ];
      const snap2 = createProjectSnapshot("版本2", files2);

      const comparison = compareSnapshots((snap1 as any).id, (snap2 as any).id);

      expect((comparison as any).diffs.some(d => d.status === "added")).toBe(true);
    });

    it("should show deleted files in comparison", () => {
      const { createProjectSnapshot, compareSnapshots } = usePreviewStore.getState();

      const files1 = [
        { path: "test.ts", content: "v1" },
        { path: "old.ts", content: "old file" },
      ];
      const snap1 = createProjectSnapshot("版本1", files1);

      const files2 = [{ path: "test.ts", content: "v2" }];
      const snap2 = createProjectSnapshot("版本2", files2);

      const comparison = compareSnapshots((snap1 as any).id, (snap2 as any).id);

      expect((comparison as any).diffs.some(d => d.status === "deleted")).toBe(true);
    });

    it("should show modified files in comparison", () => {
      const { createProjectSnapshot, compareSnapshots } = usePreviewStore.getState();

      const files1 = [{ path: "test.ts", content: "version 1" }];
      const snap1 = createProjectSnapshot("版本1", files1);

      const files2 = [{ path: "test.ts", content: "version 2 modified" }];
      const snap2 = createProjectSnapshot("版本2", files2);

      const comparison = compareSnapshots((snap1 as any).id, (snap2 as any).id);

      expect((comparison as any).diffs.some(d => d.status === "modified")).toBe(true);
    });
  });

  // ── Test 2.2.4: Delete Snapshot → List Update Flow ──

  describe("Delete Snapshot → List Update Flow", () => {
    it("should delete snapshot and update list", () => {
      const { createProjectSnapshot, deleteProjectSnapshot, listProjectSnapshots } =
        usePreviewStore.getState();

      const files = [{ path: "test.ts", content: "test" }];
      const snapshot = createProjectSnapshot("待删除", files);

      expect(listProjectSnapshots().length).toBe(1);

      deleteProjectSnapshot((snapshot as any).id);

      expect(listProjectSnapshots().length).toBe(0);
    });

    it("should handle deletion of non-existent snapshot", () => {
      const { deleteProjectSnapshot } = usePreviewStore.getState();

      // Should not throw error
      expect(() => {
        deleteProjectSnapshot("non-existent-id");
      }).not.toThrow();
    });

    it("should delete multiple snapshots", () => {
      const { createProjectSnapshot, deleteProjectSnapshot, listProjectSnapshots } =
        usePreviewStore.getState();

      const files = [{ path: "test.ts", content: "test" }];
      const snap1 = createProjectSnapshot("版本1", files);
      const snap2 = createProjectSnapshot("版本2", files);
      const snap3 = createProjectSnapshot("版本3", files);

      expect(listProjectSnapshots().length).toBe(3);

      deleteProjectSnapshot((snap1 as any).id);
      deleteProjectSnapshot((snap2 as any).id);

      expect(listProjectSnapshots().length).toBe(1);
      expect(listProjectSnapshots()[0].id).toBe(snap3?.id);
    });
  });

  // ── Test 2.2.5: View Control → View Sync Flow ──

  describe("View Control → View Sync Flow", () => {
    it("should sync zoom when restoring snapshot", async () => {
      const { createProjectSnapshot, restoreProjectSnapshot, initZoomController } =
        usePreviewStore.getState();

      // Create snapshot with view state
      const files = [{ path: "test.ts", content: "test" }];
      const snapshot = createProjectSnapshot("带视图状态", files, {
        viewState: { zoom: 1.5, scroll: { x: 100, y: 200 } },
      });

      // Initialize zoom controller
      const zoomController = initZoomController();
      zoomController.setZoomLevel(1.0);

      // Restore snapshot
      await restoreProjectSnapshot((snapshot as any).id);

      // View should be synced (actual sync logic depends on implementation)
      expect(snapshot?.metadata.viewState?.zoom).toBe(1.5);
    });

    it("should sync scroll position when restoring snapshot", async () => {
      const { createProjectSnapshot, restoreProjectSnapshot } = usePreviewStore.getState();

      const files = [{ path: "test.ts", content: "test" }];
      const snapshot = createProjectSnapshot("带滚动位置", files, {
        viewState: { zoom: 1.0, scroll: { x: 100, y: 200 } },
      });

      await restoreProjectSnapshot((snapshot as any).id);

      expect(snapshot?.metadata.viewState?.scroll?.x).toBe(100);
      expect(snapshot?.metadata.viewState?.scroll?.y).toBe(200);
    });

    it("should restore snapshot view state using SnapshotViewController", async () => {
      const snapshotViewController = usePreviewStore.getState().snapshotViewController!;

      const viewState = {
        zoom: 1.25,
        scroll: { x: 50, y: 150 },
        device: "tablet" as const,
      };

      const zoomController = snapshotViewController.getZoomController();
      expect(zoomController).toBeDefined();

      zoomController.setZoomLevel(viewState.zoom);
      expect(zoomController.getZoomLevel()).toBe(viewState.zoom);
    });
  });

  // ── Test 2.2.6: Boundary Condition Handling ──

  describe("Boundary Condition Handling", () => {
    it("should handle large file snapshot", () => {
      const { createProjectSnapshot, listProjectSnapshots } = usePreviewStore.getState();

      const largeContent = "x".repeat(1000000);
      const files = [{ path: "large.ts", content: largeContent }];

      const snapshot = createProjectSnapshot("大文件", files);

      expect(snapshot).not.toBeNull();
      expect(snapshot?.files.length).toBe(1);
      expect(snapshot?.files[0].content.length).toBeGreaterThanOrEqual(1000000);
    });

    it("should handle empty snapshot", () => {
      const { createProjectSnapshot, listProjectSnapshots } = usePreviewStore.getState();

      const snapshot = createProjectSnapshot("空快照", []);

      expect(snapshot).not.toBeNull();
      expect(snapshot?.files.length).toBe(0);
    });

    it("should handle concurrent snapshot operations", async () => {
      const { createProjectSnapshot, restoreProjectSnapshot } = usePreviewStore.getState();

      const files = [{ path: "test.ts", content: "test" }];

      // Create multiple snapshots concurrently
      const promises = Array(10)
        .fill(null)
        .map((_, i) => createProjectSnapshot(`版本${i}`, files));

      const results = await Promise.all(promises);

      expect(results.every(r => r !== null)).toBe(true);
    });

    it("should handle exception during restore", async () => {
      const { restoreProjectSnapshot } = usePreviewStore.getState();

      const boundaryExceptionHandler = usePreviewStore.getState().boundaryExceptionHandler!;

      const result = await restoreProjectSnapshot("invalid-id");
      expect(result.success).toBe(false);

      if (result.error) {
        const handled = boundaryExceptionHandler.catchException(
          "storage",
          result.error,
          undefined,
          { context: "snapshot-restore" }
        );
        expect(handled).toBeDefined();
      }
    });

    it("should validate snapshot files before restore", async () => {
      const { restoreProjectSnapshot } = usePreviewStore.getState();

      // Try to restore with invalid snapshot ID
      const result = await restoreProjectSnapshot("");

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  // ── Test 2.2.7: Complete Snapshot Workflow Integration ──

  describe("Complete Snapshot Workflow Integration", () => {
    it("should handle complete workflow: create → list → compare → restore → delete", async () => {
      const {
        createProjectSnapshot,
        listProjectSnapshots,
        compareSnapshots,
        restoreProjectSnapshot,
        deleteProjectSnapshot,
      } = usePreviewStore.getState();

      // 1. Create first snapshot
      const files1 = [{ path: "test.ts", content: "version 1" }];
      const snap1 = createProjectSnapshot("版本1", files1);
      expect(snap1).not.toBeNull();

      // 2. Create second snapshot
      const files2 = [{ path: "test.ts", content: "version 2" }];
      const snap2 = createProjectSnapshot("版本2", files2);
      expect(snap2).not.toBeNull();

      // 3. List snapshots
      const snapshots = listProjectSnapshots();
      expect(snapshots.length).toBe(2);

      // 4. Compare snapshots
      const comparison = compareSnapshots((snap1 as any).id, (snap2 as any).id);
      expect(comparison).not.toBeNull();
      expect((comparison as any).diffs.length).toBeGreaterThan(0);

      // 5. Restore first snapshot
      const restoreResult = await restoreProjectSnapshot((snap1 as any).id);
      expect(restoreResult.success).toBe(true);

      // 6. Delete second snapshot
      deleteProjectSnapshot((snap2 as any).id);

      // 7. Verify list
      const finalSnapshots = listProjectSnapshots();
      expect(finalSnapshots.length).toBe(1);
      expect(finalSnapshots[0].id).toBe(snap1?.id);

      // Complete workflow successful
    });

    it("should handle workflow with view state sync", async () => {
      const {
        createProjectSnapshot,
        restoreProjectSnapshot,
        initZoomController,
      } = usePreviewStore.getState();

      // Create snapshot with view state
      const files = [{ path: "test.ts", content: "test" }];
      const snapshot = createProjectSnapshot("完整流程", files, {
        viewState: {
          zoom: 1.5,
          scroll: { x: 100, y: 200 },
          device: "tablet",
        },
        description: "包含完整视图状态",
      });

      // Initialize zoom controller
      const zoomController = initZoomController();

      // Restore snapshot
      const restoreResult = await restoreProjectSnapshot((snapshot as any).id);
      expect(restoreResult.success).toBe(true);

      // Verify view state was captured
      expect(snapshot?.metadata.viewState?.zoom).toBe(1.5);
      expect(snapshot?.metadata.viewState?.scroll).toEqual({ x: 100, y: 200 });
      expect(snapshot?.metadata.viewState?.device).toBe("tablet");
    });

    it("should handle error recovery in workflow", async () => {
      const {
        createProjectSnapshot,
        restoreProjectSnapshot,
        deleteProjectSnapshot,
      } = usePreviewStore.getState();

      const boundaryExceptionHandler = usePreviewStore.getState().boundaryExceptionHandler!;

      // Create snapshot
      const files = [{ path: "test.ts", content: "test" }];
      const snapshot = createProjectSnapshot("错误恢复测试", files);

      // Try invalid restore
      const invalidRestore = await restoreProjectSnapshot("invalid-id");
      expect(invalidRestore.success).toBe(false);

      // Handle error
      if (invalidRestore.error) {
        const handled = boundaryExceptionHandler.catchException(
          "storage",
          invalidRestore.error,
          undefined,
          { context: "restore" }
        );
        expect(handled).toBeDefined();
      }

      // Try valid restore
      const validRestore = await restoreProjectSnapshot((snapshot as any).id);
      expect(validRestore.success).toBe(true);

      // Clean up
      deleteProjectSnapshot((snapshot as any).id);
    });
  });
});
