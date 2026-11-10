/**
 * @file: ColorValidator.ts
 * @description: 颜色验证器 - 验证颜色值的格式、有效性、对比度等
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: theme,color,validator,accessibility
 */

// ================================================================
// ColorValidator - Color value validation and contrast calculation
// ================================================================

/**
 * 颜色格式类型
 */
export type ColorFormat =
  | "hex"
  | "rgb"
  | "hsl"
  | "oklch"
  | "named";

/**
 * 颜色验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 颜色格式 */
  format?: ColorFormat;
  /** 标准化的颜色值 */
  normalized?: string;
  /** 错误信息 */
  error?: string;
  /** 颜色值（RGBA格式） */
  rgba?: {
    r: number;
    g: number;
    b: number;
    a: number;
  };
}

/**
 * 颜色对比度结果
 */
export interface ContrastResult {
  ratio: number;
  wcagAA: boolean;
  wcagAAA: boolean;
  suggestion: string;
  level?: string;
}

export type ColorValidationResult = ValidationResult & { level?: string };

/**
 * 颜色验证器配置
 */
export interface ColorValidatorConfig {
  /** 是否允许透明色 */
  allowTransparent?: boolean;
  /** 最小对比度阈值 */
  minContrastRatio?: number;
  /** 自定义默认颜色 */
  defaultColor?: string;
}

/**
 * 颜色验证器
 *
 * 提供颜色格式验证、标准化、对比度计算等功能
 */

export class ColorValidator {
  private static instance: ColorValidator | null = null;
  private config: ColorValidatorConfig;
  private customDefaults: Record<string, string> = {};

  public static getInstance(): ColorValidator {
    if (!ColorValidator.instance) {
      ColorValidator.instance = new ColorValidator();
    }
    return ColorValidator.instance;
  }

  public destroy(): void {
    ColorValidator.instance = null;
  }

  // 颜色名称映射表（常用颜色）
  private static readonly COLOR_NAMES: Record<string, string> = {
    transparent: "rgba(0, 0, 0, 0)",
    black: "rgba(0, 0, 0, 1)",
    white: "rgba(255, 255, 255, 1)",
    red: "rgba(255, 0, 0, 1)",
    green: "rgba(0, 255, 0, 1)",
    blue: "rgba(0, 0, 255, 1)",
    yellow: "rgba(255, 255, 0, 1)",
    cyan: "rgba(0, 255, 255, 1)",
    magenta: "rgba(255, 0, 255, 1)",
    gray: "rgba(128, 128, 128, 1)",
    grey: "rgba(128, 128, 128, 1)",
  };

  constructor(config?: ColorValidatorConfig) {
    this.config = {
      allowTransparent: true,
      minContrastRatio: 4.5, // WCAG AA标准
      defaultColor: "#000000",
      ...config,
    };
  }

  /**
   * 验证颜色值
   */
  validateColor(color: string): ValidationResult {
    // 处理空值
    if (!color || color.trim() === "") {
      return this.handleEmptyColor();
    }

    // 移除空格
    const normalizedInput = color.trim();

    // 尝试识别格式
    if (normalizedInput.startsWith("#")) {
      return this._validateHexInternal(normalizedInput);
    } else if (
      normalizedInput.startsWith("rgb") ||
      normalizedInput.startsWith("rgba")
    ) {
      return this.validateRgb(normalizedInput);
    } else if (
      normalizedInput.startsWith("hsl") ||
      normalizedInput.startsWith("hsla")
    ) {
      return this.validateHsl(normalizedInput);
    } else if (
      normalizedInput.startsWith("oklch")
    ) {
      return this.validateOklch(normalizedInput);
    } else {
      return this.validateNamedColor(normalizedInput);
    }
  }

  /**
   * 处理空颜色值
   */
  handleEmptyColor(): ValidationResult {
    return {
      valid: false,
      error: "Color value cannot be empty",
    };
  }

  /**
   * 验证十六进制颜色
   */
  private _validateHexInternal(hex: string): ValidationResult {
    // 检查格式
    const hexRegex = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
    if (!hexRegex.test(hex)) {
      return {
        valid: false,
        error: `Invalid hex color format: ${hex}. Expected format: #RGB, #RGBA, #RRGGBB, or #RRGGBBAA`,
      };
    }

    // 解析并标准化
    const rgba = this.parseHexToRgba(hex);
    if (!rgba) {
      return {
        valid: false,
        error: `Failed to parse hex color: ${hex}`,
      };
    }

    // 检查透明色（如果不允许）
    if (!this.config.allowTransparent && rgba.a === 0) {
      return {
        valid: false,
        error: "Transparent colors are not allowed",
      };
    }

    // 标准化为6位hex
    const normalized = this.rgbaToHex(rgba);

    return {
      valid: true,
      format: "hex",
      normalized,
      rgba,
    };
  }

