/**
 * @file: ViewStatePersistence.ts
 * @description: 视图状态持久化 - 保存和恢复滚动位置、缩放级别等视图状态
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: view,state,persistence,storage,restore
 */

import { ScrollPosition } from './ScrollSyncEngine';
import { logger } from "../services/Logger";

/**
 * 视图状态接口
 */
export interface ViewState {
  id: string;               // 状态ID
  filePath: string;         // 文件路径
  scrollPosition: ScrollPosition;  // 滚动位置
  zoomLevel: number;        // 缩放级别
  timestamp: number;        // 时间戳
  ttl?: number;             // 存活时间（毫秒）
}

/**
 * 持久化配置
 */
export interface PersistenceConfig {
  maxStates: number;        // 最大保存状态数
  defaultTTL: number;       // 默认存活时间（毫秒）
  storageKey: string;       // localStorage键名
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: PersistenceConfig = {
  maxStates: 100,
  defaultTTL: 7 * 24 * 60 * 60 * 1000, // 7天
  storageKey: 'yyc3_preview_view_states',
};

/**
 * 视图状态持久化管理器
 */
export class ViewStatePersistence {
  private config: PersistenceConfig;
  private states: Map<string, ViewState> = new Map();
  private listeners: Set<(state: ViewState) => void> = new Set();

  constructor(config: Partial<PersistenceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadFromStorage();
  }

  /**
   * 从localStorage加载状态
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const states: ViewState[] = JSON.parse(stored);
        states.forEach(state => {
          // 检查是否过期
          if (!this.isExpired(state)) {
            this.states.set(state.id, state);
          }
        });
      }
    } catch (error) {
      logger.error('Failed to load view states from storage:', error);
      // 清除损坏的数据
      localStorage.removeItem(this.config.storageKey);
    }
  }

  /**
   * 保存到localStorage
   */
  private saveToStorage(): void {
    try {
      const states = Array.from(this.states.values());
      localStorage.setItem(this.config.storageKey, JSON.stringify(states));
    } catch (error) {
      logger.error('Failed to save view states to storage:', error);

      // 如果存储失败，可能是配额超限，清理过期状态后重试
      this.cleanupExpiredStates();

      try {
        const states = Array.from(this.states.values());
        localStorage.setItem(this.config.storageKey, JSON.stringify(states));
      } catch (retryError) {
        logger.error('Retry failed, storage quota exceeded:', retryError);
      }
    }
  }

  /**
   * 检查状态是否过期
   */
  private isExpired(state: ViewState): boolean {
    if (!state.ttl) return false;
    return Date.now() > state.timestamp + state.ttl;
  }

  /**
   * 清理过期状态
   */
  private cleanupExpiredStates(): void {
    const expiredIds: string[] = [];

    this.states.forEach((state, id) => {
      if (this.isExpired(state)) {
        expiredIds.push(id);
      }
    });

    expiredIds.forEach(id => this.states.delete(id));
  }

  /**
   * 限制状态数量
   */
  private trimStates(): void {
    if (this.states.size <= this.config.maxStates) return;

    // 按时间戳排序，保留最新的状态
    const sortedStates = Array.from(this.states.entries())
      .sort((a, b) => b[1].timestamp - a[1].timestamp);

    // 保留最新的maxStates个状态
    const toKeep = sortedStates.slice(0, this.config.maxStates);

    this.states.clear();
    toKeep.forEach(([id, state]) => {
      this.states.set(id, state);
    });
  }

  /**
   * 生成状态ID
   */
  private generateStateId(filePath: string): string {
    return `view_${btoa(filePath).replace(/=/g, '')}_${Date.now()}`;
  }

  // ── 公共API ────────────────────────────────────────────────

  /**
   * 保存视图状态
   */
  saveState(
    filePath: string,
    scrollPosition: ScrollPosition,
    zoomLevel: number,
    ttl?: number
  ): ViewState {
    // 查找该文件的现有状态
    const existingState = this.findStateByFile(filePath);

    const state: ViewState = {
      id: existingState?.id || this.generateStateId(filePath),
      filePath,
      scrollPosition,
      zoomLevel,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
    };

    this.states.set(state.id, state);
    this.trimStates();
    this.cleanupExpiredStates();
    this.saveToStorage();
    this.notifyListeners(state);

    return state;
  }

