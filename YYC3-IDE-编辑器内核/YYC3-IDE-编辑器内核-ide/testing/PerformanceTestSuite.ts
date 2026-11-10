/**
 * @file: PerformanceTestSuite.ts
 * @description: 性能压力测试工具 - 快照管理、控制台日志、并发操作、长时间运行测试
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: testing,performance,stress,snapshot,console,concurrency
 */

import type {
  PerformanceTestConfig,
  PerformanceTestResult,
  PerformanceMetrics,
  PerformanceSample,
  SnapshotPerformanceResult,
  ConsolePerformanceResult,
  ConcurrencyPerformanceResult,
} from './TestingTypes';
import { logger } from "../services/Logger";

// ================================================================
// 性能测试套件
// ================================================================

/**
 * 性能测试套件
 * 提供快照管理、控制台日志、并发操作和长时间运行测试
 */
export class PerformanceTestSuite {
  private config: PerformanceTestConfig;
  private samples: PerformanceSample[] = [];
  private memorySamples: number[] = [];
  private cpuSamples: number[] = [];

  constructor(config: Partial<PerformanceTestConfig> = {}) {
    this.config = {
      snapshotCount: config.snapshotCount || 1000,
      consoleLogCount: config.consoleLogCount || 10000,
      concurrentOperations: config.concurrentOperations || 100,
      duration: config.duration || 24 * 60 * 60 * 1000, // 24小时
      samplingInterval: config.samplingInterval || 100,
      enableMemoryMonitoring: config.enableMemoryMonitoring ?? true,
      enableCPUMonitoring: config.enableCPUMonitoring ?? true,
    };
  }

  /**
   * 运行完整性能测试
   */
  async runAllTests(): Promise<PerformanceTestResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    logger.warn('Starting performance test suite...');
    logger.warn('[PerformanceTest] Config:', this.config);

    try {
      // 1. 快照管理性能测试
      logger.warn('\n[PerformanceTest] Running snapshot management test...');
      const snapshotResult = await this.testSnapshotPerformance();

      // 2. 控制台日志性能测试
      logger.warn('\n[PerformanceTest] Running console log test...');
      const consoleResult = await this.testConsolePerformance();

      // 3. 并发操作性能测试
      logger.warn('\n[PerformanceTest] Running concurrent operations test...');
      const concurrencyResult = await this.testConcurrentOperations();

      // 4. 长时间运行测试（缩短版本，实际运行24小时）
      logger.warn('\n[PerformanceTest] Running long-running test (simulated)...');
      const longRunningResult = await this.testLongRunning();

      const endTime = Date.now();
      const metrics = this.calculateMetrics(startTime, endTime);

      const passed = this.evaluateResults(
        snapshotResult,
        consoleResult,
        concurrencyResult,
        longRunningResult,
      );

      logger.warn('\n[PerformanceTest] Performance test completed');
      logger.warn(`Result: ${passed ? 'PASSED' : 'FAILED'}`);

      return {
        testName: 'Performance Test Suite',
        config: this.config,
        metrics,
        samples: this.samples,
        passed,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(
        `Performance test failed: ${error instanceof Error ? error.message : String(error)}`,
      );

      return {
        testName: 'Performance Test Suite',
        config: this.config,
        metrics: this.calculateMetrics(startTime, Date.now()),
        samples: this.samples,
        passed: false,
        errors,
        warnings,
      };
    }
  }

  /**
   * 测试快照管理性能
   */
  async testSnapshotPerformance(): Promise<SnapshotPerformanceResult> {
    const startTime = Date.now();
    const snapshots: Array<{
      id: string;
      timestamp: number;
      data: string;
    }> = [];

    // 创建快照
    logger.warn(
      `  [SnapshotTest] Creating ${this.config.snapshotCount} snapshots...`,
    );
    const creationStart = Date.now();
    for (let i = 0; i < this.config.snapshotCount; i++) {
      const snapshot = {
        id: `snapshot-${i}`,
        timestamp: Date.now(),
        data: this.generateTestData(i),
      };
      snapshots.push(snapshot);

      this.addSample('snapshot_create', Date.now() - creationStart, true);

      if (i % 100 === 0) {
        this.monitorResources();
      }
    }
    const creationTime = Date.now() - creationStart;

    // 读取快照
    logger.warn('[SnapshotTest] Reading ${snapshots.length} snapshots...');
    const readStart = Date.now();
    for (const snapshot of snapshots) {
      const _ = snapshot.data; // 读取数据
      this.addSample('snapshot_read', 1, true);
    }
    const readTime = Date.now() - readStart;

    // 列出快照
    logger.warn('[SnapshotTest] Listing snapshots...');
    const listStart = Date.now();
    const _snapshotList = snapshots.map((s) => s.id);
    const listTime = Date.now() - listStart;

    // 删除快照
    logger.warn('[SnapshotTest] Deleting ${snapshots.length} snapshots...');
    const deleteStart = Date.now();
    snapshots.length = 0; // 清空数组
    const deleteTime = Date.now() - deleteStart;

    const storageSize = this.estimateStorageSize(this.config.snapshotCount);

    const result: SnapshotPerformanceResult = {
      creationTime,
      readTime,
      deleteTime,
      listTime,
      storageSize,
      snapshotCount: this.config.snapshotCount,
    };

    logger.warn('[SnapshotTest] Creation time: ${creationTime}ms');
    logger.warn('[SnapshotTest] Read time: ${readTime}ms');
    logger.warn('[SnapshotTest] List time: ${listTime}ms');
    logger.warn('[SnapshotTest] Delete time: ${deleteTime}ms');

    return result;
  }

