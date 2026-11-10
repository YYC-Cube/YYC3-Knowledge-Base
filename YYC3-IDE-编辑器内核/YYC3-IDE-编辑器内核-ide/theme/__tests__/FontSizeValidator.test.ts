// @ts-nocheck
/**
 * @file: FontSizeValidator.test.ts
 * @description: FontSizeValidator单元测试
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 */

import { describe, it, expect } from "vitest";
import { FontSizeValidator } from "../FontSizeValidator";

describe("FontSizeValidator", () => {
  let validator: FontSizeValidator;

  beforeEach(() => {
    validator = new FontSizeValidator();
  });

  // ================================================================
  // 像素值测试
  // ================================================================

  describe("像素值测试", () => {
    it("应该验证有效的像素值", () => {
      const result = validator.validateFontSize("16px");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe(16);
      expect(result.unit).toBe("px");
    });

    it("应该验证最小有效像素值", () => {
      const result = validator.validateFontSize("8px");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe(8);
    });

    it("应该验证最大有效像素值", () => {
      const result = validator.validateFontSize("128px");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe(128);
    });

    it("应该拒绝小于最小值的像素值", () => {
      const result = validator.validateFontSize("7px");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("too small");
    });

    it("应该拒绝大于最大值的像素值", () => {
      const result = validator.validateFontSize("129px");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("too large");
    });

    it("应该处理小数像素值", () => {
      const result = validator.validateFontSize("16.5px");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe(16.5);
    });
  });

  // ================================================================
  // EM值测试
  // ================================================================

  describe("EM值测试", () => {
    it("应该验证有效的EM值", () => {
      const result = validator.validateFontSize("1em");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe(16); // 1em = 16px
      expect(result.unit).toBe("em");
    });

    it("应该验证小数EM值", () => {
      const result = validator.validateFontSize("1.5em");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe(24); // 1.5em = 24px
    });

    it("应该拒绝太小EM值", () => {
      const result = validator.validateFontSize("0.4em");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("too small");
    });

    it("应该拒绝太大EM值", () => {
      const result = validator.validateFontSize("9em");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("too large");
    });
  });

  // ================================================================
  // REM值测试
  // ================================================================

  describe("REM值测试", () => {
    it("应该验证有效的REM值", () => {
      const result = validator.validateFontSize("1rem");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe(16); // 1rem = 16px
      expect(result.unit).toBe("rem");
    });

    it("应该验证小数REM值", () => {
      const result = validator.validateFontSize("1.25rem");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe(20); // 1.25rem = 20px
    });
  });

  // ================================================================
  // PT值测试
  // ================================================================

  describe("PT值测试", () => {
    it("应该验证有效的PT值", () => {
      const result = validator.validateFontSize("12pt");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBeCloseTo(16, 0); // 12pt ≈ 16px
      expect(result.unit).toBe("pt");
    });

    it("应该拒绝太小PT值", () => {
      const result = validator.validateFontSize("5pt");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("too small");
    });
  });

  // ================================================================
  // 百分比值测试
  // ================================================================

  describe("百分比值测试", () => {
    it("应该验证有效的百分比", () => {
      const result = validator.validateFontSize("100%");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe(16); // 100% of 16px = 16px
      expect(result.unit).toBe("percentage");
    });

    it("应该验证小数百分比", () => {
      const result = validator.validateFontSize("150%");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe(24); // 150% of 16px = 24px
    });

    it("应该拒绝太小百分比", () => {
      const result = validator.validateFontSize("40%");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("too small");
    });
  });

  // ================================================================
  // 无单位值测试
  // ================================================================

  describe("无单位值测试", () => {
    it("应该验证有效的无单位值（默认px）", () => {
      const result = validator.validateFontSize("16");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe(16);
      expect(result.unit).toBe("none");
    });

    it("应该验证小数无单位值", () => {
      const result = validator.validateFontSize("16.5");
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe(16.5);
    });
  });

  // ================================================================
  // 负值和零值测试
  // ================================================================

  describe("负值和零值测试", () => {
    it("应该拒绝负值", () => {
      const result = validator.validateFontSize("-16px");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("cannot be negative");
    });

    it("应该拒绝零值", () => {
      const result = validator.validateFontSize("0px");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("cannot be zero");
    });

    it("应该允许负值（配置允许）", () => {
      const validator2 = new FontSizeValidator({ allowNegative: true });
      const result = validator2.validateFontSize("-16px");
      expect(result.valid).toBe(true);
    });

    it("应该允许零值（配置允许）", () => {
      const validator2 = new FontSizeValidator({ allowZero: true });
      const result = validator2.validateFontSize("0px");
      expect(result.valid).toBe(true);
    });
  });

  // ================================================================
  // 空值和无效格式测试
  // ================================================================

  describe("空值和无效格式测试", () => {
    it("应该处理空字符串", () => {
      const result = validator.validateFontSize("");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("cannot be empty");
    });

    it("应该处理null值", () => {
      const result = validator.validateFontSize(null as any);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("cannot be empty");
    });

    it("应该处理undefined值", () => {
      const result = validator.validateFontSize(undefined as any);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("cannot be empty");
    });

    it("应该拒绝无效格式", () => {
      const result = validator.validateFontSize("large");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid font size format");
    });

    it("应该拒绝NaN值", () => {
      const result = validator.validateFontSize("NaNpx");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not a valid number");
    });
  });

  // ================================================================
  // 辅助方法测试
  // ================================================================

  describe("辅助方法", () => {
    it("应该返回默认字体大小", () => {
      const defaultSize = validator.getDefaultFontSize();
      expect(defaultSize).toBe("16px");
    });

    it("应该在验证失败时返回默认值", () => {
      const result = validator.validateOrDefault("invalid");
      expect(result).toBe("16px");
    });

    it("应该在验证成功时返回原值", () => {
      const result = validator.validateOrDefault("18px");
      expect(result).toBe("18px");
    });

    it("应该返回字体大小范围", () => {
      const range = validator.getRange();
      expect(range.min).toBe(8);
      expect(range.max).toBe(128);
      expect(range.default).toBe(16);
    });

    it("应该检查是否在范围内", () => {
      expect(validator.isInRange("16px")).toBe(true);
      expect(validator.isInRange("7px")).toBe(false);
      expect(validator.isInRange("129px")).toBe(false);
    });

    it("应该截断到最小值", () => {
      const result = validator.clampToRange("5px");
      expect(result).toBe("8px");
    });

    it("应该截断到最大值", () => {
      const result = validator.clampToRange("200px");
      expect(result).toBe("128px");
    });

    it("应该保留范围内的值", () => {
      const result = validator.clampToRange("16px");
      expect(result).toBe("16px");
    });

    it("应该在验证失败时返回默认值（截断）", () => {
      const result = validator.clampToRange("invalid");
      expect(result).toBe("16px");
    });
  });

  // ================================================================
  // 配置测试
  // ================================================================

  describe("配置测试", () => {
    it("应该使用自定义最小值", () => {
      const validator2 = new FontSizeValidator({ minSizePx: 12, maxSizePx: 72 });
      expect(validator2.isInRange("10px")).toBe(false);
      expect(validator2.isInRange("12px")).toBe(true);
      expect(validator2.isInRange("72px")).toBe(true);
      expect(validator2.isInRange("80px")).toBe(false);
    });

    it("应该使用自定义默认值", () => {
      const validator2 = new FontSizeValidator({ defaultSizePx: 14 });
      expect(validator2.getDefaultFontSize()).toBe("14px");
      expect(validator2.validateOrDefault("invalid")).toBe("14px");
    });
  });
});
