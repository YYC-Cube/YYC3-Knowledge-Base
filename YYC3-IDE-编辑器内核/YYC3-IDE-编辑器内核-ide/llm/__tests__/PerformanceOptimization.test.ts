// @ts-nocheck
/**
 * @file: llm/__tests__/PerformanceOptimization.test.ts
 * @description: 性能优化与监控测试套件
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: test,performance,monitor,optimization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceMonitor } from '../PerformanceMonitor';
import { PerformanceOptimizer } from '../PerformanceOptimizer';
import { PerformanceReporter } from '../PerformanceReporter';
import {
  MetricType,
  PerformanceLevel,
  OptimizationType,
  DEFAULT_MONITOR_CONFIG,
} from '../PerformanceTypes';

describe('性能优化与监控', () => {
  let monitor: PerformanceMonitor;
  let optimizer: PerformanceOptimizer;
  let reporter: PerformanceReporter;

  beforeEach(() => {
    monitor = new PerformanceMonitor({
      ...DEFAULT_MONITOR_CONFIG,
      interval: 100,
    });
    optimizer = new PerformanceOptimizer();
    reporter = new PerformanceReporter();
  });

  afterEach(() => {
    monitor.stop();
    optimizer.cacheClear();
  });

  describe('性能监控系统', () => {
    it('应该启动和停止监控', () => {
      monitor.start();
      expect(monitor['isRunning']).toBe(true);

      monitor.stop();
      expect(monitor['isRunning']).toBe(false);
    });

    it('应该监控渲染性能', () => {
      const metric = monitor.monitorRender('TestComponent', 20);

      expect(metric.type).toBe(MetricType.RENDER);
      expect(metric.componentName).toBe('TestComponent');
      expect(metric.renderTime).toBe(20);
      expect(metric.unit).toBe('ms');
    });

    it('应该评估性能级别', () => {
      // 优秀：小于阈值的一半
      const excellent = monitor.monitorRender('Component1', 5);
      expect(excellent.level).toBe(PerformanceLevel.EXCELLENT);

      // 良好：小于阈值的80%
      const good = monitor.monitorRender('Component2', 10);
      expect(good.level).toBe(PerformanceLevel.GOOD);

      // 一般：小于阈值
      const fair = monitor.monitorRender('Component3', 14);
      expect(fair.level).toBe(PerformanceLevel.FAIR);

      // 较差：小于阈值的1.5倍
      const poor = monitor.monitorRender('Component4', 20);
      expect(poor.level).toBe(PerformanceLevel.POOR);

      // 严重：大于阈值的1.5倍
      const critical = monitor.monitorRender('Component5', 30);
      expect(critical.level).toBe(PerformanceLevel.CRITICAL);
    });

    it('应该监控内存使用', () => {
      // Mock memory API
      (performance as any).memory = {
        usedJSHeapSize: 50 * 1024 * 1024,
        totalJSHeapSize: 100 * 1024 * 1024,
        jsHeapSizeLimit: 200 * 1024 * 1024,
      };

      const metric = monitor.monitorMemory();

      expect(metric).not.toBeNull();
      expect((metric as any).type).toBe(MetricType.MEMORY);
      expect((metric as any).memoryUsage).toBeGreaterThan(0);
      expect((metric as any).memoryUsage).toBeLessThan(100);
    });

    it('应该监控CPU使用', () => {
      const metric = monitor.monitorCPU();

      expect(metric.type).toBe(MetricType.CPU);
      expect(metric.value).toBeGreaterThanOrEqual(0);
      expect(metric.value).toBeLessThanOrEqual(100);
    });

    it('应该监控网络请求', () => {
      const metric = monitor.monitorNetwork();

      expect(metric.type).toBe(MetricType.NETWORK);
      expect(metric.requestCount).toBeGreaterThanOrEqual(0);
      expect(metric.averageResponseTime).toBeGreaterThanOrEqual(0);
    });

    it('应该记录自定义指标', () => {
      const customMetric = {
        type: MetricType.INTERACTION,
        name: 'custom_metric',
        value: 100,
        unit: 'ms',
        timestamp: Date.now(),
        level: PerformanceLevel.GOOD,
        threshold: 200,
      };

      monitor.recordMetric(customMetric);
      const metrics = monitor.getMetrics();

      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics.some(m => m.name === 'custom_metric')).toBe(true);
    });

    it('应该获取统计信息', () => {
      monitor.monitorRender('Component1', 10);
      monitor.monitorRender('Component2', 20);

      const stats = monitor.getStats();

      expect(stats.totalMetrics).toBeGreaterThan(0);
      expect(stats.averageRenderTime).toBeGreaterThanOrEqual(0);
    });

    it('应该清除指标', () => {
      monitor.monitorRender('Component', 10);
      monitor.clearMetrics();
      const metrics = monitor.getMetrics();

      expect(metrics.length).toBe(0);
    });
  });

  describe('性能优化策略', () => {
    it('应该创建虚拟滚动', () => {
      const virtualScroll = optimizer.createVirtualScroll({
        itemHeight: 50,
        containerHeight: 400,
        overscan: 3,
        threshold: 20,
      });

      const items = Array.from({ length: 100 }, (_, i) => ({ id: i, content: `Item ${i}` }));
      const visibleItems = virtualScroll.getVisibleItems(items, 0);

      expect(visibleItems.length).toBeGreaterThan(0);
      expect(visibleItems.length).toBeLessThan(items.length);

      const totalHeight = virtualScroll.getTotalHeight(items);
      expect(totalHeight).toBe(100 * 50);
    });

    it('应该实现防抖功能', () => {
      const mockFn = vi.fn();
      const debouncedFn = optimizer.debounce(mockFn, {
        delay: 100,
        leading: false,
        trailing: true,
      });

      // 快速调用多次
      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(mockFn).not.toHaveBeenCalled();

      // 等待防抖延迟
      return new Promise(resolve => {
        setTimeout(() => {
          expect(mockFn).toHaveBeenCalledTimes(1);
          resolve(undefined);
        }, 150);
      });
    });

    it('应该实现节流功能', () => {
      const mockFn = vi.fn();
      const throttledFn = optimizer.throttle(mockFn, {
        delay: 100,
        leading: true,
        trailing: false,
      });

      // 快速调用多次
      throttledFn();
      throttledFn();
      throttledFn();

      // 只应该调用一次
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('应该实现缓存功能', () => {
      const key = 'test_key';
      const value = { data: 'test' };

      optimizer.cacheSet(key, value, 3600000);
      const cached = optimizer.cacheGet(key);

      expect(cached).toEqual(value);
    });

    it('应该检查缓存过期', () => {
      const key = 'test_key';
      const value = { data: 'test' };

      optimizer.cacheSet(key, value, 100); // 100ms TTL

      return new Promise(resolve => {
        setTimeout(() => {
          const cached = optimizer.cacheGet(key);
          expect(cached).toBeNull();
          resolve(undefined);
        }, 150);
      });
    });

    it('应该清除缓存', () => {
      optimizer.cacheSet('key1', 'value1');
      optimizer.cacheSet('key2', 'value2');

      optimizer.cacheClear();

      expect(optimizer.cacheGet('key1')).toBeNull();
      expect(optimizer.cacheGet('key2')).toBeNull();
    });

    it('应该创建懒加载器', () => {
      const lazyLoader = optimizer.createLazyLoader<string>();
      const loader = () => Promise.resolve('loaded');

      return lazyLoader.load(loader).then(result => {
        expect(result).toBe('loaded');
      });
    });

    it('应该预加载资源', () => {
      const lazyLoader = optimizer.createLazyLoader<string>();
      const loader = () => Promise.resolve('preloaded');

      lazyLoader.preload(loader);

      // 预加载是异步的，等待一下
      return new Promise(resolve => {
        setTimeout(() => {
          lazyLoader.load(loader).then(result => {
            expect(result).toBe('preloaded');
            resolve(undefined);
          });
        }, 50);
      });
    });

    it('应该分析性能瓶颈', () => {
      const bottlenecks = [
        {
          id: 'b1',
          type: MetricType.RENDER,
          description: '渲染缓慢',
          impact: 'high' as const,
          suggestions: ['优化渲染'],
          metrics: [],
          detectedAt: Date.now(),
        },
      ];

      const suggestions = optimizer.analyzeBottlenecks(bottlenecks);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].type).toBeDefined();
      expect(suggestions[0].title).toBeDefined();
    });

    it('应该获取优化策略', () => {
      const strategy = optimizer.getStrategy(OptimizationType.VIRTUAL_SCROLL);

      expect(strategy).toBeDefined();
      expect((strategy as any).type).toBe(OptimizationType.VIRTUAL_SCROLL);
      expect((strategy as any).enabled).toBe(true);
    });

    it('应该更新优化策略', () => {
      optimizer.updateStrategy(OptimizationType.VIRTUAL_SCROLL, {
        enabled: false,
      });

      const strategy = optimizer.getStrategy(OptimizationType.VIRTUAL_SCROLL);
      expect((strategy as any).enabled).toBe(false);
    });

    it('应该获取所有策略', () => {
      const strategies = optimizer.getAllStrategies();

      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies.some(s => s.type === OptimizationType.VIRTUAL_SCROLL)).toBe(true);
    });
  });

  describe('性能报告生成', () => {
    it('应该生成性能报告', () => {
      const metrics = [
        {
          type: MetricType.RENDER,
          name: 'render_test',
          value: 20,
          unit: 'ms',
          timestamp: Date.now(),
          level: PerformanceLevel.POOR,
          threshold: 16,
        },
      ];

      const report = reporter.generateReport(metrics);

      expect(report.id).toBeDefined();
      expect(report.timestamp).toBeGreaterThan(0);
      expect(report.metrics.length).toBeGreaterThan(0);
      expect(report.summary.score).toBeGreaterThanOrEqual(0);
    });

    it('应该识别性能瓶颈', () => {
      const metrics = [
        {
          type: MetricType.RENDER,
          name: 'slow_render',
          value: 30,
          unit: 'ms',
          timestamp: Date.now(),
          level: PerformanceLevel.CRITICAL,
          threshold: 16,
        },
        {
          type: MetricType.MEMORY,
          name: 'high_memory',
          value: 90,
          unit: '%',
          timestamp: Date.now(),
          level: PerformanceLevel.POOR,
          threshold: 80,
        },
      ];

      const bottlenecks = reporter.identifyBottlenecks(metrics);

      expect(bottlenecks.length).toBeGreaterThan(0);
      expect(bottlenecks.some(b => b.type === MetricType.RENDER)).toBe(true);
      expect(bottlenecks.some(b => b.type === MetricType.MEMORY)).toBe(true);
    });

    it('应该计算性能评分', () => {
      const metrics = [
        {
          type: MetricType.RENDER,
          name: 'good_render',
          value: 10,
          unit: 'ms',
          timestamp: Date.now(),
          level: PerformanceLevel.GOOD,
          threshold: 16,
        },
        {
          type: MetricType.RENDER,
          name: 'excellent_render',
          value: 5,
          unit: 'ms',
          timestamp: Date.now(),
          level: PerformanceLevel.EXCELLENT,
          threshold: 16,
        },
      ];

      const report = reporter.generateReport(metrics);

      // 优秀和良好的组合，评分应该较高
      expect(report.summary.score).toBeGreaterThan(60);
      // 可能是优秀或良好，取决于计算
      expect([PerformanceLevel.EXCELLENT, PerformanceLevel.GOOD]).toContain(report.summary.overallLevel);
    });

    it('应该导出JSON报告', () => {
      const metrics = [
        {
          type: MetricType.RENDER,
          name: 'test',
          value: 10,
          unit: 'ms',
          timestamp: Date.now(),
          level: PerformanceLevel.GOOD,
          threshold: 16,
        },
      ];

      const report = reporter.generateReport(metrics);
      const json = reporter.exportAsJSON(report);

      // JSON报告包含英文ID
      expect(json).toContain('perf_');
      expect(json).toContain('test');
    });

    it('应该导出Markdown报告', () => {
      const metrics = [
        {
          type: MetricType.RENDER,
          name: 'test_render',
          value: 10,
          unit: 'ms',
          timestamp: Date.now(),
          level: PerformanceLevel.GOOD,
          threshold: 16,
        },
      ];

      const report = reporter.generateReport(metrics);
      const markdown = reporter.exportAsMarkdown(report);

      expect(markdown).toContain('# 性能报告');
      expect(markdown).toContain('渲染性能');
      expect(markdown).toContain('test_render');
    });

    it('应该包含优化建议', () => {
      const metrics = [
        {
          type: MetricType.RENDER,
          name: 'slow_render',
          value: 30,
          unit: 'ms',
          timestamp: Date.now(),
          level: PerformanceLevel.CRITICAL,
          threshold: 16,
        },
      ];

      const report = reporter.generateReport(metrics);

      expect(report.bottlenecks.length).toBeGreaterThan(0);
      expect(report.bottlenecks[0].suggestions.length).toBeGreaterThan(0);
      expect(report.suggestions.length).toBeGreaterThan(0);
    });

    it('应该生成摘要', () => {
      const metrics = [
        {
          type: MetricType.RENDER,
          name: 'good_render',
          value: 10,
          unit: 'ms',
          timestamp: Date.now(),
          level: PerformanceLevel.GOOD,
          threshold: 16,
        },
      ];

      const report = reporter.generateReport(metrics);

      expect(report.summary.overallLevel).toBeDefined();
      expect(report.summary.score).toBeGreaterThan(0);
    });
  });

  describe('集成测试', () => {
    it('应该完成完整的性能监控流程', () => {
      // 启动监控
      monitor.start();

      // 模拟性能数据收集
      monitor.monitorRender('Component1', 10);
      monitor.monitorRender('Component2', 15);
      monitor.monitorCPU();
      monitor.monitorNetwork();

      // 获取指标
      const metrics = monitor.getMetrics();
      expect(metrics.length).toBeGreaterThan(0);

      // 生成报告
      const report = reporter.generateReport(metrics);
      expect(report.metrics.length).toBeGreaterThan(0);

      // 停止监控
      monitor.stop();
    });

    it('应该应用优化策略', () => {
      // 创建瓶颈
      const bottlenecks = [
        {
          id: 'b1',
          type: MetricType.RENDER,
          description: '渲染性能差',
          impact: 'high' as const,
          suggestions: ['实现虚拟滚动'],
          metrics: [],
          detectedAt: Date.now(),
        },
      ];

      // 分析并生成建议
      const suggestions = optimizer.analyzeBottlenecks(bottlenecks);
      expect(suggestions.length).toBeGreaterThan(0);

      // 应用策略
      optimizer.updateStrategy(OptimizationType.VIRTUAL_SCROLL, {
        enabled: true,
        config: { threshold: 20 },
      });

      const strategy = optimizer.getStrategy(OptimizationType.VIRTUAL_SCROLL);
      expect((strategy as any).enabled).toBe(true);
    });
  });
});
