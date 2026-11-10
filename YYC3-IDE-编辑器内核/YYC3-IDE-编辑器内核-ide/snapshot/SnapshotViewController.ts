/**
 * @file: SnapshotViewController.ts
 * @description: 快照视图控制器 - 管理快照视图的缩放同步、滚动同步、视图比较
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: snapshot,view,controller,comparison
 */

// ================================================================
// SnapshotViewController - Snapshot view management and synchronization
// ================================================================

import { ZoomController, type ZoomState } from "../preview/ZoomController";

/**
 * 视图位置
 */
export interface ViewPosition {
  /** 滚动位置（X） */
  scrollX: number;
  /** 滚动位置（Y） */
  scrollY: number;
  /** 缩放级别 */
  zoom: number;
}

/**
 * 视图状态
 */
export interface ViewState {
  /** 视图ID */
  viewId: string;
  /** 快照ID */
  snapshotId: string;
  /** 当前位置 */
  position: ViewPosition;
  /** 是否可见 */
  visible: boolean;
  /** 是否激活 */
  active: boolean;
  /** 视图宽度 */
  width: number;
  /** 视图高度 */
  height: number;
}

/**
 * 视图比较配置
 */
export interface ComparisonConfig {
  /** 并排视图模式 */
  sideBySide?: boolean;
  /** 同步滚动 */
  syncScroll?: boolean;
  /** 同步缩放 */
  syncZoom?: boolean;
  /** 显示差异高亮 */
  highlightDiffs?: boolean;
  /** 差异透明度 */
  diffOpacity?: number;
}

/**
 * 快照视图控制器配置
 */
export interface SnapshotViewControllerConfig {
  /** 比较配置 */
  comparisonConfig?: ComparisonConfig;
  /** 缩放控制器配置 */
  zoomConfig?: {
    minZoom?: number;
    maxZoom?: number;
    zoomStep?: number;
  };
  /** 视图变化回调 */
  onViewChange?: (viewId: string, state: ViewState) => void;
  /** 同步状态变化回调 */
  onSyncChange?: (type: "scroll" | "zoom", synced: boolean) => void;
}

/**
 * 快照视图控制器
 *
 * 管理快照的多个视图，支持缩放同步、滚动同步、视图比较
 */
export class SnapshotViewController {
  private config: SnapshotViewControllerConfig;
  private views: Map<string, ViewState>;
  private zoomController: ZoomController;
  private syncScroll: boolean;
  private syncZoom: boolean;

  constructor(config?: SnapshotViewControllerConfig) {
    this.config = {
      comparisonConfig: {
        sideBySide: true,
        syncScroll: true,
        syncZoom: true,
        highlightDiffs: true,
        diffOpacity: 0.5,
      },
      zoomConfig: {
        minZoom: 25,
        maxZoom: 200,
        zoomStep: 25,
      },
      ...config,
    };

    this.syncScroll = (this.config.comparisonConfig as any)?.syncScroll ?? true;
    this.syncZoom = (this.config.comparisonConfig as any)?.syncZoom ?? true;

    this.views = new Map();

    // 初始化缩放控制器
    this.zoomController = new ZoomController({
      initialZoom: 100,
      minZoom: (this.config.zoomConfig as any)?.minZoom,
      maxZoom: (this.config.zoomConfig as any)?.maxZoom,
      zoomStep: (this.config.zoomConfig as any)?.zoomStep,
      onZoomChange: (zoom) => {
        this.handleZoomChange(zoom);
      },
    });
  }

  /**
   * 添加视图
   */
  addView(viewId: string, snapshotId: string, initialPosition?: ViewPosition): void {
    const view: ViewState = {
      viewId,
      snapshotId,
      position: initialPosition || {
        scrollX: 0,
        scrollY: 0,
        zoom: 100,
      },
      visible: true,
      active: false,
      width: 800,
      height: 600,
    };

    this.views.set(viewId, view);

    // 触发回调
    if (this.config.onViewChange) {
      this.config.onViewChange(viewId, { ...view });
    }
  }

  /**
   * 移除视图
   */
  removeView(viewId: string): boolean {
    const removed = this.views.delete(viewId);

    if (removed && this.config.onViewChange) {
      this.config.onViewChange(viewId, {
        viewId,
        snapshotId: "",
        position: { scrollX: 0, scrollY: 0, zoom: 100 },
        visible: false,
        active: false,
        width: 0,
        height: 0,
      });
    }
    return removed;
  }

