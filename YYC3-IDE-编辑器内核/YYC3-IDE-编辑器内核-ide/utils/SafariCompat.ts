/**
 * @file: SafariCompat.ts
 * @description: Safari兼容性Polyfill和API适配
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-05
 * @updated: 2026-04-05
 * @status: production
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: safari,compatibility,polyfill,browser
 */

// ================================================================
// Safari Compatibility - Safari兼容性适配
// ================================================================
//
// 功能：
//   - Safari特有API适配
//   - 缺失API Polyfill
//   - CSS兼容性处理
//   - 事件兼容性处理
//   - IndexedDB适配
//
// 使用场景：
//   - Safari浏览器兼容
//   - iOS Safari适配
//   - 跨浏览器兼容
// ================================================================

import { logger } from '../services/Logger';

// ── Browser Detection ──

export const isSafari = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return ua.includes('Safari') && !ua.includes('Chrome') && !ua.includes('Chromium');
};

export const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

export const isIOSSafari = (): boolean => {
  return isIOS() && !navigator.userAgent.includes('CriOS');
};

// ── Safari-specific Polyfills ──

export function applySafariPolyfills(): void {
  if (typeof window === 'undefined') return;

  // ── ResizeObserver Polyfill ──
  if (!window.ResizeObserver) {
    logger.warn('[SafariCompat] ResizeObserver not supported, using polyfill');
    (window as any).ResizeObserver = class ResizeObserver {
      private callback: ResizeObserverCallback;
      private elements: Set<Element> = new Set();
      private rafId: number | null = null;

      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }

      observe(target: Element): void {
        this.elements.add(target);
        this.scheduleCheck();
      }

      unobserve(target: Element): void {
        this.elements.delete(target);
      }

      disconnect(): void {
        this.elements.clear();
        if (this.rafId) {
          cancelAnimationFrame(this.rafId);
        }
      }

      private scheduleCheck(): void {
        if (this.rafId) return;
        this.rafId = requestAnimationFrame(() => {
          this.checkSizes();
          this.rafId = null;
        });
      }

      private checkSizes(): void {
        const entries: ResizeObserverEntry[] = [];
        this.elements.forEach((element) => {
          const rect = element.getBoundingClientRect();
          entries.push({
            target: element,
            contentRect: rect,
            borderBoxSize: [{ inlineSize: rect.width, blockSize: rect.height }],
            contentBoxSize: [{ inlineSize: rect.width, blockSize: rect.height }],
            devicePixelContentBoxSize: [
              { inlineSize: rect.width * window.devicePixelRatio, blockSize: rect.height * window.devicePixelRatio },
            ],
          } as ResizeObserverEntry);
        });
        this.callback(entries, this);
      }
    };
  }

  // ── IntersectionObserver Polyfill for older Safari ──
  if (!window.IntersectionObserver) {
    logger.warn('[SafariCompat] IntersectionObserver not supported, using fallback');
    (window as any).IntersectionObserver = class IntersectionObserver {
      private callback: IntersectionObserverCallback;
      private elements: Set<Element> = new Set();
      private scrollHandler: () => void;
      public root: Element | null = null;
      public rootMargin: string = '0px';
      public thresholds: number[] = [];

      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
        this.scrollHandler = () => this.checkVisibility();
      }

      // TS 6.0+: required by IntersectionObserver type
      readonly scrollMargin: string = '';

      observe(target: Element): void {
        this.elements.add(target);
        window.addEventListener('scroll', this.scrollHandler, { passive: true });
        this.checkVisibility();
      }

      unobserve(target: Element): void {
        this.elements.delete(target);
      }

      disconnect(): void {
        this.elements.clear();
        window.removeEventListener('scroll', this.scrollHandler);
      }

      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }

      private checkVisibility(): void {
        const entries: IntersectionObserverEntry[] = [];
        const self = this as unknown as IntersectionObserver;
        this.elements.forEach((element) => {
          const rect = element.getBoundingClientRect();
          const isVisible =
            rect.top < window.innerHeight &&
            rect.bottom > 0 &&
            rect.left < window.innerWidth &&
            rect.right > 0;

          entries.push({
            target: element,
            isIntersecting: isVisible,
            boundingClientRect: rect,
            intersectionRatio: isVisible ? 1 : 0,
            intersectionRect: isVisible ? rect : new DOMRectReadOnly(),
            rootBounds: new DOMRect(0, 0, window.innerWidth, window.innerHeight),
            time: Date.now(),
          } as IntersectionObserverEntry);
        });
        this.callback(entries, self);
      }
    };
  }

  // ── Visual Viewport API Polyfill ──
  if (!window.visualViewport) {
    (window as any).visualViewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      scale: 1,
      offsetLeft: 0,
      offsetTop: 0,
      pageLeft: window.scrollX,
      pageTop: window.scrollY,
      addEventListener: window.addEventListener.bind(window),
      removeEventListener: window.removeEventListener.bind(window),
    };
  }

  // ── Clipboard API Polyfill ──
  if (!navigator.clipboard) {
    (navigator as any).clipboard = {
      writeText: async (text: string): Promise<void> => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      },
      readText: async (): Promise<string> => {
        return new Promise((resolve, reject) => {
          const textarea = document.createElement('textarea');
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();

          const success = document.execCommand('paste');
          const text = textarea.value;
          document.body.removeChild(textarea);

          if (success) {
            resolve(text);
          } else {
            reject(new Error('Failed to read clipboard'));
          }
        });
      },
    };
  }

  // ── Blob.stream() Polyfill ──
  if (!Blob.prototype.stream) {
    (Blob.prototype as any).stream = function (this: Blob): ReadableStream<Uint8Array> {
      // eslint-disable-next-line @typescript-eslint/no-this-alias -- Need to capture 'this' for use in nested function
      const blobInstance = this;
      let position = 0;

      return new ReadableStream({
        async pull(controller) {
          const chunk = blobInstance.slice(position, position + 65536);
          const buffer = await chunk.arrayBuffer();
          if (buffer.byteLength === 0) {
            controller.close();
            return;
          }
          position += buffer.byteLength;
          controller.enqueue(new Uint8Array(buffer));
        },
      });
    };
  }

  // ── AbortSignal.timeout Polyfill ──
  if (!AbortSignal.timeout) {
    (AbortSignal as any).timeout = (ms: number): AbortSignal => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(new DOMException('TimeoutError')), ms);
      return controller.signal;
    };
  }
}

