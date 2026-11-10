/**
 * @file: llm/PerformanceMonitor.ts
 * @description: 性能监控系统 - 监控渲染、内存、CPU、网络请求
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: performance,monitor,metrics
 */

import {
  PerformanceMetric,
  PerformanceLevel,
  MetricType,
  PerformanceMonitorConfig,
  DEFAULT_MONITOR_CONFIG,
  RenderMetric,
  MemoryMetric,
  CPUMetric,
  NetworkMetric,
  PerformanceStats,
} from './PerformanceTypes';
import { logger } from "../services/Logger";

/**
 * 性能监控器
 */
export class PerformanceMonitor {
  private config: PerformanceMonitorConfig;
  private metrics: PerformanceMetric[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private observers: PerformanceObserver[] = [];
  private isRunning = false;

  constructor(config: Partial<PerformanceMonitorConfig> = {}) {
    this.config = { ...DEFAULT_MONITOR_CONFIG, ...config };
  }

  /**
   * 启动监控
   */
  start(): void {
    if (this.isRunning || !this.config.enabled) return;

    this.isRunning = true;

    // 定期收集指标
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, this.config.interval);

    // 观察性能条目
    this.setupObservers();

    logger.warn('Started');
  }

  /**
   * 停止监控
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];

    logger.warn('Stopped');
  }

  /**
   * 获取所有指标
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * 获取统计信息
   */
  getStats(): PerformanceStats {
    const renderMetrics = this.metrics.filter(m => m.type === MetricType.RENDER) as RenderMetric[];
    const memoryMetrics = this.metrics.filter(m => m.type === MetricType.MEMORY) as MemoryMetric[];
    const cpuMetrics = this.metrics.filter(m => m.type === MetricType.CPU) as CPUMetric[];
    const networkMetrics = this.metrics.filter(m => m.type === MetricType.NETWORK) as NetworkMetric[];

    return {
      totalMetrics: this.metrics.length,
      averageRenderTime: this.average(renderMetrics.map(m => m.renderTime)),
      averageMemoryUsage: this.average(memoryMetrics.map(m => m.memoryUsage)),
      averageCPUUsage: this.average(cpuMetrics.map(m => m.value)),
      averageNetworkTime: this.average(networkMetrics.map(m => m.averageResponseTime)),
      bottlenecksDetected: this.countBottlenecks(),
      optimizationsApplied: 0,
      improvementPercentage: 0,
    };
  }

  /**
   * 清除指标
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * 记录自定义指标
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    this.checkAlert(metric);
    this.pruneMetrics();
  }

  /**
   * 监控渲染性能
   */
  monitorRender(componentName: string, renderTime: number): RenderMetric {
    const level = this.evaluateLevel(renderTime, this.config.thresholds.renderTime);

    const metric: RenderMetric = {
      type: MetricType.RENDER,
      name: `render_${componentName}`,
      value: renderTime,
      unit: 'ms',
      timestamp: Date.now(),
      level,
      threshold: this.config.thresholds.renderTime,
      componentName,
      renderTime,
      updateTime: 0,
      renderCount: 1,
    };

    this.recordMetric(metric);
    return metric;
  }

  /**
   * 监控内存使用
   */
  monitorMemory(): MemoryMetric | null {
    if (!(performance as any).memory) {
      logger.warn('Memory API not available');
      return null;
    }

    const memory = (performance as any).memory;
    const memoryUsage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    const level = this.evaluateLevel(memoryUsage, this.config.thresholds.memoryUsage);

    const metric: MemoryMetric = {
      type: MetricType.MEMORY,
      name: 'memory_usage',
      value: memoryUsage,
      unit: '%',
      timestamp: Date.now(),
      level,
      threshold: this.config.thresholds.memoryUsage,
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      memoryUsage,
    };

    this.recordMetric(metric);
    return metric;
  }

