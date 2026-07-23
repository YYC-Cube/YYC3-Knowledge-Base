// 引入要测试的工具函数
const {
  calculatePercentage,
  formatCurrency,
  isValidEmail,
  isValidAmount,
  formatDate,
  daysDifference,
  deepClone,
  debounce,
  throttle,
} = require("../../src/utils");

describe("基础测试示例", () => {
  it("should pass basic test", () => {
    expect(1 + 1).toBe(2);
  });

  it("should handle string operations", () => {
    const message = "Hello YanYu Cloud³";
    expect(message).toContain("YanYu");
    expect(message.length).toBeGreaterThan(10);
  });

  it("should work with arrays", () => {
    const items = ["测试", "覆盖率", "质量"];
    expect(items).toHaveLength(3);
    expect(items).toContain("测试");
  });

  test("should handle async operations", () => {
    // 测试同步方式的Promise
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    expect(delay).toBeDefined();
    expect(typeof delay).toBe("function");
  });
});

// 工具函数测试
describe("工具函数测试", () => {
  describe("calculatePercentage", () => {
    it("应该正确计算百分比", () => {
      expect(calculatePercentage(25, 100)).toBe(25);
      expect(calculatePercentage(1, 3)).toBe(33.33);
      expect(calculatePercentage(2, 3)).toBe(66.67);
    });

    it("应该处理零值", () => {
      expect(calculatePercentage(10, 0)).toBe(0);
      expect(calculatePercentage(0, 100)).toBe(0);
    });

    it("应该处理小数值", () => {
      expect(calculatePercentage(12.5, 50)).toBe(25);
      expect(calculatePercentage(33.33, 100)).toBe(33.33);
    });

    it("应该四舍五入到两位小数", () => {
      expect(calculatePercentage(1, 7)).toBe(14.29);
      expect(calculatePercentage(2, 7)).toBe(28.57);
    });
  });

  describe("formatCurrency", () => {
    it("应该正确格式化货币", () => {
      expect(formatCurrency(1234.56)).toBe("￥1,234.56");
      expect(formatCurrency(1000)).toBe("￥1,000.00");
    });

    it("应该支持不同货币符号", () => {
      expect(formatCurrency(1234.56, "$")).toBe("$1,234.56");
      expect(formatCurrency(1234.56, "€")).toBe("€1,234.56");
    });

    it("应该处理零金额", () => {
      expect(formatCurrency(0)).toBe("￥0.00");
    });

    it("应该处理负金额", () => {
      expect(formatCurrency(-1234.56)).toBe("￥-1,234.56");
    });

    it("应该格式化大数字", () => {
      expect(formatCurrency(1234567.89)).toBe("￥1,234,567.89");
    });

    it("应该处理小数精度", () => {
      expect(formatCurrency(1234.5)).toBe("￥1,234.50");
      expect(formatCurrency(1234.567)).toBe("￥1,234.57");
    });
  });
});

// 验证函数测试
describe("验证函数测试", () => {
  describe("isValidEmail", () => {
    it("应该验证正确的邮箱", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name@domain.co.uk")).toBe(true);
      expect(isValidEmail("test+tag@example.org")).toBe(true);
    });

    it("应该拒绝无效的邮箱", () => {
      expect(isValidEmail("invalid-email")).toBe(false);
      expect(isValidEmail("test@")).toBe(false);
      expect(isValidEmail("@example.com")).toBe(false);
      expect(isValidEmail("test@.com")).toBe(false);
      expect(isValidEmail("")).toBe(false);
    });

    it("应该处理边界情况", () => {
      expect(isValidEmail("test@example")).toBe(false);
      expect(isValidEmail("test.@example.com")).toBe(false);
      expect(isValidEmail("test..test@example.com")).toBe(false);
    });
  });

  describe("isValidAmount", () => {
    it("应该验证正数金额", () => {
      expect(isValidAmount(100)).toBe(true);
      expect(isValidAmount(0.01)).toBe(true);
      expect(isValidAmount(1234.56)).toBe(true);
    });

    it("应该拒绝无效金额", () => {
      expect(isValidAmount(0)).toBe(false);
      expect(isValidAmount(-100)).toBe(false);
      expect(isValidAmount(NaN)).toBe(false);
      expect(isValidAmount(Infinity)).toBe(false);
    });

    it("应该处理边界情况", () => {
      expect(isValidAmount(Number.MAX_VALUE)).toBe(true);
      expect(isValidAmount(Number.MIN_VALUE)).toBe(true);
      expect(isValidAmount(-0)).toBe(false);
    });
  });
});

