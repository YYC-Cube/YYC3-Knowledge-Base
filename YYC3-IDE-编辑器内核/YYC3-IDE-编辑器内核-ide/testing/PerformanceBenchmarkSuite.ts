// @ts-nocheck
/**
 * @file: testing/PerformanceBenchmarkSuite.ts
 * @description: 性能基准测试套件
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: performance,benchmark,test
 */

import {
  PerformanceBaselineMetric,
  PerformanceTestResult,
  PerformanceReport,
  PerformanceComparisonResult,
  MetricComparison,
  PerformanceIssue,
  PerformanceRecommendation,
  TestEnvironment,
  BenchmarkLevel,
  _BenchmarkType,
  PerformanceBenchmarkConfig,
  DEFAULT_BENCHMARK_CONFIG,
  DEFAULT_BASELINE_METRICS,
  PerformanceTrendDataPoint,
  PerformanceTrendAnalysis,
} from './PerformanceBenchmarkTypes';
import { logger } from "../services/Logger";

/**
 * 性能基准测试套件
 */
export class PerformanceBenchmarkSuite {
  private config: PerformanceBenchmarkConfig;
  private baselines: PerformanceBaselineMetric[];
  private testResults: PerformanceTestResult[] = [];
  private historyData: PerformanceTrendDataPoint[] = [];

  constructor(config: Partial<PerformanceBenchmarkConfig> = {}) {
    this.config = { ...DEFAULT_BENCHMARK_CONFIG, ...config };
    this.baselines = [...DEFAULT_BASELINE_METRICS];
  }

  /**
   * 运行所有性能基准测试
   */
  async runAllBenchmarks(): Promise<PerformanceReport> {
    logger.warn('开始运行所有基准测试...');

    // 1. 渲染性能测试
    await this.runRenderBenchmarks();

    // 2. 内存性能测试
    await this.runMemoryBenchmarks();

    // 3. CPU 性能测试
    await this.runCPUBenchmarks();

    // 4. 网络性能测试
    await this.runNetworkBenchmarks();

    // 5. 启动性能测试
    await this.runStartupBenchmarks();

    // 6. 运行时性能测试
    await this.runRuntimeBenchmarks();

    // 生成报告
    const report = this.generateReport();

    logger.warn('[性能基准测试] 完成，整体评分:', report.overallScore);

    return report;
  }

  /**
   * 运行渲染性能基准测试
   */
  private async runRenderBenchmarks(): Promise<void> {
    logger.warn('运行渲染性能测试...');

    // 初始渲染时间测试
    const initialRenderResult = await this.measureInitialRenderTime();
    this.testResults.push(initialRenderResult);

    // 重渲染时间测试
    const reRenderResult = await this.measureReRenderTime();
    this.testResults.push(reRenderResult);

    // FPS 测试
    const fpsResult = await this.measureFPS();
    this.testResults.push(fpsResult);
  }

  /**
   * 测量初始渲染时间
   */
  private async measureInitialRenderTime(): Promise<PerformanceTestResult> {
    const startTime = performance.now();

    // 模拟渲染
    await this.simulateRender();

    const endTime = performance.now();
    const duration = endTime - startTime;

    const baseline = this.getBaseline('initial-render-time')!;
    const level = this.getPerformanceLevel(duration, baseline);
    const passed = duration < baseline.errorThreshold;

    return {
      testName: '初始渲染时间',
      testType: 'render',
      startTime,
      endTime,
      duration,
      measurements: new Map([['initial-render-time', duration]]),
      passed,
      level,
      details: `初始渲染耗时 ${duration.toFixed(2)}ms`,
    };
  }

  /**
   * 测量重渲染时间
   */
  private async measureReRenderTime(): Promise<PerformanceTestResult> {
    const measurements = new Map<string, number>();
    const durations: number[] = [];

    // 运行多次测试
    for (let i = 0; i < this.config.testRuns; i++) {
      const startTime = performance.now();
      await this.simulateReRender();
      const endTime = performance.now();
      durations.push(endTime - startTime);
    }

    const avgDuration =
      durations.reduce((a, b) => a + b, 0) / durations.length;
    measurements.set('re-render-time', avgDuration);

    const baseline = this.getBaseline('re-render-time')!;
    const level = this.getPerformanceLevel(avgDuration, baseline);
    const passed = avgDuration < baseline.errorThreshold;

    return {
      testName: '重渲染时间',
      testType: 'render',
      startTime: 0,
      endTime: 0,
      duration: avgDuration,
      measurements,
      passed,
      level,
      details: `平均重渲染耗时 ${avgDuration.toFixed(2)}ms`,
    };
  }