  /**
   * 恢复视图状态
   */
  restoreState(filePath: string): ViewState | null {
    const state = this.findStateByFile(filePath);

    if (!state) {
      return null;
    }

    // 检查是否过期
    if (this.isExpired(state)) {
      this.states.delete(state.id);
      this.saveToStorage();
      return null;
    }

    return state;
  }

  /**
   * 根据文件路径查找状态
   */
  findStateByFile(filePath: string): ViewState | null {
    for (const state of this.states.values()) {
      if (state.filePath === filePath) {
        return state;
      }
    }
    return null;
  }

  /**
   * 根据ID获取状态
   */
  getState(id: string): ViewState | null {
    const state = this.states.get(id);

    if (!state) {
      return null;
    }

    // 检查是否过期
    if (this.isExpired(state)) {
      this.states.delete(id);
      this.saveToStorage();
      return null;
    }

    return state;
  }

  /**
   * 删除状态
   */
  deleteState(id: string): boolean {
    const deleted = this.states.delete(id);

    if (deleted) {
      this.saveToStorage();
    }

    return deleted;
  }

  /**
   * 清空所有状态
   */
  clearStates(): void {
    this.states.clear();
    this.saveToStorage();
  }

  /**
   * 获取所有状态
   */
  getAllStates(): ViewState[] {
    this.cleanupExpiredStates();
    return Array.from(this.states.values());
  }

  /**
   * 获取状态数量
   */
  getStateCount(): number {
    return this.states.size;
  }

  /**
   * 更新状态的TTL
   */
  updateStateTTL(id: string, ttl: number): boolean {
    const state = this.states.get(id);

    if (!state) {
      return false;
    }

    state.ttl = ttl;
    state.timestamp = Date.now();
    this.saveToStorage();

    return true;
  }

  /**
   * 延长状态的生命周期
   */
  extendStateLife(id: string, additionalTTL: number): boolean {
    const state = this.states.get(id);

    if (!state) {
      return false;
    }

    state.ttl = (state.ttl || this.config.defaultTTL) + additionalTTL;
    state.timestamp = Date.now();
    this.saveToStorage();

    return true;
  }

  /**
   * 导出所有状态
   */
  exportStates(): string {
    this.cleanupExpiredStates();
    return JSON.stringify(Array.from(this.states.values()), null, 2);
  }

  /**
   * 导入状态
   */
  importStates(json: string, merge: boolean = false): number {
    try {
      const states: ViewState[] = JSON.parse(json);
      let imported = 0;

      if (!merge) {
        this.states.clear();
      }

      states.forEach(state => {
        if (!this.isExpired(state)) {
          this.states.set(state.id, state);
          imported++;
        }
      });

      this.trimStates();
      this.saveToStorage();

      return imported;
    } catch (error) {
      logger.error('Failed to import states:', error);
      return 0;
    }
  }

  /**
   * 添加监听器
   */
  addListener(listener: (state: ViewState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 通知监听器
   */
  private notifyListeners(state: ViewState): void {
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (e) {
        logger.error('Error in view state listener:', e);
      }
    });
  }

  /**
   * 获取配置
   */
  getConfig(): PersistenceConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<PersistenceConfig>): void {
    this.config = { ...this.config, ...config };
    this.trimStates();
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    total: number;
    expired: number;
    oldestTimestamp: number;
    newestTimestamp: number;
  } {
    const states = Array.from(this.states.values());

    return {
      total: states.length,
      expired: states.filter(s => this.isExpired(s)).length,
      oldestTimestamp: states.length > 0 ? Math.min(...states.map(s => s.timestamp)) : 0,
      newestTimestamp: states.length > 0 ? Math.max(...states.map(s => s.timestamp)) : 0,
    };
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.saveToStorage();
    this.states.clear();
    this.listeners.clear();
  }
}

/**
 * 单例实例
 */
let instance: ViewStatePersistence | null = null;

/**
 * 获取单例实例
 */
export function getViewStatePersistence(
  config?: Partial<PersistenceConfig>
): ViewStatePersistence {
  if (!instance) {
    instance = new ViewStatePersistence(config);
  }
  return instance;
}
