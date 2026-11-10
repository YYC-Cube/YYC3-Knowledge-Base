// @ts-nocheck
/**
 * @file: ThemeSystem.test.ts
 * @description: 主题系统完整测试 - CSS变量注入、颜色验证、Design Token
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: test,theme,css-variables,color-validation,design-tokens
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  CSSVariableInjector, 
  batchUpdateCSSVariables,
  setCSSVariable,
  getCSSVariable,
  type ThemeType,
  type BatchUpdateResult
} from '../CSSVariableInjector';
import {
  ColorValidator,
  validateColor,
  calculateContrast,
  validateContrast,
  type ColorValidationResult,
  type ContrastResult
} from '../ColorValidator';
import {
  DesignTokenSystem,
  getToken,
  setToken,
  type TokenType,
  type DesignToken
} from '../DesignTokenSystem';

// ================================================================
// CSSVariableInjector 测试
// ================================================================

describe('CSSVariableInjector', () => {
  let injector: CSSVariableInjector;

  beforeEach(() => {
    injector = CSSVariableInjector.getInstance();
    injector.clearAll();
  });

  afterEach(() => {
    injector.clearAll();
  });

  describe('单例模式', () => {
    it('应该返回同一个实例', () => {
      const instance1 = CSSVariableInjector.getInstance();
      const instance2 = CSSVariableInjector.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('批量更新CSS变量', () => {
    it('应该批量更新多个CSS变量', () => {
      const variables = {
        '--primary': '#007bff',
        '--secondary': '#6c757d',
        '--background': '#ffffff'
      };

      const result = injector.batchUpdate(variables);

      expect(result.applied).toBe(3);
      expect(result.skipped).toBe(0);
      expect(result.changes).toHaveLength(3);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('应该只更新变化的变量', () => {
      // 第一次更新
      injector.batchUpdate({
        '--primary': '#007bff',
        '--secondary': '#6c757d'
      });

      // 第二次更新（只改变一个变量）
      const result = injector.batchUpdate({
        '--primary': '#007bff',
        '--secondary': '#28a745' // 只改变这个
      });

      expect(result.applied).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it('应该正确更新DOM', () => {
      const variables = {
        '--test-color': '#ff0000'
      };

      injector.batchUpdate(variables);

      const root = document.documentElement;
      const value = root.style.getPropertyValue('--test-color');
      expect(value).toBe('#ff0000');
    });

    it('应该记录性能指标', () => {
      injector.batchUpdate({
        '--primary': '#007bff',
        '--secondary': '#6c757d'
      });

      const metrics = injector.getPerformanceMetrics();
      
      expect(metrics.totalUpdates).toBe(1);
      expect(metrics.totalVariables).toBe(2);
      expect(metrics.lastUpdateDuration).toBeGreaterThan(0);
    });
  });

  describe('单个变量操作', () => {
    it('应该设置单个CSS变量', () => {
      injector.setVariable('--test-var', '#123456');
      expect(injector.getVariable('--test-var')).toBe('#123456');
    });

    it('应该检查变量是否存在', () => {
      injector.setVariable('--existing', '#000');
      expect(injector.hasVariable('--existing')).toBe(true);
      expect(injector.hasVariable('--non-existing')).toBe(false);
    });

    it('应该移除CSS变量', () => {
      injector.setVariable('--to-remove', '#fff');
      expect(injector.hasVariable('--to-remove')).toBe(true);

      injector.removeVariable('--to-remove');
      expect(injector.hasVariable('--to-remove')).toBe(false);
    });
  });

  describe('主题应用', () => {
    it('应该应用Navy主题', () => {
      injector.applyTheme('navy');
      
      const primary = injector.getVariable('--primary');
      expect(primary).toBeTruthy();
      expect(primary).toContain('oklch');
    });

    it('应该应用Cyberpunk主题', () => {
      injector.applyTheme('cyberpunk');
      
      const primary = injector.getVariable('--primary');
      expect(primary).toBeTruthy();
      expect(primary).toContain('oklch');
    });

    it('应该应用Light主题', () => {
      injector.applyTheme('light');
      
      const background = injector.getVariable('--background');
      expect(background).toBeTruthy();
    });

    it('应该支持自定义变量覆盖', () => {
      injector.applyTheme('navy', {
        '--primary': '#custom-color'
      });

      expect(injector.getVariable('--primary')).toBe('#custom-color');
    });
  });

  describe('变化监听', () => {
    it('应该通知变化监听器', () => {
      const listener = vi.fn();
      const unsubscribe = injector.addChangeListener(listener);

      injector.batchUpdate({ '--test': '#fff' });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            key: '--test',
            newValue: '#fff'
          })
        ])
      );

      unsubscribe();
    });

    it('应该能够取消监听', () => {
      const listener = vi.fn();
      const unsubscribe = injector.addChangeListener(listener);

      injector.batchUpdate({ '--test1': '#fff' });
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      
      injector.batchUpdate({ '--test2': '#fff' });
      expect(listener).toHaveBeenCalledTimes(1); // 仍然是1次
    });
  });

  describe('导入导出', () => {
    it('应该导出变量为JSON', () => {
      injector.batchUpdate({
        '--primary': '#007bff',
        '--secondary': '#6c757d'
      });

      const json = injector.exportVariables();
      const parsed = JSON.parse(json);

      expect(parsed['--primary']).toBe('#007bff');
      expect(parsed['--secondary']).toBe('#6c757d');
    });

    it('应该从JSON导入变量', () => {
      const json = JSON.stringify({
        '--imported': '#ff0000'
      });

      const result = injector.importVariables(json);

      expect(result.applied).toBe(1);
      expect(injector.getVariable('--imported')).toBe('#ff0000');
    });
  });

  describe('延迟批量更新', () => {
    it('应该调度批量更新', async () => {
      injector.scheduleBatchUpdate({ '--scheduled1': '#111' });
      injector.scheduleBatchUpdate({ '--scheduled2': '#222' });

      // 立即检查，应该还没有更新
      expect(injector.hasVariable('--scheduled1')).toBe(false);

      // 等待下一个动画帧
      await new Promise(resolve => requestAnimationFrame(resolve));

      // 现在应该已经更新了
      expect(injector.hasVariable('--scheduled1')).toBe(true);
      expect(injector.hasVariable('--scheduled2')).toBe(true);
    });
  });

  describe('便捷函数', () => {
    it('batchUpdateCSSVariables应该工作', () => {
      const result = batchUpdateCSSVariables({ '--test': '#fff' });
      expect(result.applied).toBe(1);
    });

    it('setCSSVariable应该工作', () => {
      setCSSVariable('--test', '#fff');
      expect(getCSSVariable('--test')).toBe('#fff');
    });
  });
});

// ================================================================
// ColorValidator 测试
// ================================================================

describe('ColorValidator', () => {
  let validator: ColorValidator;

  beforeEach(() => {
    validator = ColorValidator.getInstance();
  });

  describe('单例模式', () => {
    it('应该返回同一个实例', () => {
      const instance1 = ColorValidator.getInstance();
      const instance2 = ColorValidator.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('HEX颜色验证', () => {
    it('应该验证有效的HEX颜色', () => {
      const result = validator.validate('#FF5733');
      expect(result.valid).toBe(true);
      expect(result.format).toBe('hex');
    });

    it('应该验证短HEX格式', () => {
      const result = validator.validate('#F53');
      expect(result.valid).toBe(true);
      expect(result.format).toBe('hex');
    });

    it('应该拒绝无效的HEX颜色', () => {
      const result = validator.validate('#GGGGGG');
      expect(result.valid).toBe(false);
    });
  });

  describe('RGB颜色验证', () => {
    it('应该验证有效的RGB颜色', () => {
      const result = validator.validate('rgb(255, 87, 51)');
      expect(result.valid).toBe(true);
      expect(result.format).toBe('rgb');
    });

    it('应该拒绝无效的RGB颜色', () => {
      const result = validator.validate('rgb(256, 87, 51)');
      expect(result.valid).toBe(false);
    });
  });

  describe('HSL颜色验证', () => {
    it('应该验证有效的HSL颜色', () => {
      const result = validator.validate('hsl(10, 100%, 60%)');
      expect(result.valid).toBe(true);
      expect(result.format).toBe('hsl');
    });

    it('应该拒绝无效的HSL颜色', () => {
      const result = validator.validate('hsl(370, 100%, 60%)');
      expect(result.valid).toBe(false);
    });
  });

  describe('OKLch颜色验证', () => {
    it('应该验证有效的OKLch颜色', () => {
      const result = validator.validate('oklch(0.55 0.22 264)');
      expect(result.valid).toBe(true);
      expect(result.format).toBe('oklch');
    });

    it('应该拒绝无效的OKLch颜色', () => {
      const result = validator.validate('oklch(1.5 0.22 264)');
      expect(result.valid).toBe(false);
    });
  });

  describe('空值处理', () => {
    it('应该处理null值', () => {
      const result = validator.validate(null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('空');
    });

    it('应该处理undefined值', () => {
      const result = validator.validate(undefined);
      expect(result.valid).toBe(false);
    });

    it('应该处理空字符串', () => {
      const result = validator.validate('');
      expect(result.valid).toBe(false);
    });
  });

  describe('颜色转换', () => {
    it('应该转换HEX到RGB', () => {
      const rgb = validator.hexToRGB('#FF5733');
      expect(rgb.r).toBe(255);
      expect(rgb.g).toBe(87);
      expect(rgb.b).toBe(51);
    });

    it('应该转换RGB到HEX', () => {
      const hex = validator.rgbToHex({ r: 255, g: 87, b: 51 });
      expect(hex).toBe('#FF5733');
    });

    it('应该转换RGB到HSL', () => {
      const hsl = validator.rgbToHSL({ r: 255, g: 87, b: 51 });
      expect(hsl.h).toBeGreaterThanOrEqual(0);
      expect(hsl.h).toBeLessThanOrEqual(360);
    });

    it('应该转换HSL到RGB', () => {
      const rgb = validator.hslToRGB({ h: 10, s: 100, l: 60 });
      expect(rgb.r).toBeGreaterThanOrEqual(0);
      expect(rgb.r).toBeLessThanOrEqual(255);
    });
  });

  describe('对比度计算', () => {
    it('应该计算对比度', () => {
      const ratio = validator.calculateContrastRatio('#ffffff', '#000000');
      expect(ratio).toBe(21); // 最大对比度
    });

    it('应该验证WCAG AA标准', () => {
      const result = validator.validateContrast('#ffffff', '#767676');
      expect(result.wcagAA).toBe(true);
      expect(result.level).toBe('AA');
    });

    it('应该验证WCAG AAA标准', () => {
      const result = validator.validateContrast('#ffffff', '#595959');
      expect(result.wcagAAA).toBe(true);
      expect(result.level).toBe('AAA');
    });

    it('应该为低对比度提供改进建议', () => {
      const result = validator.validateContrast('#777777', '#888888');
      expect(result.level).toBe('fail');
      expect(result.suggestion).toBeTruthy();
    });
  });

  describe('默认颜色', () => {
    it('应该设置默认颜色', () => {
      validator.setDefaultColor('custom', '#ff0000');
      expect(validator.getDefaultColor('custom')).toBe('#ff0000');
    });

    it('应该在验证失败时返回默认值', () => {
      const color = validator.validateWithDefault(null, 'primary');
      expect(color).toBeTruthy();
    });
  });

  describe('便捷函数', () => {
    it('validateColor应该工作', () => {
      const result = validateColor('#ff0000');
      expect(result.valid).toBe(true);
    });

    it('calculateContrast应该工作', () => {
      const ratio = calculateContrast('#fff', '#000');
      expect(ratio).toBe(21);
    });

    it('validateContrast应该工作', () => {
      const result = validateContrast('#fff', '#000');
      expect(result.wcagAA).toBe(true);
    });
  });
});

// ================================================================
// DesignTokenSystem 测试
// ================================================================

describe('DesignTokenSystem', () => {
  let tokenSystem: DesignTokenSystem;

  beforeEach(() => {
    tokenSystem = DesignTokenSystem.getInstance();
  });

  describe('单例模式', () => {
    it('应该返回同一个实例', () => {
      const instance1 = DesignTokenSystem.getInstance();
      const instance2 = DesignTokenSystem.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('基础Token（Primitive）', () => {
    it('应该初始化基础Token', () => {
      const token = tokenSystem.getToken('color.blue.500');
      expect(token).toBeTruthy();
      expect(token).toContain('oklch');
    });

    it('应该获取基础Token定义', () => {
      const definition = tokenSystem.getTokenDefinition('color.blue.500');
      expect(definition).toBeDefined();
      expect(definition?.type).toBe('primitive');
    });
  });

  describe('语义Token（Semantic）', () => {
    it('应该初始化语义Token', () => {
      const token = tokenSystem.getToken('color.primary');
      expect(token).toBeTruthy();
    });

    it('应该解析Token引用', () => {
      // color.primary 应该引用 color.blue.500
      const primaryValue = tokenSystem.getToken('color.primary');
      const blueValue = tokenSystem.getToken('color.blue.500');
      expect(primaryValue).toBe(blueValue);
    });
  });

  describe('组件Token（Component）', () => {
    it('应该初始化组件Token', () => {
      const token = tokenSystem.getToken('button.primary.background');
      expect(token).toBeTruthy();
    });

    it('应该解析多级Token引用', () => {
      // button.primary.background -> color.primary -> color.blue.500
      const buttonBg = tokenSystem.getToken('button.primary.background');
      const primary = tokenSystem.getToken('color.primary');
      expect(buttonBg).toBe(primary);
    });
  });

  describe('主题覆盖', () => {
    it('应该设置主题Token覆盖', () => {
      tokenSystem.setThemeOverride('cyberpunk', 'color.primary', 'oklch(0.60 0.25 300)');
      
      const navyPrimary = tokenSystem.getToken('color.primary', 'navy');
      const cyberPrimary = tokenSystem.getToken('color.primary', 'cyberpunk');
      
      expect(navyPrimary).not.toBe(cyberPrimary);
    });
  });

  describe('Token操作', () => {
    it('应该设置新Token', () => {
      tokenSystem.setToken('custom.token', '#ff0000', 'semantic', '自定义Token');
      
      const value = tokenSystem.getToken('custom.token');
      expect(value).toBe('#ff0000');
    });

    it('应该批量设置Token', () => {
      const tokens: DesignToken[] = [
        { name: 'test.token1', value: '#111', type: 'primitive' },
        { name: 'test.token2', value: '#222', type: 'semantic' }
      ];

      tokenSystem.setTokens(tokens);

      expect(tokenSystem.getToken('test.token1')).toBe('#111');
      expect(tokenSystem.getToken('test.token2')).toBe('#222');
    });
  });

  describe('Token统计', () => {
    it('应该返回Token统计', () => {
      const stats = tokenSystem.getTokenStats();
      
      expect(stats.primitive).toBeGreaterThan(0);
      expect(stats.semantic).toBeGreaterThan(0);
      expect(stats.component).toBeGreaterThan(0);
      expect(stats.total).toBe(stats.primitive + stats.semantic + stats.component);
    });
  });

  describe('导出CSS变量', () => {
    it('应该导出为CSS变量格式', () => {
      const variables = tokenSystem.exportToCSSVariables();
      
      expect(variables['--color-blue-500']).toBeTruthy();
      expect(variables['--color-primary']).toBeTruthy();
      expect(variables['--button-primary-background']).toBeTruthy();
    });

    it('应该应用主题覆盖导出', () => {
      tokenSystem.setThemeOverride('cyberpunk', 'color.primary', 'oklch(0.60 0.25 300)');
      
      const variables = tokenSystem.exportToCSSVariables('cyberpunk');
      expect(variables['--color-primary']).toBe('oklch(0.60 0.25 300)');
    });
  });

  describe('Token引用解析', () => {
    it('应该解析单个Token引用', () => {
      const resolved = tokenSystem.resolveTokenReference('{color.blue.500}');
      const expected = tokenSystem.getToken('color.blue.500');
      expect(resolved).toBe(expected);
    });

    it('应该解析值中的Token引用', () => {
      const value = 'padding: {spacing.4} {spacing.6}';
      const resolved = tokenSystem.resolveValue(value);
      
      const spacing4 = tokenSystem.getToken('spacing.4');
      const spacing6 = tokenSystem.getToken('spacing.6');
      
      expect(resolved).toBe(`padding: ${spacing4} ${spacing6}`);
    });
  });

  describe('Token监听', () => {
    it('应该通知Token变更', () => {
      const listener = vi.fn();
      const unsubscribe = tokenSystem.addTokenListener(listener);

      tokenSystem.setToken('test.listener', '#fff', 'primitive');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test.listener',
          value: '#fff'
        })
      );

      unsubscribe();
    });
  });

  describe('便捷函数', () => {
    it('getToken应该工作', () => {
      const value = getToken('color.blue.500');
      expect(value).toBeTruthy();
    });

    it('setToken应该工作', () => {
      setToken('test.convenience', '#abc', 'semantic');
      expect(getToken('test.convenience')).toBe('#abc');
    });
  });
});

// ================================================================
// 集成测试
// ================================================================

describe('主题系统集成测试', () => {
  it('应该协同工作：Token → CSS变量 → DOM', () => {
    const injector = CSSVariableInjector.getInstance();
    const tokenSystem = DesignTokenSystem.getInstance();
    
    // 1. 从Token系统导出CSS变量
    const variables = tokenSystem.exportToCSSVariables('navy');
    
    // 2. 应用到DOM
    const result = injector.batchUpdate(variables);
    
    // 3. 验证应用成功
    expect(result.applied).toBeGreaterThan(0);
    
    // 4. 验证DOM已更新
    const primary = injector.getVariable('--color-primary');
    expect(primary).toBeTruthy();
  });

  it('应该协同工作：颜色验证 → Token设置 → CSS变量', () => {
    const validator = ColorValidator.getInstance();
    const tokenSystem = DesignTokenSystem.getInstance();
    const injector = CSSVariableInjector.getInstance();
    
    // 1. 验证颜色
    const validation = validator.validate('#007bff');
    expect(validation.valid).toBe(true);
    
    // 2. 设置Token
    tokenSystem.setToken('custom.primary', validation.normalized!, 'semantic');
    
    // 3. 导出CSS变量
    const variables = tokenSystem.exportToCSSVariables();
    
    // 4. 应用到DOM
    injector.batchUpdate(variables);
    
    // 5. 验证结果
    expect(injector.getVariable('--custom-primary')).toBe('#007BFF');
  });

  it('应该完整验证主题可访问性', () => {
    const injector = CSSVariableInjector.getInstance();
    const validator = ColorValidator.getInstance();
    
    // 应用主题
    injector.applyTheme('navy');
    
    // 获取前景色和背景色
    const foreground = injector.getVariable('--foreground');
    const background = injector.getVariable('--background');
    
    // 验证对比度
    const contrastResult = validator.validateContrast(foreground!, background as any);
    
    // Navy主题应该通过WCAG AA
    expect(contrastResult.wcagAA).toBe(true);
  });
});
