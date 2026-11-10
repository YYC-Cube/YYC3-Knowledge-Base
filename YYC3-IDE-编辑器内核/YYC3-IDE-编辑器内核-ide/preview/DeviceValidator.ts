/**
 * @file: DeviceValidator.ts
 * @description: 设备参数验证模块，验证设备宽度、高度、DPR、User-Agent等参数的有效性
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: validation,device,parameters,dpr,user-agent
 */

// ================================================================
// DeviceValidator — 设备参数验证器
// 确保设备参数在合理范围内
// ================================================================

import type { DevicePreset } from './DevicePresets';

/**
 * 验证结果接口
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误信息 */
  errors: string[];
  /** 警告信息 */
  warnings: string[];
}

/**
 * 设备参数范围
 */
export const DEVICE_RANGES = {
  width: { min: 320, max: 4096 },
  height: { min: 480, max: 4096 },
  dpr: { min: 1, max: 4 },
  scale: { min: 0.1, max: 3.0 }
} as const;

/**
 * 设备参数验证器
 */
export class DeviceValidator {
  /**
   * 验证完整的设备预设
   */
  public static validateDevice(device: Partial<DevicePreset>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证必需字段
    if (!device.id || device.id.trim() === '') {
      errors.push('设备ID不能为空');
    }

    if (!device.name || device.name.trim() === '') {
      errors.push('设备名称不能为空');
    }

    // 验证宽度
    if (device.width !== undefined) {
      const widthValidation = this.validateWidth(device.width);
      if (!widthValidation.valid) {
        errors.push(...widthValidation.errors);
      }
      warnings.push(...widthValidation.warnings);
    } else {
      errors.push('宽度参数缺失');
    }

    // 验证高度
    if (device.height !== undefined) {
      const heightValidation = this.validateHeight(device.height);
      if (!heightValidation.valid) {
        errors.push(...heightValidation.errors);
      }
      warnings.push(...heightValidation.warnings);
    } else {
      errors.push('高度参数缺失');
    }

    // 验证DPR
    if (device.dpr !== undefined) {
      const dprValidation = this.validateDPR(device.dpr);
      if (!dprValidation.valid) {
        errors.push(...dprValidation.errors);
      }
      warnings.push(...dprValidation.warnings);
    } else {
      errors.push('DPR参数缺失');
    }

    // 验证User-Agent
    if (device.userAgent !== undefined) {
      const uaValidation = this.validateUserAgent(device.userAgent);
      if (!uaValidation.valid) {
        errors.push(...uaValidation.errors);
      }
      warnings.push(...uaValidation.warnings);
    }

    // 验证缩放因子
    if (device.scale !== undefined) {
      const scaleValidation = this.validateScale(device.scale);
      if (!scaleValidation.valid) {
        errors.push(...scaleValidation.errors);
      }
      warnings.push(...scaleValidation.warnings);
    }

    // 验证分类
    if (device.category && !['phone', 'tablet', 'desktop', 'wearable'].includes(device.category)) {
      errors.push(`无效的设备分类: ${device.category}`);
    }

    // 宽高比警告
    if (device.width && device.height) {
      const ratio = device.width / device.height;
      if (ratio < 0.3 || ratio > 3.0) {
        warnings.push(`宽高比 ${ratio.toFixed(2)} 较为罕见，请确认参数正确`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证宽度参数
   */
  public static validateWidth(width: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof width !== 'number' || isNaN(width)) {
      errors.push('宽度必须是有效数字');
      return { valid: false, errors, warnings };
    }

    if (width < DEVICE_RANGES.width.min) {
      errors.push(`宽度 ${width}px 小于最小值 ${DEVICE_RANGES.width.min}px`);
    }

    if (width > DEVICE_RANGES.width.max) {
      errors.push(`宽度 ${width}px 大于最大值 ${DEVICE_RANGES.width.max}px`);
    }

    if (width % 1 !== 0) {
      warnings.push(`宽度 ${width}px 不是整数，可能导致渲染问题`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证高度参数
   */
  public static validateHeight(height: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof height !== 'number' || isNaN(height)) {
      errors.push('高度必须是有效数字');
      return { valid: false, errors, warnings };
    }

    if (height < DEVICE_RANGES.height.min) {
      errors.push(`高度 ${height}px 小于最小值 ${DEVICE_RANGES.height.min}px`);
    }

    if (height > DEVICE_RANGES.height.max) {
      errors.push(`高度 ${height}px 大于最大值 ${DEVICE_RANGES.height.max}px`);
    }

    if (height % 1 !== 0) {
      warnings.push(`高度 ${height}px 不是整数，可能导致渲染问题`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证DPR参数
   */
  public static validateDPR(dpr: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof dpr !== 'number' || isNaN(dpr)) {
      errors.push('DPR必须是有效数字');
      return { valid: false, errors, warnings };
    }

    if (dpr < DEVICE_RANGES.dpr.min) {
      errors.push(`DPR ${dpr} 小于最小值 ${DEVICE_RANGES.dpr.min}`);
    }

    if (dpr > DEVICE_RANGES.dpr.max) {
      errors.push(`DPR ${dpr} 大于最大值 ${DEVICE_RANGES.dpr.max}`);
    }

    // 常见DPR值
    const commonDPRs = [1, 1.5, 2, 2.5, 2.625, 2.75, 3, 3.5, 3.75, 4];
    if (!commonDPRs.includes(dpr)) {
      warnings.push(`DPR ${dpr} 不是常见值，请确认设备规格`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证User-Agent字符串
   */
  public static validateUserAgent(userAgent: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof userAgent !== 'string') {
      errors.push('User-Agent必须是字符串');
      return { valid: false, errors, warnings };
    }

    if (userAgent.trim() === '') {
      errors.push('User-Agent不能为空字符串');
      return { valid: false, errors, warnings };
    }

    // 检查User-Agent基本格式
    if (!userAgent.includes('Mozilla/')) {
      warnings.push('User-Agent缺少标准Mozilla前缀');
    }

    // 检查长度
    if (userAgent.length < 20) {
      warnings.push('User-Agent长度过短，可能格式不正确');
    }

    if (userAgent.length > 500) {
      warnings.push('User-Agent长度过长，可能格式不正确');
    }

    // 检查必要的浏览器标识
    const hasBrowser = userAgent.includes('Chrome') ||
                       userAgent.includes('Safari') ||
                       userAgent.includes('Firefox') ||
                       userAgent.includes('Edge');
    if (!hasBrowser) {
      warnings.push('User-Agent缺少浏览器标识');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证缩放因子
   */
  public static validateScale(scale: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof scale !== 'number' || isNaN(scale)) {
      errors.push('缩放因子必须是有效数字');
      return { valid: false, errors, warnings };
    }

    if (scale < DEVICE_RANGES.scale.min) {
      errors.push(`缩放因子 ${scale} 小于最小值 ${DEVICE_RANGES.scale.min}`);
    }

    if (scale > DEVICE_RANGES.scale.max) {
      errors.push(`缩放因子 ${scale} 大于最大值 ${DEVICE_RANGES.scale.max}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 快速验证设备参数是否有效
   */
  public static isValidDevice(device: Partial<DevicePreset>): boolean {
    return this.validateDevice(device).valid;
  }

  /**
   * 获取验证范围
   */
  public static getValidationRanges(): typeof DEVICE_RANGES {
    return { ...DEVICE_RANGES };
  }
}