  /**
   * 更新视图位置
   */
  updateViewPosition(viewId: string, position: Partial<ViewPosition>): boolean {
    const view = this.views.get(viewId);
    if (!view) {
      return false;
    }

    // 更新位置
    const previousPosition = { ...view.position };
    view.position = {
      ...view.position,
      ...position,
    };

    // 同步滚动
    if (
      this.syncScroll &&
      (position.scrollX !== undefined || position.scrollY !== undefined)
    ) {
      this.syncScrollPosition(viewId, previousPosition);
    }

    // 同步缩放
    if (this.syncZoom && position.zoom !== undefined) {
      this.syncZoomLevel(viewId, previousPosition.zoom);
    }

    // 触发回调
    if (this.config.onViewChange) {
      this.config.onViewChange(viewId, { ...view });
    }

    return true;
  }

  /**
   * 更新视图尺寸
   */
  updateViewSize(viewId: string, width: number, height: number): boolean {
    const view = this.views.get(viewId);
    if (!view) {
      return false;
    }

    view.width = width;
    view.height = height;

    // 触发回调
    if (this.config.onViewChange) {
      this.config.onViewChange(viewId, { ...view });
    }

    return true;
  }

  /**
   * 设置视图可见性
   */
  setViewVisible(viewId: string, visible: boolean): boolean {
    const view = this.views.get(viewId);
    if (!view) {
      return false;
    }

    view.visible = visible;

    // 触发回调
    if (this.config.onViewChange) {
      this.config.onViewChange(viewId, { ...view });
    }

    return true;
  }

  /**
   * 激活视图
   */
  activateView(viewId: string): boolean {
    const view = this.views.get(viewId);
    if (!view) {
      return false;
    }

    // 取消其他视图的激活状态
    this.views.forEach((v, vid) => {
      if (vid !== viewId) {
        v.active = false;
      }
    });

    view.active = true;

    // 触发回调
    if (this.config.onViewChange) {
      this.config.onViewChange(viewId, { ...view });
    }

    return true;
  }

  /**
   * 获取视图状态
   */
  getViewState(viewId: string): ViewState | undefined {
    const view = this.views.get(viewId);
    return view ? { ...view } : undefined;
  }

  /**
   * 获取所有视图
   */
  getAllViews(): ViewState[] {
    return Array.from(this.views.values()).map((v) => ({ ...v }));
  }

  /**
   * 同步滚动位置
   */
  private syncScrollPosition(sourceViewId: string, previousPosition: ViewPosition): void {
    const sourceView = this.views.get(sourceViewId);
    if (!sourceView) {
      return;
    }

    const deltaX = sourceView.position.scrollX - previousPosition.scrollX;
    const deltaY = sourceView.position.scrollY - previousPosition.scrollY;

    // 同步到其他视图
    this.views.forEach((view, viewId) => {
      if (viewId !== sourceViewId && view.visible) {
        view.position.scrollX += deltaX;
        view.position.scrollY += deltaY;

        // 限制滚动范围
        view.position.scrollX = Math.max(0, view.position.scrollX);
        view.position.scrollY = Math.max(0, view.position.scrollY);

        if (this.config.onViewChange) {
          this.config.onViewChange(viewId, { ...view });
        }
      }
    });
  }

  /**
   * 同步缩放级别
   */
  private syncZoomLevel(sourceViewId: string, previousZoom: number): void {
    const sourceView = this.views.get(sourceViewId);
    if (!sourceView) {
      return;
    }

    this.zoomController.setZoom(sourceView.position.zoom / 100);

    this.views.forEach((view, viewId) => {
      if (viewId !== sourceViewId && view.visible) {
        view.position.zoom = sourceView.position.zoom;

        if (this.config.onViewChange) {
          this.config.onViewChange(viewId, { ...view });
        }
      }
    });
  }

  /**
   * 处理缩放变化
   */
  private handleZoomChange(zoom: number): void {
    if (!this.syncZoom) {
      return;
    }

    this.views.forEach((view, viewId) => {
      if (view.visible) {
        view.position.zoom = zoom;

        if (this.config.onViewChange) {
          this.config.onViewChange(viewId, { ...view });
        }
      }
    });
  }

