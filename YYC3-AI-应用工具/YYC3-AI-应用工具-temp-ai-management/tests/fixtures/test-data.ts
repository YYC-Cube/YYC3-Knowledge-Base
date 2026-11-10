// 测试数据工厂
export interface MockRecord {
  id: number;
  amount: number;
  date: string;
  status: "pending" | "matched" | "unmatched";
  description: string;
  reference?: string;
}

export interface MockUser {
  id: number;
  email: string;
  name: string;
  role: "admin" | "user" | "viewer";
  createdAt: string;
}

// 对账记录模拟数据
export const mockReconciliationRecord: MockRecord = {
  id: 1,
  amount: 100.5,
  date: "2024-01-01",
  status: "pending",
  description: "Test transaction",
  reference: "TXN-001",
};

// 用户模拟数据
export const mockUser: MockUser = {
  id: 1,
  email: "test@example.com",
  name: "Test User",
  role: "admin",
  createdAt: "2024-01-01T00:00:00.000Z",
};

// 工厂模式生成测试数据
export class RecordFactory {
  static create(overrides: Partial<MockRecord> = {}): MockRecord {
    return {
      ...mockReconciliationRecord,
      ...overrides,
      id: overrides.id || Math.floor(Math.random() * 10000),
    };
  }

  static createMany(
    count: number,
    overrides: Partial<MockRecord> = {}
  ): MockRecord[] {
    return Array.from({ length: count }, (_, index) =>
      this.create({ ...overrides, id: index + 1 })
    );
  }

  static createMatched(overrides: Partial<MockRecord> = {}): MockRecord {
    return this.create({
      ...overrides,
      status: "matched",
      reference: `MATCHED-${Date.now()}`,
    });
  }

  static createUnmatched(overrides: Partial<MockRecord> = {}): MockRecord {
    return this.create({
      ...overrides,
      status: "unmatched",
      reference: `UNMATCHED-${Date.now()}`,
    });
  }
}

export class UserFactory {
  static create(overrides: Partial<MockUser> = {}): MockUser {
    return {
      ...mockUser,
      ...overrides,
      id: overrides.id || Math.floor(Math.random() * 10000),
    };
  }

  static createMany(
    count: number,
    overrides: Partial<MockUser> = {}
  ): MockUser[] {
    return Array.from({ length: count }, (_, index) =>
      this.create({ ...overrides, id: index + 1 })
    );
  }

  static createAdmin(overrides: Partial<MockUser> = {}): MockUser {
    return this.create({ ...overrides, role: "admin" });
  }

  static createRegularUser(overrides: Partial<MockUser> = {}): MockUser {
    return this.create({ ...overrides, role: "user" });
  }
}

// API响应模拟数据
export const mockApiResponses = {
  success: {
    success: true,
    data: null,
    message: "Operation completed successfully",
  },
  error: {
    success: false,
    error: "Operation failed",
    message: "An error occurred",
  },
  reconciliationImport: {
    success: true,
    data: {
      recordsImported: 100,
      errors: [],
      warnings: [],
    },
  },
  reconciliationStats: {
    success: true,
    data: {
      total: 1000,
      matched: 850,
      unmatched: 150,
      matchRate: 0.85,
    },
  },
};

// 测试用户认证令牌
export const testTokens = {
  admin: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-admin-token",
  user: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-user-token",
  expired: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired-token",
};
