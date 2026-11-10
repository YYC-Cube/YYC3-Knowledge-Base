// @ts-nocheck
/**
 * @file: ColorValidator.test.ts
 * @description: ColorValidator单元测试
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 */

import { describe, it, expect } from "vitest";
import { ColorValidator } from "../ColorValidator";

describe("ColorValidator", () => {
  let validator: ColorValidator;

  beforeEach(() => {
    validator = new ColorValidator();
  });

  // ================================================================
  // 十六进制颜色测试
  // ================================================================

  describe("validateHex", () => {
    it("应该验证有效的3位十六进制颜色", () => {
      const result = validator.validateColor("#FFF");
      expect(result.valid).toBe(true);
      expect(result.format).toBe("hex");
      expect(result.normalized).toBe("#FFFFFF");
      expect(result.rgba).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    });

    it("应该验证有效的4位十六进制颜色（带透明度）", () => {
      const result = validator.validateColor("#FFF8");
      expect(result.valid).toBe(true);
      expect(result.format).toBe("hex");
      expect(result.rgba?.a).toBeCloseTo(0.533, 1);
    });

    it("应该验证有效的6位十六进制颜色", () => {
      const result = validator.validateColor("#FF5733");
      expect(result.valid).toBe(true);
      expect(result.format).toBe("hex");
      expect(result.normalized).toBe("#FF5733");
      expect(result.rgba).toEqual({ r: 255, g: 87, b: 51, a: 1 });
    });

    it("应该验证有效的8位十六进制颜色（带透明度）", () => {
      const result = validator.validateColor("#FF573380");
      expect(result.valid).toBe(true);
      expect(result.format).toBe("hex");
      expect(result.rgba?.a).toBeCloseTo(0.5, 1);
    });

    it("应该拒绝无效的十六进制颜色格式", () => {
      const result = validator.validateColor("#FFG");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid hex color format");
    });

    it("应该拒绝太长的十六进制颜色", () => {
      const result = validator.validateColor("#FF5733FFAA");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid hex color format");
    });
  });

  // ================================================================
  // RGB颜色测试
  // ================================================================

  describe("validateRgb", () => {
    it("应该验证有效的RGB颜色", () => {
      const result = validator.validateColor("rgb(255, 0, 0)");
      expect(result.valid).toBe(true);
      expect(result.format).toBe("rgb");
      expect(result.normalized).toBe("#FF0000");
      expect(result.rgba).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    });

    it("应该验证有效的RGBA颜色", () => {
      const result = validator.validateColor("rgba(255, 0, 0, 0.5)");
      expect(result.valid).toBe(true);
      expect(result.format).toBe("rgb");
      expect(result.rgba?.a).toBe(0.5);
    });

    it("应该处理带空格的RGB值", () => {
      const result = validator.validateColor("rgb( 255 , 0 , 0 )");
      expect(result.valid).toBe(true);
    });

    it("应该拒绝超出范围的RGB值", () => {
      const result = validator.validateColor("rgb(256, 0, 0)");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("must be in range 0-255");
    });

    it("应该拒绝负值的RGB", () => {
      const result = validator.validateColor("rgb(-1, 0, 0)");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("must be in range 0-255");
    });

    it("应该拒绝超出范围的alpha值", () => {
      const result = validator.validateColor("rgba(255, 0, 0, 1.5)");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("alpha must be in range 0-1");
    });
  });

  // ================================================================
  // HSL颜色测试
  // ================================================================

  describe("validateHsl", () => {
    it("应该验证有效的HSL颜色", () => {
      const result = validator.validateColor("hsl(0, 100%, 50%)");
      expect(result.valid).toBe(true);
      expect(result.format).toBe("hsl");
      expect(result.rgba).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    });

    it("应该验证有效的HSLA颜色", () => {
      const result = validator.validateColor("hsla(0, 100%, 50%, 0.5)");
      expect(result.valid).toBe(true);
      expect(result.format).toBe("hsl");
      expect(result.rgba?.a).toBe(0.5);
    });

    it("应该拒绝超出范围的色相值", () => {
      const result = validator.validateColor("hsl(361, 100%, 50%)");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Hue must be in range 0-360");
    });

    it("应该拒绝超出范围的饱和度值", () => {
      const result = validator.validateColor("hsl(0, 101%, 50%)");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Saturation must be in range 0-100%");
    });

    it("应该拒绝超出范围的亮度值", () => {
      const result = validator.validateColor("hsl(0, 100%, 101%)");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Lightness must be in range 0-100%");
    });
  });

  // ================================================================
  // 命名颜色测试
  // ================================================================

  describe("validateNamedColor", () => {
    it("应该验证有效的颜色名称", () => {
      const result = validator.validateColor("black");
      expect(result.valid).toBe(true);
      expect(result.format).toBe("named");
      expect(result.rgba).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    });

    it("应该验证颜色名称（不区分大小写）", () => {
      const result = validator.validateColor("BLACK");
      expect(result.valid).toBe(true);
      expect(result.rgba).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    });

    it("应该验证透明色", () => {
      const result = validator.validateColor("transparent");
      expect(result.valid).toBe(true);
      expect(result.rgba?.a).toBe(0);
    });

    it("应该拒绝无效的颜色名称", () => {
      const result = validator.validateColor("invalidcolor");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Unknown color name");
    });
  });

  // ================================================================
  // 空值和边界测试
  // ================================================================

  describe("空值和边界测试", () => {
    it("应该处理空字符串", () => {
      const result = validator.validateColor("");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("cannot be empty");
    });

    it("应该处理只有空格的字符串", () => {
      const result = validator.validateColor("   ");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("cannot be empty");
    });

    it("应该处理null值", () => {
      const result = validator.validateColor(null as any);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("cannot be empty");
    });

    it("应该处理undefined值", () => {
      const result = validator.validateColor(undefined as any);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("cannot be empty");
    });
  });

  // ================================================================
  // 对比度计算测试
  // ================================================================

  describe("calculateContrast", () => {
    it("应该计算黑白的对比度", () => {
      const result = validator.calculateContrast("#000000", "#FFFFFF");
      expect(result.ratio).toBeCloseTo(21, 0);
      expect(result.wcagAA).toBe(true);
      expect(result.wcagAAA).toBe(true);
    });

    it("应该计算浅灰和白的对比度", () => {
      const result = validator.calculateContrast("#888888", "#FFFFFF");
      expect(result.ratio).toBeLessThan(4.5);
      expect(result.wcagAA).toBe(false);
      expect(result.wcagAAA).toBe(false);
    });

    it("应该检测低对比度", () => {
      const result = validator.calculateContrast("#E0E0E0", "#F0F0F0");
      expect(result.ratio).toBeLessThan(3);
      expect(result.suggestion).toContain("does not meet WCAG AA");
    });

    it("应该检测无效的前景色", () => {
      const result = validator.calculateContrast("invalid", "#FFFFFF");
      expect(result.ratio).toBe(0);
      expect(result.wcagAA).toBe(false);
      expect(result.wcagAAA).toBe(false);
    });

    it("应该检测无效的背景色", () => {
      const result = validator.calculateContrast("#000000", "invalid");
      expect(result.ratio).toBe(0);
      expect(result.wcagAA).toBe(false);
      expect(result.wcagAAA).toBe(false);
    });
  });

  // ================================================================
  // 默认值和辅助方法测试
  // ================================================================

  describe("辅助方法", () => {
    it("应该返回默认颜色", () => {
      const validator2 = new ColorValidator({ defaultColor: "#FF0000" });
      const defaultColor = validator2.getDefaultColor();
      expect(defaultColor).toBe("#FF0000");
    });

    it("应该在验证失败时返回默认值", () => {
      const result = validator.validateOrDefault("invalid");
      expect(result).toBe("#000000"); // 默认值
    });

    it("应该在验证成功时返回标准化颜色", () => {
      const result = validator.validateOrDefault("#F00");
      expect(result).toBe("#FF0000");
    });
  });

  // ================================================================
  // 配置测试
  // ================================================================

  describe("配置测试", () => {
    it("应该拒绝透明色（配置不允许）", () => {
      const validator2 = new ColorValidator({ allowTransparent: false });
      const result = validator2.validateColor("transparent");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not allowed");
    });

    it("应该允许透明色（配置允许）", () => {
      const validator2 = new ColorValidator({ allowTransparent: true });
      const result = validator2.validateColor("transparent");
      expect(result.valid).toBe(true);
    });

    it("应该拒绝完全透明的RGBA（配置不允许）", () => {
      const validator2 = new ColorValidator({ allowTransparent: false });
      const result = validator2.validateColor("rgba(255, 0, 0, 0)");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not allowed");
    });
  });
});