  /**
   * 验证RGB颜色
   */
  private validateRgb(rgb: string): ValidationResult {
    // 检查格式
    const rgbRegex =
      /^rgba?\(\s*(-?\d{1,3})\s*,\s*(-?\d{1,3})\s*,\s*(-?\d{1,3})(\s*,\s*(-?\d+\.?\d*))?\s*\)$/;
    const match = rgb.match(rgbRegex);

    if (!match) {
      return {
        valid: false,
        error: `Invalid RGB color format: ${rgb}. Expected format: rgb(r, g, b) or rgba(r, g, b, a)`,
      };
    }

    const r = parseInt(match[1], 10);
    const g = parseInt(match[2], 10);
    const b = parseInt(match[3], 10);
    const a = match[5] ? parseFloat(match[5]) : 1;

    // 检查数值范围
    if (
      r < 0 ||
      r > 255 ||
      g < 0 ||
      g > 255 ||
      b < 0 ||
      b > 255 ||
      a < 0 ||
      a > 1
    ) {
      return {
        valid: false,
        error: `RGB values must be in range 0-255, alpha must be in range 0-1. Got: rgb(${r}, ${g}, ${b}, ${a})`,
      };
    }

    const rgba = { r, g, b, a };

    // 检查透明色
    if (!this.config.allowTransparent && a === 0) {
      return {
        valid: false,
        error: "Transparent colors are not allowed",
      };
    }

    // 标准化为hex
    const normalized = this.rgbaToHex(rgba);

    return {
      valid: true,
      format: "rgb",
      normalized,
      rgba,
    };
  }

  /**
   * 验证HSL颜色
   */
  private validateHsl(hsl: string): ValidationResult {
    // 检查格式
    const hslRegex =
      /^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%(?:\s*,\s*(0?\.\d+|1|0))?\s*\)$/;
    const match = hsl.match(hslRegex);

    if (!match) {
      return {
        valid: false,
        error: `Invalid HSL color format: ${hsl}. Expected format: hsl(h, s%, l%) or hsla(h, s%, l%, a)`,
      };
    }

    const h = parseInt(match[1], 10);
    const s = parseInt(match[2], 10);
    const l = parseInt(match[3], 10);
    const a = match[4] ? parseFloat(match[4]) : 1;

    // 检查数值范围
    if (h < 0 || h > 360) {
      return {
        valid: false,
        error: `Hue must be in range 0-360. Got: ${h}`,
      };
    }

    if (s < 0 || s > 100) {
      return {
        valid: false,
        error: `Saturation must be in range 0-100%. Got: ${s}%`,
      };
    }

    if (l < 0 || l > 100) {
      return {
        valid: false,
        error: `Lightness must be in range 0-100%. Got: ${l}%`,
      };
    }

    if (a < 0 || a > 1) {
      return {
        valid: false,
        error: `Alpha must be in range 0-1. Got: ${a}`,
      };
    }

    // 转换为RGB
    const rgba = this.hslToRgba(h, s, l, a);

    // 检查透明色
    if (!this.config.allowTransparent && a === 0) {
      return {
        valid: false,
        error: "Transparent colors are not allowed",
      };
    }

    // 标准化为hex
    const normalized = this.rgbaToHex(rgba);

