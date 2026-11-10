/**
 * @file: services/stores.ts
 * @description: 统一 Store Hub — 在 stores/index.ts 基础上提供非 React 环境访问能力
 *              和 batch update 工具
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v2.0.0
 * @created: 2026-06-04
 * @updated: 2026-06-04
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: stores,zustand,hub,selectors,di
 */

// ================================================================
// 统一 Store Hub v2
// ================================================================
// 用途：在 stores/index.ts 的基础上提供：
//   1. 非 React 环境下的 store 读写（如 services、agents）
//   2. batch update 工具（同时更新多个 store）
//   3. 统一的 store 订阅能力
// ================================================================

import type { StoreApi } from "zustand";
import { useAIFixStore } from "../stores/useAIFixStore";
import { useFileStoreZustand, type FileStoreState } from "../stores/useFileStoreZustand";
import { useModelStoreZustand, type ModelStoreState } from "../stores/useModelStoreZustand";
import { usePreviewStore } from "../stores/usePreviewStore";
import { useProxyStoreZustand } from "../stores/useProxyStoreZustand";

// ── 非 React 环境 store 访问 ──

export const fileApi = useFileStoreZustand as unknown as StoreApi<FileStoreState>;
export const modelApi = useModelStoreZustand as unknown as StoreApi<ModelStoreState>;
export const proxyApi = useProxyStoreZustand as unknown as StoreApi<Record<string, any>>;
export const previewApi = usePreviewStore as unknown as StoreApi<Record<string, any>>;
export const aiFixApi = useAIFixStore as unknown as StoreApi<Record<string, any>>;

// ── 便捷函数 ──

/** 读取文件 store */
export const getFileState = () => fileApi.getState();
/** 读取模型 store */
export const getModelState = () => modelApi.getState();
/** 读取预览 store */
export const getPreviewState = () => previewApi.getState();

/** Batch update — 同时更新多个 store */
export function batchUpdate(
  ...updates: Array<{ store: StoreApi<any>; partial: Record<string, unknown> }>
): void {
  for (const { store, partial } of updates) {
    store.setState(partial);
  }
}

// ── Re-export store hooks ──
export { useAIFixStore } from "../stores/useAIFixStore";
export { useFileStoreZustand } from "../stores/useFileStoreZustand";
export { useModelStoreZustand } from "../stores/useModelStoreZustand";
export { usePreviewStore } from "../stores/usePreviewStore";
export { useProxyStoreZustand } from "../stores/useProxyStoreZustand";
