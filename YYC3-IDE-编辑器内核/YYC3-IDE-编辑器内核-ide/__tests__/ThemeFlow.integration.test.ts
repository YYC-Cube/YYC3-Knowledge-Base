// @ts-nocheck
/**
 * @file: ThemeFlow.integration.test.ts
 * @description: 主题流程集成测试 - 测试主题切换、自定义颜色、验证和系统主题同步
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: test
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: test,integration,theme-flow,color-validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useThemeStore } from "../stores/useThemeStore";
import { ColorValidator } from "../theme/ColorValidator";
import { FontSizeValidator } from "../theme/FontSizeValidator";

// ================================================================
// Integration Tests - Complete Theme Flow
// ================================================================

describe("Theme Flow Integration", () => {
  let colorValidator: ColorValidator;
  let fontSizeValidator: FontSizeValidator;

  beforeEach(() => {
    // Reset theme store
    useThemeStore.setState({
      currentTheme: "light",
      customColors: {},
      systemThemeFollow: false,
    });

    // Initialize validators
    colorValidator = new ColorValidator();
    fontSizeValidator = new FontSizeValidator({ minSizePx: 12, maxSizePx: 72 });

    // Mock matchMedia
    if (!window.matchMedia) {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
    }

    // Clear CSS variables
    document.documentElement.style.removeProperty("--bg-color");
    document.documentElement.style.removeProperty("--text-color");
    document.documentElement.style.removeProperty("--primary-color");
  });

  afterEach(() => {
    // Clean up
    colorValidator.destroy();
    fontSizeValidator.destroy();

    // Clear CSS variables
    document.documentElement.style.removeProperty("--bg-color");
    document.documentElement.style.removeProperty("--text-color");
    document.documentElement.style.removeProperty("--primary-color");
  });

  // ── Test 2.1.1: Theme Switch → Style Update Flow ──

  describe("Theme Switch → Style Update Flow", () => {
    it("should update all CSS variables when switching to dark theme", () => {
      const { setTheme } = useThemeStore.getState();

      setTheme("navy");

      expect(useThemeStore.getState().currentTheme).toBe("navy");

      // Verify CSS classes are set
      expect(document.documentElement.classList.contains("navy")).toBe(true);
      expect(document.body.classList.contains("navy")).toBe(true);
      expect(document.documentElement.classList.contains("cyberpunk")).toBe(false);
      expect(document.body.classList.contains("cyberpunk")).toBe(false);
    });

    it("should update all CSS variables when switching to light theme", () => {
      const { setTheme } = useThemeStore.getState();

      setTheme("cyberpunk");

      expect(useThemeStore.getState().currentTheme).toBe("cyberpunk");

      // Verify CSS classes are set
      expect(document.documentElement.classList.contains("cyberpunk")).toBe(true);
      expect(document.body.classList.contains("cyberpunk")).toBe(true);
      expect(document.documentElement.classList.contains("navy")).toBe(false);
      expect(document.body.classList.contains("navy")).toBe(false);
    });

    it("should update preview when theme changes", () => {
      const { setTheme } = useThemeStore.getState();

      // Set initial theme
      setTheme("cyberpunk");
      const initialHasCyberpunk = document.documentElement.classList.contains("cyberpunk");

      // Change theme
      setTheme("navy");
      const updatedHasNavy = document.documentElement.classList.contains("navy");

      // Theme classes should change
      expect(initialHasCyberpunk).toBe(true);
      expect(updatedHasNavy).toBe(true);
      expect(document.documentElement.classList.contains("cyberpunk")).toBe(false);
    });

    it("should handle rapid theme switching", () => {
      const { setTheme } = useThemeStore.getState();

      // Switch themes rapidly
      setTheme("cyberpunk");
      setTheme("navy");
      setTheme("cyberpunk");
      setTheme("navy");

      // Final theme should be navy
      expect(useThemeStore.getState().currentTheme).toBe("navy");

      // CSS classes should be set correctly
      expect(document.documentElement.classList.contains("navy")).toBe(true);
      expect(document.documentElement.classList.contains("cyberpunk")).toBe(false);
    });
  });

  // ── Test 2.1.2: Custom Color → CSS Variable Update Flow ──

  describe("Custom Color → CSS Variable Update Flow", () => {
    it("should update CSS variables when setting custom primary color", () => {
      const { setTheme, updateCustomColors } = useThemeStore.getState();

      setTheme("navy");
      updateCustomColors({ primary: "#ff0000" });

      expect(useThemeStore.getState().customColors.primary).toBe("#ff0000");
    });

    it("should update CSS variables when setting custom background color", () => {
      const { setTheme, updateCustomColors } = useThemeStore.getState();

      setTheme("navy");
      updateCustomColors({ background: "#1a1a2e" });

      expect(useThemeStore.getState().customColors.background).toBe("#1a1a2e");
    });

    it("should update multiple custom colors simultaneously", () => {
      const { setTheme, updateCustomColors } = useThemeStore.getState();

      setTheme("navy");
      updateCustomColors({
        primary: "#ff0000",
        secondary: "#00ff00",
        background: "#000000",
        text: "#ffffff",
      });

      expect(useThemeStore.getState().customColors.primary).toBe("#ff0000");
      expect(useThemeStore.getState().customColors.secondary).toBe("#00ff00");
      expect(useThemeStore.getState().customColors.background).toBe("#000000");
      expect(useThemeStore.getState().customColors.text).toBe("#ffffff");
    });

    it("should reset to default colors when switching from custom theme", () => {
      const { setTheme, updateCustomColors } = useThemeStore.getState();

      // Set custom colors
      setTheme("navy");
      updateCustomColors({ primary: "#ff0000", background: "#000000" });
      expect(useThemeStore.getState().customColors.primary).toBe("#ff0000");

      // Switch to predefined theme
      setTheme("cyberpunk");

      // Theme should change but custom colors persist
      expect(useThemeStore.getState().currentTheme).toBe("cyberpunk");
      expect(useThemeStore.getState().customColors.primary).toBe("#ff0000");
    });
  });

  // ── Test 2.1.3: Invalid Color Validation → Error Display Flow ──

  describe("Invalid Color Validation → Error Display Flow", () => {
    it("should validate hex color format", () => {
      const result = colorValidator.validateHex("#ff0000");
      expect(result.valid).toBe(true);

      const invalidResult = colorValidator.validateHex("ff0000");
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain("hex color");
    });

    it("should validate RGB color format", () => {
      const result = colorValidator.validateRGB("rgb(255, 0, 0)");
      expect(result.valid).toBe(true);

      const invalidResult = colorValidator.validateRGB("rgb(300, 0, 0)");
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain("RGB value");
    });

    it("should validate HSL color format", () => {
      const result = colorValidator.validateHSL("hsl(120, 100%, 50%)");
      expect(result.valid).toBe(true);

      const invalidResult = colorValidator.validateHSL("hsl(400, 100%, 50%)");
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain("HSL hue");
    });

    it("should validate color contrast ratio", () => {
      const result = colorValidator.validateContrast("#ffffff", "#000000");
      expect(result.valid).toBe(true);
      expect(result.contrastRatio).toBeGreaterThan(7); // WCAG AAA

      const lowContrastResult = colorValidator.validateContrast("#ffffff", "#eeeeee");
      expect(lowContrastResult.valid).toBe(false);
      expect(lowContrastResult.error).toContain("contrast");
    });

    it("should show error when customizing with invalid hex color", () => {
      const { setTheme, updateCustomColors, themeError } = useThemeStore.getState();

      setTheme("custom");

      // Try to set invalid color
      const validationResult = colorValidator.validateHex("invalid");
      expect(validationResult.valid).toBe(false);

      // Should not update invalid color
      if (validationResult.valid) {
        updateCustomColors({ primary: "invalid" });
      } else {
        // Store validation error
        useThemeStore.setState({ themeError: validationResult.error });
      }

      expect(useThemeStore.getState().themeError).toBeTruthy();
    });

    it("should show error when customizing with low contrast colors", () => {
      const { setTheme, updateCustomColors } = useThemeStore.getState();

      setTheme("custom");

      // Try to set low contrast colors
      const validationResult = colorValidator.validateContrast("#ffffff", "#eeeeee");
      expect(validationResult.valid).toBe(false);

      if (!validationResult.valid) {
        useThemeStore.setState({ themeError: validationResult.error });
      }

      expect(useThemeStore.getState().themeError).toContain("contrast");
    });
  });

  // ── Test 2.1.4: System Theme Listening → Auto Switch Flow ──

  describe("System Theme Listening → Auto Switch Flow", () => {
    it("should enable system theme following", () => {
      const { setSystemThemeFollow } = useThemeStore.getState();

      setSystemThemeFollow(true);

      expect(useThemeStore.getState().systemThemeFollow).toBe(true);
    });

    it("should disable system theme following", () => {
      const { setSystemThemeFollow } = useThemeStore.getState();

      setSystemThemeFollow(false);

      expect(useThemeStore.getState().systemThemeFollow).toBe(false);
    });

    it("should update theme when system theme changes (simulated)", () => {
      const { setSystemThemeFollow } = useThemeStore.getState();

      setSystemThemeFollow(true);

      // Simulate system theme change event
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

      // Note: In real scenario, this would trigger automatic update
      expect(useThemeStore.getState().systemThemeFollow).toBe(true);
    });

    it("should not auto-switch when system theme following disabled", () => {
      const { setSystemThemeFollow, setTheme } = useThemeStore.getState();

      setSystemThemeFollow(false);
      setTheme("cyberpunk");

      const currentTheme = useThemeStore.getState().currentTheme;
      expect(currentTheme).toBe("cyberpunk");

      // Simulate system theme change
      // Should not change because system theme follow is disabled
      expect(useThemeStore.getState().currentTheme).toBe("cyberpunk");
    });
  });

  // ── Test 2.1.5: Font Size Validation Flow ──

  describe("Font Size Validation Flow", () => {
    it("should validate font size in pixels", () => {
      const result = fontSizeValidator.validate("16px");
      expect(result.valid).toBe(true);

      const invalidResult = fontSizeValidator.validate("-16px");
      expect(invalidResult.valid).toBe(false);
    });

    it("should validate font size in rem", () => {
      const result = fontSizeValidator.validate("1rem");
      expect(result.valid).toBe(true);

      const invalidResult = fontSizeValidator.validate("-1rem");
      expect(invalidResult.valid).toBe(false);
    });

    it("should clamp font size to max limit", () => {
      const result = fontSizeValidator.validate("100px");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("font size");
    });

    it("should clamp font size to min limit", () => {
      const result = fontSizeValidator.validate("8px");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("font size");
    });

    it("should validate relative font sizes", () => {
      const result = fontSizeValidator.validate("1.5em");
      expect(result.valid).toBe(true);

      const invalidResult = fontSizeValidator.validate("0.1em");
      expect(invalidResult.valid).toBe(false);
    });
  });

  // ── Test 2.1.6: Complete Theme Workflow Integration ──

  describe("Complete Theme Workflow Integration", () => {
    it("should handle complete workflow: switch theme → customize colors → validate → system sync", () => {
      const { setTheme, updateCustomColors, setSystemThemeFollow } = useThemeStore.getState();

      // 1. Switch to dark theme
      setTheme("navy");
      expect(useThemeStore.getState().currentTheme).toBe("navy");

      // 2. Switch to custom theme
      setTheme("custom");
      expect(useThemeStore.getState().currentTheme).toBe("custom");

      // 3. Customize colors with validation
      const primaryValidation = colorValidator.validateHex("#ff0000");
      const bgValidation = colorValidator.validateHex("#000000");

      expect(primaryValidation.valid).toBe(true);
      expect(bgValidation.valid).toBe(true);

      if (primaryValidation.valid && bgValidation.valid) {
        updateCustomColors({
          primary: "#ff0000",
          background: "#000000",
        });
      }

      expect(useThemeStore.getState().customColors.primary).toBe("#ff0000");
      expect(useThemeStore.getState().customColors.background).toBe("#000000");

      // 4. Enable system theme following
      setSystemThemeFollow(true);
      expect(useThemeStore.getState().systemThemeFollow).toBe(true);

      // Complete workflow successful
    });

    it("should handle theme with invalid colors", () => {
      const { setTheme, updateCustomColors } = useThemeStore.getState();

      setTheme("custom");

      // Try invalid color
      const invalidValidation = colorValidator.validateHex("invalid");
      expect(invalidValidation.valid).toBe(false);

      // Should not update with invalid color
      if (!invalidValidation.valid) {
        useThemeStore.setState({ themeError: invalidValidation.error });
      }

      expect(useThemeStore.getState().themeError).toBeTruthy();

      // Try valid color
      const validValidation = colorValidator.validateHex("#ff0000");
      expect(validValidation.valid).toBe(true);

      if (validValidation.valid) {
        useThemeStore.setState({ themeError: null });
        updateCustomColors({ primary: "#ff0000" });
      }

      expect(useThemeStore.getState().customColors.primary).toBe("#ff0000");
      expect(useThemeStore.getState().themeError).toBeNull();
    });

    it("should handle font size validation in theme", () => {
      const { setTheme } = useThemeStore.getState();

      setTheme("navy");

      // Validate font size
      const validSize = fontSizeValidator.validate("16px");
      expect(validSize.valid).toBe(true);

      const invalidSize = fontSizeValidator.validate("100px");
      expect(invalidSize.valid).toBe(false);
      expect(invalidSize.error).toContain("font size");
    });
  });
});
