/**
 * @file: ThreeWayMerge.test.ts
 * @description: 三路合并引擎单元测试
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-18
 * @status: test
 * @license: MIT
 */

import { describe, expect, it } from "vitest";
import {
  ThreeWayMerge,
  getThreeWayMerger,
  performMerge,
  type ConflictResolution,
  type MergeConflict
} from "../ThreeWayMerge";

describe("ThreeWayMerge", () => {
  let merger: ThreeWayMerge;

  beforeEach(() => {
    merger = new ThreeWayMerge();
  });

  describe("merge — 基本场景", () => {
    it("local === remote 时直接返回 local", () => {
      const result = merger.merge("base", "same", "same");
      expect(result.success).toBe(true);
      expect(result.hasConflicts).toBe(false);
      expect(result.content).toBe("same");
      expect(result.stats.cleanMerges).toBe(1);
      expect(result.stats.similarity).toBe(1);
    });

    it("local === base 时采用 remote", () => {
      const result = merger.merge("base", "base", "remote-changed");
      expect(result.success).toBe(true);
      expect(result.content).toBe("remote-changed");
      expect(result.stats.remoteOnlyChanges).toBe(1);
    });

    it("remote === base 时采用 local", () => {
      const result = merger.merge("base", "local-changed", "base");
      expect(result.success).toBe(true);
      expect(result.content).toBe("local-changed");
      expect(result.stats.localOnlyChanges).toBe(1);
    });

    it("三者都不同时触发差异合并", () => {
      const base = "line1\nline2\nline3";
      const local = "line1\nlocal-change\nline3";
      const remote = "line1\nline2\nremote-change";
      const result = merger.merge(base, local, remote);
      expect(result).toBeDefined();
      expect(result.content).toBeTruthy();
      expect(result.stats.totalRegions).toBeGreaterThan(0);
    });
  });

  describe("merge — 冲突场景", () => {
    it("同一行不同修改产生冲突或合并结果", () => {
      const base = "line1\nline2\nline3";
      const local = "line1\nLOCAL\nline3";
      const remote = "line1\nREMOTE\nline3";
      const result = merger.merge(base, local, remote);
      expect(result).toBeDefined();
      expect(result.content).toBeTruthy();
    });

    it("冲突标记或合并内容存在", () => {
      const base = "original";
      const local = "local-ver";
      const remote = "remote-ver";
      const result = merger.merge(base, local, remote);
      if (result.hasConflicts) {
        expect(result.content).toContain("<<<<<<< LOCAL");
        expect(result.content).toContain("=======");
        expect(result.content).toContain(">>>>>>> REMOTE");
      }
    });
  });

  describe("merge — 多行场景", () => {
    it("多行非重叠变更产生合并结果", () => {
      const base = "a\nb\nc\nd\ne";
      const local = "A\nb\nc\nd\ne";
      const remote = "a\nb\nc\nD\ne";
      const result = merger.merge(base, local, remote);
      expect(result).toBeDefined();
      expect(result.content).toBeTruthy();
    });

    it("空 base 时 local 和 remote 都是新内容", () => {
      const result = merger.merge("", "local-content", "remote-content");
      expect(result).toBeDefined();
      expect(result.content).toBeTruthy();
    });

    it("空 local 和空 remote 返回空", () => {
      const result = merger.merge("base", "", "");
      expect(result.success).toBe(true);
      expect(result.content).toBe("");
    });
  });

  describe("resolveConflict", () => {
    it("选择 local 方", () => {
      const conflict: MergeConflict = {
        id: "test-1",
        filePath: "test.ts",
        regions: [],
        localContent: "local-code",
        remoteContent: "remote-code",
        baseContent: "base-code",
        resolved: false,
      };
      const resolution: ConflictResolution = {
        conflictId: "test-1",
        side: "local",
      };
      const result = merger.resolveConflict(conflict, resolution);
      expect(result).toBe("local-code");
      expect(conflict.resolved).toBe(true);
    });

    it("选择 remote 方", () => {
      const conflict: MergeConflict = {
        id: "test-2",
        filePath: "test.ts",
        regions: [],
        localContent: "local-code",
        remoteContent: "remote-code",
        baseContent: "base-code",
        resolved: false,
      };
      const resolution: ConflictResolution = {
        conflictId: "test-2",
        side: "remote",
      };
      const result = merger.resolveConflict(conflict, resolution);
      expect(result).toBe("remote-code");
      expect(conflict.resolved).toBe(true);
    });

    it("选择 both 合并双方去重", () => {
      const conflict: MergeConflict = {
        id: "test-3",
        filePath: "test.ts",
        regions: [],
        localContent: "line1\nline2",
        remoteContent: "line2\nline3",
        baseContent: "base",
        resolved: false,
      };
      const resolution: ConflictResolution = {
        conflictId: "test-3",
        side: "both",
      };
      const result = merger.resolveConflict(conflict, resolution);
      expect(result).toContain("line1");
      expect(result).toContain("line2");
      expect(result).toContain("line3");
    });

    it("选择 manual 使用自定义内容", () => {
      const conflict: MergeConflict = {
        id: "test-4",
        filePath: "test.ts",
        regions: [],
        localContent: "local",
        remoteContent: "remote",
        baseContent: "base",
        resolved: false,
      };
      const resolution: ConflictResolution = {
        conflictId: "test-4",
        side: "manual",
        customContent: "custom-resolved",
      };
      const result = merger.resolveConflict(conflict, resolution);
      expect(result).toBe("custom-resolved");
    });

    it("manual 无 customContent 时返回空字符串", () => {
      const conflict: MergeConflict = {
        id: "test-5",
        filePath: "test.ts",
        regions: [],
        localContent: "local",
        remoteContent: "remote",
        baseContent: "base",
        resolved: false,
      };
      const resolution: ConflictResolution = {
        conflictId: "test-5",
        side: "manual",
      };
      const result = merger.resolveConflict(conflict, resolution);
      expect(result).toBe("");
    });
  });

  describe("merge — 统计信息", () => {
    it("相同内容时 similarity 为 1", () => {
      const result = merger.merge("same", "same", "same");
      expect(result.stats.similarity).toBe(1);
    });

    it("完全不同的内容产生变更统计", () => {
      const base = "a\nb\nc";
      const local = "x\ny\nz";
      const remote = "p\nq\nr";
      const result = merger.merge(base, local, remote);
      expect(result.stats.totalRegions).toBeGreaterThan(0);
    });
  });
});

describe("getThreeWayMerger singleton", () => {
  it("返回同一实例", () => {
    const a = getThreeWayMerger();
    const b = getThreeWayMerger();
    expect(a).toBe(b);
  });
});

describe("performMerge 便捷函数", () => {
  it("正确代理到 merger.merge", () => {
    const result = performMerge("base", "local", "local");
    expect(result.success).toBe(true);
    expect(result.content).toBe("local");
  });
});
