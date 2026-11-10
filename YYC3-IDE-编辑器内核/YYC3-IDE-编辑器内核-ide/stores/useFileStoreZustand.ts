/**
 * @file: stores/useFileStoreZustand.ts
 * @description: Zustand + Immer 文件系统 Store，替代 FileStore.tsx Context，
 *              支持 selector 优化、immer mutation、localStorage 持久化
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.1.0
 * @created: 2026-03-08
 * @updated: 2026-03-14
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: stores,zustand,immer,files,persistence
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { getDB, type StoredFile } from "../adapters/IndexedDBAdapter";
import { FILE_CONTENTS, type FileNode } from "../fileData";
import { logger } from "../services/Logger";

// ===== Constants =====

/** 大文件阈值 - 超过此大小的文件内容将从 IndexedDB 惰性加载而不是全量保持在内存中 */
const LARGE_FILE_THRESHOLD = 500 * 1024; // 500KB

/** 大文件占位符前缀，用于标记需要 IDB 惰性加载的文件 */
const LAZY_LOAD_PLACEHOLDER = "__LAZY_LOAD__:";

// ===== Types =====
export interface OpenTab {
  path: string;
  modified: boolean;
}

export interface GitChange {
  path: string;
  status: "modified" | "added" | "deleted" | "untracked";
  staged: boolean;
}

export interface GitLogEntry {
  hash: string;
  message: string;
  author: string;
  date: string;
  branch: string;
}

export interface FileStoreState {
  // File contents
  fileContents: Record<string, string>;
  // Tabs
  openTabs: OpenTab[];
  activeFile: string;
  // Git state
  gitBranch: string;
  gitChanges: GitChange[];
  gitLog: GitLogEntry[];
}

interface FileStoreActions {
  // File operations
  updateFile: (path: string, content: string) => void;
  updateFileContent: (path: string, content: string) => Promise<void>;
  createFile: (path: string, content?: string) => void;
  deleteFile: (path: string) => void;
  renameFile: (oldPath: string, newPath: string) => void;
  moveFile: (sourcePath: string, targetPath: string) => boolean;
  copyFile: (sourcePath: string, targetPath: string) => boolean;
  moveFolder: (sourcePath: string, targetPath: string) => boolean;
  duplicateFile: (path: string) => string | null;

  // Tab operations
  setActiveFile: (path: string) => void;
  openFile: (path: string) => void;
  closeTab: (path: string) => void;
  closeOtherTabs: (path: string) => void;
  closeAllTabs: () => void;

  // Git operations
  setGitBranch: (branch: string) => void;
  stageFile: (path: string) => void;
  unstageFile: (path: string) => void;
  stageAll: () => void;
  unstageAll: () => void;
  commitChanges: (message: string) => void;

  // Format
  formatCurrentFile: () => void;

  // Project initialization (for template projects)
  initializeProject: (
    files: Record<string, string>,
    entryFile?: string,
  ) => void;

  // Computed (selector helpers)
  getFileTree: () => FileNode[];
}

// ===== Helpers =====

/**
 * 判断文件是否为惰性加载的大文件占位符
 */
function isLazyLoadPlaceholder(content: string): boolean {
  return content.startsWith(LAZY_LOAD_PLACEHOLDER);
}

/**
 * 从 IndexedDB 获取大文件实际内容
 */
async function loadLargeFileContent(path: string): Promise<string | null> {
  try {
    const db = await getDB();
    const file = await db.get("files", path);
    return (file as StoredFile | undefined)?.content ?? null;
  } catch (err) {
    logger.warn(`[lazy-load] Failed to load ${path} from IndexedDB:`, err);
    return null;
  }
}

/**
 * 判断文件内容是否超过大文件阈值，需要惰性加载
 */
function shouldLazyLoad(content: string): boolean {
  return content.length > LARGE_FILE_THRESHOLD;
}

/**
 * 创建惰性加载占位符
 */
function createLazyPlaceholder(path: string): string {
  return `${LAZY_LOAD_PLACEHOLDER}${path}`;
}

function getLang(name: string): string {
  if (name.endsWith(".tsx")) return "tsx";
  if (name.endsWith(".ts")) return "ts";
  if (name.endsWith(".jsx")) return "jsx";
  if (name.endsWith(".js")) return "js";
  if (name.endsWith(".json")) return "json";
  if (name.endsWith(".css")) return "css";
  if (name.endsWith(".html")) return "html";
  if (name.endsWith(".md")) return "md";
  return "text";
}