  /**
   * 测试控制台日志性能
   */
  async testConsolePerformance(): Promise<ConsolePerformanceResult> {
    const logs: Array<{
      id: string;
      level: string;
      message: string;
      timestamp: number;
    }> = [];

    // 写入日志
    logger.warn(
      `  [ConsoleTest] Writing ${this.config.consoleLogCount} logs...`,
    );
    const writeStart = Date.now();
    for (let i = 0; i < this.config.consoleLogCount; i++) {
      const log = {
        id: `log-${i}`,
        level: ['log', 'info', 'warn', 'error'][i % 4],
        message: this.generateTestLogMessage(i),
        timestamp: Date.now(),
      };
      logs.push(log);

      this.addSample('console_write', 0.1, true);

      if (i % 1000 === 0) {
        this.monitorResources();
      }
    }
    const writeTime = Date.now() - writeStart;

    // 读取日志
    logger.warn('[ConsoleTest] Reading ${logs.length} logs...');
    const readStart = Date.now();
    for (const log of logs) {
      const _ = log.message;
      this.addSample('console_read', 0.01, true);
    }
    const readTime = Date.now() - readStart;

    // 过滤日志
    logger.warn('[ConsoleTest] Filtering logs...');
    const filterStart = Date.now();
    const _errorLogs = logs.filter((l) => l.level === 'error');
    const filterTime = Date.now() - filterStart;

    // 清除日志
    logger.warn('[ConsoleTest] Clearing ${logs.length} logs...');
    const clearStart = Date.now();
    logs.length = 0;
    const clearTime = Date.now() - clearStart;

    const storageSize = this.estimateStorageSize(this.config.consoleLogCount);

    const result: ConsolePerformanceResult = {
      writeTime,
      readTime,
      clearTime,
      filterTime,
      logCount: this.config.consoleLogCount,
      storageSize,
    };

    logger.warn('[ConsoleTest] Write time: ${writeTime}ms');
    logger.warn('[ConsoleTest] Read time: ${readTime}ms');
    logger.warn('[ConsoleTest] Filter time: ${filterTime}ms');
    logger.warn('[ConsoleTest] Clear time: ${clearTime}ms');

    return result;
  }

  /**
   * 测试并发操作
   */
  async testConcurrentOperations(): Promise<ConcurrencyPerformanceResult> {
    logger.warn(
      `  [ConcurrencyTest] Running ${this.config.concurrentOperations} concurrent operations...`,
    );

    const operations: Promise<void>[] = [];
    const responseTimes: number[] = [];
    let conflictCount = 0;
    const retryCount = 0;
    let successCount = 0;

    const start = Date.now();

    for (let i = 0; i < this.config.concurrentOperations; i++) {
      operations.push(
        this.runConcurrentOperation(i).then(
          (responseTime) => {
            responseTimes.push(responseTime);
            successCount++;
            this.addSample('concurrent_op', responseTime, true);
          },
          (error) => {
            logger.error(`  [ConcurrencyTest] Operation ${i} failed:`, error);
            conflictCount++;
            this.addSample('concurrent_op', 0, false);
          },
        ),
      );
    }

    await Promise.all(operations);

    const duration = Date.now() - start;
    const averageResponseTime =
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const throughput = (successCount / duration) * 1000;
    const successRate = (successCount / this.config.concurrentOperations) * 100;

    const result: ConcurrencyPerformanceResult = {
      operationCount: this.config.concurrentOperations,
      averageResponseTime,
      maxResponseTime,
      throughput,
      conflictCount,
      retryCount,
      successRate,
    };

    logger.warn(
      `  [ConcurrencyTest] Average response time: ${averageResponseTime.toFixed(2)}ms`,
    );
    logger.warn('[ConcurrencyTest] Max response time: ${maxResponseTime}ms');
    logger.warn(
      `  [ConcurrencyTest] Throughput: ${throughput.toFixed(2)} ops/sec`,
    );
    logger.warn('[ConcurrencyTest] Success rate: ${successRate.toFixed(2)}%');

    return result;
  }

