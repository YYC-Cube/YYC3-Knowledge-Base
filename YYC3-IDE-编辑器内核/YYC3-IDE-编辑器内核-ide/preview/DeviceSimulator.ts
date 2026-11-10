/**
 * @file: DeviceSimulator.ts
 * @description: 设备模拟引擎核心，提供设备切换、旋转、DPR设置、User-Agent注入等功能
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: device,simulator,emulator,preview,responsive
 */

// ================================================================
// DeviceSimulator — 设备模拟引擎
// 核心功能：设备切换、参数应用、旋转模拟
// ================================================================

import type { DevicePreset, DeviceCategory } from './DevicePresets';
import { DEVICE_PRESETS, getDeviceById } from './DevicePresets';
import { DeviceValidator, type ValidationResult } from './DeviceValidator';
import { logger } from "../services/Logger";

/**
 * 设备方向
 */
export type DeviceOrientation = 'portrait' | 'landscape';

/**
 * 设备状态
 */
export interface DeviceState {
  /** 当前设备预设 */
  device: DevicePreset | null;
  /** 当前宽度 */
  width: number;
  /** 当前高度 */
  height: number;
  /** 当前DPR */
  dpr: number;
  /** 当前User-Agent */
  userAgent: string;
  /** 当前方向 */
  orientation: DeviceOrientation;
  /** 是否旋转锁定 */
  rotationLocked: boolean;
  /** 缩放级别 */
  scale: number;
}

/**
 * 设备变更监听器
 */
export type DeviceChangeListener = (state: DeviceState) => void;

/**
 * 设备模拟引擎配置
 */
export interface DeviceSimulatorConfig {
  /** 默认设备ID */
  defaultDeviceId?: string;
  /** 是否自动应用User-Agent */
  applyUserAgent?: boolean;
  /** 是否自动设置DPR */
  applyDPR?: boolean;
  /** 是否持久化状态 */
  persistState?: boolean;
  /** 存储键名 */
  storageKey?: string;
}

/**
 * 设备模拟引擎
 * 单例模式，管理设备模拟的完整生命周期
 */
export class DeviceSimulator {
  private static instance: DeviceSimulator | null = null;

  /** 当前设备状态 */
  private state: DeviceState;

  /** 设备变更监听器 */
  private listeners: Set<DeviceChangeListener> = new Set();

  /** 自定义设备预设 */
  private customDevices: Map<string, DevicePreset> = new Map();

  /** 配置选项 */
  private config: Required<DeviceSimulatorConfig>;

  /**
   * 私有构造函数
   */
  private constructor(config: DeviceSimulatorConfig = {}) {
    this.config = {
      defaultDeviceId: config.defaultDeviceId || 'desktop-hd',
      applyUserAgent: config.applyUserAgent ?? true,
      applyDPR: config.applyDPR ?? true,
      persistState: config.persistState ?? true,
      storageKey: config.storageKey || 'device-simulator-state'
    };

    // 初始化状态
    const defaultDevice = getDeviceById(this.config.defaultDeviceId) || DEVICE_PRESETS[0];

    this.state = {
      device: defaultDevice,
      width: defaultDevice.width,
      height: defaultDevice.height,
      dpr: defaultDevice.dpr,
      userAgent: defaultDevice.userAgent,
      orientation: 'portrait',
      rotationLocked: false,
      scale: 1
    };

    // 恢复持久化状态
    if (this.config.persistState) {
      this.loadState();
    }
  }

  /**
   * 获取单例实例
   */
  public static getInstance(config?: DeviceSimulatorConfig): DeviceSimulator {
    if (!DeviceSimulator.instance) {
      DeviceSimulator.instance = new DeviceSimulator(config);
    }
    return DeviceSimulator.instance;
  }

  /**
   * 重置单例实例
   */
  public static resetInstance(): void {
    if (DeviceSimulator.instance) {
      DeviceSimulator.instance.cleanup();
      DeviceSimulator.instance = null;
    }
  }

  // ==================== 设备管理 ====================

  /**
   * 应用设备预设
   */
  public applyDevice(deviceId: string): ValidationResult {
    const device = this.getDevice(deviceId);

    if (!device) {
      return {
        valid: false,
        errors: [`设备未找到: ${deviceId}`],
        warnings: []
      };
    }

    // 验证设备参数
    const validation = DeviceValidator.validateDevice(device);
    if (!validation.valid) {
      return validation;
    }

    // 应用设备参数
    this.state.device = device;
    this.state.width = device.width;
    this.state.height = device.height;
    this.state.dpr = device.dpr;
    this.state.userAgent = device.userAgent;

    // 根据设备特性设置方向
    if (device.width > device.height) {
      this.state.orientation = 'landscape';
    } else {
      this.state.orientation = 'portrait';
    }

    // 应用到预览环境
    this.applyToEnvironment();

    // 保存状态
    this.saveState();

    // 通知监听器
    this.notifyListeners();

    return validation;
  }