// 日期函数测试
describe("日期函数测试", () => {
  describe("formatDate", () => {
    it("应该正确格式化日期", () => {
      const date = new Date("2024-01-15");
      const formatted = formatDate(date);
      expect(formatted).toBe("2024/1/15");
    });

    it("应该处理字符串日期", () => {
      const formatted = formatDate("2024-01-15");
      expect(formatted).toBe("2024/1/15");
    });

    it("应该处理当前日期", () => {
      const now = new Date();
      const formatted = formatDate(now);
      expect(formatted).toMatch(/\d{4}\/\d{1,2}\/\d{1,2}/);
    });
  });

  describe("daysDifference", () => {
    it("应该正确计算天数差", () => {
      const date1 = "2024-01-01";
      const date2 = "2024-01-11";
      expect(daysDifference(date1, date2)).toBe(10);
    });

    it("应该处理反向日期", () => {
      const date1 = "2024-01-11";
      const date2 = "2024-01-01";
      expect(daysDifference(date1, date2)).toBe(10);
    });

    it("应该处理相同日期", () => {
      const date = "2024-01-01";
      expect(daysDifference(date, date)).toBe(0);
    });

    it("应该处理Date对象", () => {
      const date1 = new Date("2024-01-01");
      const date2 = new Date("2024-01-06");
      expect(daysDifference(date1, date2)).toBe(5);
    });
  });
});

// 对象操作测试
describe("对象操作测试", () => {
  describe("deepClone", () => {
    it("应该深拷贝简单对象", () => {
      const obj = { a: 1, b: "test" };
      const cloned = deepClone(obj);

      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
    });

    it("应该深拷贝嵌套对象", () => {
      const obj = {
        a: 1,
        b: { c: 2, d: { e: 3 } },
        f: [1, 2, { g: 4 }],
      };
      const cloned = deepClone(obj);

      expect(cloned).toEqual(obj);
      expect(cloned.b).not.toBe(obj.b);
      expect(cloned.f).not.toBe(obj.f);
      expect(cloned.f[2]).not.toBe(obj.f[2]);
    });

    it("应该处理数组", () => {
      const arr = [1, 2, { a: 3 }];
      const cloned = deepClone(arr);

      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
      expect(cloned[2]).not.toBe(arr[2]);
    });

    it("应该处理Date对象", () => {
      const date = new Date("2024-01-01");
      const cloned = deepClone(date);

      expect(cloned).toEqual(date);
      expect(cloned).not.toBe(date);
    });

    it("应该处理null和undefined", () => {
      expect(deepClone(null)).toBe(null);
      expect(deepClone(undefined)).toBe(undefined);
    });

    it("应该处理基础类型", () => {
      expect(deepClone(123)).toBe(123);
      expect(deepClone("test")).toBe("test");
      expect(deepClone(true)).toBe(true);
    });
  });
});

// 函数工具测试
describe("函数工具测试", () => {
  describe("debounce", () => {
    jest.useFakeTimers();

    it("应该延迟执行函数", () => {
      const func = jest.fn();
      const debouncedFunc = debounce(func, 100);

      debouncedFunc();
      expect(func).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(func).toHaveBeenCalledTimes(1);
    });

    it("应该重新设置延迟", () => {
      const func = jest.fn();
      const debouncedFunc = debounce(func, 100);

      debouncedFunc();
      debouncedFunc();
      debouncedFunc();

      jest.advanceTimersByTime(50);
      expect(func).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(func).toHaveBeenCalledTimes(1);
    });
  });

  describe("throttle", () => {
    jest.useFakeTimers();

    it("应该限制函数执行频率", () => {
      const func = jest.fn();
      const throttledFunc = throttle(func, 100);

      throttledFunc();
      throttledFunc();
      throttledFunc();

      expect(func).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(100);
      throttledFunc();

      expect(func).toHaveBeenCalledTimes(2);
    });
  });
});

// Mock测试示例
describe("Mock测试示例", () => {
  it("应该正确使用mock函数", () => {
    const mockFn = jest.fn();
    mockFn("test");

    expect(mockFn).toHaveBeenCalled();
    expect(mockFn).toHaveBeenCalledWith("test");
  });

  it("应该mock返回值", () => {
    const mockService = {
      getData: jest.fn().mockReturnValue({ success: true, data: [] }),
    };

    const result = mockService.getData();
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it("应该mock异步函数", async () => {
    const mockAsyncFunc = jest.fn().mockResolvedValue({ id: 1, name: "test" });

    const result = await mockAsyncFunc();
    expect(result.id).toBe(1);
    expect(result.name).toBe("test");
  });
});
