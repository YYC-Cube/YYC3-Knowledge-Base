// @ts-nocheck
/**
 * @file: FontSizeValidator.ts
 * @description: 字体大小验证器 - 验证字体大小的范围、格式等
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: theme,font-size,validator
 */

// ================================================================
// FontSizeValidator - Font size validation and normalization
// ================================================================

/**
 * 字体大小验证结果
 */
export interface FontSizeValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 标准化后的值（像素） */
  normalized?: number;
  /** 原始值 */
  original?: string;
  /** 错误信息 */
  error?: string;
  /** 单位 */
  unit?: "px" | "em" | "rem" | "pt" | "percentage";
}

/**
 * 字体大小验证器配置
 */
export interface FontSizeValidatorConfig {
  /** 最小字体大小（像素） */
  minSizePx?: number;
  /** 最大字体大小（像素） */
  maxSizePx?: number;
  /** 默认字体大小（像素） */
  defaultSizePx?: number;
  /** 是否允许负值 */
  allowNegative?: boolean;
  /** 是否允许零 */
  allowZero?: boolean;
}

/**
 * 字体大小验证器
 *
 * 提供字体大小范围检查、格式验证、标准化等功能
 */
export class FontSizeValidator {
  private config: FontSizeValidatorConfig;

  constructor(config?: FontSizeValidatorConfig) {
    this.config = {
      minSizePx: 8, // 最小8px
      maxSizePx: 128, // 最大128px
      defaultSizePx: 16, // 默认16px
      allowNegative: false,
      allowZero: false,
      ...config,
    };
  }

  /**
   * 验证字体大小
   */
  validateFontSize(size: string | number): FontSizeValidationResult {
    // 处理空值
    if (size === null || size === undefined || size === "") {
      return this.handleEmptySize();
    }

    // 转换为字符串
    const sizeStr = String(size).trim();

    // 尝试解析为数字
    const numberResult = this.parseNumber(sizeStr);
    if (numberResult) {
      return this.validateSizeValue(numberResult.value, numberResult.unit, sizeStr);
    }

    // 解析失败
    return {
      valid: false,
      original: sizeStr,
      error: `Invalid font size format: ${sizeStr}. Expected format: 12px, 1.5em, 1.2rem, 14pt, or 120%`,
    };
  }

  /**
   * 处理空字体大小
   */
  private handleEmptySize(): FontSizeValidationResult {
    return {
      valid: false,
      error: "Font size cannot be empty",
    };
  }

  /**
   * 解析数字和单位
   */
  private parseNumber(
    sizeStr: string
  ): { value: number; unit: "px" | "em" | "rem" | "pt" | "percentage" | "none" } | null {
    // 尝试直接解析为数字（无单位，默认px）
    if (/^-?\d+(\.\d+)?$/.test(sizeStr)) {
      const value = parseFloat(sizeStr);
      return { value, unit: "none" };
    }

    // 解析带单位
    const unitRegex = /^(-?\d+(\.\d+)?)\s*(px|em|rem|pt|%)$/i;
    const match = sizeStr.match(unitRegex);

    if (!match) {
      if (/^NaN/i.test(sizeStr)) {
        return { value: NaN, unit: "px" };
      }
      return null;
    }

    const value = parseFloat(match[1]);
    if (isNaN(value)) {
      return { value: NaN, unit: "px" };
    }
    const unitStr = match[3].toLowerCase();

    // 映射单位
    const unitMap: Record<string, "px" | "em" | "rem" | "pt" | "percentage"> = {
      px: "px",
      em: "em",
      rem: "rem",
      pt: "pt",
      "%": "percentage",
    };

    return {
      value,
      unit: unitMap[unitStr],
    };
  }

