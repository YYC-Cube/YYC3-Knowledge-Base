import { test, expect } from "@playwright/test";

test.describe("I18n Integration Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display default language (Chinese)", async ({ page }) => {
    // Check if page loads with Chinese content
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

    // Check if Chinese text is displayed
    await expect(page.getByText("仪表盘")).toBeVisible({ timeout: 10000 });
  });

  test("should change language using language selector", async ({ page }) => {
    // Find and click language selector
    const languageSelector = page
      .getByRole("button")
      .filter({ hasText: "简体中文" });
    await expect(languageSelector).toBeVisible({ timeout: 10000 });
    await languageSelector.click();

    // Select English
    await page.getByText("English").click();

    // Wait for language change to take effect
    await page.waitForTimeout(1000);

    // Check if English text is displayed
    await expect(page.getByText("Dashboard")).toBeVisible({ timeout: 5000 });

    // Check if HTML lang attribute changed
    await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
  });

  test("should persist language selection across page reloads", async ({
    page,
  }) => {
    // Change to English
    const languageSelector = page
      .getByRole("button")
      .filter({ hasText: "简体中文" });
    await languageSelector.click();
    await page.getByText("English").click();

    // Wait for change to persist
    await page.waitForTimeout(1000);

    // Reload page
    await page.reload();

    // Check if English is still selected
    await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
    await expect(page.getByText("Dashboard")).toBeVisible({ timeout: 10000 });
  });

  test("should handle RTL language (Arabic) correctly", async ({ page }) => {
    // Change to Arabic
    const languageSelector = page
      .getByRole("button")
      .filter({ hasText: "简体中文" });
    await languageSelector.click();
    await page.getByText("العربية").click();

    // Wait for change to take effect
    await page.waitForTimeout(1000);

    // Check RTL direction
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar-SA");
  });

  test("should format dates according to locale", async ({ page }) => {
    // Test with different locales if date display is available
    await page.goto("/dashboard"); // Assuming dashboard has date displays

    // Check Chinese date format
    const dateElement = page.locator('[data-testid="date-display"]').first();
    if (await dateElement.isVisible()) {
      const chineseDate = await dateElement.textContent();
      expect(chineseDate).toMatch(/年|月|日/);
    }

    // Change to English
    const languageSelector = page
      .getByRole("button")
      .filter({ hasText: "简体中文" });
    await languageSelector.click();
    await page.getByText("English").click();
    await page.waitForTimeout(1000);

    // Check English date format
    if (await dateElement.isVisible()) {
      const englishDate = await dateElement.textContent();
      expect(englishDate).toMatch(
        /January|February|March|April|May|June|July|August|September|October|November|December/
      );
    }
  });

  test("should format numbers according to locale", async ({ page }) => {
    // Test number formatting if available
    await page.goto("/dashboard");

    const numberElement = page
      .locator('[data-testid="number-display"]')
      .first();
    if (await numberElement.isVisible()) {
      // Check number formatting with commas
      const numberText = await numberElement.textContent();
      expect(numberText).toMatch(/\d{1,3}(,\d{3})*/);
    }
  });

  test("should handle form validation messages in different languages", async ({
    page,
  }) => {
    // Navigate to a form page
    await page.goto("/settings"); // Assuming settings has forms

    // Try to submit empty form to trigger validation
    const submitButton = page.getByRole("button", { name: /保存|submit/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Check Chinese validation message
      await expect(page.getByText("此字段为必填项")).toBeVisible({
        timeout: 5000,
      });
    }

    // Change to English
    const languageSelector = page.getByRole("button");
    await languageSelector.click();
    await page.getByText("English").click();
    await page.waitForTimeout(1000);

    // Try submit again
    const englishSubmitButton = page.getByRole("button", {
      name: /save|submit/i,
    });
    if (await englishSubmitButton.isVisible()) {
      await englishSubmitButton.click();

      // Check English validation message
      await expect(page.getByText("This field is required")).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("should maintain navigation state during language changes", async ({
    page,
  }) => {
    // Navigate to a specific page
    await page.goto("/orders");

    // Change language
    const languageSelector = page
      .getByRole("button")
      .filter({ hasText: "简体中文" });
    await languageSelector.click();
    await page.getByText("English").click();
    await page.waitForTimeout(1000);

    // Check if still on the same logical page
    expect(page.url()).toContain("/orders");

    // Check if navigation labels changed
    await expect(page.getByText("Order Management")).toBeVisible({
      timeout: 5000,
    });
  });

  test("should handle browser language detection", async ({
    page,
    context,
  }) => {
    // Set browser language to English
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "language", {
        get: () => "en-US",
      });
    });

    // Navigate to app
    await page.goto("/");

    // Should detect English and display English content
    await expect(page.getByText("Dashboard")).toBeVisible({ timeout: 10000 });
  });

  test("should fallback to default language for unsupported locales", async ({
    page,
    context,
  }) => {
    // Set browser language to unsupported locale
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "language", {
        get: () => "pt-BR", // Portuguese - not supported
      });
    });

    // Navigate to app
    await page.goto("/");

    // Should fallback to Chinese (default)
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    await expect(page.getByText("仪表盘")).toBeVisible({ timeout: 10000 });
  });
});
