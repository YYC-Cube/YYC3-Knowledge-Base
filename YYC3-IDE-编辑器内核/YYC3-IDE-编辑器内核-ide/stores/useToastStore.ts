/**
 * @file: useToastStore.ts
 * @description: 轻量级 Toast 通知系统，替代 alert() 实现非阻塞式内联通知
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-17
 * @updated: 2026-04-17
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: store,toast,notification,ux
 */

import { create } from "zustand";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  createdAt: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

let toastCounter = 0;

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],

  addToast: (type, message, duration = 4000) => {
    const id = `toast-${++toastCounter}-${Date.now()}`;
    const toast: Toast = {
      id,
      type,
      message,
      duration,
      createdAt: Date.now(),
    };

    set((state) => ({
      toasts: [...state.toasts.slice(-7), toast],
    }));

    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }

    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearAll: () => {
    set({ toasts: [] });
  },
}));

export function toast(type: ToastType, message: string, duration?: number) {
  return useToastStore.getState().addToast(type, message, duration);
}

export function toastSuccess(message: string, duration?: number) {
  return toast("success", message, duration);
}

export function toastError(message: string, duration?: number) {
  return toast("error", message, duration ?? 6000);
}

export function toastWarning(message: string, duration?: number) {
  return toast("warning", message, duration ?? 5000);
}

export function toastInfo(message: string, duration?: number) {
  return toast("info", message, duration);
}