// ── CSS Compatibility ──

export function applySafariCSSFixes(): void {
  if (typeof document === 'undefined') return;

  const style = document.createElement('style');
  style.id = 'safari-compat-css';

  const cssRules = `
    /* Safari flexbox gap fix */
    @supports not (gap: 1px) {
      .flex-gap-fix > * {
        margin: 0;
      }
      .flex-gap-fix > * + * {
        margin-left: var(--gap, 8px);
      }
    }

    /* Safari backdrop-filter fix */
    @supports not (backdrop-filter: blur(10px)) {
      .backdrop-blur-fallback {
        background: rgba(255, 255, 255, 0.95) !important;
      }
    }

    /* Safari scroll-snap fix */
    .scroll-snap-fix {
      -webkit-overflow-scrolling: touch;
      scroll-snap-type: x mandatory;
      -webkit-scroll-snap-type: x mandatory;
    }

    .scroll-snap-fix > * {
      scroll-snap-align: start;
      -webkit-scroll-snap-align: start;
    }

    /* Safari input styling fix */
    input[type="text"],
    input[type="email"],
    input[type="password"],
    input[type="search"],
    textarea {
      -webkit-appearance: none;
      border-radius: 0;
    }

    /* Safari button styling fix */
    button {
      -webkit-appearance: none;
    }

    /* Safari sticky positioning fix */
    .sticky-fix {
      position: -webkit-sticky;
      position: sticky;
    }

    /* Safari smooth scroll fix */
    @supports not (scroll-behavior: smooth) {
      html {
        scroll-behavior: auto;
      }
    }

    /* Safari aspect-ratio fix */
    @supports not (aspect-ratio: 1/1) {
      .aspect-ratio-fix {
        position: relative;
      }
      .aspect-ratio-fix::before {
        content: '';
        display: block;
        padding-top: var(--aspect-ratio, 100%);
      }
      .aspect-ratio-fix > * {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      }
    }
  `;

  style.textContent = cssRules;
  document.head.appendChild(style);
}

// ── IndexedDB Safari Compatibility ──

