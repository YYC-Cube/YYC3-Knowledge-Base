/**
 * @file: llm/PerformanceTypes.ts
 * @description: 性能优化与监控类型定义
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: performance,monitor,optimization,types
 */

/**
 * 性能指标类型
 */
export enum MetricType {
  RENDER = 'render',           // 渲染性能
  MEMORY = 'memory',           // 内存使用
  CPU = 'cpu',                 // CPU使用
  NETWORK = 'network',         // 网络请求
  INTERACTION = 'interaction', // 交互响应
  BUNDLE = 'bundle',          // 包大小
  CACHE = 'cache',            // 缓存命中
}

/**
 * 性能级别
 */
export enum PerformanceLevel {
  EXCELLENT = 'excellent',  // 优秀
  GOOD = 'good',           // 良好
  FAIR = 'fair',           // 一般
  POOR = 'poor',           // 较差
  CRITICAL = 'critical',   // 严重
}

/**
 * 优化策略类型
 */
export enum OptimizationType {
  VIRTUAL_SCROLL = 'virtual_scroll',     // 虚拟滚动
  DEBOUNCE = 'debounce',                 // 防抖
  THROTTLE = 'throttle',                 // 节流
  LAZY_LOAD = 'lazy_load',               // 懒加载
  CODE_SPLIT = 'code_split',             // 代码分割
  CACHE = 'cache',                       // 缓存
  MEMO = 'memo',                         // 记忆化
  WEB_WORKER = 'web_worker',             // Web Worker
}

/**
 * 性能指标
 */
export interface PerformanceMetric {
  type: MetricType;
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  level: PerformanceLevel;
  threshold: number;
  metadata?: Record<string, any>;
}

/**
 * 渲染性能指标
 */
export interface RenderMetric extends PerformanceMetric {
  type: MetricType.RENDER;
  componentName: string;
  renderTime: number;
  updateTime: number;
  renderCount: number;
}

/**
 * 内存使用指标
 */
export interface MemoryMetric extends PerformanceMetric {
  type: MetricType.MEMORY;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  memoryUsage: number; // 百分比
}

/**
 * CPU使用指标
 */
export interface CPUMetric extends PerformanceMetric {
  type: MetricType.CPU;
  tasksPerSecond: number;
  averageTaskTime: number;
  longTasks: number; // 长任务数量
  idleTime: number;
}

/**
 * 网络请求指标
 */
export interface NetworkMetric extends PerformanceMetric {
  type: MetricType.NETWORK;
  requestCount: number;
  successCount: number;
  failedCount: number;
  averageResponseTime: number;
  totalDataSize: number;
}

/**
 * 性能瓶颈
 */
export interface PerformanceBottleneck {
  id: string;
  type: MetricType;
  description: string;
  impact: 'high' | 'medium' | 'low';
  suggestions: string[];
  metrics: PerformanceMetric[];
  detectedAt: number;
}

/**
 * 优化建议
 */
export interface OptimizationSuggestion {
  type: OptimizationType;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'easy' | 'medium' | 'hard';
  code?: string;
  references?: string[];
}

/**
 * 优化策略
 */
export interface OptimizationStrategy {
  type: OptimizationType;
  enabled: boolean;
  config: Record<string, any>;
  performance: {
    before: number;
    after: number;
    improvement: number;
  };
}

/**
 * 性能报告
 */
export interface PerformanceReport {
  id: string;
  timestamp: number;
  duration: number;
  metrics: PerformanceMetric[];
  bottlenecks: PerformanceBottleneck[];
  suggestions: OptimizationSuggestion[];
  summary: {
    overallLevel: PerformanceLevel;
    score: number;
    improvements: string[];
    warnings: string[];
  };
}

/**
 * 性能监控配置
 */
export interface PerformanceMonitorConfig {
  enabled: boolean;
  interval: number;          // 监控间隔（毫秒）
  thresholds: {
    renderTime: number;      // 渲染时间阈值（毫秒）
    memoryUsage: number;     // 内存使用阈值（百分比）
    cpuUsage: number;        // CPU使用阈值（百分比）
    networkTime: number;     // 网络响应时间阈值（毫秒）
  };
  alerts: {
    enabled: boolean;
    level: PerformanceLevel;
  };
  storage: {
    enabled: boolean;
    maxSize: number;         // 最大存储条数
    retention: number;       // 保留时间（小时）
  };
}

/**
 * 默认监控配置
 */
export const DEFAULT_MONITOR_CONFIG: PerformanceMonitorConfig = {
  enabled: true,
  interval: 1000,
  thresholds: {
    renderTime: 16,          // 60 FPS
    memoryUsage: 80,         // 80%
    cpuUsage: 70,            // 70%
    networkTime: 1000,       // 1秒
  },
  alerts: {
    enabled: true,
    level: PerformanceLevel.FAIR,
  },
  storage: {
    enabled: true,
    maxSize: 1000,
    retention: 24,
  },
};

/**
 * 性能统计
 */
export interface PerformanceStats {
  totalMetrics: number;
  averageRenderTime: number;
  averageMemoryUsage: number;
  averageCPUUsage: number;
  averageNetworkTime: number;
  bottlenecksDetected: number;
  optimizationsApplied: number;
  improvementPercentage: number;
}

/**
 * 缓存条目
 */
export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  hits: number;
  ttl: number;  // 过期时间（毫秒）
}

/**
 * 虚拟滚动配置
 */
export interface VirtualScrollConfig {
  itemHeight: number;
  containerHeight: number;
  overscan: number;          // 预渲染数量
  threshold: number;         // 触发虚拟滚动的阈值
}

/**
 * 防抖节流配置
 */
export interface DebounceThrottleConfig {
  delay: number;
  leading: boolean;
  trailing: boolean;
  maxWait?: number;
}
