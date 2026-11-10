/**
 * @file: MyersDiff.ts
 * @description: Myers Diff算法实现，提供高效的文本差异计算，支持行级和字符级差异检测
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: diff,myers,algorithm,text-comparison
 */

// ================================================================
// MyersDiff — Myers差异算法实现
// 基于Eugene W. Myers的O(ND)差异算法
// ================================================================

/**
 * 差异类型
 */
export type DiffType = 'add' | 'delete' | 'equal';

/**
 * 差异块
 */
export interface DiffBlock {
  /** 差异类型 */
  type: DiffType;
  /** 内容 */
  content: string;
  /** 旧行号（删除和相等时有） */
  oldLineNumber?: number;
  /** 新行号（新增和相等时有） */
  newLineNumber?: number;
  /** 旧内容的字符级差异（可选） */
  charDiffs?: CharDiff[];
}

/**
 * 字符级差异
 */
export interface CharDiff {
  type: 'add' | 'delete' | 'equal';
  content: string;
  startInLine: number;
  length: number;
}

/**
 * 差异结果
 */
export interface DiffResult {
  /** 差异块列表 */
  blocks: DiffBlock[];
  /** 新增行数 */
  additions: number;
  /** 删除行数 */
  deletions: number;
  /** 相等行数 */
  equals: number;
  /** 总行数 */
  totalLines: number;
  /** 相似度 (0-1) */
  similarity: number;
}

/**
 * 编辑操作
 */
interface Edit {
  type: DiffType;
  oldStart: number;
  oldEnd: number;
  newStart: number;
  newEnd: number;
}

/**
 * Myers Diff算法实现
 */
export class MyersDiff {
  /**
   * 比较两个文本
   */
  public diff(oldText: string, newText: string, options?: {
    /** 是否启用字符级差异 */
    charLevel?: boolean;
    /** 最大处理行数（性能优化） */
    maxLines?: number;
  }): DiffResult {
    const charLevel = options?.charLevel ?? true;
    const maxLines = options?.maxLines ?? 10000;

    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');

    // 性能优化：超大文件使用简化算法
    if (oldLines.length > maxLines || newLines.length > maxLines) {
      return this.simpleDiff(oldLines, newLines);
    }

    // 使用Myers算法计算编辑序列
    const edits = this.myers(oldLines, newLines);

    // 转换为差异块
    const blocks = this.editsToBlocks(edits, oldLines, newLines, charLevel);

    // 统计
    const additions = blocks.filter(b => b.type === 'add').length;
    const deletions = blocks.filter(b => b.type === 'delete').length;
    const equals = blocks.filter(b => b.type === 'equal').length;
    const totalLines = additions + deletions + equals;

    // 计算相似度
    const similarity = totalLines > 0 ? equals / totalLines : 1;

    return {
      blocks,
      additions,
      deletions,
      equals,
      totalLines,
      similarity
    };
  }

  /**
   * Myers算法核心
   * 计算最短编辑脚本（SES）
   */
  private myers(oldLines: string[], newLines: string[]): Edit[] {
    const N = oldLines.length;
    const M = newLines.length;
    const MAX = N + M;
    const V: Map<number, number> = new Map();
    const trace: Map<number, number>[] = [];

    V.set(1, 0);

    for (let D = 0; D <= MAX; D++) {
      trace.push(new Map(V));

      for (let k = -D; k <= D; k += 2) {
        let x: number;

        if (k === -D || (k !== D && (V.get(k - 1) || 0) < (V.get(k + 1) || 0))) {
          x = V.get(k + 1) || 0;
        } else {
          x = (V.get(k - 1) || 0) + 1;
        }

        let y = x - k;

        while (x < N && y < M && oldLines[x] === newLines[y]) {
          x++;
          y++;
        }

        V.set(k, x);

        if (x >= N && y >= M) {
          // 找到解，回溯生成编辑序列
          return this.backtrack(trace, oldLines, newLines);
        }
      }
    }

    return [];
  }

