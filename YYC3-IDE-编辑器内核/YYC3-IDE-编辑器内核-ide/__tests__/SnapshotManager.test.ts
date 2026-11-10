// @ts-nocheck
/**
 * @file: SnapshotManager.test.ts
 * @description: SnapshotManager 单元测试
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SnapshotManager, createSnapshotManager } from "../SnapshotManager";
import type { Snapshot } from "../SnapshotManager";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe("SnapshotManager", () => {
  let manager: SnapshotManager;

  beforeEach(() => {
    // 清理 localStorage
    localStorageMock.clear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    
    // 创建新的管理器实例
    manager = new SnapshotManager();
  });

  afterEach(() => {
    manager.clearAll();
  });

  // ========================================
  // 创建快照测试
  // ========================================

  describe("createSnapshot", () => {
    it("应该成功创建快照", () => {
      const files = [
        { path: "index.ts", content: "console.warn('hello')" }
      ];
      
      const snapshot = manager.createSnapshot("测试快照", files);
      
      expect(snapshot.id).toBeDefined();
      expect(snapshot.label).toBe("测试快照");
      expect(snapshot.timestamp).toBeDefined();
      expect(snapshot.files).toHaveLength(1);
      expect(snapshot.files[0].path).toBe("index.ts");
      expect(snapshot.files[0].content).toBe("console.warn('hello')");
      expect(snapshot.files[0].hash).toBeDefined();
    });

    it("应该正确计算元数据", () => {
      const files = [
        { path: "file1.ts", content: "line1\nline2\nline3" },
        { path: "file2.ts", content: "line1\nline2" }
      ];
      
      const snapshot = manager.createSnapshot("多文件快照", files);
      
      expect(snapshot.metadata.totalFiles).toBe(2);
      expect(snapshot.metadata.totalLines).toBe(5); // 3 + 2
    });

    it("应该支持自定义元数据", () => {
      const files = [{ path: "app.ts", content: "test" }];
      const metadata = {
        description: "功能开发完成",
        tags: ["feature", "v1.0"]
      };
      
      const snapshot = manager.createSnapshot("带元数据", files, metadata);
      
      expect(snapshot.metadata.description).toBe("功能开发完成");
      expect(snapshot.metadata.tags).toEqual(["feature", "v1.0"]);
    });

    it("应该为每个文件计算哈希", () => {
      const files = [
        { path: "file1.ts", content: "content1" },
        { path: "file2.ts", content: "content2" }
      ];
      
      const snapshot = manager.createSnapshot("哈希测试", files);
      
      expect(snapshot.files[0].hash).toBeDefined();
      expect(snapshot.files[1].hash).toBeDefined();
      expect(snapshot.files[0].hash).not.toBe(snapshot.files[1].hash);
    });

    it("应该持久化到 localStorage", () => {
      const files = [{ path: "test.ts", content: "test" }];
      manager.createSnapshot("持久化测试", files);
      
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  // ========================================
  // 列出快照测试
  // ========================================

  describe("listSnapshots", () => {
    it("应该返回所有快照", () => {
      manager.createSnapshot("快照1", [{ path: "f1.ts", content: "c1" }]);
      manager.createSnapshot("快照2", [{ path: "f2.ts", content: "c2" }]);
      
      const snapshots = manager.listSnapshots();
      
      expect(snapshots).toHaveLength(2);
    });

    it("应该按时间戳降序排列", async () => {
      // 创建第一个快照
      manager.createSnapshot("快照1", [{ path: "f1.ts", content: "c1" }]);
      
      // 等待1ms确保时间戳不同
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // 创建第二个快照
      manager.createSnapshot("快照2", [{ path: "f2.ts", content: "c2" }]);
      
      const snapshots = manager.listSnapshots();
      
      expect(snapshots[0].label).toBe("快照2"); // 最新的在前
      expect(snapshots[1].label).toBe("快照1");
    });

    it("空管理器应该返回空列表", () => {
      const snapshots = manager.listSnapshots();
      expect(snapshots).toHaveLength(0);
    });
  });

  // ========================================
  // 获取快照测试
  // ========================================

  describe("getSnapshot", () => {
    it("应该返回指定的快照", () => {
      const created = manager.createSnapshot("查找测试", [
        { path: "test.ts", content: "test" }
      ]);
      
      const found = manager.getSnapshot(created.id);
      
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.label).toBe("查找测试");
    });

    it("不存在的快照应该返回null", () => {
      const found = manager.getSnapshot("non_existent_id");
      expect(found).toBeNull();
    });
  });

  // ========================================
  // 恢复快照测试
  // ========================================

  describe("restoreSnapshot", () => {
    it("应该成功恢复快照", () => {
      const files = [
        { path: "file1.ts", content: "content1" },
        { path: "file2.ts", content: "content2" }
      ];
      
      const snapshot = manager.createSnapshot("恢复测试", files);
      
      const applyFn = vi.fn();
      const result = manager.restoreSnapshot(snapshot.id, applyFn);
      
      expect(result).toBe(true);
      expect(applyFn).toHaveBeenCalledTimes(1);
      expect(applyFn).toHaveBeenCalledWith([
        { path: "file1.ts", content: "content1" },
        { path: "file2.ts", content: "content2" }
      ]);
    });

    it("恢复不存在的快照应该返回false", () => {
      const applyFn = vi.fn();
      const result = manager.restoreSnapshot("non_existent", applyFn);
      
      expect(result).toBe(false);
      expect(applyFn).not.toHaveBeenCalled();
    });

    it("应用函数抛出错误时应该返回false", () => {
      const snapshot = manager.createSnapshot("错误测试", [
        { path: "test.ts", content: "test" }
      ]);
      
      const applyFn = vi.fn(() => {
        throw new Error("Apply error");
      });
      
      const result = manager.restoreSnapshot(snapshot.id, applyFn);
      
      expect(result).toBe(false);
    });
  });

  // ========================================
  // 删除快照测试
  // ========================================

  describe("deleteSnapshot", () => {
    it("应该成功删除快照", () => {
      const snapshot = manager.createSnapshot("删除测试", [
        { path: "test.ts", content: "test" }
      ]);
      
      const result = manager.deleteSnapshot(snapshot.id);
      
      expect(result).toBe(true);
      expect(manager.getSnapshot(snapshot.id)).toBeNull();
    });

    it("删除后应该更新localStorage", () => {
      const snapshot = manager.createSnapshot("删除测试", [
        { path: "test.ts", content: "test" }
      ]);
      
      localStorageMock.setItem.mockClear();
      manager.deleteSnapshot(snapshot.id);
      
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it("删除不存在的快照应该返回false", () => {
      const result = manager.deleteSnapshot("non_existent");
      expect(result).toBe(false);
    });
  });

  describe("deleteSnapshots", () => {
    it("应该批量删除快照", () => {
      const snap1 = manager.createSnapshot("快照1", [{ path: "f1.ts", content: "c1" }]);
      const snap2 = manager.createSnapshot("快照2", [{ path: "f2.ts", content: "c2" }]);
      const snap3 = manager.createSnapshot("快照3", [{ path: "f3.ts", content: "c3" }]);
      
      const count = manager.deleteSnapshots([snap1.id, snap2.id]);
      
      expect(count).toBe(2);
      expect(manager.getSnapshotCount()).toBe(1);
    });
  });

  // ========================================
  // 比较快照测试
  // ========================================

  describe("compareSnapshots", () => {
    it("应该正确识别新增文件", () => {
      const snap1 = manager.createSnapshot("快照1", [
        { path: "file1.ts", content: "content1" }
      ]);
      
      const snap2 = manager.createSnapshot("快照2", [
        { path: "file1.ts", content: "content1" },
        { path: "file2.ts", content: "content2" } // 新增
      ]);
      
      const diff = manager.compareSnapshots(snap1.id, snap2.id);
      
      expect(diff.added).toEqual(["file2.ts"]);
      expect(diff.removed).toEqual([]);
      expect(diff.modified).toEqual([]);
      expect(diff.unchanged).toEqual(["file1.ts"]);
    });

    it("应该正确识别删除文件", () => {
      const snap1 = manager.createSnapshot("快照1", [
        { path: "file1.ts", content: "content1" },
        { path: "file2.ts", content: "content2" }
      ]);
      
      const snap2 = manager.createSnapshot("快照2", [
        { path: "file1.ts", content: "content1" }
      ]);
      
      const diff = manager.compareSnapshots(snap1.id, snap2.id);
      
      expect(diff.removed).toEqual(["file2.ts"]);
      expect(diff.added).toEqual([]);
      expect(diff.modified).toEqual([]);
    });

    it("应该正确识别修改文件", () => {
      const snap1 = manager.createSnapshot("快照1", [
        { path: "file1.ts", content: "content1" }
      ]);
      
      const snap2 = manager.createSnapshot("快照2", [
        { path: "file1.ts", content: "content1_modified" } // 修改
      ]);
      
      const diff = manager.compareSnapshots(snap1.id, snap2.id);
      
      expect(diff.modified).toEqual(["file1.ts"]);
      expect(diff.added).toEqual([]);
      expect(diff.removed).toEqual([]);
    });

    it("应该正确识别所有变化", () => {
      const snap1 = manager.createSnapshot("快照1", [
        { path: "file1.ts", content: "content1" },
        { path: "file2.ts", content: "content2" },
        { path: "file3.ts", content: "content3" }
      ]);
      
      const snap2 = manager.createSnapshot("快照2", [
        { path: "file1.ts", content: "content1" }, // 未变
        { path: "file2.ts", content: "content2_modified" }, // 修改
        { path: "file4.ts", content: "content4" } // 新增
        // file3.ts 被删除
      ]);
      
      const diff = manager.compareSnapshots(snap1.id, snap2.id);
      
      expect(diff.unchanged).toContain("file1.ts");
      expect(diff.modified).toContain("file2.ts");
      expect(diff.added).toContain("file4.ts");
      expect(diff.removed).toContain("file3.ts");
    });

    it("比较不存在的快照应该抛出错误", () => {
      const snap = manager.createSnapshot("快照", [
        { path: "test.ts", content: "test" }
      ]);
      
      expect(() => {
        manager.compareSnapshots(snap.id, "non_existent");
      }).toThrow("Snapshot not found");
    });
  });

  // ========================================
  // 持久化测试
  // ========================================

  describe("persistence", () => {
    it("应该从 localStorage 加载快照", () => {
      // 创建快照
      const snapshot = manager.createSnapshot("持久化测试", [
        { path: "test.ts", content: "test" }
      ]);
      
      // 创建新的管理器实例（会从 localStorage 加载）
      const newManager = new SnapshotManager();
      
      const loaded = newManager.getSnapshot(snapshot.id);
      expect(loaded).toBeDefined();
      expect(loaded?.label).toBe("持久化测试");
      
      newManager.clearAll();
    });

    it("应该处理损坏的 localStorage 数据", () => {
      localStorageMock.getItem.mockReturnValueOnce("invalid json");
      
      // 不应该抛出错误
      const newManager = new SnapshotManager();
      expect(newManager.getSnapshotCount()).toBe(0);
      
      newManager.clearAll();
    });
  });

  // ========================================
  // 数量限制测试
  // ========================================

  describe("enforceLimit", () => {
    it("应该限制快照数量", () => {
      // 创建超过限制的快照
      for (let i = 0; i < 55; i++) {
        manager.createSnapshot(`快照${i}`, [
          { path: `file${i}.ts`, content: `content${i}` }
        ]);
      }
      
      // 应该只有50个
      expect(manager.getSnapshotCount()).toBe(50);
    });

    it("应该保留最新的快照", async () => {
      // 创建51个快照，每个之间有延迟确保时间戳不同
      for (let i = 0; i < 51; i++) {
        manager.createSnapshot(`快照${i}`, [
          { path: `file${i}.ts`, content: `content${i}` }
        ]);
        await new Promise(resolve => setTimeout(resolve, 2));
      }
      
      const snapshots = manager.listSnapshots();
      
      // 应该只有50个快照（限制是50）
      expect(snapshots.length).toBe(50);
      
      // 最新的快照应该是最后创建的（快照50）
      expect(snapshots[0].label).toBe("快照50");
      
      // 获取所有快照标签
      const labels = snapshots.map(s => s.label);
      
      // 快照0应该被删除（最旧的）
      expect(labels).not.toContain("快照0");
      
      // 验证保留的都是较新的快照（快照1-50）
      for (let i = 1; i <= 50; i++) {
        expect(labels).toContain(`快照${i}`);
      }
    });
  });

  // ========================================
  // 辅助方法测试
  // ========================================

  describe("helper methods", () => {
    it("getSnapshotCount 应该返回正确数量", () => {
      expect(manager.getSnapshotCount()).toBe(0);
      
      manager.createSnapshot("快照1", [{ path: "f1.ts", content: "c1" }]);
      expect(manager.getSnapshotCount()).toBe(1);
      
      manager.createSnapshot("快照2", [{ path: "f2.ts", content: "c2" }]);
      expect(manager.getSnapshotCount()).toBe(2);
    });

    it("hasSnapshot 应该正确检查快照是否存在", () => {
      const snapshot = manager.createSnapshot("测试", [
        { path: "test.ts", content: "test" }
      ]);
      
      expect(manager.hasSnapshot(snapshot.id)).toBe(true);
      expect(manager.hasSnapshot("non_existent")).toBe(false);
    });

    it("updateSnapshotLabel 应该更新标签", () => {
      const snapshot = manager.createSnapshot("旧标签", [
        { path: "test.ts", content: "test" }
      ]);
      
      const result = manager.updateSnapshotLabel(snapshot.id, "新标签");
      
      expect(result).toBe(true);
      expect(manager.getSnapshot(snapshot.id)?.label).toBe("新标签");
    });

    it("clearAll 应该清空所有快照", () => {
      manager.createSnapshot("快照1", [{ path: "f1.ts", content: "c1" }]);
      manager.createSnapshot("快照2", [{ path: "f2.ts", content: "c2" }]);
      
      manager.clearAll();
      
      expect(manager.getSnapshotCount()).toBe(0);
    });

    it("getStorageStats 应该返回统计信息", () => {
      manager.createSnapshot("快照1", [
        { path: "file1.ts", content: "line1\nline2\nline3" },
        { path: "file2.ts", content: "line1\nline2" }
      ]);
      
      manager.createSnapshot("快照2", [
        { path: "file3.ts", content: "line1" }
      ]);
      
      const stats = manager.getStorageStats();
      
      expect(stats.snapshotCount).toBe(2);
      expect(stats.totalFiles).toBe(3);
      expect(stats.totalLines).toBe(6); // 3 + 2 + 1
      expect(stats.estimatedSize).toBeDefined();
    });
  });

  // ========================================
  // 边界情况测试
  // ========================================

  describe("edge cases", () => {
    it("应该处理空文件列表", () => {
      const snapshot = manager.createSnapshot("空快照", []);
      
      expect(snapshot.files).toHaveLength(0);
      expect(snapshot.metadata.totalFiles).toBe(0);
      expect(snapshot.metadata.totalLines).toBe(0);
    });

    it("应该处理大文件", () => {
      const largeContent = "x".repeat(10000);
      const snapshot = manager.createSnapshot("大文件", [
        { path: "large.ts", content: largeContent }
      ]);
      
      expect(snapshot.files[0].content.length).toBe(10000);
      expect(snapshot.files[0].hash).toBeDefined();
    });

    it("应该处理特殊字符路径", () => {
      const snapshot = manager.createSnapshot("特殊路径", [
        { path: "src/文件夹/文件名-特殊.tsx", content: "test" }
      ]);
      
      expect(snapshot.files[0].path).toBe("src/文件夹/文件名-特殊.tsx");
    });

    it("应该处理相同内容的不同文件", () => {
      const snapshot = manager.createSnapshot("相同内容", [
        { path: "file1.ts", content: "same content" },
        { path: "file2.ts", content: "same content" }
      ]);
      
      // 两个文件应该有相同的哈希
      expect(snapshot.files[0].hash).toBe(snapshot.files[1].hash);
    });
  });

  // ========================================
  // 工厂函数测试
  // ========================================

  describe("createSnapshotManager", () => {
    it("应该创建管理器实例", () => {
      const manager = createSnapshotManager();
      expect(manager).toBeInstanceOf(SnapshotManager);
      manager.clearAll();
    });
  });
});
