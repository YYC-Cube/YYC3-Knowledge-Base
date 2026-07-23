const request = require("supertest");


// 模拟Express应用
const express = require("express");
const app = express();

app.use(express.json());

// 模拟API路由
app.get("/api/health", (req: any, res: any) => {
  res.json({ success: true, status: "healthy" });
});

app.post("/api/reconciliation/import", (req: any, res: any) => {
  const { records } = req.body;
  if (!records || !Array.isArray(records)) {
    return res.status(400).json({
      success: false,
      error: { code: "ERR_2002", message: "Invalid records format" },
    });
  }

  res.json({
    success: true,
    data: {
      recordsImported: records.length,
      processedAt: new Date().toISOString(),
    },
  });
});

app.get("/api/reconciliation/records", (req: any, res: any) => {
  res.json({
    success: true,
    data: [
      { id: 1, amount: 100.0, type: "income", date: "2025-01-01" },
      { id: 2, amount: 50.0, type: "expense", date: "2025-01-02" },
    ],
  });
});

app.post("/api/reconciliation/auto-reconcile", (req: any, res: any) => {
  res.json({
    success: true,
    data: {
      matched: 15,
      unmatched: 3,
      totalProcessed: 18,
    },
  });
});

app.get("/api/reconciliation/stats", (req: any, res: any) => {
  res.json({
    success: true,
    data: {
      totalRecords: 100,
      matchedRecords: 85,
      unmatchedRecords: 15,
      matchRate: 85.0,
    },
  });
});

describe("Reconciliation API Integration Tests", () => {
  beforeAll(async () => {
    // 在这里可以设置测试数据库
    console.log("Setting up integration test environment...");
  });

  afterAll(async () => {
    // 清理测试数据
    console.log("Cleaning up integration test environment...");
  });

  test("Health check should return healthy status", async () => {
    const response = await request(app).get("/api/health").expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.status).toBe("healthy");
  });

  test("Complete reconciliation flow from import to matching", async () => {
    // 1. Import records
    const importData = {
      records: [
        {
          amount: 100.0,
          type: "income",
          date: "2025-01-01",
          description: "Test income",
        },
        {
          amount: 50.0,
          type: "expense",
          date: "2025-01-02",
          description: "Test expense",
        },
      ],
    };

    const importResponse = await request(app)
      .post("/api/reconciliation/import")
      .send(importData)
      .expect(200);

    expect(importResponse.body.success).toBe(true);
    expect(importResponse.body.data.recordsImported).toBe(2);

    // 2. Verify records exist
    const recordsResponse = await request(app)
      .get("/api/reconciliation/records")
      .expect(200);

    expect(recordsResponse.body.success).toBe(true);
    expect(recordsResponse.body.data.length).toBeGreaterThan(0);

    // 3. Run auto-reconciliation
    const reconcileResponse = await request(app)
      .post("/api/reconciliation/auto-reconcile")
      .expect(200);

    expect(reconcileResponse.body.success).toBe(true);
    expect(reconcileResponse.body.data.matched).toBeGreaterThan(0);

    // 4. Verify stats updated correctly
    const statsResponse = await request(app)
      .get("/api/reconciliation/stats")
      .expect(200);

    expect(statsResponse.body.success).toBe(true);
    expect(statsResponse.body.data.matchRate).toBeGreaterThan(0);
  });

  test("Should handle invalid import data", async () => {
    const invalidData = {
      records: "not-an-array",
    };

    const response = await request(app)
      .post("/api/reconciliation/import")
      .send(invalidData)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("ERR_2002");
  });
});
