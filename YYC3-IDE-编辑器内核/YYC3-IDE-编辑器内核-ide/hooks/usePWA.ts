/**
 * @file: usePWA.ts
 * @description: PWA 安装和使用 Hook - 支持安装提示、离线检测、更新通知、后台同步
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v2.0.0
 * @created: 2026-03-19
 * @updated: 2026-04-05
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: pwa,install,offline,hook,background-sync
 */

import { useState, useEffect, useCallback } from "react";
import { logger } from "../services/Logger";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isOffline: boolean;
  updateAvailable: boolean;
  promptEvent: BeforeInstallPromptEvent | null;
  syncSupported: boolean;
  notificationSupported: boolean;
  cacheStatus: { caches: number; totalEntries: number } | null;
}

interface SyncRegistration {
  tag: string;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
}

interface PendingSyncItem {
  id: string;
  storeName: 'files' | 'settings' | 'memories';
  data: unknown;
  timestamp: number;
}

export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOnline: navigator.onLine,
    isOffline: !navigator.onLine,
    updateAvailable: false,
    promptEvent: null,
    syncSupported: 'serviceWorker' in navigator && 'SyncManager' in window,
    notificationSupported: 'Notification' in window,
    cacheStatus: null,
  });

  const [syncRegistrations, setSyncRegistrations] = useState<Map<string, SyncRegistration>>(new Map());

  // 监听安装提示
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      logger.warn('beforeinstallprompt event fired');

      setState((prev) => ({
        ...prev,
        isInstallable: true,
        promptEvent: e as BeforeInstallPromptEvent,
      }));
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  // 监听安装成功
  useEffect(() => {
    const handleAppInstalled = () => {
      logger.warn('app installed');
      setState((prev) => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        promptEvent: null,
      }));
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // 监听网络状态
  useEffect(() => {
    const handleOnline = () => {
      logger.warn('online');
      setState((prev) => ({
        ...prev,
        isOnline: true,
        isOffline: false,
      }));
    };

    const handleOffline = () => {
      logger.warn('offline');
      setState((prev) => ({
        ...prev,
        isOnline: false,
        isOffline: true,
      }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 监听 Service Worker 更新
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                logger.warn('new version available');
                setState((prev) => ({
                  ...prev,
                  updateAvailable: true,
                }));
              }
            });
          }
        });
      });
    }
  }, []);

  // 监听 Service Worker 消息
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, payload } = event.data || {};

        if (type === 'SYNC_COMPLETE') {
          setSyncRegistrations(prev => {
            const next = new Map(prev);
            const reg = next.get(payload?.tag);
            if (reg) {
              next.set(payload.tag, { ...reg, status: 'completed' });
            }
            return next;
          });
        }

        if (type === 'CACHE_STATUS') {
          setState(prev => ({ ...prev, cacheStatus: payload }));
        }
      });
    }
  }, []);

  // 安装 PWA
  const install = useCallback(async () => {
    if (!state.promptEvent) {
      logger.warn('no install prompt available');
      return false;
    }

    try {
      await state.promptEvent.prompt();
      const { outcome } = await state.promptEvent.userChoice;
      logger.warn('[PWA] install outcome:', outcome);

      setState((prev) => ({
        ...prev,
        promptEvent: null,
        isInstallable: false,
      }));

      return outcome === "accepted";
    } catch (err) {
      logger.error('[PWA] install error:', err);
      return false;
    }
  }, [state.promptEvent]);

  // 更新 Service Worker
  const update = useCallback(async () => {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration.waiting) {
        registration.waiting?.postMessage({ type: "SKIP_WAITING" });
        return true;
      }
    }
    return false;
  }, []);

  // 注册 Service Worker
  const registerServiceWorker = useCallback(async () => {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        logger.warn('[PWA] Service Worker registered:', registration.scope);
        return true;
      } catch (err) {
        logger.error('[PWA] Service Worker registration failed:', err);
        return false;
      }
    }
    return false;
  }, []);

  // 取消安装提示
  const clearPrompt = useCallback(() => {
    setState((prev) => ({
      ...prev,
      promptEvent: null,
      isInstallable: false,
    }));
  }, []);

  // ── Background Sync ──

  const registerSync = useCallback(async (tag: string): Promise<boolean> => {
    if (!state.syncSupported) {
      logger.warn('Background Sync not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register(tag);

      setSyncRegistrations(prev => {
        const next = new Map(prev);
        next.set(tag, { tag, status: 'pending' });
        return next;
      });

      logger.warn('[PWA] Background sync registered:', tag);
      return true;
    } catch (err) {
      logger.error('[PWA] Failed to register background sync:', err);
      return false;
    }
  }, [state.syncSupported]);

  const getSyncStatus = useCallback((tag: string): SyncRegistration | undefined => {
    return syncRegistrations.get(tag);
  }, [syncRegistrations]);

  // ── Offline Queue ──

  const addToOfflineQueue = useCallback(async (item: Omit<PendingSyncItem, 'id' | 'timestamp'>): Promise<string> => {
    const id = `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const fullItem: PendingSyncItem = {
      ...item,
      id,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('yyc3-pending-sync', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(item.storeName, 'readwrite');
        const store = tx.objectStore(item.storeName);
        store.add(fullItem);
        tx.oncomplete = () => resolve(id);
        tx.onerror = () => reject(tx.error);
      };
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('memories')) db.createObjectStore('memories', { keyPath: 'id' });
      };
    });
  }, []);

  const getOfflineQueue = useCallback(async (storeName?: 'files' | 'settings' | 'memories'): Promise<PendingSyncItem[]> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('yyc3-pending-sync', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const storeNames = storeName ? [storeName] : ['files', 'settings', 'memories'];
        const results: PendingSyncItem[] = [];

        storeNames.forEach(name => {
          if (db.objectStoreNames.contains(name)) {
            const tx = db.transaction(name, 'readonly');
            const store = tx.objectStore(name);
            const getAll = store.getAll();
            getAll.onsuccess = () => results.push(...getAll.result);
          }
        });

        resolve(results);
      };
    });
  }, []);

  const clearOfflineQueue = useCallback(async (storeName?: 'files' | 'settings' | 'memories'): Promise<void> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('yyc3-pending-sync', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const storeNames = storeName ? [storeName] : ['files', 'settings', 'memories'];

        storeNames.forEach(name => {
          if (db.objectStoreNames.contains(name)) {
            const tx = db.transaction(name, 'readwrite');
            const store = tx.objectStore(name);
            store.clear();
          }
        });

        resolve();
      };
    });
  }, []);

  // ── Notifications ──

  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!state.notificationSupported) return false;

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }, [state.notificationSupported]);

  const showNotification = useCallback(async (title: string, options?: NotificationOptions): Promise<boolean> => {
    if (!state.notificationSupported || Notification.permission !== 'granted') {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
      return true;
    } catch (err) {
      logger.error('[PWA] Failed to show notification:', err);
      return false;
    }
  }, [state.notificationSupported]);

  // ── Cache Management ──

  const getCacheStatus = useCallback(async (): Promise<{ caches: number; totalEntries: number } | null> => {
    if (!('serviceWorker' in navigator)) return null;

    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
      registration.active.postMessage({ type: 'GET_CACHE_STATUS' });
      return new Promise((resolve) => {
        const handler = (event: MessageEvent) => {
          if (event.data?.type === 'CACHE_STATUS') {
            navigator.serviceWorker.removeEventListener('message', handler);
            resolve(event.data.payload);
          }
        };
        navigator.serviceWorker.addEventListener('message', handler);
        setTimeout(() => {
          navigator.serviceWorker.removeEventListener('message', handler);
          resolve(null);
        }, 5000);
      });
    }
    return null;
  }, []);

  const cacheUrls = useCallback(async (urls: string[]): Promise<boolean> => {
    if (!('serviceWorker' in navigator)) return false;

    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
      registration.active.postMessage({ type: 'CACHE_URLS', urls });
      return true;
    }
    return false;
  }, []);

  const clearCache = useCallback(async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator)) return false;

    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
      registration.active.postMessage({ type: 'CLEAR_CACHE' });
      return true;
    }
    return false;
  }, []);

  return {
    ...state,
    install,
    update,
    registerServiceWorker,
    clearPrompt,
    registerSync,
    getSyncStatus,
    addToOfflineQueue,
    getOfflineQueue,
    clearOfflineQueue,
    requestNotificationPermission,
    showNotification,
    getCacheStatus,
    cacheUrls,
    clearCache,
  };
}

export default usePWA;
