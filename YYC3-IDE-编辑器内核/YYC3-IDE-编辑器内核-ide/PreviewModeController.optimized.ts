// @ts-nocheck
/**
 * @file: PreviewModeController.optimized.ts
 * @description: 预览模式控制器（性能优化版），管理实时/手动/延迟三种预览模式
 *              优化点：节流、防抖、智能批量更新、内存优化
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.1.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: preview,controller,mode,optimized,performance
 */

import type { PreviewMode } from "./stores/usePreviewStore";
import { logger } from "./services/Logger";

/**
 * 预览模式控制器（性能优化版）
 *
 * 性能优化点：
 * 1. 节流控制 - 限制更新频率，避免高频触发
 * 2. 防抖优化 - 延迟模式下使用防抖，合并多次快速变更
 * 3. 智能批量更新 - 批量处理文件变更，减少渲染次数
 * 4. 内存优化 - 及时清理定时器，避免内存泄漏
 * 5. 智能模式 - 根据编辑频率自动调整更新策略
 */
export class PreviewModeControllerOptimized {
  /** 当前预览模式 */
  private mode: PreviewMode = "realtime";

  /** 延迟定时器 */
  private delayTimer: ReturnType<typeof setTimeout> | null = null;

  /** 节流定时器 */
  private throttleTimer: ReturnType<typeof setTimeout> | null = null;

  /** 是否有待处理的更新（手动模式使用） */
  private pendingUpdate: boolean = false;

  /** 默认延迟时间（毫秒） */
  private readonly DEFAULT_DELAY = 500;

  /** 当前延迟时间 */
  private delay: number;

  /** 节流间隔（毫秒） */
  private readonly THROTTLE_INTERVAL = 100;

  /** 上次更新时间戳 */
  private lastUpdateTime: number = 0;

  /** 智能模式统计 */
  private smartModeStats = {
    editCount: 0,
    lastEditTime: 0,
    avgEditInterval: 0,
  };

  /** 批量更新队列 */
  private batchQueue: Array<() => void> = [];

  /** 批量更新定时器 */
  private batchTimer: ReturnType<typeof setTimeout> | null = null;

  /** 批量更新间隔 */
  private readonly BATCH_INTERVAL = 50;

  /**
   * 构造函数
   *
   * @param onTriggerUpdate - 触发预览更新的回调函数
   * @param delay - 延迟时间（毫秒），默认500ms
   */
  constructor(
    private onTriggerUpdate: () => void,
    delay?: number
  ) {
    this.delay = delay ?? this.DEFAULT_DELAY;
  }

  /**
   * 设置预览模式
   */
  setMode(mode: PreviewMode): void {
    this.mode = mode;
    this.clearAllTimers();

    // 重置智能模式统计
    if (mode === "smart") {
      this.smartModeStats = {
        editCount: 0,
        lastEditTime: 0,
        avgEditInterval: 0,
      };
    }
  }

  /**
   * 获取当前预览模式
   */
  getMode(): PreviewMode {
    return this.mode;
  }

  /**
   * 文件变更处理（性能优化版）
   */
  handleFileChange(): void {
    // 更新智能模式统计
    this.updateSmartModeStats();

    switch (this.mode) {
      case "realtime":
        this.handleRealtimeMode();
        break;

      case "manual":
        this.handleManualMode();
        break;

      case "delayed":
        this.handleDelayedMode();
        break;

      case "smart":
        this.handleSmartMode();
        break;

      default:
        this.handleRealtimeMode();
    }
  }

  /**
   * 处理实时模式（节流优化）
   */
  private handleRealtimeMode(): void {
    const now = Date.now();
    const elapsed = now - this.lastUpdateTime;

    // 节流：限制更新频率
    if (elapsed < this.THROTTLE_INTERVAL) {
      // 在节流间隔内，延迟更新
      if (!this.throttleTimer) {
        this.throttleTimer = setTimeout(() => {
          this.throttleTimer = null;
          this.triggerImmediateUpdate();
        }, this.THROTTLE_INTERVAL - elapsed);
      }
      return;
    }

    this.triggerImmediateUpdate();
  }

  /**
   * 处理手动模式
   */
  private handleManualMode(): void {
    this.pendingUpdate = true;
    logger.warn('Pending update marked for manual mode');
  }

  /**
   * 处理延迟模式（防抖优化）
   */
  private handleDelayedMode(): void {
    // 防抖：清除之前的定时器，重新设置
    if (this.delayTimer) {
      clearTimeout(this.delayTimer);
    }

    this.delayTimer = setTimeout(() => {
      this.delayTimer = null;
      this.triggerImmediateUpdate();
    }, this.delay);

    logger.warn('Scheduled delayed update in ${this.delay}ms');
  }