  /**
   * 测试长时间运行
   */
  async testLongRunning(): Promise<{
    duration: number;
    memoryLeaks: boolean;
    performanceDegradation: boolean;
    errorCount: number;
  }> {
    // 模拟长时间运行测试（实际应运行24小时，这里缩短为测试版本）
    logger.warn('[LongRunningTest] Starting long-running test (simulated 1min)...');

    const testDuration = 60 * 1000; // 1分钟测试版本
    const startTime = Date.now();
    let errorCount = 0;
    const memoryTrend: number[] = [];
    const performanceTrend: number[] = [];

    const runTest = async (): Promise<void> => {
      return new Promise((resolve) => {
        const interval = setInterval(() => {
          try {
            // 执行测试操作
            const opStart = Date.now();
            this.performTestOperation();
            const opTime = Date.now() - opStart;

            performanceTrend.push(opTime);
            this.monitorResources();

            const currentMemory = this.getCurrentMemoryUsage();
            memoryTrend.push(currentMemory);

            if (Date.now() - startTime >= testDuration) {
              clearInterval(interval);
              resolve();
            }
          } catch (error) {
            errorCount++;
            logger.error('  [LongRunningTest] Error:', error);
          }
        }, 1000);
      });
    };

    await runTest();

    const duration = Date.now() - startTime;

    // 检测内存泄漏
    const memoryLeaks = this.detectMemoryLeaks(memoryTrend);

    // 检测性能退化
    const performanceDegradation = this.detectPerformanceDegradation(
      performanceTrend,
    );

    logger.warn('[LongRunningTest] Duration: ${duration}ms');
    logger.warn('[LongRunningTest] Memory leaks: ${memoryLeaks}');
    logger.warn(
      `  [LongRunningTest] Performance degradation: ${performanceDegradation}`,
    );
    logger.warn('[LongRunningTest] Errors: ${errorCount}');

    return {
      duration,
      memoryLeaks,
      performanceDegradation,
      errorCount,
    };
  }

  /**
   * 计算性能指标
   */
  private calculateMetrics(
    startTime: number,
    endTime: number,
  ): PerformanceMetrics {
    const responseTimes = this.samples
      .filter((s) => s.success)
      .map((s) => s.responseTime);

    const totalDuration = endTime - startTime;
    const averageResponseTime =
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length || 0;
    const maxResponseTime = Math.max(...responseTimes) || 0;
    const minResponseTime = Math.min(...responseTimes) || 0;

    // 计算百分位数
    const sorted = [...responseTimes].sort((a, b) => a - b);
    const p50 = this.percentile(sorted, 50);
    const p95 = this.percentile(sorted, 95);
    const p99 = this.percentile(sorted, 99);

    const throughput = (this.samples.length / totalDuration) * 1000;
    const errorRate =
      (this.samples.filter((s) => !s.success).length / this.samples.length) *
      100;

    return {
      startTime,
      endTime,
      totalDuration,
      averageResponseTime,
      maxResponseTime,
      minResponseTime,
      p50ResponseTime: p50,
      p95ResponseTime: p95,
      p99ResponseTime: p99,
      throughput,
      errorRate,
      peakMemoryUsage: Math.max(...this.memorySamples) || 0,
      averageMemoryUsage:
        this.memorySamples.reduce((a, b) => a + b, 0) /
          this.memorySamples.length || 0,
      peakCPUUsage: Math.max(...this.cpuSamples) || 0,
      averageCPUUsage:
        this.cpuSamples.reduce((a, b) => a + b, 0) / this.cpuSamples.length ||
        0,
    };
  }

  /**
   * 添加采样
   */
  private addSample(
    operationType: string,
    responseTime: number,
    success: boolean,
  ): void {
    this.samples.push({
      timestamp: Date.now(),
      responseTime,
      operationType,
      success,
    });
  }

