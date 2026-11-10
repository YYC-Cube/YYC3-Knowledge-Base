// @ts-nocheck
/**
 * @file: ContrastValidator.ts
 * @description: 高级对比度验证系统，集成WCAG标准和可访问性检查
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: theme,accessibility,wcag,contrast,validation
 */

// ================================================================
// ContrastValidator — 高级对比度验证系统
// 提供：
//   - WCAG 2.1 AA/AAA标准验证
//   - 批量颜色对比度检查
//   - 自动建议和修复
//   - 可访问性报告生成
// ================================================================

import { ColorValidator, ContrastResult } from './ColorValidator';
import { ThemeConfig, calculateContrast, getContrastLevel, WCAGLevel } from '../CustomThemeStore';

export interface ContrastValidationReport {
  valid: boolean;
  level: WCAGLevel;
  totalPairs: number;
  passedPairs: number;
  failedPairs: number;
  minRatio: number;
  maxRatio: number;
  averageRatio: number;
  details: ContrastPairResult[];
  suggestions: string[];
}

export interface ContrastPairResult {
  name: string;
  foreground: string;
  background: string;
  ratio: number;
  level: WCAGLevel;
  valid: boolean;
  suggestion?: string;
}

export interface AccessibilityScore {
  overall: number; // 0-100
  wcagAA: number; // AA标准得分
  wcagAAA: number; // AAA标准得分
  colorBlindness: number; // 色盲友好度
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface ColorBlindnessSimulation {
  type: 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';
  name: string;
  description: string;
  affectedPopulation: string;
}

/**
 * ContrastValidator - 高级对比度验证器
 * 单例模式，提供完整的可访问性验证功能
 */
export class ContrastValidator {
  private static instance: ContrastValidator;

  private colorValidator: ColorValidator;

  // WCAG标准
  private readonly WCAG_AA_NORMAL = 4.5;
  private readonly WCAG_AA_LARGE = 3.0;
  private readonly WCAG_AAA_NORMAL = 7.0;
  private readonly WCAG_AAA_LARGE = 4.5;