    return {
      valid: true,
      format: "hsl",
      normalized,
      rgba,
    };
  }

  /**
   * 验证命名颜色
   */
  private validateOklch(oklch: string): ValidationResult {
    const oklchRegex = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+))?\s*\)$/;
    const match = oklch.match(oklchRegex);

    if (!match) {
      return {
        valid: false,
        error: `Invalid OKLch color format: ${oklch}`,
      };
    }

    const l = parseFloat(match[1]);
    const c = parseFloat(match[2]);
    const h = parseFloat(match[3]);
    const a = match[4] ? parseFloat(match[4]) : 1;

    if (l < 0 || l > 1 || c < 0 || h < 0 || h > 360 || a < 0 || a > 1) {
      return {
        valid: false,
        error: `Invalid OKLch values: ${oklch}`,
      };
    }

    const rgba = this.oklchToRgba(l, c, h, a);

    return {
      valid: true,
      format: "oklch" as ColorFormat,
      normalized: oklch,
      rgba,
    };
  }

  private oklchToRgba(l: number, c: number, h: number, a: number): { r: number; g: number; b: number; a: number } {
    const hRad = (h * Math.PI) / 180;

    const lab_a = c * Math.cos(hRad);
    const lab_b = c * Math.sin(hRad);

    const l_ = l + 0.3963377774 * lab_a + 0.2158037573 * lab_b;
    const m_ = l - 0.1055613458 * lab_a - 0.0638541728 * lab_b;
    const s_ = l - 0.0894841775 * lab_a - 1.2914855480 * lab_b;

    const l3 = l_ * l_ * l_;
    const m3 = m_ * m_ * m_;
    const s3 = s_ * s_ * s_;

    const r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
    const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
    const b = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

    return {
      r: Math.round(this.linearSrgbToSrgb(Math.max(0, Math.min(1, r))) * 255),
      g: Math.round(this.linearSrgbToSrgb(Math.max(0, Math.min(1, g))) * 255),
      b: Math.round(this.linearSrgbToSrgb(Math.max(0, Math.min(1, b))) * 255),
      a,
    };
  }

  private linearSrgbToSrgb(c: number): number {
    return c <= 0.0031308 ? 12.92 * c : 1.055 * (c ** (1 / 2.4)) - 0.055;
  }

  private validateNamedColor(name: string): ValidationResult {
    const lowerName = name.toLowerCase();

    // 检查是否为有效颜色名称
    if (!Object.prototype.hasOwnProperty.call(ColorValidator.COLOR_NAMES, lowerName)) {
      return {
        valid: false,
        error: `Unknown color name: ${name}`,
      };
    }

    // 获取RGBA值
    const rgbaString = ColorValidator.COLOR_NAMES[lowerName];
    const rgba = this.parseRgbaString(rgbaString);

    if (!rgba) {
      return {
        valid: false,
        error: `Failed to parse color name: ${name}`,
      };
    }

    // 检查透明色
    if (!this.config.allowTransparent && rgba.a === 0) {
      return {
        valid: false,
        error: "Transparent colors are not allowed",
      };
    }

    return {
      valid: true,
      format: "named",
      normalized: this.rgbaToHex(rgba),
      rgba,
    };
  }

  /**
   * 计算颜色对比度
   */
  calculateContrast(foreground: string, background: string): ContrastResult {
    const fgResult = this.validateColor(foreground);
    const bgResult = this.validateColor(background);

    if (!fgResult.valid || !fgResult.rgba) {
      return {
        ratio: 0,
        wcagAA: false,
        wcagAAA: false,
        suggestion: fgResult.error || "Invalid foreground color",
      };
    }

    if (!bgResult.valid || !bgResult.rgba) {
      return {
        ratio: 0,
        wcagAA: false,
        wcagAAA: false,
        suggestion: bgResult.error || "Invalid background color",
      };
    }

    // 计算相对亮度
    const fgLuminance = this.calculateLuminance(fgResult.rgba);
    const bgLuminance = this.calculateLuminance(bgResult.rgba);

    // 计算对比度
    const lighter = Math.max(fgLuminance, bgLuminance);
    const darker = Math.min(fgLuminance, bgLuminance);
    const ratio = (lighter + 0.05) / (darker + 0.05);

    // WCAG标准
    const wcagAA = ratio >= 4.5; // 普通文本
    const wcagAAA = ratio >= 7; // 高对比度

    // 建议
    let suggestion = "";
    if (!wcagAA) {
      suggestion = `Contrast ratio ${ratio.toFixed(2)} does not meet WCAG AA (4.5:1)`;
    } else if (!wcagAAA) {
      suggestion = `Contrast ratio ${ratio.toFixed(2)} meets WCAG AA but not AAA (7:1)`;
    } else {
      suggestion = `Excellent contrast ratio ${ratio.toFixed(2)} meets WCAG AAA (7:1)`;
    }

    return {
      ratio,
      wcagAA,
      wcagAAA,
      suggestion,
    };
  }

  /**
   * 计算相对亮度
   */
  private calculateLuminance(rgba: { r: number; g: number; b: number; a: number }): number {
    // 如果有透明度，需要考虑背景（这里假设为白色背景）
    const a = rgba.a;
    const r = rgba.r / 255;
    const g = rgba.g / 255;
    const b = rgba.b / 255;

    // 考虑透明度（假设背景为白色 #FFFFFF）
    const blendedR = r * a + 1 * (1 - a);
    const blendedG = g * a + 1 * (1 - a);
    const blendedB = b * a + 1 * (1 - a);

    // 标准相对亮度计算
    const luminance =
      0.2126 * this.gammaEncode(blendedR) +
      0.7152 * this.gammaEncode(blendedG) +
      0.0722 * this.gammaEncode(blendedB);

    return luminance;
  }

  /**
   * Gamma编码
   */
  private gammaEncode(color: number): number {
    return color <= 0.03928 ? color / 12.92 : Math.pow((color + 0.055) / 1.055, 2.4);
  }

  /**
   * 解析十六进制颜色为RGBA
   */
  private parseHexToRgba(hex: string): { r: number; g: number; b: number; a: number } | null {
    // 移除#
    const hexValue = hex.slice(1);

    // 处理不同格式
    if (hexValue.length === 3) {
      // #RGB
      const r = parseInt(hexValue[0] + hexValue[0], 16);
      const g = parseInt(hexValue[1] + hexValue[1], 16);
      const b = parseInt(hexValue[2] + hexValue[2], 16);
      return { r, g, b, a: 1 };
    } else if (hexValue.length === 4) {
      // #RGBA
      const r = parseInt(hexValue[0] + hexValue[0], 16);
      const g = parseInt(hexValue[1] + hexValue[1], 16);
      const b = parseInt(hexValue[2] + hexValue[2], 16);
      const a = parseInt(hexValue[3] + hexValue[3], 16) / 255;
      return { r, g, b, a };
    } else if (hexValue.length === 6) {
      // #RRGGBB
      const r = parseInt(hexValue.slice(0, 2), 16);
      const g = parseInt(hexValue.slice(2, 4), 16);
      const b = parseInt(hexValue.slice(4, 6), 16);
      return { r, g, b, a: 1 };
    } else if (hexValue.length === 8) {
      // #RRGGBBAA
      const r = parseInt(hexValue.slice(0, 2), 16);
      const g = parseInt(hexValue.slice(2, 4), 16);
      const b = parseInt(hexValue.slice(4, 6), 16);
      const a = parseInt(hexValue.slice(6, 8), 16) / 255;
      return { r, g, b, a };
    }

    return null;
  }

  /**
   * 解析RGBA字符串
   */
  private parseRgbaString(rgba: string): { r: number; g: number; b: number; a: number } | null {
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!match) return null;

    return {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10),
      a: match[4] ? parseFloat(match[4]) : 1,
    };
  }

  /**
   * RGBA转十六进制
   */
  private rgbaToHex(rgba: { r: number; g: number; b: number; a: number }): string {
    const r = Math.round(rgba.r).toString(16).padStart(2, "0").toUpperCase();
    const g = Math.round(rgba.g).toString(16).padStart(2, "0").toUpperCase();
    const b = Math.round(rgba.b).toString(16).padStart(2, "0").toUpperCase();

    if (rgba.a === 1) {
      return `#${r}${g}${b}`;
    } else {
      const a = Math.round(rgba.a * 255).toString(16).padStart(2, "0");
      return `#${r}${g}${b}${a}`;
    }
  }

  /**
   * HSL转RGBA
   */
  private hslToRgba(
    h: number,
    s: number,
    l: number,
    a: number
  ): { r: number; g: number; b: number; a: number } {
    const sNormalized = s / 100;
    const lNormalized = l / 100;

    const chroma = (1 - Math.abs(2 * lNormalized - 1)) * sNormalized;
    const hPrime = h / 60;
    const x = chroma * (1 - Math.abs((hPrime % 2) - 1));

    let r1 = 0,
      g1 = 0,
      b1 = 0;

    if (hPrime >= 0 && hPrime < 1) {
      r1 = chroma;
      g1 = x;
      b1 = 0;
    } else if (hPrime >= 1 && hPrime < 2) {
      r1 = x;
      g1 = chroma;
      b1 = 0;
    } else if (hPrime >= 2 && hPrime < 3) {
      r1 = 0;
      g1 = chroma;
      b1 = x;
    } else if (hPrime >= 3 && hPrime < 4) {
      r1 = 0;
      g1 = x;
      b1 = chroma;
    } else if (hPrime >= 4 && hPrime < 5) {
      r1 = x;
      g1 = 0;
      b1 = chroma;
    } else if (hPrime >= 5 && hPrime < 6) {
      r1 = chroma;
      g1 = 0;
      b1 = x;
    }

    const m = lNormalized - chroma / 2;

    const r = Math.round((r1 + m) * 255);
    const g = Math.round((g1 + m) * 255);
    const b = Math.round((b1 + m) * 255);

    return { r, g, b, a };
  }

  /**
   * 获取默认颜色
   */
  getDefaultColor(key?: string): string {
    if (key && this.customDefaults[key]) {
      return this.customDefaults[key];
    }
    return this.config.defaultColor || "#000000";
  }

  /**
   * 设置默认颜色
   */
  setDefaultColor(key: string, color: string): void {
    this.customDefaults[key] = color;
  }

  /**
   * 验证并返回颜色（失败时返回默认值）
   */
  validateOrDefault(color: string): string {
    const result = this.validateColor(color);
    return result.valid ? result.normalized || color : this.getDefaultColor();
  }

  validateWithDefault(color: string | null, key: string): string {
    if (!color) return this.getDefaultColor(key);
    const result = this.validateColor(color);
    return result.valid ? result.normalized || color : this.getDefaultColor(key);
  }

  validate(color: string | null): ValidationResult {
    if (color === null || color === undefined) {
      return { valid: false, error: "颜色值不能为空" };
    }
    return this.validateColor(color);
  }

  calculateContrastRatio(foreground: string, background: string): number {
    const result = this.calculateContrast(foreground, background);
    return Math.round(result.ratio);
  }

  validateContrast(foreground: string, background: string): ContrastResult & { level: string; valid: boolean; contrastRatio: number; error?: string } {
    const result = this.calculateContrast(foreground, background);
    let level = "fail";
    if (result.wcagAAA) level = "AAA";
    else if (result.wcagAA) level = "AA";
    const valid = result.wcagAA;
    return { ...result, level, valid, contrastRatio: result.ratio, error: valid ? undefined : 'contrast ratio too low' };
  }

  hexToRGB(hex: string): { r: number; g: number; b: number } {
    const rgba = this.parseHexToRgba(hex);
    if (!rgba) return { r: 0, g: 0, b: 0 };
    return { r: rgba.r, g: rgba.g, b: rgba.b };
  }

  rgbToHex(rgb: { r: number; g: number; b: number }): string {
    return this.rgbaToHex({ ...rgb, a: 1 });
  }

  rgbToHSL(rgb: { r: number; g: number; b: number }): { h: number; s: number; l: number } {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
        case g: h = ((b - r) / d + 2) * 60; break;
        case b: h = ((r - g) / d + 4) * 60; break;
      }
    }
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  hslToRGB(hsl: { h: number; s: number; l: number }): { r: number; g: number; b: number } {
    const rgba = this.hslToRgba(hsl.h, hsl.s, hsl.l, 1);
    return { r: rgba.r, g: rgba.g, b: rgba.b };
  }

  validateHex(color: string): { valid: boolean; error?: string } {
    const hexRegex = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
    if (!hexRegex.test(color)) {
      return { valid: false, error: `Invalid hex color format: ${color}` };
    }
    return { valid: true };
  }

  validateRGB(color: string): { valid: boolean; error?: string } {
    const rgbMatch = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!rgbMatch) {
      return { valid: false, error: 'Invalid RGB value format' };
    }
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    if (r > 255 || g > 255 || b > 255) {
      return { valid: false, error: 'RGB value out of range (0-255)' };
    }
    return { valid: true };
  }

  validateHSL(color: string): { valid: boolean; error?: string } {
    const hslMatch = color.match(/^hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)$/);
    if (!hslMatch) {
      return { valid: false, error: 'Invalid HSL format' };
    }
    const h = parseInt(hslMatch[1], 10);
    if (h > 360) {
      return { valid: false, error: 'HSL hue value out of range (0-360)' };
    }
    return { valid: true };
  }

  validateContrastWithResult(foreground: string, background: string): { valid: boolean; contrastRatio?: number; error?: string } {
    const result = this.calculateContrast(foreground, background);
    if (result.ratio >= 7) {
      return { valid: true, contrastRatio: result.ratio };
    }
    if (result.ratio >= 4.5) {
      return { valid: true, contrastRatio: result.ratio };
    }
    return { valid: false, contrastRatio: result.ratio, error: 'contrast ratio too low' };
  }
}

export function validateColor(color: string): ValidationResult {
  const validator = ColorValidator.getInstance();
  return validator.validateColor(color);
}

export function calculateContrast(foreground: string, background: string): number {
  const validator = ColorValidator.getInstance();
  return validator.calculateContrastRatio(foreground, background);
}

export function validateContrast(foreground: string, background: string): ContrastResult & { level: string } {
  const validator = ColorValidator.getInstance();
  return validator.validateContrast(foreground, background);
}
