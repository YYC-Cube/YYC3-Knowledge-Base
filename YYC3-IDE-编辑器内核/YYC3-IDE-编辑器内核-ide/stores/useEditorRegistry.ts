/**
 * @file: useEditorRegistry.ts
 * @description: Monaco 编辑器实例注册表，支持跨组件行跳转和光标定位
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-17
 * @updated: 2026-04-17
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: store,monaco,editor,registry,navigation
 */

import { create } from "zustand";

export interface EditorHandle {
  revealLine: (line: number, column?: number) => void;
  getPosition: () => { line: number; column: number } | null;
  focus: () => void;
}

interface EditorRegistryState {
  editors: Map<string, EditorHandle>;
  registerEditor: (filePath: string, handle: EditorHandle) => void;
  unregisterEditor: (filePath: string) => void;
  revealLine: (filePath: string, line: number, column?: number) => boolean;
  focusEditor: (filePath: string) => boolean;
}

export const useEditorRegistry = create<EditorRegistryState>()((set, get) => ({
  editors: new Map(),

  registerEditor: (filePath, handle) => {
    set((state) => {
      const next = new Map(state.editors);
      next.set(filePath, handle);
      return { editors: next };
    });
  },

  unregisterEditor: (filePath) => {
    set((state) => {
      const next = new Map(state.editors);
      next.delete(filePath);
      return { editors: next };
    });
  },

  revealLine: (filePath, line, column) => {
    const handle = get().editors.get(filePath);
    if (!handle) return false;
    handle.revealLine(line, column);
    handle.focus();
    return true;
  },

  focusEditor: (filePath) => {
    const handle = get().editors.get(filePath);
    if (!handle) return false;
    handle.focus();
    return true;
  },
}));