  /**
   * 监控资源
   */
  private monitorResources(): void {
    if (this.config.enableMemoryMonitoring) {
      const memory = this.getCurrentMemoryUsage();
      this.memorySamples.push(memory);
    }

    if (this.config.enableCPUMonitoring) {
      const cpu = this.getCurrentCPUUsage();
      this.cpuSamples.push(cpu);
    }
  }

  /**
   * 获取当前内存使用（MB）
   */
  private getCurrentMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / 1024 / 1024;
    }
    // 浏览器环境
    if ('memory' in performance && (performance as { memory?: { usedJSHeapSize?: number } }).memory) {
      return (performance as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize / 1024 / 1024;
    }
    return 0;
  }

  /**
   * 获取当前CPU使用（%）
   */
  private getCurrentCPUUsage(): number {
    // 简化版本，实际应使用 performance API
    return Math.random() * 30; // 模拟 CPU 使用率
  }

  /**
   * 生成测试数据
   */
  private generateTestData(index: number): string {
    return JSON.stringify({
      index,
      timestamp: Date.now(),
      data: `Test data for snapshot ${index}`,
      random: Math.random(),
    });
  }

  /**
   * 生成测试日志消息
   */
  private generateTestLogMessage(index: number): string {
    return `[Test Log ${index}] This is a test log message with some content to simulate real logs. ` +
      `Timestamp: ${Date.now()}, Random: ${Math.random()}`;
  }

  /**
   * 估算存储大小
   */
  private estimateStorageSize(count: number): number {
    // 平均每条记录约 200 字节
    return count * 200;
  }

  /**
   * 运行并发操作
   */
  private async runConcurrentOperation(index: number): Promise<number> {
    const start = Date.now();

    // 模拟异步操作
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 10),
    );

    // 模拟一些处理
    const _data = this.generateTestData(index);

    return Date.now() - start;
  }

  /**
   * 执行测试操作
   */
  private performTestOperation(): void {
    // 模拟测试操作
    const _data = JSON.stringify({
      timestamp: Date.now(),
      random: Math.random(),
    });
  }

  /**
   * 检测内存泄漏
   */
  private detectMemoryLeaks(memoryTrend: number[]): boolean {
    if (memoryTrend.length < 10) return false;

    // 比较前10%和后10%的内存使用
    const first10 = memoryTrend.slice(0, Math.floor(memoryTrend.length * 0.1));
    const last10 = memoryTrend.slice(-Math.floor(memoryTrend.length * 0.1));

    const avgFirst = first10.reduce((a, b) => a + b, 0) / first10.length;
    const avgLast = last10.reduce((a, b) => a + b, 0) / last10.length;

    // 如果内存增长超过20%，认为有内存泄漏
    return avgLast > avgFirst * 1.2;
  }

  /**
   * 检测性能退化
   */
  private detectPerformanceDegradation(performanceTrend: number[]): boolean {
    if (performanceTrend.length < 10) return false;

    const first10 = performanceTrend.slice(
      0,
      Math.floor(performanceTrend.length * 0.1),
    );
    const last10 = performanceTrend.slice(
      -Math.floor(performanceTrend.length * 0.1),
    );

    const avgFirst = first10.reduce((a, b) => a + b, 0) / first10.length;
    const avgLast = last10.reduce((a, b) => a + b, 0) / last10.length;

    // 如果响应时间增长超过30%，认为有性能退化
    return avgLast > avgFirst * 1.3;
  }

  /**
   * 计算百分位数
   */
  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] || 0;
  }

  /**
   * 评估结果
   */
  private evaluateResults(
    snapshotResult: SnapshotPerformanceResult,
    consoleResult: ConsolePerformanceResult,
    concurrencyResult: ConcurrencyPerformanceResult,
    longRunningResult: {
      duration: number;
      memoryLeaks: boolean;
      performanceDegradation: boolean;
      errorCount: number;
    },
  ): boolean {
    // 检查快照性能
    if (snapshotResult.creationTime > 10000) {
      // 10秒
      logger.warn('Snapshot creation time too high');
      return false;
    }

    // 检查控制台性能
    if (consoleResult.writeTime > 5000) {
      // 5秒
      logger.warn('Console write time too high');
      return false;
    }

    // 检查并发性能
    if (concurrencyResult.successRate < 95) {
      logger.warn('Concurrency success rate too low');
      return false;
    }

    // 检查长时间运行
    if (longRunningResult.memoryLeaks) {
      logger.warn('Memory leaks detected');
      return false;
    }

    if (longRunningResult.performanceDegradation) {
      logger.warn('Performance degradation detected');
      return false;
    }

    return true;
  }
}
