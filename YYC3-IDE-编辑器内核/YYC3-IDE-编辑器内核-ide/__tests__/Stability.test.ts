// @ts-nocheck
/**
 * @file: Stability.test.ts
 * @description: 稳定性和边界情况测试
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: test,stability,boundary,error
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ErrorHandler,
  ErrorType,
  ErrorSeverity,
  handleError,
  validateParameter,
  validateArray,
  validateString,
  validateNumber,
} from "../utils/ErrorHandler";
import {
  BoundaryHandler,
  BoundaryType,
  checkFileBoundary,
  handleLargeFile,
  withTimeout,
  withRetry,
} from "../utils/BoundaryHandler";

describe("ErrorHandler", () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = ErrorHandler.getInstance();
    errorHandler.clearErrorLog();
  });

  describe("错误处理", () => {
    it("应该正确处理错误", () => {
      const error = new Error("测试错误");
      const errorInfo = errorHandler.handleError(
        error,
        ErrorType.UNKNOWN_ERROR,
        ErrorSeverity.MEDIUM
      );

      expect(errorInfo.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(errorInfo.severity).toBe(ErrorSeverity.MEDIUM);
      expect(errorInfo.message).toBe("测试错误");
      expect(errorInfo.recoverable).toBe(true);
      expect(errorInfo.timestamp).toBeDefined();
    });

    it("应该提供用户友好的错误消息", () => {
      const errorInfo = errorHandler.handleError(
        "测试",
        ErrorType.PREVIEW_UPDATE_FAILED,
        ErrorSeverity.HIGH
      );

      expect(errorInfo.userMessage).toContain("预览更新失败");
    });

    it("应该正确判断是否可恢复", () => {
      const recoverableError = errorHandler.handleError(
        "测试",
        ErrorType.PREVIEW_UPDATE_FAILED,
        ErrorSeverity.MEDIUM
      );

      const nonRecoverableError = errorHandler.handleError(
        "测试",
        ErrorType.NETWORK_ERROR,
        ErrorSeverity.HIGH
      );

      expect(recoverableError.recoverable).toBe(true);
      expect(nonRecoverableError.recoverable).toBe(false);
    });

    it("应该正确判断是否可重试", () => {
      const retryableError = errorHandler.handleError(
        "测试",
        ErrorType.AI_TIMEOUT,
        ErrorSeverity.MEDIUM
      );

      const nonRetryableError = errorHandler.handleError(
        "测试",
        ErrorType.INVALID_PARAMETER,
        ErrorSeverity.MEDIUM
      );

      expect(retryableError.retryable).toBe(true);
      expect(nonRetryableError.retryable).toBe(false);
    });

    it("应该记录错误日志", () => {
      errorHandler.handleError("错误1", ErrorType.UNKNOWN_ERROR);
      errorHandler.handleError("错误2", ErrorType.VALIDATION_FAILED);

      const log = errorHandler.getErrorLog();
      expect(log.length).toBe(2);
      expect(log[0].message).toBe("错误1");
      expect(log[1].message).toBe("错误2");
    });

    it("应该限制日志大小", () => {
      for (let i = 0; i < 150; i++) {
        errorHandler.handleError(`错误${i}`, ErrorType.UNKNOWN_ERROR);
      }

      const log = errorHandler.getErrorLog();
      expect(log.length).toBeLessThanOrEqual(100);
    });
  });

  describe("参数验证", () => {
    it("应该验证必填参数", () => {
      expect(() => {
        validateParameter(null, "test", "string", true);
      }).toThrow("参数 test 不能为空");

      expect(() => {
        validateParameter(undefined, "test", "string", true);
      }).toThrow("参数 test 不能为空");
    });

    it("应该验证参数类型", () => {
      expect(() => {
        validateParameter(123, "test", "string", false);
      }).toThrow("参数 test 类型错误");

      expect(() => {
        validateParameter("123", "test", "number", false);
      }).toThrow("参数 test 类型错误");
    });

    it("应该验证数组参数", () => {
      expect(() => {
        validateArray("not array", "test");
      }).toThrow("参数 test 必须是数组");

      expect(() => {
        validateArray([1], "test", 2);
      }).toThrow("参数 test 长度不能小于 2");

      expect(() => {
        validateArray([1, 2, 3, 4], "test", 0, 3);
      }).toThrow("参数 test 长度不能超过 3");
    });

    it("应该验证字符串参数", () => {
      expect(() => {
        validateString(123, "test");
      }).toThrow("参数 test 必须是字符串");

      expect(() => {
        validateString("ab", "test", 3);
      }).toThrow("参数 test 长度不能小于 3");

      expect(() => {
        validateString("abcdefghij", "test", 0, 5);
      }).toThrow("参数 test 长度不能超过 5");
    });

    it("应该验证数字参数", () => {
      expect(() => {
        validateNumber("123", "test");
      }).toThrow("参数 test 必须是有效数字");

      expect(() => {
        validateNumber(5, "test", 10);
      }).toThrow("参数 test 不能小于 10");

      expect(() => {
        validateNumber(15, "test", 0, 10);
      }).toThrow("参数 test 不能大于 10");
    });
  });

  describe("异步操作", () => {
    it("应该包装异步函数并捕获错误", async () => {
      const errorFn = async () => {
        throw new Error("异步错误");
      };

      await expect(
        errorHandler.wrapAsync(errorFn, ErrorType.AI_REQUEST_FAILED, ErrorSeverity.HIGH)
      ).rejects.toThrow("AI 请求失败");
    });

    it("应该重试失败的异步操作", async () => {
      let attempts = 0;
      const retryFn = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error("失败");
        }
        return "成功";
      };

      const result = await errorHandler.retryAsync(
        retryFn,
        ErrorType.AI_REQUEST_FAILED,
        3
      );

      expect(result).toBe("成功");
      expect(attempts).toBe(3);
    });

    it("应该在达到最大重试次数后抛出错误", async () => {
      const alwaysFailFn = async () => {
        throw new Error("总是失败");
      };

      await expect(
        errorHandler.retryAsync(alwaysFailFn, ErrorType.AI_REQUEST_FAILED, 3)
      ).rejects.toThrow();
    });
  });
});

describe("BoundaryHandler", () => {
  let boundaryHandler: BoundaryHandler;

  beforeEach(() => {
    boundaryHandler = BoundaryHandler.getInstance();
  });

  describe("文件边界检查", () => {
    it("应该检测空文件", () => {
      const result = checkFileBoundary("", "test.ts");

      expect(result.valid).toBe(false);
      expect(result.type).toBe(BoundaryType.EMPTY_FILE);
      expect(result.message).toContain("为空");
    });

    it("应该检测超大文件", () => {
      const largeContent = "x".repeat(2 * 1024 * 1024); // 2MB
      const result = checkFileBoundary(largeContent, "large.ts");

      expect(result.valid).toBe(false);
      expect(result.type).toBe(BoundaryType.LARGE_FILE);
      expect(result.message).toContain("超过限制");
    });

    it("应该检测过多行数", () => {
      const manyLines = Array.from({ length: 15000 }, (_, i) => `line ${i}`).join("\n");
      const result = checkFileBoundary(manyLines, "many-lines.ts");

      expect(result.valid).toBe(false);
      expect(result.type).toBe(BoundaryType.LARGE_FILE);
      expect(result.message).toContain("行数");
    });

    it("应该检测过长行", () => {
      const longLine = "x".repeat(1500);
      const result = checkFileBoundary(longLine, "long-line.ts");

      expect(result.valid).toBe(false);
      expect(result.type).toBe(BoundaryType.LARGE_FILE);
      expect(result.message).toContain("行长度");
    });

    it("应该检测无效字符", () => {
      const invalidContent = "normal text\x00\x01\x02";
      const result = checkFileBoundary(invalidContent, "invalid.ts");

      expect(result.valid).toBe(false);
      expect(result.type).toBe(BoundaryType.INVALID_CONTENT);
    });

    it("应该通过正常文件检查", () => {
      const normalContent = `
        function hello() {
          console.warn("Hello, World!");
        }
      `;
      const result = checkFileBoundary(normalContent, "normal.ts");

      expect(result.valid).toBe(true);
    });
  });

  describe("大文件处理", () => {
    it("应该截断过大文件", () => {
      const largeContent = "line\n".repeat(15000);
      const result = handleLargeFile(largeContent, "large.ts");

      expect(result.truncated).toBe(true);
      expect(result.content.length).toBeLessThan(largeContent.length);
      expect(result.newSize).toBeLessThan(result.originalSize);
    });

    it("应该保留小文件不变", () => {
      const smallContent = "small file";
      const result = handleLargeFile(smallContent, "small.ts");

      expect(result.truncated).toBe(false);
      expect(result.content).toBe(smallContent);
      expect(result.originalSize).toBe(result.newSize);
    });
  });

  describe("超时控制", () => {
    it("应该在超时后抛出错误", async () => {
      const slowOperation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return "结果";
      };

      await expect(
        withTimeout(slowOperation, 100, "测试操作")
      ).rejects.toThrow("超时");
    });

    it("应该在超时前完成操作", async () => {
      const fastOperation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return "结果";
      };

      const result = await withTimeout(fastOperation, 100, "测试操作");
      expect(result).toBe("结果");
    });
  });

  describe("重试机制", () => {
    it("应该在失败后重试", async () => {
      let attempts = 0;
      const retryOperation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error("失败");
        }
        return "成功";
      };

      const result = await withRetry(retryOperation, 3, 10, "测试操作");
      expect(result).toBe("成功");
      expect(attempts).toBe(3);
    });

    it("应该在达到最大重试次数后抛出错误", async () => {
      const alwaysFail = async () => {
        throw new Error("总是失败");
      };

      await expect(
        withRetry(alwaysFail, 3, 10, "测试操作")
      ).rejects.toThrow();
    });
  });

  describe("并发控制", () => {
    it("应该控制并发操作数量", async () => {
      const operationIds: string[] = [];
      const operations: Promise<void>[] = [];

      // 创建 15 个并发操作（限制为 10）
      for (let i = 0; i < 15; i++) {
        const promise = boundaryHandler.executeWithConcurrencyControl(
          `op-${i}`,
          async () => {
            operationIds.push(`op-${i}`);
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        );
        operations.push(promise);
      }

      await Promise.all(operations);

      // 所有操作都应该完成
      expect(operationIds.length).toBe(15);
    });
  });

  describe("批处理", () => {
    it("应该分批处理项目", async () => {
      const items = Array.from({ length: 25 }, (_, i) => i);
      const processedBatches: number[][] = [];

      const results = await boundaryHandler.processInBatches(
        items,
        10,
        async (batch) => {
          processedBatches.push(batch);
          return batch.map((x) => x * 2);
        }
      );

      expect(results.length).toBe(25);
      expect(processedBatches.length).toBe(3); // 3 批: 10 + 10 + 5
      expect(processedBatches[0].length).toBe(10);
      expect(processedBatches[1].length).toBe(10);
      expect(processedBatches[2].length).toBe(5);
    });
  });

  describe("防抖和节流", () => {
    it("应该防抖函数调用", async () => {
      let callCount = 0;
      const debouncedFn = boundaryHandler.debounce(() => {
        callCount++;
      }, 100);

      // 快速调用 5 次
      for (let i = 0; i < 5; i++) {
        debouncedFn();
      }

      // 立即检查，应该还没执行
      expect(callCount).toBe(0);

      // 等待防抖时间
      await new Promise((resolve) => setTimeout(resolve, 150));

      // 应该只执行了 1 次
      expect(callCount).toBe(1);
    });

    it("应该节流函数调用", async () => {
      let callCount = 0;
      const throttledFn = boundaryHandler.throttle(() => {
        callCount++;
      }, 100);

      // 快速调用 5 次
      for (let i = 0; i < 5; i++) {
        throttledFn();
        await new Promise((resolve) => setTimeout(resolve, 20));
      }

      // 应该只执行了部分（节流限制）
      expect(callCount).toBeGreaterThan(0);
      expect(callCount).toBeLessThan(5);
    });
  });

  describe("资源限制", () => {
    it("应该检测资源超限", () => {
      const result = boundaryHandler.checkResourceLimit(100, 100, "内存");
      expect(result.valid).toBe(false);
      expect(result.type).toBe(BoundaryType.RESOURCE_EXHAUSTED);
    });

    it("应该通过资源检查", () => {
      const result = boundaryHandler.checkResourceLimit(50, 100, "内存");
      expect(result.valid).toBe(true);
    });
  });

  describe("配置和统计", () => {
    it("应该获取当前配置", () => {
      const config = boundaryHandler.getConfig();

      expect(config.fileLimits).toBeDefined();
      expect(config.concurrencyConfig).toBeDefined();
      expect(config.fileLimits.maxFileSize).toBeGreaterThan(0);
      expect(config.concurrencyConfig.maxConcurrentOps).toBeGreaterThan(0);
    });

    it("应该更新配置", () => {
      boundaryHandler.updateConfig(
        { maxFileSize: 2 * 1024 * 1024 },
        { maxConcurrentOps: 20 }
      );

      const config = boundaryHandler.getConfig();
      expect(config.fileLimits.maxFileSize).toBe(2 * 1024 * 1024);
      expect(config.concurrencyConfig.maxConcurrentOps).toBe(20);
    });

    it("应该获取统计信息", () => {
      const stats = boundaryHandler.getStats();

      expect(stats).toHaveProperty("activeOperations");
      expect(stats).toHaveProperty("queuedOperations");
      expect(stats).toHaveProperty("activeOpCount");
    });
  });
});

describe("集成测试", () => {
  it("应该正确处理完整的错误流程", async () => {
    const errorHandler = ErrorHandler.getInstance();
    const boundaryHandler = BoundaryHandler.getInstance();

    // 模拟文件处理流程
    const processFile = async (content: string, filename: string) => {
      // 1. 边界检查
      const boundaryCheck = checkFileBoundary(content, filename);
      if (!boundaryCheck.valid) {
        throw handleError(
          new Error(boundaryCheck.message || "边界检查失败"),
          ErrorType.VALIDATION_FAILED,
          ErrorSeverity.MEDIUM
        );
      }

      // 2. 处理内容
      await new Promise((resolve) => setTimeout(resolve, 10));

      return { success: true, filename };
    };

    // 测试正常文件
    const normalResult = await processFile("normal content", "test.ts");
    expect(normalResult.success).toBe(true);

    // 测试空文件
    await expect(processFile("", "empty.ts")).rejects.toThrow();
  });

  it("应该正确处理并发文件验证", async () => {
    const boundaryHandler = BoundaryHandler.getInstance();

    const files = Array.from({ length: 20 }, (_, i) => ({
      content: `file ${i} content`,
      filename: `file${i}.ts`,
    }));

    const validateFiles = async () => {
      return boundaryHandler.processInBatches(files, 5, async (batch) => {
        return batch.map((file) => {
          const result = checkFileBoundary(file.content, file.filename);
          return { ...file, valid: result.valid };
        });
      });
    };

    const results = await validateFiles();
    expect(results.length).toBe(20);
    expect(results.every((r) => r.valid)).toBe(true);
  });
});
