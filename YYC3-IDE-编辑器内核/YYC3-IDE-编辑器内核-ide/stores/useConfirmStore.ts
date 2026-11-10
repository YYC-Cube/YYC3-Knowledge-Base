/**
 * @file: useConfirmStore.ts
 * @description: 轻量级确认对话框 Store，替代 confirm() 实现非阻塞式确认交互
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-17
 * @updated: 2026-04-17
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: store,confirm,dialog,ux
 */

import { create } from "zustand";

export interface ConfirmDialog {
  id: string;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  variant: "danger" | "warning" | "default";
  resolve: (value: boolean) => void;
}

interface ConfirmState {
  dialogs: ConfirmDialog[];
  openConfirm: (options: Partial<Omit<ConfirmDialog, "id" | "resolve">>) => Promise<boolean>;
  resolveDialog: (id: string, value: boolean) => void;
}

let dialogCounter = 0;

export const useConfirmStore = create<ConfirmState>()((set, get) => ({
  dialogs: [],

  openConfirm: (options = {}) => {
    return new Promise<boolean>((resolve) => {
      const id = `confirm-${++dialogCounter}-${Date.now()}`;
      const dialog: ConfirmDialog = {
        id,
        title: options.title ?? "确认操作",
        message: options.message ?? "",
        confirmLabel: options.confirmLabel ?? "确定",
        cancelLabel: options.cancelLabel ?? "取消",
        variant: options.variant ?? "default",
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

export function confirmDialog(
  message: string,
  options?: Partial<Omit<ConfirmDialog, "id" | "resolve" | "message">>,
) {
  return useConfirmStore.getState().openConfirm({ message, ...options });
}

export function confirmDanger(
  message: string,
  title?: string,
) {
  return useConfirmStore.getState().openConfirm({
    message,
    title: title ?? "危险操作",
    variant: "danger",
    confirmLabel: "确认执行",
    cancelLabel: "取消",
  });
}

export function confirmWarning(
  message: string,
  title?: string,
) {
  return useConfirmStore.getState().openConfirm({
    message,
    title: title ?? "警告",
    variant: "warning",
    confirmLabel: "继续",
    cancelLabel: "取消",
  });
}
