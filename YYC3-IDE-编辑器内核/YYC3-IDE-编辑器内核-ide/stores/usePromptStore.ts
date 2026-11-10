/**
 * @file: usePromptStore.ts
 * @description: 非阻塞式输入对话框 Store — 替代原生 prompt() 的 Promise 化方案
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-17
 * @updated: 2026-04-17
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: store,prompt,dialog,ux
 */

import { create } from "zustand";

export interface PromptDialog {
  id: string;
  title: string;
  message: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel: string;
  cancelLabel: string;
  pattern?: RegExp;
  patternError?: string;
  resolve: (value: string | null) => void;
}

interface PromptState {
  dialogs: PromptDialog[];
  openPrompt: (options?: {
    title?: string;
    message?: string;
    placeholder?: string;
    defaultValue?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    pattern?: RegExp;
    patternError?: string;
  }) => Promise<string | null>;
  resolveDialog: (id: string, value: string | null) => void;
}

let dialogCounter = 0;

export const usePromptStore = create<PromptState>()((set, get) => ({
  dialogs: [],

  openPrompt: (options = {}) => {
    return new Promise<string | null>((resolve) => {
      const id = `prompt-${++dialogCounter}-${Date.now()}`;
      const dialog: PromptDialog = {
        id,
        title: options.title ?? "请输入",
        message: options.message ?? "",
        placeholder: options.placeholder ?? "",
        defaultValue: options.defaultValue ?? "",
        confirmLabel: options.confirmLabel ?? "确定",
        cancelLabel: options.cancelLabel ?? "取消",
        pattern: options.pattern,
        patternError: options.patternError,
        resolve,
      };
      set((state) => ({
        dialogs: [...state.dialogs, dialog],
      }));
    });
  },

  resolveDialog: (id, value) => {
    const dialog = get().dialogs.find((d) => d.id === id);
    if (dialog) {
      dialog.resolve(value);
      set((state) => ({
        dialogs: state.dialogs.filter((d) => d.id !== id),
      }));
    }
  },
}));
