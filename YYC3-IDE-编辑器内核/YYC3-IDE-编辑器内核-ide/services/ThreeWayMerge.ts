/**
 * @file: services/ThreeWayMerge.ts
 * @description: 三路合并（3-way merge）引擎 — 基于 base/local/remote 三个版本
 *              智能合并文件变更，自动解决非冲突区域，标记冲突区域供手动解决
 *              利用 MyersDiff 算法计算精确差异，支持行级和字符级合并
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v2.0.0
 * @created: 2026-04-17
 * @updated: 2026-04-17
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: merge,3-way,diff,conflict,resolution
 */

import { MyersDiff } from "../snapshot/MyersDiff";

// ── Types ──

export type ConflictSide = "local" | "remote" | "both" | "manual";

export interface MergeRegion {
  type: "clean" | "conflict";
  content: string;
  source: "base" | "local" | "remote" | "merged";
  localRange?: { start: number; end: number };
  remoteRange?: { start: number; end: number };
  baseRange?: { start: number; end: number };
}

export interface MergeConflict {
  id: string;
  filePath: string;
  regions: MergeRegion[];
  localContent: string;
  remoteContent: string;
  baseContent: string;
  resolved: boolean;
  resolution?: ConflictResolution;
}

export interface ConflictResolution {
  conflictId: string;
  side: ConflictSide;
  customContent?: string;
}

export interface MergeResult {
  success: boolean;
  content: string;
  hasConflicts: boolean;
  conflicts: MergeConflict[];
  stats: MergeStats;
}

export interface MergeStats {
  totalRegions: number;
  cleanMerges: number;
  conflicts: number;
  localOnlyChanges: number;
  remoteOnlyChanges: number;
  bothChanged: number;
  similarity: number;
}

interface LineChange {
  type: "add" | "delete" | "equal" | "modify";
  oldStart: number;
  oldEnd: number;
  newStart: number;
  newEnd: number;
  content: string[];
}

// ── ThreeWayMerge Engine ──

export class ThreeWayMerge {
  private differ: MyersDiff;

  constructor() {
    this.differ = new MyersDiff();
  }

  merge(
    baseContent: string,
    localContent: string,
    remoteContent: string,
    filePath?: string,
  ): MergeResult {
    if (localContent === remoteContent) {
      return {
        success: true,
        content: localContent,
        hasConflicts: false,
        conflicts: [],
        stats: {
          totalRegions: 1,
          cleanMerges: 1,
          conflicts: 0,
          localOnlyChanges: 0,
          remoteOnlyChanges: 0,
          bothChanged: 0,
          similarity: 1,
        },
      };
    }

    if (localContent === baseContent) {
      return {
        success: true,
        content: remoteContent,
        hasConflicts: false,
        conflicts: [],
        stats: {
          totalRegions: 1,
          cleanMerges: 1,
          conflicts: 0,
          localOnlyChanges: 0,
          remoteOnlyChanges: 1,
          bothChanged: 0,
          similarity: 0,
        },
      };
    }

    if (remoteContent === baseContent) {
      return {
        success: true,
        content: localContent,
        hasConflicts: false,
        conflicts: [],
        stats: {
          totalRegions: 1,
          cleanMerges: 1,
          conflicts: 0,
          localOnlyChanges: 1,
          remoteOnlyChanges: 0,
          bothChanged: 0,
          similarity: 0,
        },
      };
    }

    const localDiff = this.computeLineChanges(baseContent, localContent);
    const remoteDiff = this.computeLineChanges(baseContent, remoteContent);

    const { regions, conflicts } = this.mergeChanges(
      localDiff,
      remoteDiff,
      baseContent,
      localContent,
      remoteContent,
      filePath,
    );

    const content = this.buildMergedContent(regions);
    const stats = this.computeStats(regions, localDiff, remoteDiff);

    return {
      success: conflicts.length === 0,
      content,
      hasConflicts: conflicts.length > 0,
      conflicts,
      stats,
    };
  }