  /**
   * 回溯生成编辑序列
   */
  private backtrack(
    trace: Map<number, number>[],
    oldLines: string[],
    newLines: string[]
  ): Edit[] {
    const edits: Edit[] = [];
    let x = oldLines.length;
    let y = newLines.length;

    for (let D = trace.length - 1; D > 0; D--) {
      const _v = trace[D];
      const k = x - y;
      const prevV = trace[D - 1];

      let prevK: number;
      if (k === -D || (k !== D && (prevV.get(k - 1) || 0) < (prevV.get(k + 1) || 0))) {
        prevK = k + 1;
      } else {
        prevK = k - 1;
      }

      const prevX = prevV.get(prevK) || 0;
      const prevY = prevX - prevK;

      while (x > prevX && y > prevY) {
        edits.unshift({
          type: 'equal',
          oldStart: x - 1,
          oldEnd: x,
          newStart: y - 1,
          newEnd: y
        });
        x--;
        y--;
      }

      if (D > 0) {
        if (x === prevX) {
          // 新增
          edits.unshift({
            type: 'add',
            oldStart: x,
            oldEnd: x,
            newStart: prevY,
            newEnd: y
          });
        } else {
          // 删除
          edits.unshift({
            type: 'delete',
            oldStart: prevX,
            oldEnd: x,
            newStart: y,
            newEnd: y
          });
        }
      }

      x = prevX;
      y = prevY;
    }

    return edits;
  }

  /**
   * 编辑序列转差异块
   */
  private editsToBlocks(
    edits: Edit[],
    oldLines: string[],
    newLines: string[],
    charLevel: boolean
  ): DiffBlock[] {
    const blocks: DiffBlock[] = [];

    for (const edit of edits) {
      if (edit.type === 'equal') {
        for (let i = edit.oldStart; i < edit.oldEnd; i++) {
          blocks.push({
            type: 'equal',
            content: oldLines[i],
            oldLineNumber: i + 1,
            newLineNumber: edit.newStart + (i - edit.oldStart) + 1
          });
        }
      } else if (edit.type === 'add') {
        for (let i = edit.newStart; i < edit.newEnd; i++) {
          blocks.push({
            type: 'add',
            content: newLines[i],
            newLineNumber: i + 1
          });
        }
      } else if (edit.type === 'delete') {
        for (let i = edit.oldStart; i < edit.oldEnd; i++) {
          blocks.push({
            type: 'delete',
            content: oldLines[i],
            oldLineNumber: i + 1
          });
        }
      }
    }

    // 合并连续的删除和新增为修改块（如果启用字符级差异）
    if (charLevel) {
      this.mergeAndAddCharDiffs(blocks, oldLines, newLines);
    }

    return blocks;
  }

  /**
   * 合并删除和新增为修改，并添加字符级差异
   */
  private mergeAndAddCharDiffs(
    blocks: DiffBlock[],
    oldLines: string[],
    newLines: string[]
  ): void {
    let i = 0;
    while (i < blocks.length - 1) {
      const current = blocks[i];
      const next = blocks[i + 1];

      // 检查是否是连续的删除和新增
      if (current.type === 'delete' && next.type === 'add') {
        // 计算字符级差异
        const charDiffs = this.computeCharDiff(current.content, next.content);

        // 标记为修改
        current.charDiffs = charDiffs;
        next.charDiffs = charDiffs;
      }

      i++;
    }
  }

