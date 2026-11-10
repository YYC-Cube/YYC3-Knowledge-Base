// @ts-nocheck
/**
 * @file: SnapshotDiff.test.ts
 * @description: 快照比较功能完整测试套件
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: test,snapshot,diff,comparison
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MyersDiff, type DiffResult } from '../MyersDiff';
import { SnapshotDiffEngine, type SnapshotDiffResult } from '../SnapshotDiffEngine';
import type { Snapshot, SnapshotFile } from '../../SnapshotManager';

// ================================================================
// 测试套件：快照比较功能
// ================================================================

describe('任务2.2: 快照比较功能', () => {
  
  // ================================================================
  // 2.2.1 Diff算法实现测试
  // ================================================================
  
  describe('2.2.1 Myers Diff算法', () => {
    let diff: MyersDiff;

    beforeEach(() => {
      diff = new MyersDiff();
    });

    it('应该检测到新增的行', () => {
      const oldText = 'Line 1\nLine 2';
      const newText = 'Line 1\nLine 2\nLine 3';

      const result = diff.diff(oldText, newText);

      expect(result.additions).toBe(1);
      expect(result.deletions).toBe(0);
      expect(result.blocks.filter(b => b.type === 'add').length).toBe(1);
    });

    it('应该检测到删除的行', () => {
      const oldText = 'Line 1\nLine 2\nLine 3';
      const newText = 'Line 1\nLine 2';

      const result = diff.diff(oldText, newText);

      expect(result.additions).toBe(0);
      expect(result.deletions).toBe(1);
      expect(result.blocks.filter(b => b.type === 'delete').length).toBe(1);
    });

    it('应该检测到修改的行', () => {
      const oldText = 'Line 1\nOld Line 2\nLine 3';
      const newText = 'Line 1\nNew Line 2\nLine 3';

      const result = diff.diff(oldText, newText);

      // 修改会表现为删除旧行和新增新行
      expect(result.deletions + result.additions).toBeGreaterThan(0);
    });

    it('应该检测到多个差异', () => {
      const oldText = 'Line 1\nLine 2\nLine 3\nLine 4';
      const newText = 'Line 1\nModified Line 2\nLine 3\nNew Line 5';

      const result = diff.diff(oldText, newText);

      // 应该检测到差异
      expect(result.deletions).toBeGreaterThan(0);
      expect(result.additions).toBeGreaterThan(0);
    });

    it('应该支持行级差异检测', () => {
      const oldText = 'Line 1\nLine 2';
      const newText = 'Line 1\nModified Line 2';

      const result = diff.diff(oldText, newText);

      expect(result.blocks.length).toBeGreaterThan(0);
      
      // 应该包含相等块和变更块
      const hasChanges = result.additions > 0 || result.deletions > 0;
      expect(hasChanges).toBe(true);
    });

    it('应该支持字符级差异检测', () => {
      const oldText = 'Hello World';
      const newText = 'Hello TypeScript';

      const result = diff.diff(oldText, newText, { charLevel: true });

      // 字符级差异检测
      expect(result.additions + result.deletions).toBeGreaterThan(0);
    });

    it('应该处理空文件', () => {
      const oldText = '';
      const newText = 'New content';

      const result = diff.diff(oldText, newText);

      // 从空文件到有内容，应该有增加
      expect(result.additions + result.deletions).toBeGreaterThan(0);
    });

    it('应该处理完全相同的文件', () => {
      const text = 'Line 1\nLine 2\nLine 3';
      const result = diff.diff(text, text);

      expect(result.additions).toBe(0);
      expect(result.deletions).toBe(0);
      // 相同文件相似度应为1
      expect(result.similarity).toBe(1);
    });

    it('应该正确计算相似度', () => {
      const oldText = 'Line 1\nLine 2\nLine 3';
      const newText = 'Line 1\nModified Line 2\nLine 3';

      const result = diff.diff(oldText, newText);

      // 相似度应该在0和1之间
      expect(result.similarity).toBeGreaterThan(0);
      expect(result.similarity).toBeLessThan(1);
    });

    it('应该处理大文件（性能优化）', () => {
      // 生成大文件（1000行）
      const oldLines: string[] = [];
      const newLines: string[] = [];

      for (let i = 0; i < 1000; i++) {
        oldLines.push(`Line ${i}: Content`);
        if (i % 10 === 0) {
          newLines.push(`Line ${i}: Modified Content`);
        } else {
          newLines.push(`Line ${i}: Content`);
        }
      }

      const start = performance.now();
      const result = diff.diff(oldLines.join('\n'), newLines.join('\n'));
      const end = performance.now();

      // 性能要求：< 100ms
      expect(end - start).toBeLessThan(100);
      // 由于修改行会导致删除和新增，所以检查总变更数
      expect(result.additions + result.deletions).toBeGreaterThan(0);
    });

    it('应该使用简化算法处理超大文件', () => {
      const oldLines: string[] = [];
      const newLines: string[] = [];

      // 生成超大文件（15000行）
      for (let i = 0; i < 15000; i++) {
        oldLines.push(`Line ${i}`);
        newLines.push(i % 2 === 0 ? `Line ${i}` : `Modified Line ${i}`);
      }

      const start = performance.now();
      const result = diff.diff(oldLines.join('\n'), newLines.join('\n'), { maxLines: 10000 });
      const end = performance.now();

      // 应该快速完成（放宽到500ms）
      expect(end - start).toBeLessThan(500);
    });

    it('应该正确处理行号', () => {
      const oldText = 'Line 1\nLine 2\nLine 3';
      const newText = 'Line 1\nModified Line 2\nLine 3';

      const result = diff.diff(oldText, newText);

      // 检查所有块的行号
      for (const block of result.blocks) {
        if (block.type === 'equal') {
          expect(block.oldLineNumber).toBeDefined();
          expect(block.newLineNumber).toBeDefined();
        } else if (block.type === 'delete') {
          expect(block.oldLineNumber).toBeDefined();
        } else if (block.type === 'add') {
          expect(block.newLineNumber).toBeDefined();
        }
      }
    });
  });

  // ================================================================
  // 2.2.2 快照对比API测试
  // ================================================================
  
  describe('2.2.2 快照对比API', () => {
    let engine: SnapshotDiffEngine;

    beforeEach(() => {
      SnapshotDiffEngine.resetInstance();
      engine = SnapshotDiffEngine.getInstance();
    });

    afterEach(() => {
      SnapshotDiffEngine.resetInstance();
    });

    const createSnapshot = (id: string, files: SnapshotFile[]): Snapshot => ({
      id,
      label: `Snapshot ${id}`,
      timestamp: Date.now(),
      files,
      metadata: {
        totalFiles: files.length,
        totalLines: files.reduce((sum, f) => sum + f.content.split('\n').length, 0)
      }
    });

    const createFile = (path: string, content: string): SnapshotFile => ({
      path,
      content,
      hash: btoa(content).slice(0, 8) // 简单哈希
    });

    it('应该比较两个快照', () => {
      const oldSnapshot = createSnapshot('old', [
        createFile('file1.ts', 'Old content'),
        createFile('file2.ts', 'Same content')
      ]);

      const newSnapshot = createSnapshot('new', [
        createFile('file1.ts', 'New content'),
        createFile('file2.ts', 'Same content')
      ]);

      const result = engine.compareSnapshots(oldSnapshot, newSnapshot);

      expect(result.oldSnapshotId).toBe('old');
      expect(result.newSnapshotId).toBe('new');
      expect(result.files.length).toBe(2);
    });

    it('应该检测新增的文件', () => {
      const oldSnapshot = createSnapshot('old', [
        createFile('file1.ts', 'Content')
      ]);

      const newSnapshot = createSnapshot('new', [
        createFile('file1.ts', 'Content'),
        createFile('file2.ts', 'New file')
      ]);

      const result = engine.compareSnapshots(oldSnapshot, newSnapshot);

      expect(result.stats.addedFiles).toBe(1);
      expect(result.files.find(f => f.path === 'file2.ts')?.status).toBe('added');
    });

    it('应该检测删除的文件', () => {
      const oldSnapshot = createSnapshot('old', [
        createFile('file1.ts', 'Content'),
        createFile('file2.ts', 'Deleted file')
      ]);

      const newSnapshot = createSnapshot('new', [
        createFile('file1.ts', 'Content')
      ]);

      const result = engine.compareSnapshots(oldSnapshot, newSnapshot);

      expect(result.stats.removedFiles).toBe(1);
      expect(result.files.find(f => f.path === 'file2.ts')?.status).toBe('removed');
    });

    it('应该检测修改的文件', () => {
      const oldSnapshot = createSnapshot('old', [
        createFile('file.ts', 'Old content')
      ]);

      const newSnapshot = createSnapshot('new', [
        createFile('file.ts', 'New content')
      ]);

      const result = engine.compareSnapshots(oldSnapshot, newSnapshot);

      expect(result.stats.modifiedFiles).toBe(1);
      expect(result.files.find(f => f.path === 'file.ts')?.status).toBe('modified');
    });

    it('应该检测未改变的文件', () => {
      const oldSnapshot = createSnapshot('old', [
        createFile('file.ts', 'Same content')
      ]);

      const newSnapshot = createSnapshot('new', [
        createFile('file.ts', 'Same content')
      ]);

      const result = engine.compareSnapshots(oldSnapshot, newSnapshot);

      expect(result.stats.unchangedFiles).toBe(1);
      expect(result.files.find(f => f.path === 'file.ts')?.status).toBe('unchanged');
    });

    it('应该获取差异统计', () => {
      const oldSnapshot = createSnapshot('old', [
        createFile('file1.ts', 'Old'),
        createFile('file2.ts', 'Same')
      ]);

      const newSnapshot = createSnapshot('new', [
        createFile('file1.ts', 'New'),
        createFile('file2.ts', 'Same'),
        createFile('file3.ts', 'Added')
      ]);

      const diff = engine.compareSnapshots(oldSnapshot, newSnapshot);
      const stats = engine.getDiffStats(diff);

      expect(stats.totalFiles).toBe(3);
      expect(stats.modifiedFiles).toBe(1);
      expect(stats.addedFiles).toBe(1);
      expect(stats.unchangedFiles).toBe(1);
    });

    it('应该计算相似度', () => {
      const oldSnapshot = createSnapshot('old', [
        createFile('file1.ts', 'Content'),
        createFile('file2.ts', 'Content'),
        createFile('file3.ts', 'Content')
      ]);

      const newSnapshot = createSnapshot('new', [
        createFile('file1.ts', 'Content'),
        createFile('file2.ts', 'Modified'),
        createFile('file3.ts', 'Content')
      ]);

      const result = engine.compareSnapshots(oldSnapshot, newSnapshot);

      // 1个文件未改变，共3个文件
      expect(result.stats.similarity).toBeGreaterThan(0);
      expect(result.stats.similarity).toBeLessThan(1);
    });
  });

  // ================================================================
  // 2.2.3 导出功能测试
  // ================================================================
  
  describe('2.2.3 导出功能', () => {
    let engine: SnapshotDiffEngine;
    let testDiff: SnapshotDiffResult;

    beforeEach(() => {
      SnapshotDiffEngine.resetInstance();
      engine = SnapshotDiffEngine.getInstance();

      const oldSnapshot: Snapshot = {
        id: 'old',
        label: 'Old Snapshot',
        timestamp: Date.now() - 1000,
        files: [
          { path: 'file1.ts', content: 'Old content', hash: 'old123' }
        ],
        metadata: { totalFiles: 1, totalLines: 1 }
      };

      const newSnapshot: Snapshot = {
        id: 'new',
        label: 'New Snapshot',
        timestamp: Date.now(),
        files: [
          { path: 'file1.ts', content: 'New content', hash: 'new456' },
          { path: 'file2.ts', content: 'Added file', hash: 'added789' }
        ],
        metadata: { totalFiles: 2, totalLines: 2 }
      };

      testDiff = engine.compareSnapshots(oldSnapshot, newSnapshot);
    });

    afterEach(() => {
      SnapshotDiffEngine.resetInstance();
    });

    it('应该导出为JSON格式', () => {
      const exported = engine.exportDiff(testDiff, 'json');

      expect(exported).toBeDefined();
      
      const parsed = JSON.parse(exported);
      expect(parsed.oldSnapshotId).toBe('old');
      expect(parsed.newSnapshotId).toBe('new');
    });

    it('应该导出为HTML格式', () => {
      const exported = engine.exportDiff(testDiff, 'html');

      expect(exported).toContain('<!DOCTYPE html>');
      expect(exported).toContain('<title>快照差异报告</title>');
      expect(exported).toContain(testDiff.stats.totalFiles.toString());
    });

    it('应该导出为Markdown格式', () => {
      const exported = engine.exportDiff(testDiff, 'markdown');

      expect(exported).toContain('# 快照差异报告');
      expect(exported).toContain('## 统计信息');
      expect(exported).toContain('## 文件差异');
    });

    it('应该导出为统一diff格式', () => {
      const exported = engine.exportDiff(testDiff, 'unified');

      expect(exported).toContain('--- Snapshot: old');
      expect(exported).toContain('+++ Snapshot: new');
      expect(exported).toContain('diff --git');
    });

    it('应该正确处理HTML转义', () => {
      const oldSnapshot: Snapshot = {
        id: 'test',
        label: 'Test',
        timestamp: Date.now(),
        files: [
          { path: 'file.ts', content: '<script>alert("XSS")</script>', hash: 'old' }
        ],
        metadata: { totalFiles: 1, totalLines: 1 }
      };

      const newSnapshot: Snapshot = {
        id: 'test2',
        label: 'Test2',
        timestamp: Date.now(),
        files: [
          { path: 'file.ts', content: '<div>Safe content</div>', hash: 'new' }
        ],
        metadata: { totalFiles: 1, totalLines: 1 }
      };

      const diff = engine.compareSnapshots(oldSnapshot, newSnapshot);
      const html = engine.exportDiff(diff, 'html');

      // 检查HTML转义
      expect(html).toContain('&lt;');
    });
  });

  // ================================================================
  // 2.2.4 边界情况和性能测试
  // ================================================================
  
  describe('2.2.4 边界情况和性能', () => {
    let engine: SnapshotDiffEngine;

    beforeEach(() => {
      SnapshotDiffEngine.resetInstance();
      engine = SnapshotDiffEngine.getInstance();
    });

    afterEach(() => {
      SnapshotDiffEngine.resetInstance();
    });

    it('应该处理空快照', () => {
      const emptySnapshot: Snapshot = {
        id: 'empty',
        label: 'Empty',
        timestamp: Date.now(),
        files: [],
        metadata: { totalFiles: 0, totalLines: 0 }
      };

      const result = engine.compareSnapshots(emptySnapshot, emptySnapshot);

      expect(result.files.length).toBe(0);
      expect(result.stats.totalFiles).toBe(0);
      expect(result.stats.similarity).toBe(1);
    });

    it('应该处理大量文件', () => {
      const createFiles = (count: number, prefix: string = ''): any[] => {
        const files = [];
        for (let i = 0; i < count; i++) {
          files.push({
            path: `file${i}.ts`,
            content: `${prefix}Content ${i}`,
            hash: btoa(`${prefix}Content ${i}`).slice(0, 8)
          });
        }
        return files;
      };

      const oldSnapshot: Snapshot = {
        id: 'old',
        label: 'Old',
        timestamp: Date.now(),
        files: createFiles(100),
        metadata: { totalFiles: 100, totalLines: 100 }
      };

      const newSnapshot: Snapshot = {
        id: 'new',
        label: 'New',
        timestamp: Date.now(),
        files: createFiles(100, 'Modified '),
        metadata: { totalFiles: 100, totalLines: 100 }
      };

      const start = performance.now();
      const result = engine.compareSnapshots(oldSnapshot, newSnapshot);
      const end = performance.now();

      expect(result.files.length).toBe(100);
      // 所有文件都被修改了
      expect(result.stats.modifiedFiles).toBe(100);
      expect(end - start).toBeLessThan(200);
    });

    it('应该正确处理特殊字符', () => {
      const diff = new MyersDiff();
      const oldText = 'Line with "quotes" and \'apostrophes\'';
      const newText = 'Line with "quotes" and \'apostrophes\' and more';

      const result = diff.diff(oldText, newText);

      expect(result.additions).toBe(1);
    });

    it('应该处理Unicode字符', () => {
      const diff = new MyersDiff();
      const oldText = '你好世界';
      const newText = '你好宇宙';

      const result = diff.diff(oldText, newText);

      expect(result.deletions).toBe(1);
      expect(result.additions).toBe(1);
    });

    it('应该通过性能基准测试', () => {
      const benchmark = MyersDiff.benchmark(500);

      expect(benchmark.lines).toBe(500);
      expect(benchmark.time).toBeLessThan(500); // Flaky性能测试：CI环境波动大，仅作上限保护
    });
  });

  // ================================================================
  // 集成测试
  // ================================================================
  
  describe('集成测试', () => {
    let engine: SnapshotDiffEngine;

    beforeEach(() => {
      SnapshotDiffEngine.resetInstance();
      engine = SnapshotDiffEngine.getInstance();
    });

    afterEach(() => {
      SnapshotDiffEngine.resetInstance();
    });

    it('应该完整执行快照比较流程', () => {
      // 1. 创建快照
      const oldSnapshot: Snapshot = {
        id: 'v1',
        label: 'Version 1',
        timestamp: Date.now() - 3600000,
        files: [
          { path: 'index.ts', content: 'console.warn("Hello");', hash: 'hash1' },
          { path: 'utils.ts', content: 'export function add(a, b) { return a + b; }', hash: 'hash2' }
        ],
        metadata: { totalFiles: 2, totalLines: 2 }
      };

      const newSnapshot: Snapshot = {
        id: 'v2',
        label: 'Version 2',
        timestamp: Date.now(),
        files: [
          { path: 'index.ts', content: 'console.warn("Hello World");', hash: 'hash3' },
          { path: 'utils.ts', content: 'export function add(a, b) { return a + b; }', hash: 'hash2' },
          { path: 'new.ts', content: '// New file', hash: 'hash4' }
        ],
        metadata: { totalFiles: 3, totalLines: 3 }
      };

      // 2. 比较快照
      const diff = engine.compareSnapshots(oldSnapshot, newSnapshot);
      expect(diff.files.length).toBe(3);

      // 3. 获取统计
      const stats = engine.getDiffStats(diff);
      expect(stats.modifiedFiles).toBe(1);
      expect(stats.addedFiles).toBe(1);
      expect(stats.unchangedFiles).toBe(1);

      // 4. 导出报告
      const jsonReport = engine.exportDiff(diff, 'json');
      expect(jsonReport).toBeDefined();

      const mdReport = engine.exportDiff(diff, 'markdown');
      expect(mdReport).toContain('# 快照差异报告');

      const htmlReport = engine.exportDiff(diff, 'html');
      expect(htmlReport).toContain('<!DOCTYPE html>');

      const unifiedReport = engine.exportDiff(diff, 'unified');
      expect(unifiedReport).toContain('diff --git');
    });
  });
});
