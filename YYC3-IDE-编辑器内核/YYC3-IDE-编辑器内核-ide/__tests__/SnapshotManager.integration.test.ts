// @ts-nocheck
/**
 * @file: SnapshotManager.integration.test.ts
 * @description: SnapshotManager 集成测试 - 测试快照的创建、恢复、删除和比较流程
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: test
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: test,integration,snapshot,manager,restore
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { usePreviewStore } from "../stores/usePreviewStore";
import { useFileStoreZustand } from "../stores/useFileStoreZustand";
import { SnapshotManager } from "../SnapshotManager";
import {
  applySnapshotFiles,
  applySnapshotFilesSync,
  getCurrentFilesForSnapshot,
  validateSnapshotFiles,
} from "../snapshotApplyHelper";

// ================================================================
// Integration Tests - SnapshotManager with usePreviewStore
// ================================================================

describe("SnapshotManager Integration", () => {
  beforeEach(() => {
    // Reset stores
    usePreviewStore.setState({
      snapshotManager: null,
    });

    // Clear localStorage
    localStorage.removeItem("yyc3_snapshots");
  });

  afterEach(() => {
    // Clean up
    const manager = usePreviewStore.getState().snapshotManager;
    if (manager) {
      manager.clearAll();
    }
  });

  // ── Test 2.2.3.1: Create Snapshot → List Display ──

  describe("Create Snapshot → List Display", () => {
    it("should create snapshot and display in list", () => {
      const { initSnapshotManager, createProjectSnapshot, listProjectSnapshots } =
        usePreviewStore.getState();

      // Initialize manager
      initSnapshotManager();

      // Create snapshot
      const files = [
        { path: "src/index.ts", content: "console.warn('hello')" },
        { path: "src/App.tsx", content: "<div>Hello</div>" },
      ];

      const snapshot = createProjectSnapshot("版本1", files, {
        description: "初始版本",
      });

      // Verify snapshot created
      expect(snapshot).not.toBeNull();
      expect(snapshot?.label).toBe("版本1");
      expect(snapshot?.files.length).toBe(2);
      expect(snapshot?.metadata.totalFiles).toBe(2);

      // Verify in list
      const snapshots = listProjectSnapshots();
      expect(snapshots.length).toBe(1);
      expect(snapshots[0].id).toBe(snapshot?.id);
    });

    it("should list snapshots in descending order by timestamp", async () => {
      const { initSnapshotManager, createProjectSnapshot, listProjectSnapshots } =
        usePreviewStore.getState();

      initSnapshotManager();

      const files = [{ path: "test.ts", content: "test" }];

      // Create multiple snapshots with delay
      const snap1 = createProjectSnapshot("版本1", files);
      await new Promise((resolve) => setTimeout(resolve, 10));
      const snap2 = createProjectSnapshot("版本2", files);
      await new Promise((resolve) => setTimeout(resolve, 10));
      const snap3 = createProjectSnapshot("版本3", files);

      // Get list
      const snapshots = listProjectSnapshots();

      // Should be in descending order (newest first)
      expect(snapshots.length).toBe(3);
      expect(snapshots[0].id).toBe(snap3?.id);
      expect(snapshots[1].id).toBe(snap2?.id);
      expect(snapshots[2].id).toBe(snap1?.id);
    });

    it("should create snapshot with metadata", () => {
      const { initSnapshotManager, createProjectSnapshot, getProjectSnapshot } =
        usePreviewStore.getState();

      initSnapshotManager();

      const files = [
        { path: "src/index.ts", content: "export const app = () => {}" },
      ];

      const snapshot = createProjectSnapshot("功能完成", files, {
        description: "完成核心功能",
        tags: ["feature", "v1.0"],
        totalLines: 100,
      });

      expect(snapshot).not.toBeNull();
      expect(snapshot?.metadata.description).toBe("完成核心功能");
      expect(snapshot?.metadata.tags).toContain("feature");
      expect(snapshot?.metadata.tags).toContain("v1.0");
    });
  });

  // ── Test 2.2.3.2: Restore Snapshot → File Update ──

  describe("Restore Snapshot → File Update", () => {
    it("should restore snapshot and update files", async () => {
      const { initSnapshotManager, createProjectSnapshot, listProjectSnapshots } =
        usePreviewStore.getState();

      initSnapshotManager();

      // Create initial snapshot
      const files1 = [
        { path: "src/index.ts", content: "console.warn('version 1')" },
        { path: "src/App.tsx", content: "<div>Version 1</div>" },
      ];

      const snapshot = createProjectSnapshot("版本1", files1);
      expect(snapshot).not.toBeNull();

      // Simulate file changes
      const fileStore = useFileStoreZustand.getState();
      fileStore.updateFile("src/index.ts", "console.warn('version 2')");
      fileStore.updateFile("src/App.tsx", "<div>Version 2</div>");

      // Restore snapshot
      const result = await applySnapshotFiles(files1, { triggerPreview: false });

      // Verify files restored
      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(0);
    });

    it("should batch update multiple files", async () => {
      const { initSnapshotManager, createProjectSnapshot } = usePreviewStore.getState();

      initSnapshotManager();

      // Create snapshot with many files
      const files = Array.from({ length: 10 }, (_, i) => ({
        path: `src/file${i}.ts`,
        content: `export const file${i} = ${i};`,
      }));

      const snapshot = createProjectSnapshot("批量文件", files);
      expect(snapshot).not.toBeNull();
      expect(snapshot?.files.length).toBe(10);

      // Apply files
      const result = await applySnapshotFiles(files, { triggerPreview: false });

      expect(result.successCount).toBe(10);
      expect(result.failedCount).toBe(0);
    });

    it("should trigger preview after restore", async () => {
      const { initSnapshotManager, createProjectSnapshot } = usePreviewStore.getState();

      initSnapshotManager();

      const files = [{ path: "test.ts", content: "test content" }];
      createProjectSnapshot("测试", files);

      // Spy on triggerRefresh
      const refreshSpy = vi.spyOn(usePreviewStore.getState(), "triggerRefresh");

      // Apply with triggerPreview = true
      await applySnapshotFiles(files, { triggerPreview: true });

      expect(refreshSpy).toHaveBeenCalled();
    });

    it("should handle file application errors gracefully", async () => {
      const { initSnapshotManager, createProjectSnapshot } = usePreviewStore.getState();

      initSnapshotManager();

      // Create snapshot with invalid file (simulating error)
      const files = [
        { path: "valid.ts", content: "valid content" },
        { path: "", content: "invalid - empty path" }, // This should cause error
      ];

      const result = await applySnapshotFilesSync(files, false);

      // Should have at least one success
      expect(result.successCount).toBeGreaterThan(0);
      // May have errors
      expect(result.errors.length + result.successCount).toBe(files.length);
    });
  });

  // ── Test 2.2.3.3: Delete Snapshot → List Update ──

  describe("Delete Snapshot → List Update", () => {
    it("should delete snapshot and update list", () => {
      const {
        initSnapshotManager,
        createProjectSnapshot,
        deleteProjectSnapshot,
        listProjectSnapshots,
      } = usePreviewStore.getState();

      initSnapshotManager();

      const files = [{ path: "test.ts", content: "test" }];

      // Create two snapshots
      const snap1 = createProjectSnapshot("版本1", files);
      const snap2 = createProjectSnapshot("版本2", files);

      expect(listProjectSnapshots().length).toBe(2);

      // Delete first snapshot
      const deleted = deleteProjectSnapshot((snap1 as any).id);
      expect(deleted).toBe(true);

      // Verify list updated
      const snapshots = listProjectSnapshots();
      expect(snapshots.length).toBe(1);
      expect(snapshots[0].id).toBe(snap2?.id);
    });

    it("should return false when deleting non-existent snapshot", () => {
      const { initSnapshotManager, deleteProjectSnapshot } = usePreviewStore.getState();

      initSnapshotManager();

      const deleted = deleteProjectSnapshot("non_existent_id");
      expect(deleted).toBe(false);
    });

    it("should handle multiple deletions", () => {
      const {
        initSnapshotManager,
        createProjectSnapshot,
        listProjectSnapshots,
        deleteProjectSnapshot,
      } = usePreviewStore.getState();

      initSnapshotManager();

      const files = [{ path: "test.ts", content: "test" }];

      // Create 5 snapshots
      const snapshots = [];
      for (let i = 0; i < 5; i++) {
        const snap = createProjectSnapshot(`版本${i}`, files);
        if (snap) {
          snapshots.push(snap);
        }
      }

      expect(listProjectSnapshots().length).toBe(5);

      // Delete first 3 using deleteProjectSnapshot
      for (let i = 0; i < 3; i++) {
        const deleted = deleteProjectSnapshot(snapshots[i].id);
        expect(deleted).toBe(true);
      }

      // Verify remaining count
      const remaining = listProjectSnapshots();
      expect(remaining.length).toBe(2);
      
      // Verify the remaining are the last two
      const remainingLabels = remaining.map(s => s.label).sort();
      expect(remainingLabels).toContain('版本3');
      expect(remainingLabels).toContain('版本4');
    });
  });

  // ── Test 2.2.3.4: Compare Snapshot → Diff Display ──

  describe("Compare Snapshot → Diff Display", () => {
    it("should compare two snapshots and show differences", () => {
      const { initSnapshotManager, createProjectSnapshot, compareProjectSnapshots } =
        usePreviewStore.getState();

      initSnapshotManager();

      // Create first snapshot
      const files1 = [
        { path: "src/index.ts", content: "console.warn('v1')" },
        { path: "src/App.tsx", content: "<div>V1</div>" },
      ];
      const snap1 = createProjectSnapshot("版本1", files1);

      // Create second snapshot with modifications
      const files2 = [
        { path: "src/index.ts", content: "console.warn('v2')" }, // Modified
        { path: "src/App.tsx", content: "<div>V1</div>" }, // Unchanged
        { path: "src/new.ts", content: "export const new = true" }, // Added
      ];
      const snap2 = createProjectSnapshot("版本2", files2);

      // Compare
      const diff = compareProjectSnapshots((snap1 as any).id, (snap2 as any).id);

      expect(diff).not.toBeNull();
      expect(diff?.added).toContain("src/new.ts");
      expect(diff?.modified).toContain("src/index.ts");
      expect(diff?.unchanged).toContain("src/App.tsx");
      expect(diff?.removed).toEqual([]);
    });

    it("should detect removed files", () => {
      const { initSnapshotManager, createProjectSnapshot, compareProjectSnapshots } =
        usePreviewStore.getState();

      initSnapshotManager();

      // Create first snapshot
      const files1 = [
        { path: "src/index.ts", content: "v1" },
        { path: "src/old.ts", content: "will be removed" },
      ];
      const snap1 = createProjectSnapshot("版本1", files1);

      // Create second snapshot without old.ts
      const files2 = [{ path: "src/index.ts", content: "v1" }];
      const snap2 = createProjectSnapshot("版本2", files2);

      // Compare
      const diff = compareProjectSnapshots((snap1 as any).id, (snap2 as any).id);

      expect(diff).not.toBeNull();
      expect(diff?.removed).toContain("src/old.ts");
    });

    it("should return null when comparing non-existent snapshots", () => {
      const { initSnapshotManager, compareProjectSnapshots } = usePreviewStore.getState();

      initSnapshotManager();

      const diff = compareProjectSnapshots("id1", "id2");
      expect(diff).toBeNull();
    });
  });

  // ── Test 2.2.3.5: Storage Management ──

  describe("Storage Management", () => {
    it("should enforce max snapshot limit", () => {
      const { initSnapshotManager, createProjectSnapshot, listProjectSnapshots } =
        usePreviewStore.getState();

      initSnapshotManager();

      const files = [{ path: "test.ts", content: "test" }];

      for (let i = 0; i < 60; i++) {
        createProjectSnapshot(`版本${i}`, files);
      }

      const snapshots = listProjectSnapshots();
      expect(snapshots.length).toBeLessThanOrEqual(50);
      expect(snapshots.length).toBeGreaterThanOrEqual(40);
    });

    it("should get storage statistics", () => {
      const {
        initSnapshotManager,
        createProjectSnapshot,
        getSnapshotStorageStats,
      } = usePreviewStore.getState();

      initSnapshotManager();

      const files = [
        { path: "src/index.ts", content: "x".repeat(1000) },
        { path: "src/App.tsx", content: "y".repeat(1000) },
      ];

      createProjectSnapshot("大文件", files);

      const stats = getSnapshotStorageStats();

      expect(stats).not.toBeNull();
      expect(stats?.snapshotCount).toBe(1);
      expect(stats?.totalFiles).toBe(2);
      expect(stats?.totalLines).toBeGreaterThan(0);
      expect(stats?.estimatedSize).toMatch(/KB|B/);
    });

    it("should persist snapshots to localStorage", () => {
      const { initSnapshotManager, createProjectSnapshot } = usePreviewStore.getState();

      initSnapshotManager();

      const files = [{ path: "test.ts", content: "persist me" }];
      const snapshot = createProjectSnapshot("持久化测试", files);

      // Check localStorage
      const stored = localStorage.getItem("yyc3_snapshots");
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored as any);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].id).toBe(snapshot?.id);
    });

    it("should load snapshots from localStorage on initialization", () => {
      // Pre-populate localStorage
      const mockSnapshot = {
        id: "snap_test",
        label: "Pre-existing",
        timestamp: Date.now(),
        files: [{ path: "test.ts", content: "test", hash: "abc" }],
        metadata: { totalFiles: 1, totalLines: 1 },
      };
      localStorage.setItem("yyc3_snapshots", JSON.stringify([mockSnapshot]));

      // Initialize manager (should load from localStorage)
      const { initSnapshotManager, listProjectSnapshots } = usePreviewStore.getState();
      initSnapshotManager();

      const snapshots = listProjectSnapshots();
      expect(snapshots.length).toBe(1);
      expect(snapshots[0].id).toBe("snap_test");
    });
  });

  // ── Test 2.2.3.6: Helper Functions ──

  describe("Helper Functions", () => {
    it("should get current files for snapshot", () => {
      const fileStore = useFileStoreZustand.getState();
      fileStore.updateFile("test1.ts", "content1");
      fileStore.updateFile("test2.ts", "content2");

      const files = getCurrentFilesForSnapshot();

      expect(files.length).toBeGreaterThan(0);
      expect(files.some((f) => f.path === "test1.ts")).toBe(true);
      expect(files.some((f) => f.path === "test2.ts")).toBe(true);
    });

    it("should validate snapshot files", () => {
      const validFiles = [
        { path: "valid.ts", content: "valid content" },
        { path: "another.ts", content: "more content" },
      ];

      const result = validateSnapshotFiles(validFiles);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("should detect invalid snapshot files", () => {
      const invalidFiles = [
        { path: "", content: "empty path" },
        { path: "valid.ts", content: "" }, // Empty content (warning)
      ];

      const result = validateSnapshotFiles(invalidFiles);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should warn about empty files", () => {
      const filesWithEmpty = [
        { path: "empty.ts", content: "" },
        { path: "valid.ts", content: "valid" },
      ];

      const result = validateSnapshotFiles(filesWithEmpty);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  // ── Test 2.2.3.7: Error Handling ──

  describe("Error Handling", () => {
    it("should handle uninitialized manager gracefully", () => {
      const {
        createProjectSnapshot,
        listProjectSnapshots,
        getProjectSnapshot,
        deleteProjectSnapshot,
      } = usePreviewStore.getState();

      // Don't initialize manager

      const snapshot = createProjectSnapshot("test", []);
      expect(snapshot).toBeNull();

      const list = listProjectSnapshots();
      expect(list).toEqual([]);

      const retrieved = getProjectSnapshot("id");
      expect(retrieved).toBeNull();

      const deleted = deleteProjectSnapshot("id");
      expect(deleted).toBe(false);
    });

    it("should handle localStorage quota exceeded", () => {
      const { initSnapshotManager, snapshotManager } = usePreviewStore.getState();

      initSnapshotManager();

      // Simulate quota exceeded error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      });

      // Should not throw
      expect(() => {
        snapshotManager?.createSnapshot("test", [
          { path: "test.ts", content: "test" },
        ]);
      }).not.toThrow();

      // Restore
      localStorage.setItem = originalSetItem;
    });
  });
});