  private constructor() {
    this.colorValidator = ColorValidator.getInstance();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ContrastValidator {
    if (!ContrastValidator.instance) {
      ContrastValidator.instance = new ContrastValidator();
    }
    return ContrastValidator.instance;
  }

  /**
   * 验证主题配置的所有颜色对比度
   */
  public validateTheme(config: ThemeConfig): ContrastValidationReport {
    const details: ContrastPairResult[] = [];
    const suggestions: string[] = [];

    // 定义需要验证的颜色对
    const colorPairs: Array<{ name: string; fg: keyof ThemeConfig['colors']; bg: keyof ThemeConfig['colors'] }> = [
      { name: 'Primary Text', fg: 'primaryForeground', bg: 'primary' },
      { name: 'Secondary Text', fg: 'secondaryForeground', bg: 'secondary' },
      { name: 'Accent Text', fg: 'accentForeground', bg: 'accent' },
      { name: 'Background Text', fg: 'foreground', bg: 'background' },
      { name: 'Card Text', fg: 'cardForeground', bg: 'card' },
      { name: 'Popover Text', fg: 'popoverForeground', bg: 'popover' },
      { name: 'Muted Text', fg: 'mutedForeground', bg: 'muted' },
      { name: 'Destructive Text', fg: 'destructiveForeground', bg: 'destructive' },
    ];

    let minRatio = Infinity;
    let maxRatio = 0;
    let totalRatio = 0;
    let passedPairs = 0;
    let failedPairs = 0;

    for (const pair of colorPairs) {
      const fg = config.colors[pair.fg];
      const bg = config.colors[pair.bg];

      const ratio = calculateContrast(fg, bg);
      const level = getContrastLevel(ratio);
      const valid = level !== 'fail';

      if (ratio < minRatio) minRatio = ratio;
      if (ratio > maxRatio) maxRatio = ratio;
      totalRatio += ratio;

      if (valid) {
        passedPairs++;
      } else {
        failedPairs++;
      }

      const result: ContrastPairResult = {
        name: pair.name,
        foreground: fg,
        background: bg,
        ratio,
        level,
        valid
      };

      // 添加建议
      if (!valid) {
        const suggestion = this.generateSuggestion(fg, bg, ratio, 4.5);
        result.suggestion = suggestion;
        suggestions.push(`${pair.name}: ${suggestion}`);
      } else if (level === 'AA') {
        const suggestion = this.generateSuggestion(fg, bg, ratio, 7.0);
        result.suggestion = `可以改进: ${suggestion}`;
        suggestions.push(`${pair.name}: ${suggestion}`);
      }

      details.push(result);
    }

    const averageRatio = totalRatio / colorPairs.length;
    const overallLevel: WCAGLevel = minRatio >= 7.0 ? 'AAA' : minRatio >= 4.5 ? 'AA' : 'fail';

    return {
      valid: failedPairs === 0,
      level: overallLevel,
      totalPairs: colorPairs.length,
      passedPairs,
      failedPairs,
      minRatio,
      maxRatio,
      averageRatio,
      details,
      suggestions
    };
  }

  /**
   * 生成对比度改进建议
   */
  private generateSuggestion(fg: string, bg: string, currentRatio: number, targetRatio: number): string {
    const needed = targetRatio - currentRatio;

    if (needed <= 0) {
      return '对比度已达标';
    }

    // 分析颜色亮度
    const fgLuminance = this.colorValidator.calculateLuminance(fg);
    const bgLuminance = this.colorValidator.calculateLuminance(bg);

    if (fgLuminance > bgLuminance) {
      // 前景色较亮，建议加深背景色或提高前景色亮度
      return `建议将背景色加深 ${(needed * 10).toFixed(0)}% 或将前景色提亮 ${(needed * 10).toFixed(0)}%`;
    } else {
      // 前景色较暗，建议提高背景色亮度或加深前景色
      return `建议将背景色提亮 ${(needed * 10).toFixed(0)}% 或将前景色加深 ${(needed * 10).toFixed(0)}%`;
    }
  }

  /**
   * 计算可访问性得分
   */
  public calculateAccessibilityScore(config: ThemeConfig): AccessibilityScore {
    const report = this.validateTheme(config);

    // 计算AA标准得分
    const wcagAA = (report.passedPairs / report.totalPairs) * 100;

    // 计算AAA标准得分
    const aaaPassedPairs = report.details.filter(d => d.level === 'AAA').length;
    const wcagAAA = (aaaPassedPairs / report.totalPairs) * 100;

    // 计算色盲友好度（简化版本，实际需要更复杂的算法）
    const colorBlindness = this.estimateColorBlindnessFriendliness(config);

    // 综合得分
    const overall = (wcagAA * 0.4 + wcagAAA * 0.4 + colorBlindness * 0.2);

    // 确定等级
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (overall >= 90) grade = 'A';
    else if (overall >= 80) grade = 'B';
    else if (overall >= 70) grade = 'C';
    else if (overall >= 60) grade = 'D';
    else grade = 'F';

    return {
      overall: Math.round(overall * 10) / 10,
      wcagAA: Math.round(wcagAA * 10) / 10,
      wcagAAA: Math.round(wcagAAA * 10) / 10,
      colorBlindness: Math.round(colorBlindness * 10) / 10,
      grade
    };
  }

  /**
   * 估算色盲友好度
   */
  private estimateColorBlindnessFriendliness(config: ThemeConfig): number {
    // 简化的色盲友好度评估
    // 主要检查颜色对在亮度上的差异（色盲用户主要依赖亮度差异）

    const pairs = [
      { fg: config.colors.primaryForeground, bg: config.colors.primary },
      { fg: config.colors.foreground, bg: config.colors.background },
      { fg: config.colors.cardForeground, bg: config.colors.card },
    ];

    let totalLuminanceDiff = 0;

    for (const pair of pairs) {
      const fgValidation = this.colorValidator.validateColor(pair.fg);
      const bgValidation = this.colorValidator.validateColor(pair.bg);
      const fgL = fgValidation.rgba ? this.getLuminanceFromRgba(fgValidation.rgba) : 0;
      const bgL = bgValidation.rgba ? this.getLuminanceFromRgba(bgValidation.rgba) : 0;
      const diff = Math.abs(fgL - bgL);
      totalLuminanceDiff += diff;
    }

    const avgDiff = totalLuminanceDiff / pairs.length;

    // 亮度差异越大，色盲友好度越高
    // 假设亮度差异 >= 0.5 为满分
    return Math.min(100, (avgDiff / 0.5) * 100);
  }

  private getLuminanceFromRgba(rgba: { r: number; g: number; b: number; a: number }): number {
    const r = rgba.r / 255;
    const g = rgba.g / 255;
    const b = rgba.b / 255;
    const a = rgba.a;
    const blendedR = r * a + 1 * (1 - a);
    const blendedG = g * a + 1 * (1 - a);
    const blendedB = b * a + 1 * (1 - a);
    return 0.2126 * blendedR + 0.7152 * blendedG + 0.0722 * blendedB;
  }

  /**
   * 批量验证颜色对比度
   */
  public validatePairs(pairs: Array<{ name: string; foreground: string; background: string }>): ContrastPairResult[] {
    const results: ContrastPairResult[] = [];

    for (const pair of pairs) {
      const ratio = calculateContrast(pair.foreground, pair.background);
      const level = getContrastLevel(ratio);
      const valid = level !== 'fail';

      const result: ContrastPairResult = {
        name: pair.name,
        foreground: pair.foreground,
        background: pair.background,
        ratio,
        level,
        valid
      };

      if (!valid) {
        result.suggestion = this.generateSuggestion(pair.foreground, pair.background, ratio, 4.5);
      }

      results.push(result);
    }

    return results;
  }

  /**
   * 获取色盲模拟信息
   */
  public getColorBlindnessSimulations(): ColorBlindnessSimulation[] {
    return [
      {
        type: 'protanopia',
        name: '红色盲',
        description: '无法区分红色和绿色',
        affectedPopulation: '约1%的男性'
      },
      {
        type: 'deuteranopia',
        name: '绿色盲',
        description: '无法区分绿色和红色',
        affectedPopulation: '约1%的男性'
      },
      {
        type: 'tritanopia',
        name: '蓝色盲',
        description: '无法区分蓝色和黄色',
        affectedPopulation: '非常罕见'
      },
      {
        type: 'achromatopsia',
        name: '全色盲',
        description: '只能看到灰度',
        affectedPopulation: '极罕见'
      }
    ];
  }

  /**
   * 快速验证单个颜色对
   */
  public quickValidate(foreground: string, background: string): ContrastResult {
    return this.colorValidator.calculateContrast(foreground, background);
  }

  /**
   * 检查是否满足特定WCAG标准
   */
  public meetsWCAGStandard(foreground: string, background: string, standard: 'AA' | 'AAA'): boolean {
    const ratio = calculateContrast(foreground, background);
    const threshold = standard === 'AA' ? this.WCAG_AA_NORMAL : this.WCAG_AAA_NORMAL;
    return ratio >= threshold;
  }

  /**
   * 生成可访问性报告
   */
  public generateReport(config: ThemeConfig): string {
    const validation = this.validateTheme(config);
    const score = this.calculateAccessibilityScore(config);

    let report = `# 主题可访问性报告\n\n`;
    report += `## 总体评分\n`;
    report += `- **综合得分**: ${score.overall}/100 (${score.grade}级)\n`;
    report += `- **WCAG AA**: ${score.wcagAA}/100\n`;
    report += `- **WCAG AAA**: ${score.wcagAAA}/100\n`;
    report += `- **色盲友好度**: ${score.colorBlindness}/100\n\n`;

    report += `## 对比度详情\n`;
    report += `- **最小对比度**: ${validation.minRatio.toFixed(2)}:1\n`;
    report += `- **最大对比度**: ${validation.maxRatio.toFixed(2)}:1\n`;
    report += `- **平均对比度**: ${validation.averageRatio.toFixed(2)}:1\n`;
    report += `- **通过**: ${validation.passedPairs}/${validation.totalPairs}\n`;
    report += `- **失败**: ${validation.failedPairs}/${validation.totalPairs}\n\n`;

    if (validation.suggestions.length > 0) {
      report += `## 改进建议\n`;
      validation.suggestions.forEach((s, i) => {
        report += `${i + 1}. ${s}\n`;
      });
    }

    return report;
  }
}

// 导出便捷实例
export const contrastValidator = ContrastValidator.getInstance();