  /**
   * 计算字符级差异
   */
  private computeCharDiff(oldLine: string, newLine: string): CharDiff[] {
    const oldChars = oldLine.split('');
    const newChars = newLine.split('');
    const charDiffs: CharDiff[] = [];

    // 使用LCS算法计算字符差异
    const lcs = this.lcs(oldChars, newChars);

    let oi = 0, ni = 0, li = 0;
    while (oi < oldChars.length || ni < newChars.length) {
      if (li < lcs.length && oi < oldChars.length && ni < newChars.length &&
          oldChars[oi] === lcs[li] && newChars[ni] === lcs[li]) {
        charDiffs.push({
          type: 'equal',
          content: lcs[li],
          startInLine: ni,
          length: 1
        });
        oi++; ni++; li++;
      } else if (oi < oldChars.length && (li >= lcs.length || oldChars[oi] !== lcs[li])) {
        charDiffs.push({
          type: 'delete',
          content: oldChars[oi],
          startInLine: oi,
          length: 1
        });
        oi++;
      } else if (ni < newChars.length && (li >= lcs.length || newChars[ni] !== lcs[li])) {
        charDiffs.push({
          type: 'add',
          content: newChars[ni],
          startInLine: ni,
          length: 1
        });
        ni++;
      } else {
        break;
      }
    }

    return this.mergeCharDiffs(charDiffs);
  }

  /**
   * 合并连续的字符差异
   */
  private mergeCharDiffs(diffs: CharDiff[]): CharDiff[] {
    if (diffs.length === 0) return [];

    const merged: CharDiff[] = [];
    let current = { ...diffs[0] };

    for (let i = 1; i < diffs.length; i++) {
      const next = diffs[i];

      if (next.type === current.type && next.startInLine === current.startInLine + current.length) {
        current.content += next.content;
        current.length += next.length;
      } else {
        merged.push(current);
        current = { ...next };
      }
    }

    merged.push(current);
    return merged;
  }

  /**
   * LCS算法
   */
  private lcs(a: string[], b: string[]): string[] {
    const m = a.length;
    const n = b.length;

    // 限制计算量
    if (m > 500 || n > 500) {
      const bSet = new Set(b);
      return a.filter(char => bSet.has(char));
    }

    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // 回溯
    const result: string[] = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        result.unshift(a[i - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    return result;
  }

  /**
   * 简化差异算法（用于超大文件）
   */
  private simpleDiff(oldLines: string[], newLines: string[]): DiffResult {
    const blocks: DiffBlock[] = [];
    const oldSet = new Set(oldLines);
    const newSet = new Set(newLines);

    // 简化：标记所有旧行为删除
    oldLines.forEach((line, i) => {
      if (!newSet.has(line)) {
        blocks.push({
          type: 'delete',
          content: line,
          oldLineNumber: i + 1
        });
      }
    });

    // 标记所有新行为新增
    newLines.forEach((line, i) => {
      if (!oldSet.has(line)) {
        blocks.push({
          type: 'add',
          content: line,
          newLineNumber: i + 1
        });
      }
    });

    const additions = blocks.filter(b => b.type === 'add').length;
    const deletions = blocks.filter(b => b.type === 'delete').length;

    return {
      blocks,
      additions,
      deletions,
      equals: Math.max(0, oldLines.length - deletions),
      totalLines: oldLines.length + newLines.length,
      similarity: 0
    };
  }

  /**
   * 性能测试
   */
  public static benchmark(size: number = 1000): {
    time: number;
    lines: number;
  } {
    const diff = new MyersDiff();

    // 生成测试数据
    const oldLines: string[] = [];
    const newLines: string[] = [];

    for (let i = 0; i < size; i++) {
      oldLines.push(`Line ${i}: Old content ${Math.random()}`);
      if (Math.random() > 0.3) {
        newLines.push(`Line ${i}: Old content ${Math.random()}`);
      } else {
        newLines.push(`Line ${i}: New content ${Math.random()}`);
      }
    }

    const start = performance.now();
    diff.diff(oldLines.join('\n'), newLines.join('\n'));
    const end = performance.now();

    return {
      time: end - start,
      lines: size
    };
  }
}

/**
 * 导出便捷函数
 */
export function createDiff(): MyersDiff {
  return new MyersDiff();
}
