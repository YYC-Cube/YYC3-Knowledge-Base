// Playwright E2E 测试配置
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",

  // 并行运行测试
  fullyParallel: true,

  // CI环境中禁止only测试
  forbidOnly: !!process.env.CI,

  // 重试策略
  retries: process.env.CI ? 2 : 0,

  // 工作进程数
  workers: process.env.CI ? 1 : undefined,

  // 报告配置
  reporter: [
    ["html"],
    ["json", { outputFile: "test-results/results.json" }],
    ["junit", { outputFile: "test-results/junit.xml" }],
  ],

  // 全局配置
  use: {
    // 基础URL
    baseURL: "http://127.0.0.1:3000",

    // 追踪选项
    trace: "on-first-retry",

    // 截图选项
    screenshot: "only-on-failure",

    // 视频录制
    video: "retain-on-failure",

    // 忽略HTTPS错误
    ignoreHTTPSErrors: true,

    // 设置视口
    viewport: { width: 1280, height: 720 },

    // 等待策略
    actionTimeout: 30000,
    navigationTimeout: 30000,
  },

  // 项目配置 - 多浏览器测试
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    // 移动端测试
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },

    // 平板端测试
    {
      name: "Microsoft Edge",
      use: { ...devices["Desktop Edge"], channel: "msedge" },
    },
  ],

  // Web服务器配置
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  // 输出目录
  outputDir: "test-results/",

  // 超时配置
  timeout: 30 * 1000,
  expect: {
    timeout: 5 * 1000,
  },

  // 全局设置和拆卸
  globalSetup: require.resolve("./tests/global-setup"),
  globalTeardown: require.resolve("./tests/global-teardown"),
});