  resolveConflict(
    conflict: MergeConflict,
    resolution: ConflictResolution,
  ): string {
    let resolvedContent: string;

    switch (resolution.side) {
      case "local":
        resolvedContent = conflict.localContent;
        break;
      case "remote":
        resolvedContent = conflict.remoteContent;
        break;
      case "both":
        resolvedContent = this.mergeBothSides(conflict);
        break;
      case "manual":
        resolvedContent = resolution.customContent || "";
        break;
      default:
        resolvedContent = conflict.localContent;
    }

    conflict.resolved = true;
    conflict.resolution = resolution;

    return resolvedContent;
  }

  private mergeBothSides(conflict: MergeConflict): string {
    const localLines = conflict.localContent.split('\n');
    const remoteLines = conflict.remoteContent.split('\n');
    const merged: string[] = [];
    const seen = new Set<string>();

    for (const line of localLines) {
      merged.push(line);
      seen.add(line.trim());
    }

    for (const line of remoteLines) {
      if (!seen.has(line.trim())) {
        merged.push(line);
      }
    }

    return merged.join('\n');
  }

  private computeLineChanges(oldText: string, newText: string): LineChange[] {
    const diffResult = this.differ.diff(oldText, newText, {
      charLevel: false,
      maxLines: 10000,
    });

    const changes: LineChange[] = [];
    let currentChange: LineChange | null = null;

    for (const block of diffResult.blocks) {
      const changeType = this.mapDiffType(block.type);

      if (currentChange && currentChange.type === changeType) {
        currentChange.content.push(block.content);
        if (changeType !== "equal") {
          currentChange.oldEnd = (block.oldLineNumber || currentChange.oldEnd) + 1;
          currentChange.newEnd = (block.newLineNumber || currentChange.newEnd) + 1;
        }
      } else {
        if (currentChange) {
          changes.push(currentChange);
        }
        currentChange = {
          type: changeType,
          oldStart: (block.oldLineNumber ?? 1) - 1,
          oldEnd: block.oldLineNumber ?? 1,
          newStart: (block.newLineNumber ?? 1) - 1,
          newEnd: block.newLineNumber ?? 1,
          content: [block.content],
        };
      }
    }

    if (currentChange) {
      changes.push(currentChange);
    }

    return changes;
  }

  private mapDiffType(diffType: string): LineChange["type"] {
    switch (diffType) {
      case "add": return "add";
      case "delete": return "delete";
      case "equal": return "equal";
      default: return "equal";
    }
  }