  /**
   * 设置自定义设备参数
   */
  public setCustomDevice(params: Partial<DevicePreset>): ValidationResult {
    const device: DevicePreset = {
      id: params.id || `custom-${Date.now()}`,
      name: params.name || 'Custom Device',
      vendor: params.vendor || 'Custom',
      category: params.category || 'phone',
      width: params.width || 375,
      height: params.height || 667,
      dpr: params.dpr || 2,
      userAgent: params.userAgent || 'Mozilla/5.0',
      ...params
    };

    // 验证设备参数
    const validation = DeviceValidator.validateDevice(device);
    if (!validation.valid) {
      return validation;
    }

    // 添加到自定义设备库
    this.customDevices.set(device.id, device);

    // 应用自定义设备
    return this.applyDevice(device.id);
  }

  /**
   * 获取设备预设（包含自定义设备）
   */
  public getDevice(deviceId: string): DevicePreset | undefined {
    // 优先查找自定义设备
    if (this.customDevices.has(deviceId)) {
      return this.customDevices.get(deviceId);
    }
    // 然后查找预设设备
    return getDeviceById(deviceId);
  }

  /**
   * 获取所有设备（包含自定义设备）
   */
  public getAllDevices(): DevicePreset[] {
    const presetDevices = [...DEVICE_PRESETS];
    const customDevices = Array.from(this.customDevices.values());
    return [...presetDevices, ...customDevices];
  }

  /**
   * 获取指定分类的设备
   */
  public getDevicesByCategory(category: DeviceCategory): DevicePreset[] {
    return this.getAllDevices().filter(device => device.category === category);
  }

  // ==================== 尺寸和方向 ====================

  /**
   * 调整预览窗口尺寸
   */
  public resize(width: number, height: number): ValidationResult {
    const widthValidation = DeviceValidator.validateWidth(width);
    const heightValidation = DeviceValidator.validateHeight(height);

    const errors = [...widthValidation.errors, ...heightValidation.errors];
    const warnings = [...widthValidation.warnings, ...heightValidation.warnings];

    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    this.state.width = width;
    this.state.height = height;
    this.state.device = null; // 清除设备关联

    // 更新方向
    if (width > height) {
      this.state.orientation = 'landscape';
    } else {
      this.state.orientation = 'portrait';
    }

    this.applyToEnvironment();
    this.saveState();
    this.notifyListeners();

    return { valid: true, errors, warnings };
  }

  /**
   * 旋转设备
   */
  public rotate(): void {
    if (this.state.rotationLocked) {
      return;
    }

    const { width, height } = this.state;
    this.state.width = height;
    this.state.height = width;
    this.state.orientation = this.state.orientation === 'portrait' ? 'landscape' : 'portrait';

    this.applyToEnvironment();
    this.saveState();
    this.notifyListeners();
  }

  /**
   * 设置设备方向
   */
  public setOrientation(orientation: DeviceOrientation): void {
    if (this.state.orientation === orientation) {
      return;
    }

    this.rotate();
  }

  /**
   * 锁定/解锁旋转
   */
  public setRotationLocked(locked: boolean): void {
    this.state.rotationLocked = locked;
    this.notifyListeners();
  }

  // ==================== DPR和缩放 ====================

  /**
   * 设置设备像素比（DPR）
   */
  public setDPR(dpr: number): ValidationResult {
    const validation = DeviceValidator.validateDPR(dpr);

    if (!validation.valid) {
      return validation;
    }

    this.state.dpr = dpr;
    this.state.device = null; // 清除设备关联

    if (this.config.applyDPR) {
      this.applyDPRToEnvironment();
    }

    this.saveState();
    this.notifyListeners();

    return validation;
  }

  /**
   * 设置缩放级别
   */
  public setScale(scale: number): ValidationResult {
    const validation = DeviceValidator.validateScale(scale);

    if (!validation.valid) {
      return validation;
    }

    this.state.scale = scale;
    this.applyToEnvironment();
    this.saveState();
    this.notifyListeners();

    return validation;
  }

  // ==================== User-Agent ====================

  /**
   * 设置User-Agent
   */
  public setUserAgent(userAgent: string): ValidationResult {
    const validation = DeviceValidator.validateUserAgent(userAgent);

    if (!validation.valid) {
      return validation;
    }

    this.state.userAgent = userAgent;
    this.state.device = null; // 清除设备关联

    if (this.config.applyUserAgent) {
      this.applyUserAgentToEnvironment();
    }

    this.saveState();
    this.notifyListeners();

    return validation;
  }