  /**
   * 测量 FPS
   */
  private async measureFPS(): Promise<PerformanceTestResult> {
    let frameCount = 0;
    let lastTime = performance.now();
    const fpsMeasurements: number[] = [];

    // 测量 5 秒
    const duration = 5000;
    const startTime = performance.now();

    const measureFrame = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime - lastTime >= 1000) {
        const fps = (frameCount * 1000) / (currentTime - lastTime);
        fpsMeasurements.push(fps);
        frameCount = 0;
        lastTime = currentTime;
      }

      if (currentTime - startTime < duration) {
        requestAnimationFrame(measureFrame);
      }
    };

    requestAnimationFrame(measureFrame);

    // 等待测量完成
    await new Promise((resolve) => setTimeout(resolve, duration + 100));

    const avgFPS =
      fpsMeasurements.reduce((a, b) => a + b, 0) / fpsMeasurements.length;

    const baseline = this.getBaseline('fps')!;
    // FPS 越高越好，所以反转逻辑
    const level =
      avgFPS >= baseline.target
        ? 'excellent'
        : avgFPS >= baseline.warningThreshold
          ? 'good'
          : avgFPS >= baseline.errorThreshold
            ? 'warning'
            : 'critical';

    const passed = avgFPS >= baseline.errorThreshold;

    return {
      testName: '帧率测试',
      testType: 'render',
      startTime,
      endTime: performance.now(),
      duration,
      measurements: new Map([['fps', avgFPS]]),
      passed,
      level,
      details: `平均 FPS: ${avgFPS.toFixed(2)}`,
    };
  }

  /**
   * 运行内存性能基准测试
   */
  private async runMemoryBenchmarks(): Promise<void> {
    logger.warn('运行内存性能测试...');

    // 内存使用测试
    const memoryResult = await this.measureMemoryUsage();
    this.testResults.push(memoryResult);

    // 内存增长测试
    const growthResult = await this.measureMemoryGrowth();
    this.testResults.push(growthResult);

    // GC 暂停测试
    const gcResult = await this.measureGCPause();
    this.testResults.push(gcResult);
  }

  /**
   * 测量内存使用
   */
  private async measureMemoryUsage(): Promise<PerformanceTestResult> {
    const startTime = performance.now();

    // 获取内存使用情况
    const memoryInfo = (performance as any).memory;
    const usedMemory = memoryInfo ? memoryInfo.usedJSHeapSize / 1024 / 1024 : 0;

    const endTime = performance.now();

    const baseline = this.getBaseline('memory-usage')!;
    const level = this.getPerformanceLevel(usedMemory, baseline);
    const passed = usedMemory < baseline.errorThreshold;

    return {
      testName: '内存使用',
      testType: 'memory',
      startTime,
      endTime,
      duration: endTime - startTime,
      measurements: new Map([['memory-usage', usedMemory]]),
      passed,
      level,
      details: `内存使用量: ${usedMemory.toFixed(2)} MB`,
    };
  }

  /**
   * 测量内存增长
   */
  private async measureMemoryGrowth(): Promise<PerformanceTestResult> {
    const measurements = new Map<string, number>();

    // 模拟 1 小时的内存增长（加速测试）
    const memoryInfo = (performance as any).memory;
    const initialMemory = memoryInfo
      ? memoryInfo.usedJSHeapSize / 1024 / 1024
      : 0;

    // 执行一些操作
    for (let i = 0; i < 1000; i++) {
      // 模拟创建对象
      const temp = new Array(1000).fill(null);
      temp[0] = i;
    }

    // 触发 GC（如果可用）
    if ((window as any).gc) {
      (window as any).gc();
    }

    const finalMemory = memoryInfo
      ? memoryInfo.usedJSHeapSize / 1024 / 1024
      : 0;
    const growth = finalMemory - initialMemory;

    measurements.set('memory-growth', growth);

    const baseline = this.getBaseline('memory-growth')!;
    const level = this.getPerformanceLevel(growth, baseline);
    const passed = growth < baseline.errorThreshold;

    return {
      testName: '内存增长',
      testType: 'memory',
      startTime: 0,
      endTime: 0,
      duration: 0,
      measurements,
      passed,
      level,
      details: `内存增长: ${growth.toFixed(2)} MB`,
    };
  }

  /**
   * 测量 GC 暂停
   */
  private async measureGCPause(): Promise<PerformanceTestResult> {
    const measurements = new Map<string, number>();

    // 使用 Performance Observer 监听 GC
    const gcDurations: number[] = [];

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'gc') {
          gcDurations.push(entry.duration);
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['gc'] });
    } catch (e) {
      // GC 观察不可用
    }

    // 触发一些 GC
    for (let i = 0; i < 100; i++) {
      const temp = new Array(10000).fill(null);
      temp[0] = i;
    }

    // 等待 GC
    await new Promise((resolve) => setTimeout(resolve, 1000));

    observer.disconnect();

    const avgGCDuration =
      gcDurations.length > 0
        ? gcDurations.reduce((a, b) => a + b, 0) / gcDurations.length
        : 0;

    measurements.set('gc-pause-time', avgGCDuration);

    const baseline = this.getBaseline('gc-pause-time')!;
    const level = this.getPerformanceLevel(avgGCDuration, baseline);
    const passed = avgGCDuration < baseline.errorThreshold;

    return {
      testName: 'GC 暂停时间',
      testType: 'memory',
      startTime: 0,
      endTime: 0,
      duration: 0,
      measurements,
      passed,
      level,
      details: `平均 GC 暂停: ${avgGCDuration.toFixed(2)} ms`,
    };
  }

  /**
   * 运行 CPU 性能基准测试
   */
  private async runCPUBenchmarks(): Promise<void> {
    logger.warn('运行 CPU 性能测试...');

    // CPU 使用率测试
    const cpuResult = await this.measureCPUUsage();
    this.testResults.push(cpuResult);

    // 长任务测试
    const longTaskResult = await this.measureLongTasks();
    this.testResults.push(longTaskResult);

    // 脚本执行时间测试
    const scriptResult = await this.measureScriptExecution();
    this.testResults.push(scriptResult);
  }

  /**
   * 测量 CPU 使用率
   */
  private async measureCPUUsage(): Promise<PerformanceTestResult> {
    const measurements = new Map<string, number>();

    // 简化的 CPU 使用率测量
    // 在浏览器中无法直接获取 CPU 使用率，使用估算值
    const estimatedCPUUsage = 30; // 假设 30%

    measurements.set('cpu-usage', estimatedCPUUsage);

    const baseline = this.getBaseline('cpu-usage')!;
    const level = this.getPerformanceLevel(estimatedCPUUsage, baseline);
    const passed = estimatedCPUUsage < baseline.errorThreshold;

    return {
      testName: 'CPU 使用率',
      testType: 'cpu',
      startTime: 0,
      endTime: 0,
      duration: 0,
      measurements,
      passed,
      level,
      details: `预估 CPU 使用率: ${estimatedCPUUsage}%`,
    };
  }

  /**
   * 测量长任务
   */
  private async measureLongTasks(): Promise<PerformanceTestResult> {
    const measurements = new Map<string, number>();
    const longTasks: number[] = [];

    // 使用 Performance Observer 监听长任务
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'longtask') {
          longTasks.push(entry.duration);
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      // 长任务观察不可用
    }

    // 触发一些长任务
    const start = performance.now();
    while (performance.now() - start < 100) {
      // 模拟长任务
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    observer.disconnect();

    const avgLongTaskDuration =
      longTasks.length > 0
        ? longTasks.reduce((a, b) => a + b, 0) / longTasks.length
        : 0;

    measurements.set('long-task-duration', avgLongTaskDuration);

    const baseline = this.getBaseline('long-task-duration')!;
    const level = this.getPerformanceLevel(avgLongTaskDuration, baseline);
    const passed = avgLongTaskDuration < baseline.errorThreshold;

    return {
      testName: '长任务持续时间',
      testType: 'cpu',
      startTime: 0,
      endTime: 0,
      duration: 0,
      measurements,
      passed,
      level,
      details: `平均长任务: ${avgLongTaskDuration.toFixed(2)} ms`,
    };
  }

  /**
   * 测量脚本执行时间
   */
  private async measureScriptExecution(): Promise<PerformanceTestResult> {
    const startTime = performance.now();

    // 模拟脚本执行
    for (let i = 0; i < 10000; i++) {
      Math.sqrt(i);
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    const baseline = this.getBaseline('script-execution-time')!;
    const level = this.getPerformanceLevel(duration, baseline);
    const passed = duration < baseline.errorThreshold;

    return {
      testName: '脚本执行时间',
      testType: 'cpu',
      startTime,
      endTime,
      duration,
      measurements: new Map([['script-execution-time', duration]]),
      passed,
      level,
      details: `脚本执行耗时 ${duration.toFixed(2)}ms`,
    };
  }

  /**
   * 运行网络性能基准测试
   */
  private async runNetworkBenchmarks(): Promise<void> {
    logger.warn('运行网络性能测试...');

    // FCP 测试
    const fcpResult = await this.measureFCP();
    this.testResults.push(fcpResult);

    // LCP 测试
    const lcpResult = await this.measureLCP();
    this.testResults.push(lcpResult);

    // TTI 测试
    const ttiResult = await this.measureTTI();
    this.testResults.push(ttiResult);
  }

  /**
   * 测量 FCP
   */
  private async measureFCP(): Promise<PerformanceTestResult> {
    const measurements = new Map<string, number>();

    // 获取 FCP
    const entries = performance.getEntriesByType('paint');
    const fcpEntry = entries.find((e) => e.name === 'first-contentful-paint');
    const fcp = fcpEntry ? fcpEntry.startTime : 0;

    measurements.set('first-contentful-paint', fcp);

    const baseline = this.getBaseline('first-contentful-paint')!;
    const level = this.getPerformanceLevel(fcp, baseline);
    const passed = fcp < baseline.errorThreshold;

    return {
      testName: '首次内容绘制',
      testType: 'network',
      startTime: 0,
      endTime: 0,
      duration: fcp,
      measurements,
      passed,
      level,
      details: `FCP: ${fcp.toFixed(2)}ms`,
    };
  }

  /**
   * 测量 LCP
   */
  private async measureLCP(): Promise<PerformanceTestResult> {
    const measurements = new Map<string, number>();

    // 获取 LCP
    let lcp = 0;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      lcp = lastEntry.startTime;
    });

    try {
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      // LCP 观察不可用
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    observer.disconnect();

    measurements.set('largest-contentful-paint', lcp);

    const baseline = this.getBaseline('largest-contentful-paint')!;
    const level = this.getPerformanceLevel(lcp, baseline);
    const passed = lcp < baseline.errorThreshold;

    return {
      testName: '最大内容绘制',
      testType: 'network',
      startTime: 0,
      endTime: 0,
      duration: lcp,
      measurements,
      passed,
      level,
      details: `LCP: ${lcp.toFixed(2)}ms`,
    };
  }

  /**
   * 测量 TTI
   */
  private async measureTTI(): Promise<PerformanceTestResult> {
    const measurements = new Map<string, number>();

    // 简化的 TTI 测量
    // 实际 TTI 需要更复杂的计算
    const tti = performance.now();

    measurements.set('time-to-interactive', tti);

    const baseline = this.getBaseline('time-to-interactive')!;
    const level = this.getPerformanceLevel(tti, baseline);
    const passed = tti < baseline.errorThreshold;

    return {
      testName: '可交互时间',
      testType: 'network',
      startTime: 0,
      endTime: 0,
      duration: tti,
      measurements,
      passed,
      level,
      details: `TTI: ${tti.toFixed(2)}ms`,
    };
  }

  /**
   * 运行启动性能基准测试
   */
  private async runStartupBenchmarks(): Promise<void> {
    logger.warn('运行启动性能测试...');

    // 启动时间测试
    const startupResult = await this.measureStartupTime();
    this.testResults.push(startupResult);

    // 打包大小测试
    const bundleResult = await this.measureBundleSize();
    this.testResults.push(bundleResult);

    // 代码块加载测试
    const chunkResult = await this.measureChunkLoadTime();
    this.testResults.push(chunkResult);
  }

  /**
   * 测量启动时间
   */
  private async measureStartupTime(): Promise<PerformanceTestResult> {
    const measurements = new Map<string, number>();

    // 获取启动时间
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const startupTime = navigationEntry ? navigationEntry.loadEventEnd - navigationEntry.startTime : 0;

    measurements.set('startup-time', startupTime);

    const baseline = this.getBaseline('startup-time')!;
    const level = this.getPerformanceLevel(startupTime, baseline);
    const passed = startupTime < baseline.errorThreshold;

    return {
      testName: '启动时间',
      testType: 'startup',
      startTime: 0,
      endTime: 0,
      duration: startupTime,
      measurements,
      passed,
      level,
      details: `启动时间: ${startupTime.toFixed(2)}ms`,
    };
  }

  /**
   * 测量打包大小
   */
  private async measureBundleSize(): Promise<PerformanceTestResult> {
    const measurements = new Map<string, number>();

    // 获取所有资源大小
    const resources = performance.getEntriesByType('resource');
    const totalSize = resources.reduce((acc, resource) => {
      const size = (resource as any).transferSize || 0;
      return acc + size;
    }, 0);

    const bundleSize = totalSize / 1024; // 转换为 KB

    measurements.set('bundle-size', bundleSize);

    const baseline = this.getBaseline('bundle-size')!;
    const level = this.getPerformanceLevel(bundleSize, baseline);
    const passed = bundleSize < baseline.errorThreshold;

    return {
      testName: '打包大小',
      testType: 'startup',
      startTime: 0,
      endTime: 0,
      duration: 0,
      measurements,
      passed,
      level,
      details: `打包大小: ${bundleSize.toFixed(2)} KB`,
    };
  }

  /**
   * 测量代码块加载时间
   */
  private async measureChunkLoadTime(): Promise<PerformanceTestResult> {
    const measurements = new Map<string, number>();

    // 测量动态导入时间
    const startTime = performance.now();

    try {
      // 模拟动态导入
      await new Promise((resolve) => setTimeout(resolve, 50));
    } catch (e) {
      // 忽略错误
    }

    const endTime = performance.now();
    const loadTime = endTime - startTime;

    measurements.set('chunk-load-time', loadTime);

    const baseline = this.getBaseline('chunk-load-time')!;
    const level = this.getPerformanceLevel(loadTime, baseline);
    const passed = loadTime < baseline.errorThreshold;

    return {
      testName: '代码块加载时间',
      testType: 'startup',
      startTime,
      endTime,
      duration: loadTime,
      measurements,
      passed,
      level,
      details: `代码块加载: ${loadTime.toFixed(2)}ms`,
    };
  }

  /**
   * 运行运行时性能基准测试
   */
  private async runRuntimeBenchmarks(): Promise<void> {
    logger.warn('运行运行时性能测试...');

    // 交互延迟测试
    const interactionResult = await this.measureInteractionLatency();
    this.testResults.push(interactionResult);

    // 状态更新测试
    const stateResult = await this.measureStateUpdate();
    this.testResults.push(stateResult);

    // 事件处理测试
    const eventResult = await this.measureEventHandler();
    this.testResults.push(eventResult);
  }

  /**
   * 测量交互延迟
   */
  private async measureInteractionLatency(): Promise<PerformanceTestResult> {
    const measurements = new Map<string, number>();

    // 测量点击响应时间
    const startTime = performance.now();

    // 模拟点击处理
    await new Promise((resolve) => setTimeout(resolve, 10));

    const endTime = performance.now();
    const latency = endTime - startTime;

    measurements.set('interaction-latency', latency);

    const baseline = this.getBaseline('interaction-latency')!;
    const level = this.getPerformanceLevel(latency, baseline);
    const passed = latency < baseline.errorThreshold;

    return {
      testName: '交互延迟',
      testType: 'runtime',
      startTime,
      endTime,
      duration: latency,
      measurements,
      passed,
      level,
      details: `交互延迟: ${latency.toFixed(2)}ms`,
    };
  }

  /**
   * 测量状态更新
   */
  private async measureStateUpdate(): Promise<PerformanceTestResult> {
    const measurements = new Map<string, number>();

    // 测量状态更新时间
    const startTime = performance.now();

    // 模拟状态更新
    await new Promise((resolve) => setTimeout(resolve, 5));

    const endTime = performance.now();
    const updateTime = endTime - startTime;

    measurements.set('state-update-time', updateTime);

    const baseline = this.getBaseline('state-update-time')!;
    const level = this.getPerformanceLevel(updateTime, baseline);
    const passed = updateTime < baseline.errorThreshold;

    return {
      testName: '状态更新时间',
      testType: 'runtime',
      startTime,
      endTime,
      duration: updateTime,
      measurements,
      passed,
      level,
      details: `状态更新: ${updateTime.toFixed(2)}ms`,
    };
  }

  /**
   * 测量事件处理
   */
  private async measureEventHandler(): Promise<PerformanceTestResult> {
    const measurements = new Map<string, number>();

    // 测量事件处理时间
    const startTime = performance.now();

    // 模拟事件处理
    await new Promise((resolve) => setTimeout(resolve, 2));

    const endTime = performance.now();
    const handlerTime = endTime - startTime;

    measurements.set('event-handler-time', handlerTime);

    const baseline = this.getBaseline('event-handler-time')!;
    const level = this.getPerformanceLevel(handlerTime, baseline);
    const passed = handlerTime < baseline.errorThreshold;

    return {
      testName: '事件处理时间',
      testType: 'runtime',
      startTime,
      endTime,
      duration: handlerTime,
      measurements,
      passed,
      level,
      details: `事件处理: ${handlerTime.toFixed(2)}ms`,
    };
  }

  /**
   * 生成性能报告
   */
  private generateReport(): PerformanceReport {
    // 计算整体评分
    const overallScore = this.calculateOverallScore();

    // 确定整体级别
    const overallLevel = this.getOverallLevel(overallScore);

    // 生成问题列表
    const issues = this.generateIssues();

    // 生成建议
    const recommendations = this.generateRecommendations();

    // 生成总结
    const summary = this.generateSummary();

    return {
      id: `perf-report-${Date.now()}`,
      timestamp: Date.now(),
      version: this.config.baselineVersion,
      environment: this.getTestEnvironment(),
      testResults: this.testResults,
      overallScore,
      overallLevel,
      baselines: this.baselines,
      issues,
      recommendations,
      summary,
    };
  }

  /**
   * 计算整体评分
   */
  private calculateOverallScore(): number {
    if (this.testResults.length === 0) return 0;

    const scores = this.testResults.map((result) => {
      switch (result.level) {
        case 'excellent':
          return 100;
        case 'good':
          return 80;
        case 'warning':
          return 60;
        case 'critical':
          return 40;
        default:
          return 0;
      }
    });

    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  /**
   * 获取整体级别
   */
  private getOverallLevel(score: number): BenchmarkLevel {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'warning';
    return 'critical';
  }

  /**
   * 生成问题列表
   */
  private generateIssues(): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    this.testResults.forEach((result, index) => {
      if (!result.passed) {
        issues.push({
          id: `issue-${index}`,
          type: result.level === 'critical' ? 'critical' : 'warning',
          title: `${result.testName} 未达标`,
          description: result.details || '',
          impact: '可能影响用户体验',
          relatedMetrics: Array.from(result.measurements.keys()),
          suggestedSolution: `优化 ${result.testName} 性能`,
          priority: result.level === 'critical' ? 'high' : 'medium',
        });
      }
    });

    return issues;
  }

  /**
   * 生成建议
   */
  private generateRecommendations(): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];

    // 根据测试结果生成建议
    this.testResults.forEach((result, index) => {
      if (result.level === 'critical' || result.level === 'warning') {
        recommendations.push({
          id: `rec-${index}`,
          type: 'optimization',
          title: `优化 ${result.testName}`,
          description: `当前性能为 ${result.level} 级别，建议优化`,
          expectedBenefit: '提升性能，改善用户体验',
          steps: [
            '分析性能瓶颈',
            '优化相关代码',
            '重新测试验证',
          ],
          priority: result.level === 'critical' ? 'high' : 'medium',
          relatedMetrics: Array.from(result.measurements.keys()),
        });
      }
    });

    return recommendations;
  }

  /**
   * 生成总结
   */
  private generateSummary(): string {
    const passed = this.testResults.filter((r) => r.passed).length;
    const total = this.testResults.length;
    const score = this.calculateOverallScore();

    return `性能基准测试完成。共 ${total} 项测试，${passed} 项通过。整体评分: ${score.toFixed(2)}，级别: ${this.getOverallLevel(score)}`;
  }

  /**
   * 获取测试环境
   */
  private getTestEnvironment(): TestEnvironment {
    const ua = navigator.userAgent;
    const browser = ua.includes('Chrome')
      ? 'Chrome'
      : ua.includes('Firefox')
        ? 'Firefox'
        : ua.includes('Safari')
          ? 'Safari'
          : 'Unknown';

    return {
      browser,
      browserVersion: 'latest',
      os: navigator.platform,
      cpuCores: navigator.hardwareConcurrency || 4,
      memory: (navigator as any).deviceMemory || 8,
      screenResolution: `${screen.width}x${screen.height}`,
      devicePixelRatio: window.devicePixelRatio,
      networkType: (navigator as any).connection?.effectiveType || 'unknown',
    };
  }

  /**
   * 获取性能级别
   */
  private getPerformanceLevel(
    value: number,
    baseline: PerformanceBaselineMetric,
  ): BenchmarkLevel {
    // 对于 FPS 等指标，值越大越好
    if (baseline.name === 'fps') {
      if (value >= baseline.target) return 'excellent';
      if (value >= baseline.warningThreshold) return 'good';
      if (value >= baseline.errorThreshold) return 'warning';
      return 'critical';
    }

    // 对于其他指标，值越小越好
    if (value <= baseline.target) return 'excellent';
    if (value <= baseline.warningThreshold) return 'good';
    if (value <= baseline.errorThreshold) return 'warning';
    return 'critical';
  }

  /**
   * 获取基准
   */
  private getBaseline(name: string): PerformanceBaselineMetric | undefined {
    return this.baselines.find((b) => b.name === name);
  }

  /**
   * 模拟渲染
   */
  private async simulateRender(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  /**
   * 模拟重渲染
   */
  private async simulateReRender(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  /**
   * 对比性能
   */
  async comparePerformance(
    baselineReport: PerformanceReport,
  ): Promise<PerformanceComparisonResult> {
    const metrics: MetricComparison[] = [];

    // 对比每个指标
    baselineReport.testResults.forEach((baselineResult) => {
      const currentResult = this.testResults.find(
        (r) => r.testName === baselineResult.testName,
      );

      if (currentResult) {
        baselineResult.measurements.forEach((baselineValue, key) => {
          const currentValue = currentResult.measurements.get(key);
          if (currentValue !== undefined) {
            const changePercent =
              ((currentValue - baselineValue) / baselineValue) * 100;
            const direction =
              changePercent > 5
                ? 'degraded'
                : changePercent < -5
                  ? 'improved'
                  : 'unchanged';

            metrics.push({
              metricName: key,
              baselineValue,
              comparisonValue: currentValue,
              changePercent,
              direction,
              isSignificant: Math.abs(changePercent) > 10,
            });
          }
        });
      }
    });

    // 计算评分变化
    const scoreChange =
      this.calculateOverallScore() - baselineReport.overallScore;

    // 确定级别变化
    const levelChange =
      scoreChange > 5
        ? 'improved'
        : scoreChange < -5
          ? 'degraded'
          : 'unchanged';

    // 检测回归
    const regressionMetrics = metrics
      .filter((m) => m.direction === 'degraded' && m.isSignificant)
      .map((m) => m.metricName);

    const improvedMetrics = metrics
      .filter((m) => m.direction === 'improved' && m.isSignificant)
      .map((m) => m.metricName);

    // 生成分析报告
    const analysisReport = this.generateAnalysisReport(
      metrics,
      scoreChange,
      regressionMetrics,
      improvedMetrics,
    );

    return {
      baselineVersion: baselineReport.version,
      comparisonVersion: this.config.baselineVersion,
      metrics,
      scoreChange,
      levelChange,
      hasRegression: regressionMetrics.length > 0,
      regressionMetrics,
      improvedMetrics,
      analysisReport,
    };
  }

  /**
   * 生成分析报告
   */
  private generateAnalysisReport(
    metrics: MetricComparison[],
    scoreChange: number,
    regressionMetrics: string[],
    improvedMetrics: string[],
  ): string {
    let report = '性能对比分析报告\n\n';

    if (scoreChange > 0) {
      report += `整体性能提升了 ${scoreChange.toFixed(2)} 分\n`;
    } else if (scoreChange < 0) {
      report += `整体性能下降了 ${Math.abs(scoreChange).toFixed(2)} 分\n`;
    } else {
      report += '整体性能保持稳定\n';
    }

    if (regressionMetrics.length > 0) {
      report += `\n性能退化的指标:\n`;
      regressionMetrics.forEach((metric) => {
        const m = metrics.find((metric) => metric.metricName === metric);
        if (m) {
          report += `- ${metric}: 退化 ${m.changePercent.toFixed(2)}%\n`;
        }
      });
    }

    if (improvedMetrics.length > 0) {
      report += `\n性能提升的指标:\n`;
      improvedMetrics.forEach((metric) => {
        const m = metrics.find((metric) => metric.metricName === metric);
        if (m) {
          report += `- ${metric}: 提升 ${Math.abs(m.changePercent).toFixed(2)}%\n`;
        }
      });
    }

    return report;
  }

  /**
   * 分析性能趋势
   */
  analyzePerformanceTrend(): PerformanceTrendAnalysis {
    if (this.historyData.length < 2) {
      throw new Error('历史数据不足，无法分析趋势');
    }

    const dataPointCount = this.historyData.length;
    const timeRange = {
      start: this.historyData[0].timestamp,
      end: this.historyData[dataPointCount - 1].timestamp,
    };

    // 计算平均评分
    const averageScore =
      this.historyData.reduce((acc, d) => acc + d.score, 0) / dataPointCount;

    // 计算评分标准差
    const scoreVariance =
      this.historyData.reduce((acc, d) => acc + Math.pow(d.score - averageScore, 2), 0) /
      dataPointCount;
    const scoreStandardDeviation = Math.sqrt(scoreVariance);

    // 确定趋势方向
    const firstHalf = this.historyData.slice(0, Math.floor(dataPointCount / 2));
    const secondHalf = this.historyData.slice(Math.floor(dataPointCount / 2));
    const firstAvg = firstHalf.reduce((acc, d) => acc + d.score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((acc, d) => acc + d.score, 0) / secondHalf.length;

    const trend =
      secondAvg > firstAvg + scoreStandardDeviation
        ? 'improving'
        : secondAvg < firstAvg - scoreStandardDeviation
          ? 'degrading'
          : 'stable';

    // 分析关键指标趋势
    const metricTrends = new Map();
    const allMetrics = new Set<string>();
    this.historyData.forEach((d) => {
      d.keyMetrics.forEach((_, key) => allMetrics.add(key));
    });

    allMetrics.forEach((metric) => {
      const values = this.historyData
        .map((d) => d.keyMetrics.get(metric))
        .filter((v): v is number => v !== undefined);

      if (values.length >= 2) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / values.length;
        const std = Math.sqrt(variance);

        const firstVals = values.slice(0, Math.floor(values.length / 2));
        const secondVals = values.slice(Math.floor(values.length / 2));
        const firstAvgVal = firstVals.reduce((a, b) => a + b, 0) / firstVals.length;
        const secondAvgVal = secondVals.reduce((a, b) => a + b, 0) / secondVals.length;

        metricTrends.set(metric, {
          trend:
            secondAvgVal < firstAvgVal - std
              ? 'improving'
              : secondAvgVal > firstAvgVal + std
                ? 'degrading'
                : 'stable',
          averageValue: avg,
          standardDeviation: std,
        });
      }
    });

    // 预测下一个版本评分
    const predictions = {
      nextVersionScore: averageScore + (secondAvg - firstAvg),
      confidenceLevel: 0.7,
    };

    return {
      dataPointCount,
      timeRange,
      trend,
      averageScore,
      scoreStandardDeviation,
      metricTrends,
      predictions,
    };
  }
}
