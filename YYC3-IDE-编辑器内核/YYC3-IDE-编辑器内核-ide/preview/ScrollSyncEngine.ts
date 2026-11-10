/**
 * @file: ScrollSyncEngine.ts
 * @description: 滚动同步引擎 - 管理编辑器和预览窗口的滚动同步
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: scroll,sync,preview,editor,view
 */

/**
 * 同步模式枚举
 */
import { logger } from "../services/Logger";
export enum SyncMode {
  DISABLED = 'disabled',     // 禁用同步
  EDITOR_TO_PREVIEW = 'editor_to_preview',  // 编辑器 → 预览
  PREVIEW_TO_EDITOR = 'preview_to_editor',  // 预览 → 编辑器
  BIDIRECTIONAL = 'bidirectional',  // 双向同步
}

/**
 * 滚动同步配置
 */
export interface ScrollSyncConfig {
  mode: SyncMode;            // 同步模式
  threshold: number;         // 同步阈值（像素）
  debounceDelay: number;     // 防抖延迟（毫秒）
  smoothScroll: boolean;     // 是否平滑滚动
  syncRatio: boolean;        // 是否按比例同步
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: ScrollSyncConfig = {
  mode: SyncMode.BIDIRECTIONAL,
  threshold: 5,
  debounceDelay: 50,
  smoothScroll: true,
  syncRatio: true,
};

/**
 * 滚动位置接口
 */
export interface ScrollPosition {
  x: number;
  y: number;
  ratioX: number;  // 横向滚动比例 (0-1)
  ratioY: number;  // 纵向滚动比例 (0-1)
}

/**
 * 滚动同步事件
 */
export interface ScrollSyncEvent {
  source: 'editor' | 'preview';
  position: ScrollPosition;
  timestamp: number;
}

/**
 * 滚动同步引擎
 */
export class ScrollSyncEngine {
  private config: ScrollSyncConfig;
  private editorElement: HTMLElement | null = null;
  private previewElement: HTMLElement | null = null;
  private lastEditorPosition: ScrollPosition = { x: 0, y: 0, ratioX: 0, ratioY: 0 };
  private lastPreviewPosition: ScrollPosition = { x: 0, y: 0, ratioX: 0, ratioY: 0 };
  private lastSyncTime: number = 0;
  private debounceTimer: NodeJS.Timeout | null = null;
  private listeners: Set<(event: ScrollSyncEvent) => void> = new Set();
  private isSyncing: boolean = false;
  private antiLoopWindow: number = 300; // 防循环时间窗口