export function createSafariIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('yyc3-safari-compat', 1);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const db = request.result;

      // Safari IndexedDB bug workaround
      db.onversionchange = () => {
        db.close();
        logger.warn('[SafariCompat] Database version changed, closing connection');
      };

      resolve(db);
    };

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;

      // Create object stores if needed
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pending')) {
        db.createObjectStore('pending', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// ── Safari-specific Event Handling ──

export function addSafariEventListener(
  element: EventTarget,
  type: string,
  listener: EventListener,
  options?: AddEventListenerOptions
): () => void {
  // Safari doesn't support passive option in some cases
  const safariOptions: AddEventListenerOptions = {
    ...options,
    passive: options?.passive ?? true,
  };

  element.addEventListener(type, listener, safariOptions);

  return () => element.removeEventListener(type, listener, safariOptions);
}

// ── Safari Touch Event Handling ──

export function setupSafariTouchHandling(element: HTMLElement): () => void {
  const cleanupFns: Array<() => void> = [];

  // Prevent zoom on double tap
  let lastTouchEnd = 0;
  const preventZoom = (e: TouchEvent) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  };

  element.addEventListener('touchend', preventZoom, { passive: false });
  cleanupFns.push(() => element.removeEventListener('touchend', preventZoom));

  // Handle touch scroll
  let touchStartY = 0;
  const handleTouchStart = (e: TouchEvent) => {
    touchStartY = e.touches[0].clientY;
  };

  const handleTouchMove = (e: TouchEvent) => {
    const touchY = e.touches[0].clientY;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;

    const isAtTop = scrollTop === 0;
    const isAtBottom = scrollTop + clientHeight === scrollHeight;

    const movingUp = touchY > touchStartY;
    const movingDown = touchY < touchStartY;

    if ((isAtTop && movingUp) || (isAtBottom && movingDown)) {
      e.preventDefault();
    }
  };

  element.addEventListener('touchstart', handleTouchStart, { passive: true });
  element.addEventListener('touchmove', handleTouchMove, { passive: false });

  cleanupFns.push(() => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchmove', handleTouchMove);
  });

  return () => cleanupFns.forEach(fn => fn());
}

// ── Safari Audio Context Workaround ──

export function createSafariAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;

  if (!AudioContextClass) {
    logger.warn('AudioContext not supported');
    return null;
  }

  const ctx = new AudioContextClass();

  // Safari requires user interaction to start AudioContext
  if (ctx.state === 'suspended') {
    const resumeOnInteraction = () => {
      ctx.resume().then(() => {
        document.removeEventListener('click', resumeOnInteraction);
        document.removeEventListener('touchstart', resumeOnInteraction);
      });
    };

    document.addEventListener('click', resumeOnInteraction);
    document.addEventListener('touchstart', resumeOnInteraction);
  }

  return ctx;
}

// ── Safari Request Animation Frame Fix ──

export function safariRequestAnimationFrame(callback: FrameRequestCallback): number {
  if (typeof window === 'undefined') return 0;

  // Safari has issues with requestAnimationFrame in some cases
  const raf = window.requestAnimationFrame || (window as any).webkitRequestAnimationFrame;

  if (!raf) {
    return setTimeout(() => callback(Date.now()), 16) as unknown as number;
  }

  return raf(callback);
}

export function safariCancelAnimationFrame(id: number): void {
  if (typeof window === 'undefined') return;

  const caf = window.cancelAnimationFrame || (window as any).webkitCancelAnimationFrame;

  if (!caf) {
    clearTimeout(id);
    return;
  }

  caf(id);
}

// ── Initialize All Safari Fixes ──

export function initializeSafariCompatibility(): void {
  if (!isSafari() && !isIOS()) {
    return;
  }

  logger.info('Applying Safari compatibility fixes...');

  applySafariPolyfills();
  applySafariCSSFixes();

  // Apply iOS-specific fixes
  if (isIOS()) {
    document.documentElement.classList.add('ios-device');

    // Prevent iOS bounce scroll
    document.body.style.overscrollBehavior = 'none';
    (document.body.style as any).webkitOverflowScrolling = 'touch';
  }

  logger.info('Safari compatibility fixes applied');
}

// ── Auto-initialize ──

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSafariCompatibility);
  } else {
    initializeSafariCompatibility();
  }
}

export default {
  isSafari,
  isIOS,
  isIOSSafari,
  applySafariPolyfills,
  applySafariCSSFixes,
  createSafariIndexedDB,
  addSafariEventListener,
  setupSafariTouchHandling,
  createSafariAudioContext,
  safariRequestAnimationFrame,
  safariCancelAnimationFrame,
  initializeSafariCompatibility,
};
