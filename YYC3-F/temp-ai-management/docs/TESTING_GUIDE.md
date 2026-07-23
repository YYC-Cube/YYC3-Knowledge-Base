# 🧪 YanYu Cloud³ 测试体系完善指南# 🧪 YanYu Cloud³ 测试体系完善指南

> **高优先级改进方向**: 将测试覆盖率从 65%提升到 80%+，建立完善的测试体系> **高优先级改进方向**: 将测试覆盖率从 65%提升到 80%+，建立完善的测试体系

## 📋 目录## 📋 目录

1. [测试策略与架构](#1-测试策略与架构)1. [测试策略与架构](#测试策略与架构)

2. [配置与环境设置](#2-配置与环境设置)2. [配置与环境设置](#配置与环境设置)

3. [单元测试](#3-单元测试)3. [单元测试](#单元测试)

4. [集成测试](#4-集成测试)4. [集成测试](#集成测试)

5. [端到端测试](#5-端到端测试)5. [E2E 测试](#e2e测试)

6. [性能测试](#6-性能测试)6. [性能测试](#性能测试)

7. [CI/CD 集成](#7-cicd集成)7. [CI/CD 集成](#cicd集成)

8. [测试覆盖率目标](#8-测试覆盖率目标)8. [测试覆盖率目标](#测试覆盖率目标)

9. [质量门禁机制](#9-质量门禁机制)9. [质量门禁机制](#质量门禁机制)

10. [最佳实践](#10-最佳实践)10. [最佳实践](#最佳实践)

## 1. 测试策略与架构## 测试策略

### 当前状态分析### 测试金字塔

- **单元测试覆盖率**: 65% → 目标: 80%+\`\`\`

- **集成测试**: 基础设置 → 目标: 70%+/\

- **E2E 测试**: 待完善 → 目标: 60%+ /E2E\

- **自动化程度**: 40% → 目标: 85%+ /------\

/Integration\

### 测试金字塔架构 /-------------\

/ Unit Tests \

````/-----------------\

    E2E 测试 (20%)\`\`\`

    ├── 关键业务流程

    ├── 用户完整旅程- **单元测试**: 70% 覆盖率

    └── 跨系统集成- **集成测试**: 20% 覆盖率

- **E2E测试**: 10% 覆盖率

  集成测试 (30%)

  ├── API接口测试## 单元测试

  ├── 数据库集成

  ├── 外部服务集成### 后端服务测试

  └── 组件间交互

#### 测试框架

单元测试 (50%)

├── 业务逻辑测试- Jest

├── 工具函数测试- Supertest (API测试)

├── 组件单元测试- ts-jest (TypeScript支持)

└── 服务层测试

```#### 测试结构



### 技术栈选择\`\`\`typescript

describe('ServiceName', () => {

**前端测试**:let service: ServiceName



- **框架**: Jest + React Testing LibrarybeforeEach(() => {

- **E2E**: Playwright// 初始化

- **快照测试**: Jest Snapshots})

- **Mock**: Jest Mocks + MSW

afterEach(() => {

**后端测试**:// 清理

jest.clearAllMocks()

- **框架**: Jest + Supertest})

- **数据库**: Test Database + Docker

- **API测试**: Supertest + HTTP assertionsdescribe('methodName', () => {

- **Mock**: Jest Mocks + Sinonit('should do something', async () => {

// Arrange

## 2. 配置与环境设置const input = {}



### Jest 配置      // Act

      const result = await service.methodName(input)

```javascript

// jest.config.js      // Assert

module.exports = {      expect(result).toBeDefined()

  // 基础配置    })

  preset: 'ts-jest',

  testEnvironment: 'node',})

  roots: ['<rootDir>/src', '<rootDir>/tests'],})

  \`\`\`

  // 测试文件匹配

  testMatch: [#### Mock策略

    '**/__tests__/**/*.(ts|tsx|js)',

    '**/*.(test|spec).(ts|tsx|js)'\`\`\`typescript

  ],// Mock外部依赖

  jest.mock('../config/database')

  // TypeScript 支持jest.mock('../config/redis')

  transform: {

    '^.+\\.tsx?$': 'ts-jest',// Mock函数

  },const mockFunction = jest.fn().mockResolvedValue({})

  \`\`\`

  // 模块解析

  moduleNameMapping: {### 前端组件测试

    '^@/(.*)$': '<rootDir>/src/$1',

    '^@components/(.*)$': '<rootDir>/src/components/$1',#### 测试框架

    '^@utils/(.*)$': '<rootDir>/src/utils/$1',

  },- Vitest

  - React Testing Library

  // 覆盖率配置- @testing-library/user-event

  collectCoverage: true,

  coverageDirectory: 'coverage',#### 组件测试示例

  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  \`\`\`typescript

  // 覆盖率阈值 - 高优先级改进import { render, screen } from '@testing-library/react'

  coverageThreshold: {import userEvent from '@testing-library/user-event'

    global: {import { Button } from './Button'

      branches: 80,

      functions: 80,describe('Button', () => {

      lines: 80,it('renders button with text', () => {

      statements: 80render(<Button>Click me</Button>)

    },expect(screen.getByText('Click me')).toBeInTheDocument()

    './src/core/': {})

      branches: 90,

      functions: 90,it('calls onClick when clicked', async () => {

      lines: 90,const handleClick = jest.fn()

      statements: 90render(<Button onClick={handleClick}>Click</Button>)

    },

    './src/services/': {    await userEvent.click(screen.getByText('Click'))

      branches: 85,    expect(handleClick).toHaveBeenCalledTimes(1)

      functions: 85,

      lines: 85,})

      statements: 85})

    }\`\`\`

  },

  ## 集成测试

  // 忽略文件

  coveragePathIgnorePatterns: [### API集成测试

    '/node_modules/',

    '/dist/',\`\`\`typescript

    '/coverage/',import request from 'supertest'

    '/__tests__/',import { app } from '../server'

    '/migrations/',

    '/scripts/'describe('Reconciliation API', () => {

  ],it('should create a reconciliation record', async () => {

  const response = await request(app)

  // 测试环境设置.post('/api/reconciliation/records')

  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],.set('Authorization', 'Bearer valid-token')

  .send({

  // 超时设置transactionDate: '2024-01-15',

  testTimeout: 30000,amount: 1000,

  // ...

  // 并行测试})

  maxWorkers: '50%',.expect(201)

}

```    expect(response.body.success).toBe(true)

    expect(response.body.data.recordNumber).toMatch(/^REC-/)

### Playwright E2E 配置

})

```typescript})

// playwright.config.ts\`\`\`

import { defineConfig, devices } from '@playwright/test'

### 数据库集成测试

export default defineConfig({

  testDir: './tests/e2e',\`\`\`typescript

  fullyParallel: true,describe('Database Integration', () => {

  forbidOnly: !!process.env.CI,beforeAll(async () => {

  retries: process.env.CI ? 2 : 0,await pool.query('BEGIN')

  workers: process.env.CI ? 1 : undefined,})

  reporter: [

    ['html'],afterAll(async () => {

    ['json', { outputFile: 'test-results/results.json' }]await pool.query('ROLLBACK')

  ],await pool.end()

  })

  use: {

    baseURL: 'http://127.0.0.1:3000',it('should perform database operations', async () => {

    trace: 'on-first-retry',// 测试逻辑

    screenshot: 'only-on-failure',})

    video: 'retain-on-failure',})

  },\`\`\`



  projects: [## E2E测试

    {

      name: 'chromium',### Playwright测试

      use: { ...devices['Desktop Chrome'] },

    },#### 安装

    {

      name: 'firefox',\`\`\`bash

      use: { ...devices['Desktop Firefox'] },npm install -D @playwright/test

    },npx playwright install

    {\`\`\`

      name: 'webkit',

      use: { ...devices['Desktop Safari'] },#### 测试示例

    },

    {\`\`\`typescript

      name: 'Mobile Chrome',import { test, expect } from '@playwright/test'

      use: { ...devices['Pixel 5'] },

    },test.describe('User Login Flow', () => {

  ],test('should login successfully', async ({ page }) => {

await page.goto('<http://localhost:3000>')

  webServer: {

    command: 'npm run dev',    await page.fill('[name="email"]', 'user@example.com')

    url: 'http://127.0.0.1:3000',    await page.fill('[name="password"]', 'password123')

    reuseExistingServer: !process.env.CI,    await page.click('button[type="submit"]')

  },

})    await expect(page).toHaveURL('/dashboard')

```    await expect(page.locator('text=Welcome')).toBeVisible()



## 3. 单元测试})

})

### 业务逻辑测试示例\`\`\`



```typescript#### 关键测试场景

// src/services/__tests__/reconciliation.service.test.ts

import { ReconciliationService } from '../reconciliation.service'1. **用户认证流程**

import { mockDatabase } from '../../__mocks__/database'   - 登录/登出

   - 密码重置

describe('ReconciliationService', () => {   - 权限验证

  let service: ReconciliationService

  2. **财务对账流程**

  beforeEach(() => {   - CSV导入

    service = new ReconciliationService(mockDatabase)   - 自动对账

    jest.clearAllMocks()   - 异常处理

  })   - AI分析



  describe('autoReconcile', () => {3. **工单系统**

    it('should match records within tolerance', async () => {   - 创建工单

      // Arrange   - 状态更新

      const records = [   - 消息发送

        { id: 1, amount: 100.00, date: '2024-01-01' },

        { id: 2, amount: 100.05, date: '2024-01-01' }## 性能测试

      ]

      mockDatabase.getUnmatchedRecords.mockResolvedValue(records)### k6负载测试



      // Act#### 安装

      const result = await service.autoReconcile(0.1)

      \`\`\`bash

      // Assertbrew install k6 # macOS

      expect(result.matched).toBe(1)

      expect(result.matchRate).toBeCloseTo(0.5)# or

      expect(mockDatabase.updateRecordStatus).toHaveBeenCalledWith(

        [1, 2], curl <https://github.com/grafana/k6/releases/download/v0.46.0/k6-v0.46.0-linux-amd64.tar.gz> -L | tar xvz --strip-components 1

        'matched'\`\`\`

      )

    })#### 测试脚本



    it('should handle empty records gracefully', async () => {\`\`\`javascript

      // Arrangeimport http from 'k6/http'

      mockDatabase.getUnmatchedRecords.mockResolvedValue([])import { check, sleep } from 'k6'



      // Actexport const options = {

      const result = await service.autoReconcile(0.1)stages: [

      { duration: '1m', target: 100 }, // 爬升至100用户

      // Assert{ duration: '3m', target: 100 }, // 保持100用户

      expect(result.matched).toBe(0){ duration: '1m', target: 0 }, // 降至0

      expect(result.matchRate).toBe(0)],

    })thresholds: {

  })http_req_duration: ['p(95)<500'], // 95%请求 < 500ms

})http_req_failed: ['rate<0.01'], // 错误率 < 1%

```},

}

### React组件测试示例

export default function () {

```typescriptconst res = http.get('<http://localhost:3001/api/health>')

// src/components/__tests__/KpiCard.test.tsx

import React from 'react'check(res, {

import { render, screen } from '@testing-library/react''status is 200': (r) => r.status === 200,

import { KpiCard } from '../KpiCard''response time OK': (r) => r.timings.duration < 500,

})

describe('KpiCard', () => {

  const defaultProps = {sleep(1)

    title: '总收入',}

    value: 1234567.89,\`\`\`

    currency: '￥',

    change: 5.4,#### 运行测试

    timeframe: '本月',

    trend: 'up' as const\`\`\`bash

  }k6 run backend/performance/k6-load-test.js

\`\`\`

  it('renders title and value correctly', () => {

    render(<KpiCard {...defaultProps} />)## 测试覆盖率目标



    expect(screen.getByText('总收入')).toBeInTheDocument()### 目标指标

    expect(screen.getByText('￥1,234,567.89')).toBeInTheDocument()

  })- **总体覆盖率**: 80%+

- **关键业务逻辑**: 95%+

  it('shows positive trend indicator', () => {- **工具函数**: 90%+

    render(<KpiCard {...defaultProps} />)- **UI组件**: 75%+



    const trendElement = screen.getByTestId('trend-indicator')### 覆盖率报告

    expect(trendElement).toHaveClass('text-green-600')

    expect(screen.getByText('+5.4%')).toBeInTheDocument()\`\`\`bash

  })

# 后端

  it('shows negative trend indicator', () => {

    render(npm run test:coverage

      <KpiCard

        {...defaultProps} # 前端

        change={-2.1}

        trend="down" npm run test:ui -- --coverage

      />\`\`\`

    )

    ### CI/CD集成

    const trendElement = screen.getByTestId('trend-indicator')

    expect(trendElement).toHaveClass('text-red-600')\`\`\`yaml

    expect(screen.getByText('-2.1%')).toBeInTheDocument()

  })# .github/workflows/test.yml

})

```- name: Run Tests

  run: npm test -- --coverage

### Mock策略- name: Upload Coverage

  uses: codecov/codecov-action@v3

```typescript  with:

// 外部依赖Mock  files: ./coverage/lcov.info

jest.mock('../config/database')

jest.mock('../config/redis')- name: Check Coverage Threshold

jest.mock('../config/openai')  run: |

  if [ $(cat coverage/coverage-summary.json | jq '.total.lines.pct') -lt 80 ]; then

// 函数Mock  echo "Coverage below 80%"

const mockFunction = jest.fn().mockResolvedValue({})  exit 1

  fi

// 类Mock  \`\`\`

jest.mock('../services/EmailService', () => ({

  EmailService: jest.fn().mockImplementation(() => ({## 最佳实践

    sendEmail: jest.fn().mockResolvedValue(true)

  }))1. **测试命名**: 清晰描述测试意图

}))2. **测试隔离**: 每个测试独立运行

```3. **Mock外部依赖**: 避免测试依赖外部服务

4. **快速反馈**: 单元测试应在秒级完成

## 4. 集成测试5. **持续维护**: 随代码更新测试

6. **可读性**: 测试代码应易于理解

### API 集成测试7. **覆盖边界条件**: 测试正常、异常、边界情况



```typescript## 运行测试

// tests/integration/reconciliation-api.test.ts

import request from 'supertest'\`\`\`bash

import { app } from '../../src/server'

import { setupTestDatabase, teardownTestDatabase } from '../utils/test-db'# 运行所有测试

import { createTestUser, getTestToken } from '../utils/test-auth'

npm test

describe('Reconciliation API Integration', () => {

  let testToken: string# 运行特定测试文件



  beforeAll(async () => {npm test -- reconciliation.service.test.ts

    await setupTestDatabase()

    const user = await createTestUser()# 监视模式

    testToken = await getTestToken(user.id)

  })npm test -- --watch



  afterAll(async () => {# 覆盖率报告

    await teardownTestDatabase()

  })npm run test:coverage



  describe('POST /api/reconciliation/import', () => {# E2E测试

    it('should import CSV file successfully', async () => {

      const response = await request(app)npm run test:e2e

        .post('/api/reconciliation/import')

        .attach('file', 'tests/fixtures/sample-transactions.csv')# 性能测试

        .set('Authorization', `Bearer ${testToken}`)

        .expect(200)npm run test:performance

\`\`\`

      expect(response.body.success).toBe(true)
      expect(response.body.data.recordsImported).toBeGreaterThan(0)
      expect(response.body.data.errors).toHaveLength(0)
    })

    it('should reject invalid file format', async () => {
      const response = await request(app)
        .post('/api/reconciliation/import')
        .attach('file', 'tests/fixtures/invalid.txt')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Invalid file format')
    })
  })

  describe('POST /api/reconciliation/auto-reconcile', () => {
    beforeEach(async () => {
      // 准备测试数据
      await request(app)
        .post('/api/reconciliation/import')
        .attach('file', 'tests/fixtures/sample-transactions.csv')
        .set('Authorization', `Bearer ${testToken}`)
    })

    it('should perform auto reconciliation', async () => {
      const response = await request(app)
        .post('/api/reconciliation/auto-reconcile')
        .send({ tolerance: 0.05 })
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.matched).toBeGreaterThanOrEqual(0)
      expect(response.body.data.matchRate).toBeGreaterThanOrEqual(0)
    })
  })
})
````

### 数据库集成测试

```typescript
describe("Database Integration", () => {
  beforeAll(async () => {
    await pool.query("BEGIN");
  });

  afterAll(async () => {
    await pool.query("ROLLBACK");
    await pool.end();
  });

  it("should perform complex query operations", async () => {
    // 插入测试数据
    const insertResult = await pool.query(
      "INSERT INTO reconciliation_records (amount, date) VALUES ($1, $2) RETURNING id",
      [100.5, "2024-01-01"]
    );

    // 验证插入
    expect(insertResult.rows[0].id).toBeDefined();

    // 查询验证
    const selectResult = await pool.query(
      "SELECT * FROM reconciliation_records WHERE id = $1",
      [insertResult.rows[0].id]
    );

    expect(selectResult.rows[0].amount).toBe(100.5);
  });
});
```

## 5. 端到端测试

### 完整业务流程测试

```typescript
// tests/e2e/reconciliation-flow.spec.ts
import { test, expect, Page } from "@playwright/test";

test.describe("Reconciliation Complete Flow", () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // 登录
    await page.goto("/login");
    await page.fill('[data-testid="email"]', "test@example.com");
    await page.fill('[data-testid="password"]', "password123");
    await page.click('[data-testid="login-button"]');
    await page.waitForURL("/dashboard");
  });

  test("should complete reconciliation workflow", async () => {
    // 1. 导航到对账页面
    await page.click('[data-testid="nav-reconciliation"]');
    await page.waitForURL("/reconciliation");

    // 2. 上传CSV文件
    await page.setInputFiles(
      '[data-testid="file-upload"]',
      "tests/fixtures/sample-transactions.csv"
    );
    await page.click('[data-testid="upload-button"]');

    // 3. 等待上传完成
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="records-count"]')).toContainText(
      /\d+ 条记录/
    );

    // 4. 执行自动对账
    await page.click('[data-testid="auto-reconcile-button"]');
    await page.waitForSelector('[data-testid="reconcile-progress"]');
    await page.waitForSelector('[data-testid="reconcile-complete"]', {
      timeout: 30000,
    });

    // 5. 验证结果
    const matchedCount = await page
      .locator('[data-testid="matched-count"]')
      .textContent();
    expect(parseInt(matchedCount || "0")).toBeGreaterThan(0);

    const matchRate = await page
      .locator('[data-testid="match-rate"]')
      .textContent();
    expect(parseFloat(matchRate || "0")).toBeGreaterThan(0);

    // 6. 查看详细报告
    await page.click('[data-testid="view-report-button"]');
    await expect(
      page.locator('[data-testid="reconciliation-report"]')
    ).toBeVisible();

    // 7. 验证报告内容
    await expect(page.locator('[data-testid="report-summary"]')).toContainText(
      "对账完成"
    );
    await expect(page.locator('[data-testid="report-charts"]')).toBeVisible();
  });

  test("should handle file upload errors gracefully", async () => {
    await page.click('[data-testid="nav-reconciliation"]');

    // 上传无效文件
    await page.setInputFiles(
      '[data-testid="file-upload"]',
      "tests/fixtures/invalid-format.txt"
    );
    await page.click('[data-testid="upload-button"]');

    // 验证错误处理
    await expect(page.locator('[data-testid="upload-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      "文件格式无效"
    );
  });
});
```

### 跨浏览器兼容性测试

```typescript
// tests/e2e/cross-browser.spec.ts
import { test, devices } from "@playwright/test";

const browsers = [
  { name: "Chrome", device: devices["Desktop Chrome"] },
  { name: "Firefox", device: devices["Desktop Firefox"] },
  { name: "Safari", device: devices["Desktop Safari"] },
  { name: "Mobile", device: devices["iPhone 12"] },
];

browsers.forEach(({ name, device }) => {
  test.describe(`${name} Browser Tests`, () => {
    test.use(device);

    test("should render dashboard correctly", async ({ page }) => {
      await page.goto("/dashboard");

      // 验证关键元素
      await expect(
        page.locator('[data-testid="dashboard-title"]')
      ).toBeVisible();
      await expect(page.locator('[data-testid="kpi-cards"]')).toBeVisible();
      await expect(
        page.locator('[data-testid="charts-section"]')
      ).toBeVisible();
    });
  });
});
```

## 6. 性能测试

### k6 负载测试

```javascript
// backend/performance/k6-load-test.js
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

// 自定义指标
const errorRate = new Rate("errors");

export const options = {
  stages: [
    { duration: "2m", target: 10 }, // 预热
    { duration: "5m", target: 50 }, // 负载测试
    { duration: "2m", target: 100 }, // 压力测试
    { duration: "5m", target: 100 }, // 保持压力
    { duration: "2m", target: 0 }, // 降压
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95%请求 < 500ms
    http_req_failed: ["rate<0.01"], // 错误率 < 1%
    errors: ["rate<0.1"], // 自定义错误率 < 10%
  },
};

export default function () {
  // 健康检查
  let res = http.get("http://localhost:3001/api/health");
  check(res, {
    "health check status is 200": (r) => r.status === 200,
  }) || errorRate.add(1);

  // API负载测试
  res = http.get("http://localhost:3001/api/reconciliation/records", {
    headers: {
      Authorization: "Bearer test-token",
    },
  });

  check(res, {
    "records API status is 200": (r) => r.status === 200,
    "response time OK": (r) => r.timings.duration < 500,
    "has records": (r) => JSON.parse(r.body).data.length >= 0,
  }) || errorRate.add(1);

  sleep(1);
}
```

### 前端性能测试

```typescript
// tests/performance/lighthouse.test.ts
import { test } from "@playwright/test";
import { playAudit } from "playwright-lighthouse";

test.describe("Performance Audits", () => {
  test("should meet Lighthouse performance standards", async ({ page }) => {
    await page.goto("/dashboard");

    await playAudit({
      page,
      thresholds: {
        performance: 80,
        accessibility: 90,
        "best-practices": 80,
        seo: 80,
      },
      port: 9222,
    });
  });
});
```

## 7. CICD 集成

### GitHub Actions 配置

```yaml
# .github/workflows/test-pipeline.yml
name: Test Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_USER: test
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Run type checking
        run: npm run type-check

      - name: Run unit tests
        run: npm test -- --coverage --watchAll=false
        env:
          NODE_ENV: test
          DB_HOST: localhost
          DB_PORT: 5432
          DB_NAME: test_db
          DB_USER: test
          DB_PASSWORD: test
          REDIS_HOST: localhost
          REDIS_PORT: 6379

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          flags: unittests

      - name: Check coverage threshold
        run: |
          COVERAGE=$(node -p "require('./coverage/coverage-summary.json').total.lines.pct")
          echo "Coverage: $COVERAGE%"
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "❌ Coverage below threshold: $COVERAGE%"
            exit 1
          else
            echo "✅ Coverage meets threshold: $COVERAGE%"
          fi

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Build application
        run: npm run build

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload E2E test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/

  quality-gate:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests, e2e-tests]

    steps:
      - name: Quality Gate Success
        run: |
          echo "🎉 All tests passed!"
          echo "✅ Unit tests: Passed"
          echo "✅ Integration tests: Passed"  
          echo "✅ E2E tests: Passed"
          echo "🚀 Ready for deployment!"
```

## 8. 测试覆盖率目标

### 覆盖率指标

| 测试类型     | 当前状态 | 目标 | 关键模块要求       |
| ------------ | -------- | ---- | ------------------ |
| **单元测试** | 65%      | 80%+ | 核心业务逻辑: 95%+ |
| **集成测试** | 基础     | 70%+ | API 接口: 85%+     |
| **E2E 测试** | 待完善   | 60%+ | 关键流程: 80%+     |
| **总体覆盖** | -        | 80%+ | 组件测试: 75%+     |

### 覆盖率报告生成

```javascript
// scripts/generate-test-report.js
const fs = require("fs");
const path = require("path");

async function generateTestReport() {
  const coverageData = require("../coverage/coverage-summary.json");
  const testResults = require("../test-results.json");

  const report = {
    timestamp: new Date().toISOString(),
    coverage: {
      total: coverageData.total,
      byFile: Object.keys(coverageData)
        .filter((key) => key !== "total")
        .map((file) => ({
          file,
          coverage: coverageData[file],
        })),
    },
    tests: {
      total: testResults.numTotalTests,
      passed: testResults.numPassedTests,
      failed: testResults.numFailedTests,
      skipped: testResults.numPendingTests,
    },
    quality: {
      coverageScore: coverageData.total.lines.pct,
      testScore: (testResults.numPassedTests / testResults.numTotalTests) * 100,
      overallScore: calculateOverallScore(coverageData, testResults),
    },
  };

  // 生成HTML报告
  const htmlReport = generateHtmlReport(report);
  fs.writeFileSync("test-report.html", htmlReport);

  // 生成JSON报告
  fs.writeFileSync("test-report.json", JSON.stringify(report, null, 2));

  console.log("📊 Test report generated successfully!");
}

function calculateOverallScore(coverage, tests) {
  const coverageWeight = 0.6;
  const testWeight = 0.4;

  const coverageScore = coverage.total.lines.pct;
  const testScore = (tests.numPassedTests / tests.numTotalTests) * 100;

  return coverageScore * coverageWeight + testScore * testWeight;
}

generateTestReport();
```

## 9. 质量门禁机制

### 自动化质量检查

```bash
# scripts/quality-gate.sh
#!/bin/bash

echo "🔍 Running Quality Gate Checks..."

# 1. 运行所有测试
echo "📝 Running tests..."
npm test -- --coverage --watchAll=false

# 2. 检查覆盖率
echo "📊 Checking coverage..."
COVERAGE=$(node -p "require('./coverage/coverage-summary.json').total.lines.pct")
if (( $(echo "$COVERAGE < 80" | bc -l) )); then
  echo "❌ Coverage below threshold: $COVERAGE%"
  exit 1
fi

# 3. 检查代码质量
echo "🔧 Running linting..."
npm run lint

# 4. 类型检查
echo "🎯 Type checking..."
npm run type-check

# 5. 安全扫描
echo "🛡️ Security audit..."
npm audit --audit-level moderate

echo "✅ Quality gate passed!"
```

### Pre-commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged && npm run test:changed",
      "pre-push": "npm run quality-gate"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{md,json}": ["prettier --write"]
  }
}
```

## 10. 最佳实践

### 测试编写原则

1. **AAA 模式**: Arrange - Act - Assert
2. **Given-When-Then**: 业务逻辑测试
3. **描述性命名**: 清晰表达测试意图
4. **单一职责**: 每个测试只验证一个行为
5. **独立性**: 测试间不相互依赖

### 命名约定

- **测试文件**: `*.test.ts` 或 `*.spec.ts`
- **测试目录**: `__tests__` 或 `tests/`
- **Mock 文件**: `__mocks__`
- **Fixtures**: `tests/fixtures/`

### Mock 策略

```typescript
// 1. 外部依赖始终Mock
jest.mock("../services/ExternalApiService");

// 2. 数据库使用Test Database
beforeAll(async () => {
  await setupTestDatabase();
});

// 3. 时间函数Mock
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2024-01-01"));
});

// 4. 网络请求使用MSW
import { rest } from "msw";
import { setupServer } from "msw/node";

const server = setupServer(
  rest.get("/api/data", (req, res, ctx) => {
    return res(ctx.json({ data: "test" }));
  })
);
```

### 数据管理

```typescript
// Test Fixtures
export const mockReconciliationRecord = {
  id: 1,
  amount: 100.5,
  date: "2024-01-01",
  status: "pending",
  description: "Test transaction",
};

// Factory Pattern
export class RecordFactory {
  static create(overrides = {}) {
    return {
      ...mockReconciliationRecord,
      ...overrides,
      id: Math.random(),
    };
  }

  static createMany(count: number, overrides = {}) {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}
```

### 命令行工具

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- reconciliation.service.test.ts

# 监视模式
npm test -- --watch

# 覆盖率报告
npm run test:coverage

# 端到端测试
npm run test:e2e

# 性能测试
npm run test:performance

# 完整质量检查
npm run quality-gate
```

---

## 📋 实施计划

### 第一阶段 (Week 1-2): 基础设施

- [ ] 配置 Jest 和测试环境
- [ ] 设置 CI/CD 流水线
- [ ] 建立测试数据库
- [ ] 创建测试工具函数

### 第二阶段 (Week 3-4): 单元测试

- [ ] 核心业务逻辑测试
- [ ] 工具函数测试
- [ ] React 组件测试
- [ ] 服务层测试

### 第三阶段 (Week 5-6): 集成测试

- [ ] API 接口测试
- [ ] 数据库集成测试
- [ ] 外部服务集成测试
- [ ] 组件间交互测试

### 第四阶段 (Week 7-8): E2E 测试

- [ ] 关键业务流程测试
- [ ] 用户完整旅程测试
- [ ] 跨浏览器兼容性测试
- [ ] 性能测试集成

### 第五阶段 (Week 9-10): 优化与监控

- [ ] 测试性能优化
- [ ] 报告系统完善
- [ ] 质量监控设置
- [ ] 团队培训

---

**注意**: 本测试体系改进方案需要根据实际项目进展进行调整。建议定期回顾测试指标和策略优化。