  /**
   * 处理智能模式（根据编辑频率自动调整）
   */
  private handleSmartMode(): void {
    const now = Date.now();
    const _elapsed = now - this.lastUpdateTime;

    // 根据平均编辑间隔决定更新策略
    if (this.smartModeStats.avgEditInterval < 200) {
      // 快速编辑：使用延迟模式
      this.handleDelayedMode();
    } else if (this.smartModeStats.avgEditInterval < 500) {
      // 中速编辑：使用节流
      this.handleRealtimeMode();
    } else {
      // 慢速编辑：立即更新
      this.triggerImmediateUpdate();
    }
  }

  /**
   * 更新智能模式统计
   */
  private updateSmartModeStats(): void {
    const now = Date.now();

    if (this.smartModeStats.lastEditTime > 0) {
      const interval = now - this.smartModeStats.lastEditTime;
      this.smartModeStats.editCount++;

      // 计算移动平均编辑间隔
      this.smartModeStats.avgEditInterval =
        (this.smartModeStats.avgEditInterval * (this.smartModeStats.editCount - 1) + interval)
        / this.smartModeStats.editCount;
    }

    this.smartModeStats.lastEditTime = now;
  }

  /**
   * 手动触发更新（手动模式）
   */
  manualTrigger(): void {
    if (this.pendingUpdate) {
      this.triggerImmediateUpdate();
      this.pendingUpdate = false;
    }
  }

  /**
   * 检查是否有待处理的更新
   */
  hasPendingUpdate(): boolean {
    return this.pendingUpdate;
  }

  /**
   * 添加到批量更新队列
   */
  addToBatch(update: () => void): void {
    this.batchQueue.push(update);

    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flushBatch();
      }, this.BATCH_INTERVAL);
    }
  }

  /**
   * 执行批量更新
   */
  private flushBatch(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // 执行所有批量更新
    const updates = [...this.batchQueue];
    this.batchQueue = [];

    updates.forEach(update => update());

    // 触发一次预览更新
    this.triggerImmediateUpdate();
  }

  /**
   * 立即触发更新
   */
  private triggerImmediateUpdate(): void {
    this.clearAllTimers();

    try {
      this.lastUpdateTime = Date.now();
      this.onTriggerUpdate();
      logger.warn('Preview updated immediately');
    } catch (error) {
      logger.error("[PreviewModeController] Error triggering update:", error);
    }
  }

  /**
   * 清除所有定时器
   */
  private clearAllTimers(): void {
    if (this.delayTimer) {
      clearTimeout(this.delayTimer);
      this.delayTimer = null;
    }

    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  /**
   * 设置延迟时间
   */
  setDelay(delay: number): void {
    this.delay = Math.max(100, Math.min(5000, delay));
  }

  /**
   * 获取当前延迟时间
   */
  getDelay(): number {
    return this.delay;
  }

  /**
   * 销毁控制器
   */
  destroy(): void {
    this.clearAllTimers();
    this.pendingUpdate = false;
    this.batchQueue = [];
    logger.warn('Controller destroyed');
  }

  /**
   * 重置控制器状态
   */
  reset(): void {
    this.clearAllTimers();
    this.pendingUpdate = false;
    this.batchQueue = [];
    this.smartModeStats = {
      editCount: 0,
      lastEditTime: 0,
      avgEditInterval: 0,
    };
  }

  /**
   * 获取控制器状态信息
   */
  getStatus(): {
    mode: PreviewMode;
    delay: number;
    hasPendingUpdate: boolean;
    hasActiveTimer: boolean;
    smartModeStats?: typeof this.smartModeStats;
  } {
    return {
      mode: this.mode,
      delay: this.delay,
      hasPendingUpdate: this.pendingUpdate,
      hasActiveTimer: this.delayTimer !== null || this.throttleTimer !== null,
      smartModeStats: this.mode === "smart" ? this.smartModeStats : undefined,
    };
  }
}

/**
 * 工厂函数：创建优化的预览模式控制器
 */
export function createOptimizedPreviewModeController(
  onTriggerUpdate: () => void,
  initialMode: PreviewMode = "realtime",
  delay: number = 500
): PreviewModeControllerOptimized {
  const controller = new PreviewModeControllerOptimized(onTriggerUpdate, delay);
  controller.setMode(initialMode);
  return controller;
}
