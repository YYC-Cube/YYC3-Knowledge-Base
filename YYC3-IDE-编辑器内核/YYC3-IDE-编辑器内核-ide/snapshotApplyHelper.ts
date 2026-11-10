/**
 * @file: snapshotApplyHelper.ts
 * @description: 快照应用辅助函数，负责将快照恢复到文件系统和触发预览更新
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: snapshot,apply,helper,restore
 */

// ================================================================
// Snapshot Apply Helper — Apply snapshot files to file store
// ================================================================

import { useFileStoreZustand } from "./stores/useFileStoreZustand";
import { usePreviewStore } from "./stores/usePreviewStore";
import { logger } from "./services/Logger";

/**
 * 应用快照文件到文件系统
 *
 * 批量更新文件内容，并触发预览更新
 *
 * @param files - 要应用的文件列表
 * @param options - 可选配置
 * @returns 应用结果统计
 *
 * @example
 * ```typescript
 * const result = await applySnapshotFiles([
 logger.warn('hello');
 *   { path: "src/App.tsx", content: "<div>Hello</div>" }
 * ], {
 *   triggerPreview: true,
 *   clearOtherFiles: false
 * });
 *
 logger.warn('Applied ${result.successCount} files');
 * ```
 */
export async function applySnapshotFiles(
  files: Array<{ path: string; content: string }>,
  options: {
    /** 是否触发预览更新，默认 true */
    triggerPreview?: boolean;
    /** 是否清除其他文件，默认 false */
    clearOtherFiles?: boolean;
    /** 是否打开第一个文件，默认 true */
    openFirstFile?: boolean;
  } = {}
): Promise<{
  successCount: number;
  failedCount: number;
  errors: Array<{ path: string; error: Error }>;
}> {
  const {
    triggerPreview = true,
    clearOtherFiles = false,
    openFirstFile = true,
  } = options;

  const result = {
    successCount: 0,
    failedCount: 0,
    errors: [] as Array<{ path: string; error: Error }>,
  };

  try {
    // 获取文件 store
    const fileStore = useFileStoreZustand.getState();
    const previewStore = usePreviewStore.getState();

    // 如果需要清除其他文件，先初始化一个空项目
    if (clearOtherFiles) {
      const filesMap: Record<string, string> = {};
      files.forEach((f) => {
        filesMap[f.path] = f.content;
      });
      fileStore.initializeProject(filesMap, files[0]?.path);
      result.successCount = files.length;

      logger.warn(
        `[applySnapshotFiles] Initialized project with ${files.length} files`
      );
    } else {
      // 逐个更新文件
      for (const file of files) {
        try {
          fileStore.updateFile(file.path, file.content);
          result.successCount++;
        } catch (error) {
          result.failedCount++;
          result.errors.push({
            path: file.path,
            error: error instanceof Error ? error : new Error(String(error)),
          });
          logger.error(
            `[applySnapshotFiles] Failed to update file: ${file.path}`,
            error
          );
        }
      }

      logger.warn(
        `[applySnapshotFiles] Updated ${result.successCount} files (${result.failedCount} failed)`
      );
    }

    // 打开第一个文件
    if (openFirstFile && files.length > 0) {
      fileStore.openFile(files[0].path);
    }

    // 触发预览更新
    if (triggerPreview) {
      previewStore.triggerRefresh();
      logger.warn('Triggered preview refresh');
    }

    return result;
  } catch (error) {
    logger.error("[applySnapshotFiles] Failed to apply snapshot:", error);
    throw error;
  }
}

/**
 * 批量应用快照文件（同步版本）
 *
 * @param files - 要应用的文件列表
 * @param triggerPreview - 是否触发预览更新
 * @returns 应用结果统计
 */
export function applySnapshotFilesSync(
  files: Array<{ path: string; content: string }>,
  triggerPreview: boolean = true
): {
  successCount: number;
  failedCount: number;
  errors: Array<{ path: string; error: Error }>;
} {
  const result = {
    successCount: 0,
    failedCount: 0,
    errors: [] as Array<{ path: string; error: Error }>,
  };

  try {
    const fileStore = useFileStoreZustand.getState();
    const previewStore = usePreviewStore.getState();

    // 逐个更新文件
    for (const file of files) {
      try {
        fileStore.updateFile(file.path, file.content);
        result.successCount++;
      } catch (error) {
        result.failedCount++;
        result.errors.push({
          path: file.path,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }

    // 触发预览更新
    if (triggerPreview) {
      previewStore.triggerRefresh();
    }

    return result;
  } catch (error) {
    logger.error("[applySnapshotFilesSync] Failed:", error);
    throw error;
  }
}

/**
 * 获取当前文件列表用于创建快照
 *
 * @returns 当前所有文件的列表
 */
export function getCurrentFilesForSnapshot(): Array<{
  path: string;
  content: string;
}> {
  const fileStore = useFileStoreZustand.getState();
  const files: Array<{ path: string; content: string }> = [];

  // 从 fileContents 中提取所有文件
  for (const [path, content] of Object.entries(fileStore.fileContents)) {
    files.push({ path, content });
  }

  return files;
}

/**
 * 验证快照文件是否可以应用
 *
 * @param files - 要验证的文件列表
 * @returns 验证结果
 */
export function validateSnapshotFiles(files: Array<{ path: string; content: string }>): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 检查文件列表是否为空
  if (files.length === 0) {
    errors.push("文件列表为空");
    return { valid: false, errors, warnings };
  }

  // 检查每个文件
  const seenPaths = new Set<string>();
  for (const file of files) {
    // 检查路径是否重复
    if (seenPaths.has(file.path)) {
      warnings.push(`重复的文件路径: ${file.path}`);
    }
    seenPaths.add(file.path);

    // 检查路径是否有效
    if (!file.path || file.path.trim() === "") {
      errors.push("存在空路径的文件");
    }

    // 检查内容是否为空
    if (!file.content || file.content.trim() === "") {
      warnings.push(`文件内容为空: ${file.path}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