  /**
   * 启用/禁用滚动同步
   */
  setSyncScroll(enabled: boolean): void {
    this.syncScroll = enabled;

    if (this.config.onSyncChange) {
      this.config.onSyncChange("scroll", enabled);
    }
  }

  /**
   * 启用/禁用缩放同步
   */
  setSyncZoom(enabled: boolean): void {
    this.syncZoom = enabled;

    if (this.config.onSyncChange) {
      this.config.onSyncChange("zoom", enabled);
    }
  }

  /**
   * 获取同步状态
   */
  getSyncState(): { scroll: boolean; zoom: boolean } {
    return {
      scroll: this.syncScroll,
      zoom: this.syncZoom,
    };
  }

  /**
   * 缩放所有视图到适配
   */
  zoomToFit(containerWidth: number, contentWidth: number): boolean {
    const success = this.zoomController.zoomToFit(containerWidth, contentWidth);

    if (success) {
      const zoom = this.zoomController.getCurrentZoom();

      this.views.forEach((view, viewId) => {
        view.position.zoom = zoom;

        if (this.config.onViewChange) {
          this.config.onViewChange(viewId, { ...view });
        }
      });
    }

    return success;
  }

  /**
   * 重置所有视图缩放
   */
  resetAllZoom(): boolean {
    const success = this.zoomController.resetZoom();

    if (success) {
      const zoom = this.zoomController.getCurrentZoom();

      this.views.forEach((view, viewId) => {
        view.position.zoom = zoom;

        if (this.config.onViewChange) {
          this.config.onViewChange(viewId, { ...view });
        }
      });
    }

    return success;
  }

  /**
   * 放大所有视图
   */
  zoomInAll(): boolean {
    return this.zoomController.zoomIn();
  }

  /**
   * 缩小所有视图
   */
  zoomOutAll(): boolean {
    return this.zoomController.zoomOut();
  }

  /**
   * 获取缩放控制器
   */
  getZoomController(): ZoomController {
    return this.zoomController;
  }

  /**
   * 更新比较配置
   */
  updateComparisonConfig(config: Partial<ComparisonConfig>): void {
    this.config.comparisonConfig = {
      ...this.config.comparisonConfig,
      ...config,
    };

    // 更新同步状态
    if (config.syncScroll !== undefined) {
      this.setSyncScroll(config.syncScroll);
    }

    if (config.syncZoom !== undefined) {
      this.setSyncZoom(config.syncZoom);
    }
  }

  /**
   * 获取比较配置
   */
  getComparisonConfig(): ComparisonConfig {
    return { ...this.config.comparisonConfig! };
  }

  /**
   * 比较两个视图的差异
   */
  compareViews(viewId1: string, viewId2: string): {
    scrollDiff: { x: number; y: number };
    zoomDiff: number;
    hasDifferences: boolean;
  } | null {
    const view1 = this.views.get(viewId1);
    const view2 = this.views.get(viewId2);

    if (!view1 || !view2) {
      return null;
    }

    const scrollDiff = {
      x: view2.position.scrollX - view1.position.scrollX,
      y: view2.position.scrollY - view1.position.scrollY,
    };

    const zoomDiff = view2.position.zoom - view1.position.zoom;

    const hasDifferences =
      scrollDiff.x !== 0 ||
      scrollDiff.y !== 0 ||
      Math.abs(zoomDiff) > 0.01;

    return {
      scrollDiff,
      zoomDiff,
      hasDifferences,
    };
  }

  /**
   * 清空所有视图
   */
  clearAllViews(): void {
    this.views.clear();
  }

  /**
   * 获取视图数量
   */
  getViewCount(): number {
    return this.views.size;
  }

  /**
   * 获取激活的视图ID
   */
  getActiveViewId(): string | undefined {
    for (const [viewId, view] of this.views.entries()) {
      if (view.active) {
        return viewId;
      }
    }
    return undefined;
  }

  /**
   * 销毁控制器
   */
  destroy(): void {
    this.clearAllViews();
    this.zoomController.destroy();
    this.config.onViewChange = undefined;
    this.config.onSyncChange = undefined;
  }
}
