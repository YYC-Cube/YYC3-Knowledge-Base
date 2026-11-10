"use client";

import { useEffect } from 'react';

/**
 * @file 开发环境 Service Worker 清理组件
 * @description 在开发环境自动注销已注册的 Service Worker，避免因旧 SW 导致的 500 与浏览器 API 误用
 * @module app/components/DevSWCleanup
 * @author YYC
 * @version 1.0.0
 * @created 2024-10-31
 * @updated 2024-10-31
 */
export default function DevSWCleanup() {
  useEffect(() => {
    // 仅在浏览器 + 开发环境执行
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'development') {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => {
          regs.forEach((r) => r.unregister().catch(() => {}));
        })
        .catch(() => {});
    }
  }, []);

  // 不渲染任何 UI
  return null;
}
