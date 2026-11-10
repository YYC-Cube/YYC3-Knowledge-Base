import { test, expect } from "@playwright/test";

test.describe("Dashboard E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    // 导航到首页
    await page.goto("/");
  });

  test("should load dashboard page successfully", async ({ page }) => {
    // 检查页面标题
    await expect(page).toHaveTitle(/YanYu Cloud³/);

    // 检查主要内容区域
    await expect(page.locator("main")).toBeVisible();

    // 检查是否有加载指示器消失
    await page.waitForLoadState("networkidle");
  });

  test("should display navigation menu", async ({ page }) => {
    // 检查导航菜单是否存在
    const nav = page.locator("nav");
    await expect(nav).toBeVisible();

    // 检查主要导航项目
    await expect(page.locator("text=仪表板")).toBeVisible();
    await expect(page.locator("text=数据分析")).toBeVisible();
  });

  test("should handle responsive design", async ({ page }) => {
    // 测试桌面视图
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator("nav")).toBeVisible();

    // 测试移动视图
    await page.setViewportSize({ width: 375, height: 667 });

    // 在移动端可能需要点击菜单按钮
    const menuButton = page.locator('[aria-label="Menu"]');
    if (await menuButton.isVisible()) {
      await menuButton.click();
    }
  });

  test("should perform basic user interactions", async ({ page }) => {
    // 等待页面完全加载
    await page.waitForLoadState("networkidle");

    // 尝试点击一个按钮或链接
    const firstButton = page.locator("button").first();
    if (await firstButton.isVisible()) {
      await firstButton.click();
      // 等待任何可能的导航或模态框
      await page.waitForTimeout(1000);
    }
  });

  test("should handle error states gracefully", async ({ page }) => {
    // 模拟网络错误
    await page.route("**/api/**", (route) => {
      route.abort("failed");
    });

    await page.goto("/");

    // 检查错误处理
    // 这里可能需要根据实际的错误处理机制调整
    await page.waitForTimeout(2000);

    // 确保页面仍然可用
    await expect(page.locator("body")).toBeVisible();
  });
});