function buildTreeFromPaths(contents: Record<string, string>): FileNode[] {
  const root: FileNode[] = [];
  const paths = Object.keys(contents).sort();

  for (const fullPath of paths) {
    const parts = fullPath.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const partPath = parts.slice(0, i + 1).join("/");
      const isFile = i === parts.length - 1;

      const existing = current.find((n) => n.name === part);
      if (existing) {
        if (existing.type === "folder" && existing.children) {
          current = existing.children;
        }
      } else {
        const node: FileNode = {
          name: part,
          path: partPath,
          type: isFile ? "file" : "folder",
          ...(isFile ? { lang: getLang(part) } : { children: [] }),
        };
        current.push(node);
        if (!isFile && node.children) {
          current = node.children;
        }
      }
    }
  }

  return root;
}

function simpleFormat(code: string, lang: string): string {
  if (lang === "json") {
    try {
      return JSON.stringify(JSON.parse(code), null, 2);
    } catch {
      return code;
    }
  }
  const lines = code.split("\n");
  let indent = 0;
  const formatted: string[] = [];
  const openers = /[{(\[]\\s*$/;
  const closers = /^\s*[})\]]/;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      formatted.push("");
      continue;
    }
    if (closers.test(line)) indent = Math.max(0, indent - 1);
    formatted.push("  ".repeat(indent) + line);
    if (openers.test(line) && !line.startsWith("//") && !line.startsWith("*"))
      indent++;
  }

  return formatted.join("\n");
}

const INITIAL_GIT_LOG: GitLogEntry[] = [
  {
    hash: "a1b2c3d",
    message: "feat: 添加数据表格组件",
    author: "开发者",
    date: "2 小时前",
    branch: "main",
  },
  {
    hash: "e4f5g6h",
    message: "fix: 修复侧边栏导航高亮",
    author: "开发者",
    date: "5 小时前",
    branch: "main",
  },
  {
    hash: "i7j8k9l",
    message: "refactor: 重构 Header 组件",
    author: "协作者",
    date: "昨天",
    branch: "main",
  },
  {
    hash: "m0n1o2p",
    message: "chore: 初始化项目结构",
    author: "开发者",
    date: "3 天前",
    branch: "main",
  },
];