  /**
   * 监控CPU使用
   */
  monitorCPU(): CPUMetric {
    const tasks = performance.getEntriesByType('task');
    const longTasks = tasks.filter((task: any) => task.duration > 50);
    const averageTaskTime = tasks.length > 0
      ? tasks.reduce((sum: number, task: any) => sum + task.duration, 0) / tasks.length
      : 0;

    const cpuUsage = Math.min(100, (tasks.length / 10) * 20); // 简化的CPU使用估算
    const level = this.evaluateLevel(cpuUsage, this.config.thresholds.cpuUsage);

    const metric: CPUMetric = {
      type: MetricType.CPU,
      name: 'cpu_usage',
      value: cpuUsage,
      unit: '%',
      timestamp: Date.now(),
      level,
      threshold: this.config.thresholds.cpuUsage,
      tasksPerSecond: tasks.length,
      averageTaskTime,
      longTasks: longTasks.length,
      idleTime: 0,
    };

    this.recordMetric(metric);
    return metric;
  }

  /**
   * 监控网络请求
   */
  monitorNetwork(): NetworkMetric {
    const entries = performance.getEntriesByType('resource');
    const requests = entries.filter((entry: any) =>
      entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest'
    );

    const averageResponseTime = requests.length > 0
      ? requests.reduce((sum: number, req: any) => sum + req.duration, 0) / requests.length
      : 0;

    const totalDataSize = requests.reduce((sum: number, req: any) => {
      return sum + (req.transferSize || 0);
    }, 0);

    const level = this.evaluateLevel(averageResponseTime, this.config.thresholds.networkTime);

    const metric: NetworkMetric = {
      type: MetricType.NETWORK,
      name: 'network_requests',
      value: averageResponseTime,
      unit: 'ms',
      timestamp: Date.now(),
      level,
      threshold: this.config.thresholds.networkTime,
      requestCount: requests.length,
      successCount: requests.length, // 简化，实际需要错误追踪
      failedCount: 0,
      averageResponseTime,
      totalDataSize,
    };

    this.recordMetric(metric);
    return metric;
  }

  /**
   * 收集所有指标
   */
  private collectMetrics(): void {
    this.monitorMemory();
    this.monitorCPU();
    this.monitorNetwork();
  }

  /**
   * 设置性能观察器
   */
  private setupObservers(): void {
    // 观察长任务
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            this.recordMetric({
              type: MetricType.CPU,
              name: 'long_task',
              value: entry.duration,
              unit: 'ms',
              timestamp: entry.startTime,
              level: PerformanceLevel.POOR,
              threshold: 50,
            });
          });
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch (e) {
        logger.warn('Long task observer not supported');
      }

      // 观察布局偏移
      try {
        const layoutShiftObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              this.recordMetric({
                type: MetricType.RENDER,
                name: 'layout_shift',
                value: entry.value,
                unit: 'score',
                timestamp: entry.startTime,
                level: entry.value > 0.1 ? PerformanceLevel.POOR : PerformanceLevel.GOOD,
                threshold: 0.1,
              });
            }
          });
        });
        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(layoutShiftObserver);
      } catch (e) {
        logger.warn('Layout shift observer not supported');
      }
    }
  }

  /**
   * 评估性能级别
   */
  private evaluateLevel(value: number, threshold: number): PerformanceLevel {
    const ratio = value / threshold;

    if (ratio < 0.5) return PerformanceLevel.EXCELLENT;
    if (ratio < 0.8) return PerformanceLevel.GOOD;
    if (ratio < 1.0) return PerformanceLevel.FAIR;
    if (ratio < 1.5) return PerformanceLevel.POOR;
    return PerformanceLevel.CRITICAL;
  }

  /**
   * 检查是否需要告警
   */
  private checkAlert(metric: PerformanceMetric): void {
    if (!this.config.alerts.enabled) return;

    const alertLevels = [
      PerformanceLevel.POOR,
      PerformanceLevel.CRITICAL,
    ];

    if (alertLevels.includes(metric.level)) {
      logger.warn('Alert: ${metric.name} = ${metric.value}${metric.unit} (${metric.level})');
    }
  }

  /**
   * 清理旧指标
   */
  private pruneMetrics(): void {
    if (!this.config.storage.enabled) return;

    // 按数量限制
    if (this.metrics.length > this.config.storage.maxSize) {
      this.metrics = this.metrics.slice(-this.config.storage.maxSize);
    }

    // 按时间限制
    const cutoff = Date.now() - this.config.storage.retention * 60 * 60 * 1000;
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoff);
  }

  /**
   * 计算平均值
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * 统计瓶颈数量
   */
  private countBottlenecks(): number {
    return this.metrics.filter(m =>
      m.level === PerformanceLevel.POOR || m.level === PerformanceLevel.CRITICAL
    ).length;
  }
}
