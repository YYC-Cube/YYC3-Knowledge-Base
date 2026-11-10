/**
 * @file: ZoomController.ts
 * @description: 视图缩放控制器 - 管理预览视图的缩放级别、范围验证、步进控制
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: preview,zoom,controller,view
 */

// ================================================================
// ZoomController - View zoom level control and management
// ================================================================

import { logger } from "../services/Logger";

/**
 * 缩放级别类型
 */
export type ZoomLevel =
  | "25"
  | "50"
  | "75"
  | "100"
  | "125"
  | "150"
  | "175"
  | "200"
  | "custom";

/**
 * 缩放控制器配置
 */
export interface ZoomControllerConfig {
  /** 初始缩放级别 */
  initialZoom?: ZoomLevel | number;
  /** 最小缩放级别（百分比） */
  minZoom?: number;
  /** 最大缩放级别（百分比） */
  maxZoom?: number;
  /** 缩放步进（百分比） */
  zoomStep?: number;
  /** 是否允许自定义缩放 */
  allowCustomZoom?: boolean;
  /** 缩放变化回调 */
  onZoomChange?: (zoom: number) => void;
  /** 缩放限制回调 */
  onZoomLimit?: (zoom: number, isMax: boolean) => void;
}

/**
 * 缩放状态
 */
export interface ZoomState {
  /** 当前缩放级别（百分比） */
  currentZoom: number;
  /** 是否为自定义缩放 */
  isCustom: boolean;
  /** 是否达到最小值 */
  isAtMin: boolean;
  /** 是否达到最大值 */
  isAtMax: boolean;
  /** 缩放历史记录 */
  history: number[];
  /** 历史记录索引 */
  historyIndex: number;
}

/**
 * 视图缩放控制器
 *
 * 管理预览视图的缩放级别，支持预设值和自定义值
 */
export class ZoomController {
  private config: ZoomControllerConfig;
  private state: ZoomState;
  private readonly PRESET_ZOOMS: number[] = [25, 50, 75, 100, 125, 150, 175, 200];

  constructor(config?: ZoomControllerConfig) {
    this.config = {
      initialZoom: 100,
      minZoom: 25,
      maxZoom: 200,
      zoomStep: 25,
      allowCustomZoom: true,
      ...config,
    };

    // 初始化状态
    const initialZoomValue = this.parseInitialZoom(this.config.initialZoom as any);
    this.state = {
      currentZoom: initialZoomValue,
      isCustom: !this.PRESET_ZOOMS.includes(initialZoomValue),
      isAtMin: initialZoomValue <= this.config.minZoom!,
      isAtMax: initialZoomValue >= this.config.maxZoom!,
      history: [initialZoomValue],
      historyIndex: 0,
    };
  }

  /**
   * 解析初始缩放值
   */
  private parseInitialZoom(initial: ZoomLevel | number): number {
    if (typeof initial === "number") {
      return this.clampZoom(initial);
    }

    // 预设值
    return this.clampZoom(parseInt(initial, 10));
  }

  /**
   * 设置缩放级别
   */
  getZoom(): number {
    return this.state.currentZoom / 100;
  }

  setZoom(zoom: number): boolean {
    const percentZoom = zoom <= 5 ? zoom * 100 : zoom;
    if (percentZoom < this.config.minZoom! || percentZoom > (this.config.maxZoom as any)) {
      return false;
    }

    const previousZoom = this.state.currentZoom;
    this.state.currentZoom = percentZoom;
    this.state.isCustom = !this.PRESET_ZOOMS.includes(percentZoom);
    this.state.isAtMin = percentZoom <= this.config.minZoom!;
    this.state.isAtMax = percentZoom >= this.config.maxZoom!;

    this.addToHistory(percentZoom);

    if (this.config.onZoomChange && percentZoom !== previousZoom) {
      this.config.onZoomChange(percentZoom);
    }

    return true;
  }

  /**
   * 增加缩放（放大）
   */
  zoomIn(): boolean {
    if (this.state.isAtMax) {
      this.notifyZoomLimit(this.state.currentZoom, true);
      return false;
    }

    const newZoom = Math.min(
      this.state.currentZoom + this.config.zoomStep!,
      this.config.maxZoom as any);

    return this.setZoom(newZoom / 100);
  }