  /**
   * 验证字体大小值
   */
  private validateSizeValue(
    value: number,
    unit: "px" | "em" | "rem" | "pt" | "percentage" | "none",
    original: string
  ): FontSizeValidationResult {
    // 检查NaN
    if (isNaN(value)) {
      return {
        valid: false,
        original,
        error: "Font size is not a valid number",
      };
    }

    // 检查负值
    if (value < 0 && !this.config.allowNegative) {
      return {
        valid: false,
        original,
        error: `Font size cannot be negative: ${value}`,
      };
    }

    // 检查零值
    if (value === 0 && !this.config.allowZero) {
      return {
        valid: false,
        original,
        error: "Font size cannot be zero",
      };
    }

    // 转换为像素进行比较
    const pxValue = this.convertToPixels(value, unit);

    if (pxValue < this.config.minSizePx! && !this.config.allowNegative && !this.config.allowZero) {
      return {
        valid: false,
        original,
        error: `Font size too small: ${original} (${pxValue.toFixed(1)}px). Minimum is ${this.config.minSizePx}px`,
      };
    }

    // 检查最大值
    if (pxValue > (this.config.maxSizePx as any)) {
      return {
        valid: false,
        original,
        error: `Font size too large: ${original} (${pxValue.toFixed(1)}px). Maximum is ${this.config.maxSizePx}px`,
      };
    }

    return {
      valid: true,
      normalized: pxValue,
      original,
      unit,
    };
  }

  /**
   * 转换为像素
   */
  private convertToPixels(
    value: number,
    unit: "px" | "em" | "rem" | "pt" | "percentage" | "none"
  ): number {
    switch (unit) {
      case "px":
      case "none":
        return value;
      case "em":
      case "rem":
        // 假设基准字体大小为16px
        return value * 16;
      case "pt":
        return (value * 96) / 72; // 1pt = 1/72英寸 = 96/72像素
      case "percentage":
        return (value / 100) * 16; // 假设基准字体大小为16px
      default:
        return value;
    }
  }

  /**
   * 获取默认字体大小
   */
  getDefaultFontSize(): string {
    return `${this.config.defaultSizePx}px`;
  }

  /**
   * 验证并返回字体大小（失败时返回默认值）
   */
  validateOrDefault(size: string | number): string {
    const result = this.validateFontSize(size);
    return result.valid
      ? result.unit === "none"
        ? `${result.normalized}px`
        : result.original || this.getDefaultFontSize()
      : this.getDefaultFontSize();
  }

  /**
   * 获取字体大小范围
   */
  getRange(): { min: number; max: number; default: number } {
    return {
      min: this.config.minSizePx!,
      max: this.config.maxSizePx!,
      default: this.config.defaultSizePx!,
    };
  }

  /**
   * 检查是否在范围内
   */
  isInRange(size: string | number): boolean {
    const result = this.validateFontSize(size);
    return result.valid;
  }

  /**
   * 截断到有效范围
   */
  clampToRange(size: string | number): string {
    if (size === null || size === undefined || size === "") {
      return this.getDefaultFontSize();
    }

    const sizeStr = String(size).trim();
    const numberResult = this.parseNumber(sizeStr);

    if (!numberResult || isNaN(numberResult.value)) {
      return this.getDefaultFontSize();
    }

    const pxValue = this.convertToPixels(numberResult.value, numberResult.unit);

    if (pxValue < (this.config.minSizePx as any)) {
      return `${this.config.minSizePx}px`;
    }

    if (pxValue > (this.config.maxSizePx as any)) {
      return `${this.config.maxSizePx}px`;
    }

    return sizeStr;
  }

  validate(size: string): { valid: boolean; error?: string } {
    if (!size || typeof size !== 'string') {
      return { valid: false, error: 'Invalid font size' };
    }

    const trimmed = size.trim();
    if (trimmed.startsWith('-')) {
      return { valid: false, error: 'font size cannot be negative' };
    }

    const numberResult = this.parseNumber(trimmed);
    if (!numberResult || isNaN(numberResult.value)) {
      return { valid: false, error: 'Invalid font size format' };
    }

    const pxValue = this.convertToPixels(numberResult.value, numberResult.unit);

    if (pxValue < (this.config.minSizePx as any)) {
      return { valid: false, error: 'font size is below minimum' };
    }

    if (pxValue > (this.config.maxSizePx as any)) {
      return { valid: false, error: 'font size exceeds maximum' };
    }

    if (numberResult.unit === 'em' && numberResult.value < 0.5) {
      return { valid: false, error: 'font size is too small' };
    }

    return { valid: true };
  }

  destroy(): void {
    /* empty */
  }
}