  private mergeChanges(
    localChanges: LineChange[],
    remoteChanges: LineChange[],
    baseContent: string,
    localContent: string,
    remoteContent: string,
    filePath?: string,
  ): { regions: MergeRegion[]; conflicts: MergeConflict[] } {
    const baseLines = baseContent.split('\n');
    const regions: MergeRegion[] = [];
    const conflicts: MergeConflict[] = [];

    const localNonEqual = localChanges.filter(c => c.type !== "equal");
    const remoteNonEqual = remoteChanges.filter(c => c.type !== "equal");

    const localRanges = this.buildRanges(localNonEqual, baseLines.length);
    const remoteRanges = this.buildRanges(remoteNonEqual, baseLines.length);

    const overlappingRanges = this.findOverlaps(localRanges, remoteRanges);

    let basePos = 0;

    const allEvents = this.buildMergeEvents(localRanges, remoteRanges, overlappingRanges, baseLines, localContent, remoteContent);

    for (const event of allEvents) {
      if (event.type === "gap" && event.end != null) {
        if (event.end > basePos) {
          const gapContent = baseLines.slice(basePos, event.end).join('\n');
          if (gapContent) {
            regions.push({
              type: "clean",
              content: gapContent,
              source: "base",
              baseRange: { start: basePos, end: event.end },
            });
          }
        }
        basePos = event.end;
      } else if (event.type === "local-only" && event.content != null && event.range) {
        regions.push({
          type: "clean",
          content: event.content,
          source: "local",
          localRange: event.range,
        });
        basePos = event.range.end;
      } else if (event.type === "remote-only" && event.content != null && event.range) {
        regions.push({
          type: "clean",
          content: event.content,
          source: "remote",
          remoteRange: event.range,
        });
        basePos = event.range.end;
      } else if (event.type === "conflict") {
        const conflictId = `conflict-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        const localPart = event.localContent || "";
        const remotePart = event.remoteContent || "";
        const basePart = event.baseContent || "";

        regions.push({
          type: "conflict",
          content: this.formatConflictMarkers(localPart, remotePart),
          source: "merged",
          localRange: event.localRange,
          remoteRange: event.remoteRange,
          baseRange: event.baseRange,
        });

        conflicts.push({
          id: conflictId,
          filePath: filePath || "",
          regions: [
            { type: "clean", content: basePart, source: "base" },
            { type: "conflict", content: localPart, source: "local" },
            { type: "conflict", content: remotePart, source: "remote" },
          ],
          localContent: localPart,
          remoteContent: remotePart,
          baseContent: basePart,
          resolved: false,
        });

        basePos = Math.max(
          event.baseRange?.end ?? basePos,
          event.localRange?.end ?? basePos,
          event.remoteRange?.end ?? basePos,
        );
      }
    }

    if (basePos < baseLines.length) {
      const remaining = baseLines.slice(basePos).join('\n');
      if (remaining) {
        regions.push({
          type: "clean",
          content: remaining,
          source: "base",
          baseRange: { start: basePos, end: baseLines.length },
        });
      }
    }

    return { regions, conflicts };
  }

  private formatConflictMarkers(localContent: string, remoteContent: string): string {
    const parts: string[] = [];
    parts.push("<<<<<<< LOCAL");
    if (localContent) parts.push(localContent);
    parts.push("=======");
    if (remoteContent) parts.push(remoteContent);
    parts.push(">>>>>>> REMOTE");
    return parts.join('\n');
  }

  private buildRanges(changes: LineChange[], totalLines: number): Array<{
    start: number;
    end: number;
    content: string;
    changeType: LineChange["type"];
  }> {
    return changes.map(c => ({
      start: c.oldStart,
      end: c.oldEnd,
      content: c.content.join('\n'),
      changeType: c.type,
    }));
  }

  private findOverlaps(
    localRanges: Array<{ start: number; end: number; content: string; changeType: LineChange["type"] }>,
    remoteRanges: Array<{ start: number; end: number; content: string; changeType: LineChange["type"] }>,
  ): Array<{
    localIndex: number;
    remoteIndex: number;
    type: "overlap" | "adjacent";
  }> {
    const overlaps: Array<{
      localIndex: number;
      remoteIndex: number;
      type: "overlap" | "adjacent";
    }> = [];

    for (let li = 0; li < localRanges.length; li++) {
      for (let ri = 0; ri < remoteRanges.length; ri++) {
        const lr = localRanges[li];
        const rr = remoteRanges[ri];

        if (lr.start < rr.end && rr.start < lr.end) {
          overlaps.push({ localIndex: li, remoteIndex: ri, type: "overlap" });
        } else if (lr.end === rr.start || rr.end === lr.start) {
          overlaps.push({ localIndex: li, remoteIndex: ri, type: "adjacent" });
        }
      }
    }

    return overlaps;
  }

  private buildMergeEvents(
    localRanges: Array<{ start: number; end: number; content: string; changeType: LineChange["type"] }>,
    remoteRanges: Array<{ start: number; end: number; content: string; changeType: LineChange["type"] }>,
    overlaps: Array<{ localIndex: number; remoteIndex: number; type: "overlap" | "adjacent" }>,
    baseLines: string[],
    localContent: string,
    remoteContent: string,
  ): Array<MergeEvent> {
    const events: MergeEvent[] = [];
    const conflictLocalIndices = new Set(overlaps.map(o => o.localIndex));
    const conflictRemoteIndices = new Set(overlaps.map(o => o.remoteIndex));

    const allPositions: Array<{ pos: number; source: "local" | "remote"; index: number }> = [];

    for (let i = 0; i < localRanges.length; i++) {
      allPositions.push({ pos: localRanges[i].start, source: "local", index: i });
    }
    for (let i = 0; i < remoteRanges.length; i++) {
      allPositions.push({ pos: remoteRanges[i].start, source: "remote", index: i });
    }

    allPositions.sort((a, b) => a.pos - b.pos);

    let lastPos = 0;

    for (const entry of allPositions) {
      if (entry.pos > lastPos) {
        events.push({ type: "gap", end: entry.pos });
      }

      if (entry.source === "local" && !conflictLocalIndices.has(entry.index)) {
        const range = localRanges[entry.index];
        events.push({
          type: "local-only",
          content: range.content,
          range: { start: range.start, end: range.end },
        });
        lastPos = range.end;
      } else if (entry.source === "remote" && !conflictRemoteIndices.has(entry.index)) {
        const range = remoteRanges[entry.index];
        events.push({
          type: "remote-only",
          content: range.content,
          range: { start: range.start, end: range.end },
        });
        lastPos = range.end;
      } else if (entry.source === "local" && conflictLocalIndices.has(entry.index)) {
        const localRange = localRanges[entry.index];
        const overlap = overlaps.find(o => o.localIndex === entry.index);
        if (overlap) {
          const remoteRange = remoteRanges[overlap.remoteIndex];

          if (localRange.content === remoteRange.content) {
            events.push({
              type: "local-only",
              content: localRange.content,
              range: { start: localRange.start, end: localRange.end },
            });
          } else {
            events.push({
              type: "conflict",
              localContent: localRange.content,
              remoteContent: remoteRange.content,
              baseContent: baseLines.slice(localRange.start, Math.max(localRange.end, remoteRange.end)).join('\n'),
              localRange: { start: localRange.start, end: localRange.end },
              remoteRange: { start: remoteRange.start, end: remoteRange.end },
              baseRange: {
                start: Math.min(localRange.start, remoteRange.start),
                end: Math.max(localRange.end, remoteRange.end),
              },
            });
          }

          lastPos = Math.max(localRange.end, remoteRange.end);
          conflictLocalIndices.delete(entry.index);
          conflictRemoteIndices.delete(overlap.remoteIndex);
        }
      }
    }

    if (lastPos < baseLines.length) {
      events.push({ type: "gap", end: baseLines.length });
    }

    return events;
  }

  private buildMergedContent(regions: MergeRegion[]): string {
    return regions.map(r => r.content).join('\n');
  }

  private computeStats(
    regions: MergeRegion[],
    localChanges: LineChange[],
    remoteChanges: LineChange[],
  ): MergeStats {
    const totalRegions = regions.length;
    const cleanMerges = regions.filter(r => r.type === "clean").length;
    const conflicts = regions.filter(r => r.type === "conflict").length;

    const localOnlyChanges = localChanges.filter(c => c.type !== "equal").length;
    const remoteOnlyChanges = remoteChanges.filter(c => c.type !== "equal").length;

    const bothChanged = conflicts;

    const totalLines = regions.reduce((sum, r) => sum + r.content.split('\n').length, 0);
    const cleanLines = regions
      .filter(r => r.type === "clean")
      .reduce((sum, r) => sum + r.content.split('\n').length, 0);
    const similarity = totalLines > 0 ? cleanLines / totalLines : 1;

    return {
      totalRegions,
      cleanMerges,
      conflicts,
      localOnlyChanges,
      remoteOnlyChanges,
      bothChanged,
      similarity,
    };
  }
}

// ── Merge Event (internal) ──

interface MergeEvent {
  type: "gap" | "local-only" | "remote-only" | "conflict";
  end?: number;
  content?: string;
  range?: { start: number; end: number };
  localContent?: string;
  remoteContent?: string;
  baseContent?: string;
  localRange?: { start: number; end: number };
  remoteRange?: { start: number; end: number };
  baseRange?: { start: number; end: number };
}

// ── Singleton ──

let globalMerger: ThreeWayMerge | null = null;

export function getThreeWayMerger(): ThreeWayMerge {
  if (!globalMerger) {
    globalMerger = new ThreeWayMerge();
  }
  return globalMerger;
}

export function performMerge(
  baseContent: string,
  localContent: string,
  remoteContent: string,
  filePath?: string,
): MergeResult {
  return getThreeWayMerger().merge(baseContent, localContent, remoteContent, filePath);
}
