/**
 * @file: hooks/useLargeFileContent.ts
 * @description: 大文件惰性加载 Hook - 自动检测文件内容是否为占位符，
 *              从 IndexedDB 惰性加载实际内容，避免大文件长期占用内存
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-06-04
 * @updated: 2026-06-04
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: hooks,lazy-load,large-file,indexeddb
 */

import { useState, useEffect, useCallback } from "react";
import {
  useFileStoreZustand,
  selectFileContents,
  selectActiveFile,
  isLazyLoadPlaceholder,
  loadLargeFileContent,
} from "../stores/useFileStoreZustand";

interface UseLargeFileContentResult {
  /** 文件实际内容（惰性加载后返回真实内容） */
  content: string | null;
  /** 是否正在从 IndexedDB 加载 */
  loading: boolean;
  /** 加载过程中发生的错误 */
  error: Error | null;
  /** 手动重新加载 */
  reload: () => Promise<void>;
  /** 文件是否为惰性加载的大文件 */
  isLazy: boolean;
}

/**
 * useLargeFileContent - 获取文件内容，自动处理惰性加载的大文件
 *
 * @param filePath - 文件路径，不传则使用当前 activeFile
 * @returns {UseLargeFileContentResult} 文件内容与加载状态
 *
 * @example
 * ```tsx
 * const { content, loading, error } = useLargeFileContent('src/large-file.ts');
 * if (loading) return <Spinner />;
 * return <pre>{content}</pre>;
 * ```
 */
export function useLargeFileContent(filePath?: string): UseLargeFileContentResult {
  const fileContents = useFileStoreZustand(selectFileContents);
  const activeFile = useFileStoreZustand(selectActiveFile);
  const targetPath = filePath ?? activeFile;

  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const rawContent = fileContents[targetPath] ?? null;
  const isLazy = rawContent ? isLazyLoadPlaceholder(rawContent) : false;

  const loadContent = useCallback(async () => {
    // 如果内存中已有真实内容，直接使用
    if (rawContent && !isLazyLoadPlaceholder(rawContent)) {
      setContent(rawContent);
      setLoading(false);
      setError(null);
      return;
    }

    // 尝试从 IndexedDB 惰性加载
    if (isLazy) {
      setLoading(true);
      setError(null);
      try {
        const loaded = await loadLargeFileContent(targetPath);
        if (loaded !== null) {
          setContent(loaded);
        } else {
          // 回退到占位符作为内容展示
          setContent(rawContent);
        }
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        setContent(rawContent);
      } finally {
        setLoading(false);
      }
    } else {
      setContent(rawContent);
      setLoading(false);
    }
  }, [rawContent, isLazy, targetPath]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  return {
    content,
    loading,
    error,
    reload: loadContent,
    isLazy,
  };
}