  zoomOut(): boolean {
    if (this.state.isAtMin) {
      this.notifyZoomLimit(this.state.currentZoom, false);
      return false;
    }

    const newZoom = Math.max(
      this.state.currentZoom - this.config.zoomStep!,
      this.config.minZoom as any);

    return this.setZoom(newZoom / 100);
  }

  resetZoom(): boolean {
    return this.setZoom(1.0);
  }

  setPresetZoom(level: ZoomLevel): boolean {
    const zoomValue = parseInt(level, 10);
    return this.setZoom(zoomValue / 100);
  }

  /**
   * 获取下一个预设缩放级别（放大）
   */
  getNextPresetZoom(): number | null {
    for (const preset of this.PRESET_ZOOMS) {
      if (preset > this.state.currentZoom) {
        return Math.min(preset, this.config.maxZoom as any);
      }
    }
    return null;
  }

  /**
   * 获取上一个预设缩放级别（缩小）
   */
  getPreviousPresetZoom(): number | null {
    for (let i = this.PRESET_ZOOMS.length - 1; i >= 0; i--) {
      const preset = this.PRESET_ZOOMS[i];
      if (preset < this.state.currentZoom) {
        return Math.max(preset, this.config.minZoom as any);
      }
    }
    return null;
  }

  /**
   * 缩放到适配视图
   */
  zoomToFit(containerWidth: number, contentWidth: number): boolean {
    const zoom = (containerWidth / contentWidth) * 100;
    const clampedZoom = this.clampZoom(Math.round(zoom / 5) * 5);
    return this.setZoom(clampedZoom / 100);
  }

  zoomToWidth(containerWidth: number, contentWidth: number): boolean {
    return this.zoomToFit(containerWidth, contentWidth);
  }

  zoomToHeight(containerHeight: number, contentHeight: number): boolean {
    const zoom = (containerHeight / contentHeight) * 100;
    const clampedZoom = this.clampZoom(Math.round(zoom / 5) * 5);
    return this.setZoom(clampedZoom / 100);
  }

  /**
   * 限制缩放值在有效范围内
   */
  clampZoom(zoom: number): number {
    return Math.max(
      this.config.minZoom!,
      Math.min(zoom, this.config.maxZoom as any)
    );
  }

  setZoomLevel(level: number): boolean {
    return this.setZoom(level);
  }

  getZoomLevel(): number {
    return this.getZoom();
  }

  getMaxZoomLevel(): number {
    return this.config.maxZoom! / 100;
  }

  getMinZoomLevel(): number {
    return this.config.minZoom! / 100;
  }

  /**
   * 验证缩放值是否有效
   */
  isValidZoom(zoom: number): boolean {
    return zoom >= this.config.minZoom! && zoom <= this.config.maxZoom!;
  }

  /**
   * 通知缩放限制
   */
  private notifyZoomLimit(zoom: number, isMax: boolean): void {
    if (this.config.onZoomLimit) {
      this.config.onZoomLimit(zoom, isMax);
    }

    logger.warn(
      `Zoom ${zoom}% is at ${isMax ? "maximum" : "minimum"} limit`,
      undefined,
      "ZoomController"
    );
  }

  /**
   * 添加到历史记录
   */
  private addToHistory(zoom: number): void {
    // 移除当前索引之后的历史
    this.state.history = this.state.history.slice(0, this.state.historyIndex + 1);

    // 添加新的缩放值
    this.state.history.push(zoom);
    this.state.historyIndex = this.state.history.length - 1;

    // 限制历史记录长度
    if (this.state.history.length > 50) {
      this.state.history.shift();
      this.state.historyIndex--;
    }
  }

  /**
   * 撤销缩放
   */
  undoZoom(): boolean {
    if (this.state.historyIndex <= 0) {
      return false;
    }

    this.state.historyIndex--;
    const zoom = this.state.history[this.state.historyIndex];

    // 更新当前缩放（不触发历史记录）
    const previousZoom = this.state.currentZoom;
    this.state.currentZoom = zoom;
    this.state.isCustom = !this.PRESET_ZOOMS.includes(zoom);
    this.state.isAtMin = zoom <= this.config.minZoom!;
    this.state.isAtMax = zoom >= this.config.maxZoom!;

    // 触发回调
    if (this.config.onZoomChange && zoom !== previousZoom) {
      this.config.onZoomChange(zoom);
    }

    return true;
  }