  constructor(config: Partial<ScrollSyncConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 设置编辑器元素
   */
  setEditorElement(element: HTMLElement | null): void {
    if (this.editorElement) {
      this.editorElement.removeEventListener('scroll', this.handleEditorScroll);
    }

    this.editorElement = element;

    if (this.editorElement) {
      this.editorElement.addEventListener('scroll', this.handleEditorScroll, { passive: true });
    }
  }

  /**
   * 设置预览元素
   */
  setPreviewElement(element: HTMLElement | null): void {
    if (this.previewElement) {
      this.previewElement.removeEventListener('scroll', this.handlePreviewScroll);
    }

    this.previewElement = element;

    if (this.previewElement) {
      this.previewElement.addEventListener('scroll', this.handlePreviewScroll, { passive: true });
    }
  }

  /**
   * 处理编辑器滚动
   */
  private handleEditorScroll = (): void => {
    if (!this.editorElement || this.isSyncing) return;
    if (this.config.mode === SyncMode.DISABLED || this.config.mode === SyncMode.PREVIEW_TO_EDITOR) {
      return;
    }

    const position = this.getScrollPosition(this.editorElement);

    // 检查是否超过阈值
    if (!this.isPositionChanged(position, this.lastEditorPosition)) {
      return;
    }

    this.lastEditorPosition = position;
    this.notifyListeners({ source: 'editor', position, timestamp: Date.now() });

    // 防抖同步
    this.debounceSync(() => {
      this.syncToPreview(position);
    });
  };

  /**
   * 处理预览滚动
   */
  private handlePreviewScroll = (): void => {
    if (!this.previewElement || this.isSyncing) return;
    if (this.config.mode === SyncMode.DISABLED || this.config.mode === SyncMode.EDITOR_TO_PREVIEW) {
      return;
    }

    const position = this.getScrollPosition(this.previewElement);

    // 检查是否超过阈值
    if (!this.isPositionChanged(position, this.lastPreviewPosition)) {
      return;
    }

    this.lastPreviewPosition = position;
    this.notifyListeners({ source: 'preview', position, timestamp: Date.now() });

    // 防抖同步
    this.debounceSync(() => {
      this.syncToEditor(position);
    });
  };

  /**
   * 获取滚动位置
   */
  private getScrollPosition(element: HTMLElement): ScrollPosition {
    const { scrollLeft, scrollTop, scrollWidth, scrollHeight, clientWidth, clientHeight } = element;

    const maxScrollX = scrollWidth - clientWidth;
    const maxScrollY = scrollHeight - clientHeight;

    return {
      x: scrollLeft,
      y: scrollTop,
      ratioX: maxScrollX > 0 ? scrollLeft / maxScrollX : 0,
      ratioY: maxScrollY > 0 ? scrollTop / maxScrollY : 0,
    };
  }

  /**
   * 检查位置是否改变
   */
  private isPositionChanged(current: ScrollPosition, last: ScrollPosition): boolean {
    const dx = Math.abs(current.x - last.x);
    const dy = Math.abs(current.y - last.y);
    return dx > this.config.threshold || dy > this.config.threshold;
  }

  /**
   * 防抖同步
   */
  private debounceSync(callback: () => void): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      callback();
      this.debounceTimer = null;
    }, this.config.debounceDelay);
  }

  /**
   * 同步到预览窗口
   */
  private syncToPreview(position: ScrollPosition): void {
    if (!this.previewElement || this.isInAntiLoopWindow()) return;

    this.isSyncing = true;
    const preview = this.previewElement;
    const { scrollWidth, scrollHeight, clientWidth, clientHeight } = preview;

    if (this.config.syncRatio) {
      // 按比例同步
      const targetX = position.ratioX * (scrollWidth - clientWidth);
      const targetY = position.ratioY * (scrollHeight - clientHeight);

      this.scrollTo(preview, targetX, targetY);
    } else {
      // 直接同步
      this.scrollTo(preview, position.x, position.y);
    }

    this.lastSyncTime = Date.now();

    // 延迟重置同步标志
    setTimeout(() => {
      this.isSyncing = false;
    }, 100);
  }

  /**
   * 同步到编辑器
   */
  private syncToEditor(position: ScrollPosition): void {
    if (!this.editorElement || this.isInAntiLoopWindow()) return;

    this.isSyncing = true;
    const editor = this.editorElement;
    const { scrollWidth, scrollHeight, clientWidth, clientHeight } = editor;

    if (this.config.syncRatio) {
      // 按比例同步
      const targetX = position.ratioX * (scrollWidth - clientWidth);
      const targetY = position.ratioY * (scrollHeight - clientHeight);

      this.scrollTo(editor, targetX, targetY);
    } else {
      // 直接同步
      this.scrollTo(editor, position.x, position.y);
    }

    this.lastSyncTime = Date.now();

    // 延迟重置同步标志
    setTimeout(() => {
      this.isSyncing = false;
    }, 100);
  }

  /**
   * 滚动到指定位置
   */
  private scrollTo(element: HTMLElement, x: number, y: number): void {
    try {
      if (this.config.smoothScroll && typeof element.scrollTo === 'function') {
        element.scrollTo({
          left: x,
          top: y,
          behavior: 'smooth',
        });
      } else {
        element.scrollLeft = x;
        element.scrollTop = y;
      }
    } catch (error) {
      // 降级处理：直接设置scrollLeft和scrollTop
      element.scrollLeft = x;
      element.scrollTop = y;
    }
  }

  /**
   * 检查是否在防循环时间窗口内
   */
  private isInAntiLoopWindow(): boolean {
    return Date.now() - this.lastSyncTime < this.antiLoopWindow;
  }

  /**
   * 通知监听器
   */
  private notifyListeners(event: ScrollSyncEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (e) {
        logger.error('Error in scroll sync listener:', e);
      }
    });
  }

  // ── 公共API ────────────────────────────────────────────────

  /**
   * 获取当前配置
   */
  getConfig(): ScrollSyncConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ScrollSyncConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取编辑器滚动位置
   */
  getEditorPosition(): ScrollPosition {
    return { ...this.lastEditorPosition };
  }

  /**
   * 获取预览滚动位置
   */
  getPreviewPosition(): ScrollPosition {
    return { ...this.lastPreviewPosition };
  }

  /**
   * 手动同步编辑器滚动到预览
   */
  syncEditorToPreview(): void {
    if (this.editorElement) {
      const position = this.getScrollPosition(this.editorElement);
      this.syncToPreview(position);
    }
  }

  /**
   * 手动同步预览滚动到编辑器
   */
  syncPreviewToEditor(): void {
    if (this.previewElement) {
      const position = this.getScrollPosition(this.previewElement);
      this.syncToEditor(position);
    }
  }

  /**
   * 添加滚动监听器
   */
  addListener(listener: (event: ScrollSyncEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 启用同步
   */
  enable(): void {
    if (this.config.mode === SyncMode.DISABLED) {
      this.config.mode = SyncMode.BIDIRECTIONAL;
    }
  }

  /**
   * 禁用同步
   */
  disable(): void {
    this.config.mode = SyncMode.DISABLED;
  }

  /**
   * 销毁引擎
   */
  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.setEditorElement(null);
    this.setPreviewElement(null);
    this.listeners.clear();
  }
}

/**
 * 单例实例
 */
let instance: ScrollSyncEngine | null = null;

/**
 * 获取单例实例
 */
export function getScrollSyncEngine(config?: Partial<ScrollSyncConfig>): ScrollSyncEngine {
  if (!instance) {
    instance = new ScrollSyncEngine(config);
  }
  return instance;
}
