// @ts-nocheck
/**
 * @file: ThemeEventSystem.ts
 * @description: 主题事件系统，支持主题变化监听、颜色变化监听
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: theme,events,listener,observer
 */

// ================================================================
// ThemeEventSystem — 主题事件系统
// 提供：
//   - 主题变化监听
//   - 颜色变化监听
//   - Token变化监听
//   - 自动清理监听器
// ================================================================

import { ThemeType } from './CSSVariableInjector';
import { ThemeConfig } from '../CustomThemeStore';
import { logger } from "../services/Logger";

export type ThemeEventType = 'themeChange' | 'colorChange' | 'tokenChange';

export interface ThemeChangeEvent {
  oldTheme?: ThemeType;
  newTheme: ThemeType;
  oldConfig?: ThemeConfig | null;
  newConfig: ThemeConfig | null;
  timestamp: number;
}

export interface ColorChangeEvent {
  key: string;
  oldValue?: string;
  newValue: string;
  timestamp: number;
}

export interface TokenChangeEvent {
  tokenName: string;
  oldValue?: string;
  newValue: string;
  timestamp: number;
}

export type ThemeChangeCallback = (event: ThemeChangeEvent) => void;
export type ColorChangeCallback = (event: ColorChangeEvent) => void;
export type TokenChangeCallback = (event: TokenChangeEvent) => void;

type EventCallback = ThemeChangeCallback | ColorChangeCallback | TokenChangeCallback;

interface EventListener {
  id: string;
  type: ThemeEventType;
  callback: EventCallback;
  once: boolean;
}

/**
 * ThemeEventSystem - 主题事件系统
 * 单例模式，提供完整的事件管理功能
 */
export class ThemeEventSystem {
  private static instance: ThemeEventSystem;

  // 事件监听器
  private listeners: Map<string, EventListener> = new Map();

  // 按类型索引的监听器
  private listenersByType: Map<ThemeEventType, Set<string>> = new Map();

  // 监听器ID计数器
  private listenerIdCounter = 0;

  // 历史事件（用于调试）
  private eventHistory: Array<{ type: ThemeEventType; event: unknown; timestamp: number }> = [];
  private maxHistorySize = 100;

  private constructor() {
    // 初始化类型索引
    this.listenersByType.set('themeChange', new Set());
    this.listenersByType.set('colorChange', new Set());
    this.listenersByType.set('tokenChange', new Set());
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ThemeEventSystem {
    if (!ThemeEventSystem.instance) {
      ThemeEventSystem.instance = new ThemeEventSystem();
    }
    return ThemeEventSystem.instance;
  }

  /**
   * 生成监听器ID
   */
  private generateListenerId(): string {
    return `listener_${Date.now()}_${++this.listenerIdCounter}`;
  }

  /**
   * 添加事件监听器
   */
  public on(type: ThemeEventType, callback: EventCallback): () => void {
    const id = this.generateListenerId();

    const listener: EventListener = {
      id,
      type,
      callback,
      once: false
    };

    this.listeners.set(id, listener);
    this.listenersByType.get(type)?.add(id);

    // 返回取消监听函数
    return () => this.off(id);
  }

  /**
   * 添加一次性监听器
   */
  public once(type: ThemeEventType, callback: EventCallback): () => void {
    const id = this.generateListenerId();

    const listener: EventListener = {
      id,
      type,
      callback,
      once: true
    };

    this.listeners.set(id, listener);
    this.listenersByType.get(type)?.add(id);

    // 返回取消监听函数
    return () => this.off(id);
  }

  /**
   * 移除监听器
   */
  public off(listenerId: string): boolean {
    const listener = this.listeners.get(listenerId);
    if (!listener) return false;

    this.listeners.delete(listenerId);
    this.listenersByType.get(listener.type)?.delete(listenerId);

    return true;
  }

  /**
   * 移除所有指定类型的监听器
   */
  public offAll(type?: ThemeEventType): number {
    if (type) {
      const ids = this.listenersByType.get(type);
      if (!ids) return 0;

      const count = ids.size;
      ids.forEach(id => this.listeners.delete(id));
      ids.clear();

      return count;
    } else {
      // 移除所有监听器
      const count = this.listeners.size;
      this.listeners.clear();
      this.listenersByType.forEach(set => set.clear());

      return count;
    }
  }

  /**
   * 触发事件
   */
  public emit(type: ThemeEventType, event: unknown): void {
    // 记录历史
    this.recordEvent(type, event);

    // 获取该类型的所有监听器ID
    const listenerIds = this.listenersByType.get(type);
    if (!listenerIds) return;

    // 收集需要移除的监听器ID（一次性监听器）
    const toRemove: string[] = [];

    // 触发所有监听器
    listenerIds.forEach(id => {
      const listener = this.listeners.get(id);
      if (listener) {
        try {
          listener.callback(event);
        } catch (error) {
          logger.error(`[ThemeEventSystem] 监听器执行错误 (${id}):`, error);
        }

        if (listener.once) {
          toRemove.push(id);
        }
      }
    });

    // 移除一次性监听器
    toRemove.forEach(id => this.off(id));
  }

  /**
   * 发射主题变化事件
   */
  public emitThemeChange(event: ThemeChangeEvent): void {
    this.emit('themeChange', event);
  }

  /**
   * 发射颜色变化事件
   */
  public emitColorChange(event: ColorChangeEvent): void {
    this.emit('colorChange', event);
  }

  /**
   * 发射Token变化事件
   */
  public emitTokenChange(event: TokenChangeEvent): void {
    this.emit('tokenChange', event);
  }

  /**
   * 监听主题变化（便捷方法）
   */
  public onThemeChange(callback: ThemeChangeCallback): () => void {
    return this.on('themeChange', callback);
  }

  /**
   * 监听颜色变化（便捷方法）
   */
  public onColorChange(callback: ColorChangeCallback): () => void {
    return this.on('colorChange', callback);
  }

  /**
   * 监听Token变化（便捷方法）
   */
  public onTokenChange(callback: TokenChangeCallback): () => void {
    return this.on('tokenChange', callback);
  }

  /**
   * 记录事件历史
   */
  private recordEvent(type: ThemeEventType, event: unknown): void {
    this.eventHistory.push({
      type,
      event,
      timestamp: Date.now()
    });

    // 限制历史大小
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * 获取事件历史
   */
  public getEventHistory(limit?: number): Array<{ type: ThemeEventType; event: unknown; timestamp: number }> {
    if (limit && limit > 0) {
      return this.eventHistory.slice(-limit);
    }
    return [...this.eventHistory];
  }

  /**
   * 清空事件历史
   */
  public clearEventHistory(): void {
    this.eventHistory = [];
  }

  /**
   * 获取监听器统计
   */
  public getStats(): {
    totalListeners: number;
    themeChangeListeners: number;
    colorChangeListeners: number;
    tokenChangeListeners: number;
    eventHistorySize: number;
  } {
    return {
      totalListeners: this.listeners.size,
      themeChangeListeners: this.listenersByType.get('themeChange')?.size || 0,
      colorChangeListeners: this.listenersByType.get('colorChange')?.size || 0,
      tokenChangeListeners: this.listenersByType.get('tokenChange')?.size || 0,
      eventHistorySize: this.eventHistory.length
    };
  }

  /**
   * 销毁实例
   */
  public destroy(): void {
    this.offAll();
    this.clearEventHistory();
  }
}

// 导出便捷实例
export const themeEventSystem = ThemeEventSystem.getInstance();
