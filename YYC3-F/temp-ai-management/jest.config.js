// Jest 测试配置文件 - 完整配置
module.exports = {
  // 基础配置
  roots: ["<rootDir>/tests", "<rootDir>/src"],

  // 测试文件匹配
  testMatch: [
    "**/__tests__/**/*.(js|ts|tsx)",
    "**/*.(test|spec).(js|ts|tsx)",
    "!**/e2e/**/*", // 排除E2E测试，由Playwright处理
  ],

  // TypeScript支持
  preset: "ts-jest",
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
        },
      },
    ],
    "^.+\\.(js|jsx)$": "babel-jest",
  },

  // 测试环境
  testEnvironment: "jsdom",

  // 覆盖率配置
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "json-summary", "lcov", "html"],

  // 收集覆盖率的文件
  collectCoverageFrom: [
    "src/**/*.{js,ts}",
    "backend/src/**/*.{js,ts}",
    "lib/**/*.{js,ts}",
    "hooks/**/*.{js,ts,tsx}",
    "components/**/*.{js,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.{js,ts}",
    "!src/**/index.{js,ts}",
    "!**/e2e/**",
  ],

  // 覆盖率阈值 - 高优先级改进：从65%提升到80%+
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // 忽略文件
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/coverage/",
    "/tests/e2e/",
    "/scripts/",
  ],

  // 测试环境设置
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],

  // 超时设置
  testTimeout: 30000,

  // 清除mock
  clearMocks: true,
  restoreMocks: true,

  // 详细输出
  verbose: true,

  // 模块名映射 (修正拼写)
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },

  // 转换忽略模式
  transformIgnorePatterns: ["node_modules/(?!(supertest|@playwright)/)"],
};