// ===== Zustand Store =====
export const useFileStoreZustand = create<FileStoreState & FileStoreActions>()(
  immer((set, get) => ({
    // ── Initial state ──
    fileContents: FILE_CONTENTS,
    openTabs: [{ path: "src/app/App.tsx", modified: false }],
    activeFile: "src/app/App.tsx",
    gitBranch: "main",
    gitChanges: [
      { path: "src/app/App.tsx", status: "modified", staged: false },
      {
        path: "src/app/components/DataTable.tsx",
        status: "added",
        staged: false,
      },
    ],
    gitLog: INITIAL_GIT_LOG,

    // ── File operations (Immer makes these clean as any)2 ──
    updateFile: (path, content) =>
      set((state) => {
        state.fileContents[path] = content;
        const tab = state.openTabs.find((t) => t.path === path);
        if (tab) tab.modified = true;
        if (!state.gitChanges.find((c) => c.path === path)) {
          state.gitChanges.push({ path, status: "modified", staged: false });
        }
      }),

    updateFileContent: async (path, content) => {
      get().updateFile(path, content);
      // Persist large content to IndexedDB asynchronously
      if (shouldLazyLoad(content)) {
        try {
          const { saveFile } = await import("../adapters/IndexedDBAdapter");
          await saveFile("default", path, content);
        } catch (err) {
          logger.warn(`[lazy-save] Failed to persist ${path}:`, err);
        }
      }
    },

    createFile: (path, content = "") =>
      set((state) => {
        state.fileContents[path] = content;
        state.gitChanges = [
          ...state.gitChanges.filter((c) => c.path !== path),
          { path, status: "untracked", staged: false },
        ];
      }),

    deleteFile: (path) =>
      set((state) => {
        delete state.fileContents[path];
        state.openTabs = state.openTabs.filter((t) => t.path !== path);
        state.gitChanges = [
          ...state.gitChanges.filter((c) => c.path !== path),
          { path, status: "deleted", staged: false },
        ];
        if (state.activeFile === path) {
          state.activeFile = "src/app/App.tsx";
        }
      }),

    renameFile: (oldPath, newPath) =>
      set((state) => {
        state.fileContents[newPath] = state.fileContents[oldPath] || "";
        delete state.fileContents[oldPath];
        state.openTabs = state.openTabs.map((t) =>
          t.path === oldPath ? { ...t, path: newPath } : t,
        );
        if (state.activeFile === oldPath) state.activeFile = newPath;
        state.gitChanges = [
          ...state.gitChanges.filter((c) => c.path !== oldPath),
          { path: oldPath, status: "deleted", staged: false },
          { path: newPath, status: "added", staged: false },
        ];
      }),

    moveFile: (sourcePath, targetPath) => {
      const state = get();
      if (!state.fileContents[sourcePath]) {
        logger.warn(`moveFile: source file not found: ${sourcePath}`);
        return false;
      }
      if (state.fileContents[targetPath]) {
        logger.warn(`moveFile: target already exists: ${targetPath}`);
        return false;
      }

      set((s) => {
        s.fileContents[targetPath] = s.fileContents[sourcePath] || "";
        delete s.fileContents[sourcePath];
        s.openTabs = s.openTabs.map((t) =>
          t.path === sourcePath ? { ...t, path: targetPath } : t,
        );
        if (s.activeFile === sourcePath) s.activeFile = targetPath;
        s.gitChanges = [
          ...s.gitChanges.filter((c) => c.path !== sourcePath),
          { path: sourcePath, status: "deleted", staged: false },
          { path: targetPath, status: "added", staged: false },
        ];
      });

      logger.warn(`moveFile: ${sourcePath} -> ${targetPath}`);
      return true;
    },

    copyFile: (sourcePath, targetPath) => {
      const state = get();
      if (!state.fileContents[sourcePath]) {
        logger.warn(`copyFile: source file not found: ${sourcePath}`);
        return false;
      }
      if (state.fileContents[targetPath]) {
        logger.warn(`copyFile: target already exists: ${targetPath}`);
        return false;
      }

      set((s) => {
        s.fileContents[targetPath] = s.fileContents[sourcePath] || "";
        s.gitChanges = [
          ...s.gitChanges.filter((c) => c.path !== targetPath),
          { path: targetPath, status: "added", staged: false },
        ];
      });

      logger.warn(`copyFile: ${sourcePath} -> ${targetPath}`);
      return true;
    },

    moveFolder: (sourcePath, targetPath) => {
      const state = get();
      const filesToMove = Object.keys(state.fileContents).filter(
        (path) => path.startsWith(sourcePath + "/") || path === sourcePath
      );

      if (filesToMove.length === 0) {
        logger.warn(`moveFolder: folder not found: ${sourcePath}`);
        return false;
      }

      set((s) => {
        for (const oldPath of filesToMove) {
          const relativePath = oldPath.slice(sourcePath.length);
          const newPath = targetPath + relativePath;

          s.fileContents[newPath] = s.fileContents[oldPath] || "";
          delete s.fileContents[oldPath];

          s.openTabs = s.openTabs.map((t) =>
            t.path === oldPath ? { ...t, path: newPath } : t,
          );

          if (s.activeFile === oldPath) s.activeFile = newPath;

          s.gitChanges = [
            ...s.gitChanges.filter((c) => c.path !== oldPath),
            { path: oldPath, status: "deleted", staged: false },
            { path: newPath, status: "added", staged: false },
          ];
        }
      });

      logger.warn(`moveFolder: ${sourcePath} -> ${targetPath} (${filesToMove.length} files)`);
      return true;
    },

    duplicateFile: (path) => {
      const state = get();
      if (!state.fileContents[path]) {
        logger.warn(`duplicateFile: file not found: ${path}`);
        return null;
      }

      const ext = path.lastIndexOf(".");
      const basePath = ext > 0 ? path.slice(0, ext) : path;
      const extension = ext > 0 ? path.slice(ext) : "";

      let newPath = `${basePath}-copy${extension}`;
      let counter = 1;
      while (state.fileContents[newPath]) {
        newPath = `${basePath}-copy-${counter}${extension}`;
        counter++;
      }

      set((s) => {
        s.fileContents[newPath] = s.fileContents[path] || "";
        s.gitChanges = [
          ...s.gitChanges.filter((c) => c.path !== newPath),
          { path: newPath, status: "added", staged: false },
        ];
      });

      logger.warn(`duplicateFile: ${path} -> ${newPath}`);
      return newPath;
    },

    // ── Tab operations ──
    setActiveFile: (path) =>
      set((state) => {
        state.activeFile = path;
        if (!state.openTabs.find((t) => t.path === path)) {
          state.openTabs.push({ path, modified: false });
        }
      }),

    openFile: (path) =>
      set((state) => {
        state.activeFile = path;
        if (!state.openTabs.find((t) => t.path === path)) {
          state.openTabs.push({ path, modified: false });
        }
      }),

    closeTab: (path) =>
      set((state) => {
        const filtered = state.openTabs.filter((t) => t.path !== path);
        if (filtered.length === 0) return; // Keep at least one tab
        state.openTabs = filtered;
        if (state.activeFile === path) {
          state.activeFile = filtered[filtered.length - 1].path;
        }
      }),

    closeOtherTabs: (path) =>
      set((state) => {
        state.openTabs = state.openTabs.filter((t) => t.path === path);
        state.activeFile = path;
      }),

    closeAllTabs: () =>
      set((state) => {
        state.openTabs = [{ path: "src/app/App.tsx", modified: false }];
        state.activeFile = "src/app/App.tsx";
      }),

    // ── Git operations ──
    setGitBranch: (branch) =>
      set((state) => {
        state.gitBranch = branch;
      }),

    stageFile: (path) =>
      set((state) => {
        const change = state.gitChanges.find((c) => c.path === path);
        if (change) change.staged = true;
      }),

    unstageFile: (path) =>
      set((state) => {
        const change = state.gitChanges.find((c) => c.path === path);
        if (change) change.staged = false;
      }),

    stageAll: () =>
      set((state) => {
        state.gitChanges.forEach((c) => {
          c.staged = true;
        });
      }),

    unstageAll: () =>
      set((state) => {
        state.gitChanges.forEach((c) => {
          c.staged = false;
        });
      }),

    commitChanges: (message) =>
      set((state) => {
        const staged = state.gitChanges.filter((c) => c.staged);
        if (staged.length === 0) return;

        state.gitLog.unshift({
          hash: Math.random().toString(36).slice(2, 9),
          message,
          author: "开发者",
          date: "刚刚",
          branch: state.gitBranch,
        });
        state.gitChanges = state.gitChanges.filter((c) => !c.staged);
        for (const tab of state.openTabs) {
          if (staged.some((s) => s.path === tab.path)) {
            tab.modified = false;
          }
        }
      }),

    // ── Format ──
    formatCurrentFile: () =>
      set((state) => {
        const { activeFile, fileContents } = state;
        const content = fileContents[activeFile];
        if (!content) return;
        const lang = getLang(activeFile.split("/").pop() || "");
        state.fileContents[activeFile] = simpleFormat(content, lang);
      }),

    // ── Project initialization (for template projects) ──
    initializeProject: (files, entryFile) =>
      set((state) => {
        // Apply lazy loading for large files
        const optimizedFiles: Record<string, string> = {};
        for (const [path, content] of Object.entries(files)) {
          optimizedFiles[path] = shouldLazyLoad(content)
            ? createLazyPlaceholder(path)
            : content;
        }
        state.fileContents = optimizedFiles;
        state.openTabs = [
          { path: entryFile || "src/app/App.tsx", modified: false },
        ];
        state.activeFile = entryFile || "src/app/App.tsx";
        state.gitBranch = "main";
        state.gitChanges = [];
        state.gitLog = INITIAL_GIT_LOG;

        // Async persist large files to IndexedDB
        for (const [path, content] of Object.entries(files)) {
          if (shouldLazyLoad(content)) {
            import("../adapters/IndexedDBAdapter").then(({ saveFile }) => {
              saveFile("default", path, content).catch((err) =>
                logger.warn(`[lazy-save] Failed to persist ${path}:`, err),
              );
            });
          }
        }
      }),

    // ── Computed ──
    getFileTree: () => buildTreeFromPaths(get().fileContents),
  })),
);

// ===== Selectors for performance (avoid re-renders) =====
export const selectFileContents = (state: FileStoreState) => state.fileContents;
export const selectOpenTabs = (state: FileStoreState) => state.openTabs;
export const selectActiveFile = (state: FileStoreState) => state.activeFile;
export const selectGitBranch = (state: FileStoreState) => state.gitBranch;
export const selectGitChanges = (state: FileStoreState) => state.gitChanges;
export const selectGitLog = (state: FileStoreState) => state.gitLog;

// ===== Large File Helpers (exported for external hooks) =====
export { createLazyPlaceholder, isLazyLoadPlaceholder, loadLargeFileContent, shouldLazyLoad };