  /**
   * 重做缩放
   */
  redoZoom(): boolean {
    if (this.state.historyIndex >= this.state.history.length - 1) {
      return false;
    }

    this.state.historyIndex++;
    const zoom = this.state.history[this.state.historyIndex];

    // 更新当前缩放（不触发历史记录）
    const previousZoom = this.state.currentZoom;
    this.state.currentZoom = zoom;
    this.state.isCustom = !this.PRESET_ZOOMS.includes(zoom);
    this.state.isAtMin = zoom <= this.config.minZoom!;
    this.state.isAtMax = zoom >= this.config.maxZoom!;

    // 触发回调
    if (this.config.onZoomChange && zoom !== previousZoom) {
      this.config.onZoomChange(zoom);
    }

    return true;
  }

  /**
   * 清空历史记录
   */
  clearHistory(): void {
    this.state.history = [this.state.currentZoom];
    this.state.historyIndex = 0;
  }

  /**
   * 获取当前状态
   */
  getState(): Readonly<ZoomState> {
    return { ...this.state };
  }

  /**
   * 获取当前缩放级别
   */
  getCurrentZoom(): number {
    return this.state.currentZoom;
  }

  /**
   * 获取缩放比例（用于CSS transform）
   */
  getScale(): number {
    return this.state.currentZoom / 100;
  }

  /**
   * 是否可以放大
   */
  canZoomIn(): boolean {
    return !this.state.isAtMax;
  }

  /**
   * 是否可以缩小
   */
  canZoomOut(): boolean {
    return !this.state.isAtMin;
  }

  /**
   * 是否可以撤销
   */
  canUndo(): boolean {
    return this.state.historyIndex > 0;
  }

  /**
   * 是否可以重做
   */
  canRedo(): boolean {
    return this.state.historyIndex < this.state.history.length - 1;
  }

  /**
   * 获取所有预设缩放级别
   */
  getPresetZooms(): number[] {
    return [...this.PRESET_ZOOMS];
  }

  /**
   * 获取配置
   */
  getConfig(): Readonly<ZoomControllerConfig> {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(partialConfig: Partial<ZoomControllerConfig>): void {
    this.config = { ...this.config, ...partialConfig };

    // 如果当前缩放超出新范围，调整到范围内
    if (!this.isValidZoom(this.state.currentZoom)) {
      this.setZoom(this.clampZoom(this.state.currentZoom) / 100);
    }
  }

  /**
   * 销毁控制器
   */
  destroy(): void {
    this.clearHistory();
    this.config.onZoomChange = undefined;
    this.config.onZoomLimit = undefined;
  }

  getZoomPercentage(): string {
    return `${Math.round(this.state.currentZoom)}%`;
  }

  getZoomPresets(): number[] {
    return [...this.PRESET_ZOOMS];
  }

  addListener(listener: (zoom: number) => void): () => void {
    const originalCallback = this.config.onZoomChange;
    this.config.onZoomChange = (zoom: number) => {
      listener(zoom);
      if (originalCallback) originalCallback(zoom);
    };
    return () => {
      this.config.onZoomChange = originalCallback;
    };
  }

  setTargetElement(element: HTMLElement): void {
    /* empty */
  }

  fitToWidth(width: number): void {
    /* empty */
  }

  fitToHeight(height: number): void {
    /* empty */
  }

  fitToContainer(width: number, height: number): void {
    /* empty */
  }

  exportState(): { zoom: number; percentage: string } {
    return {
      zoom: this.getZoom(),
      percentage: this.getZoomPercentage(),
    };
  }

  importState(state: { zoom: number }): void {
    if (state.zoom !== undefined) {
      this.setZoom(state.zoom);
    }
  }
}

export const ZOOM_PRESETS: Record<string, number> = {
  '25%': 0.25,
  '50%': 0.5,
  '75%': 0.75,
  '100%': 1.0,
  '125%': 1.25,
  '150%': 1.5,
  '175%': 1.75,
  '200%': 2.0,
};

let zoomControllerInstance: ZoomController | null = null;

export function getZoomController(): ZoomController {
  if (!zoomControllerInstance) {
    zoomControllerInstance = new ZoomController();
  }
  return zoomControllerInstance;
}

export function setupZoomKeyboardShortcuts(controller: ZoomController): () => void {
  const handler = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey) {
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        controller.zoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        controller.zoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        controller.resetZoom();
      }
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}