  // ==================== 状态管理 ====================

  /**
   * 获取当前设备状态
   */
  public getState(): Readonly<DeviceState> {
    return { ...this.state };
  }

  /**
   * 重置到默认状态
   */
  public reset(): void {
    const defaultDevice = getDeviceById(this.config.defaultDeviceId) || DEVICE_PRESETS[0];

    this.state = {
      device: defaultDevice,
      width: defaultDevice.width,
      height: defaultDevice.height,
      dpr: defaultDevice.dpr,
      userAgent: defaultDevice.userAgent,
      orientation: 'portrait',
      rotationLocked: false,
      scale: 1
    };

    this.applyToEnvironment();
    this.saveState();
    this.notifyListeners();
  }

  /**
   * 重置到指定设备
   */
  public resetToDevice(deviceId: string): ValidationResult {
    return this.applyDevice(deviceId);
  }

  // ==================== 监听器管理 ====================

  /**
   * 添加设备变更监听器
   */
  public addListener(listener: DeviceChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 移除设备变更监听器
   */
  public removeListener(listener: DeviceChangeListener): void {
    this.listeners.delete(listener);
  }

  /**
   * 清除所有监听器
   */
  public clearListeners(): void {
    this.listeners.clear();
  }

  // ==================== 私有方法 ====================

  /**
   * 应用到预览环境
   */
  private applyToEnvironment(): void {
    // 应用尺寸到iframe或预览容器
    this.applySizeToEnvironment();

    // 应用DPR
    if (this.config.applyDPR) {
      this.applyDPRToEnvironment();
    }

    // 应用User-Agent
    if (this.config.applyUserAgent) {
      this.applyUserAgentToEnvironment();
    }
  }

  /**
   * 应用尺寸到环境
   */
  private applySizeToEnvironment(): void {
    // 这里应该与实际的预览容器集成
    // 发送自定义事件，让预览组件响应
    const event = new CustomEvent('deviceResize', {
      detail: {
        width: this.state.width,
        height: this.state.height,
        scale: this.state.scale
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * 应用DPR到环境
   */
  private applyDPRToEnvironment(): void {
    // 设置window.devicePixelRatio（注意：这是只读的，只能通过其他方式模拟）
    const event = new CustomEvent('deviceDPRChange', {
      detail: { dpr: this.state.dpr }
    });
    window.dispatchEvent(event);
  }

  /**
   * 应用User-Agent到环境
   */
  private applyUserAgentToEnvironment(): void {
    // 在iframe中注入User-Agent
    const event = new CustomEvent('deviceUserAgentChange', {
      detail: { userAgent: this.state.userAgent }
    });
    window.dispatchEvent(event);
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        logger.error('设备变更监听器执行错误:', error);
      }
    });
  }

  /**
   * 保存状态到localStorage
   */
  private saveState(): void {
    if (!this.config.persistState) return;

    try {
      const stateData = {
        deviceId: this.state.device?.id,
        width: this.state.width,
        height: this.state.height,
        dpr: this.state.dpr,
        userAgent: this.state.userAgent,
        orientation: this.state.orientation,
        rotationLocked: this.state.rotationLocked,
        scale: this.state.scale
      };

      localStorage.setItem(this.config.storageKey, JSON.stringify(stateData));
    } catch (error) {
      logger.warn('保存设备状态失败:', error);
    }
  }

  /**
   * 从localStorage加载状态
   */
  private loadState(): void {
    try {
      const saved = localStorage.getItem(this.config.storageKey);
      if (!saved) return;

      const stateData = JSON.parse(saved);

      // 恢复设备
      if (stateData.deviceId) {
        const device = this.getDevice(stateData.deviceId);
        if (device) {
          this.state.device = device;
        }
      }

      // 恢复其他参数
      if (stateData.width) this.state.width = stateData.width;
      if (stateData.height) this.state.height = stateData.height;
      if (stateData.dpr) this.state.dpr = stateData.dpr;
      if (stateData.userAgent) this.state.userAgent = stateData.userAgent;
      if (stateData.orientation) this.state.orientation = stateData.orientation;
      if (stateData.rotationLocked !== undefined) this.state.rotationLocked = stateData.rotationLocked;
      if (stateData.scale) this.state.scale = stateData.scale;

    } catch (error) {
      logger.warn('加载设备状态失败:', error);
    }
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    this.clearListeners();
    this.customDevices.clear();
  }
}

/**
 * 导出便捷函数
 */
export function createDeviceSimulator(config?: DeviceSimulatorConfig): DeviceSimulator {
  return DeviceSimulator.getInstance(config);
}

export function getDeviceSimulator(): DeviceSimulator {
  return DeviceSimulator.getInstance();
}
