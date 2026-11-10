/**
 * @file: testing/PerformanceBenchmarkTypes.ts
 * @description: 性能基准测试类型定义
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: performance,benchmark,types
 */

/**
 * 性能基准类型
 */
export type BenchmarkType =
  | 'render' // 渲染性能
  | 'memory' // 内存性能
  | 'cpu' // CPU 性能
  | 'network' // 网络性能
  | 'startup' // 启动性能
  | 'runtime'; // 运行时性能

/**
 * 性能基准级别
 */
export type BenchmarkLevel = 'critical' | 'warning' | 'good' | 'excellent';

/**
 * 性能基准指标
 */
export interface PerformanceBaselineMetric {
  /** 指标名称 */
  name: string;
  /** 指标类型 */
  type: BenchmarkType;
  /** 目标值 */
  target: number;
  /** 警告阈值 */
  warningThreshold: number;
  /** 错误阈值 */
  errorThreshold: number;
  /** 单位 */
  unit: string;
  /** 描述 */
  description: string;
}

/**
 * 性能测试结果
 */
export interface PerformanceTestResult {
  /** 测试名称 */
  testName: string;
  /** 测试类型 */
  testType: BenchmarkType;
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime: number;
  /** 持续时间（ms） */
  duration: number;
  /** 测量值 */
  measurements: Map<string, number>;
  /** 是否通过 */
  passed: boolean;
  /** 性能级别 */
  level: BenchmarkLevel;
  /** 详情 */
  details?: string;
  /** 错误信息 */
  error?: string;
}

/**
 * 性能对比结果
 */
export interface PerformanceComparisonResult {
  /** 基准版本 */
  baselineVersion: string;
  /** 对比版本 */
  comparisonVersion: string;
  /** 对比指标 */
  metrics: MetricComparison[];
  /** 整体评分变化 */
  scoreChange: number;
  /** 整体级别变化 */
  levelChange: 'improved' | 'degraded' | 'unchanged';
  /** 是否有回归 */
  hasRegression: boolean;
  /** 回归指标 */
  regressionMetrics: string[];
  /** 改进指标 */
  improvedMetrics: string[];
  /** 分析报告 */
  analysisReport: string;
}

/**
 * 指标对比
 */
export interface MetricComparison {
  /** 指标名称 */
  metricName: string;
  /** 基准值 */
  baselineValue: number;
  /** 对比值 */
  comparisonValue: number;
  /** 变化百分比 */
  changePercent: number;
  /** 变化方向 */
  direction: 'improved' | 'degraded' | 'unchanged';
  /** 是否显著 */
  isSignificant: boolean;
  /** 显著性水平 */
  significanceLevel?: number;
}

/**
 * 性能报告
 */
export interface PerformanceReport {
  /** 报告ID */
  id: string;
  /** 生成时间 */
  timestamp: number;
  /** 版本号 */
  version: string;
  /** 测试环境 */
  environment: TestEnvironment;
  /** 测试结果 */
  testResults: PerformanceTestResult[];
  /** 整体评分 */
  overallScore: number;
  /** 整体级别 */
  overallLevel: BenchmarkLevel;
  /** 性能基准 */
  baselines: PerformanceBaselineMetric[];
  /** 性能对比（可选） */
  comparison?: PerformanceComparisonResult;
  /** 问题列表 */
  issues: PerformanceIssue[];
  /** 建议 */
  recommendations: PerformanceRecommendation[];
  /** 总结 */
  summary: string;
}

/**
 * 测试环境
 */
export interface TestEnvironment {
  /** 浏览器 */
  browser: string;
  /** 浏览器版本 */
  browserVersion: string;
  /** 操作系统 */
  os: string;
  /** CPU 核心数 */
  cpuCores: number;
  /** 内存大小（GB） */
  memory: number;
  /** 屏幕分辨率 */
  screenResolution: string;
  /** 设备像素比 */
  devicePixelRatio: number;
  /** 网络类型 */
  networkType: string;
}

/**
 * 性能问题
 */
export interface PerformanceIssue {
  /** 问题ID */
  id: string;
  /** 问题类型 */
  type: 'critical' | 'warning' | 'info';
  /** 问题标题 */
  title: string;
  /** 问题描述 */
  description: string;
  /** 影响范围 */
  impact: string;
  /** 相关指标 */
  relatedMetrics: string[];
  /** 建议解决方案 */
  suggestedSolution: string;
  /** 优先级 */
  priority: 'high' | 'medium' | 'low';
}

/**
 * 性能建议
 */
export interface PerformanceRecommendation {
  /** 建议ID */
  id: string;
  /** 建议类型 */
  type: 'optimization' | 'refactor' | 'configuration' | 'best-practice';
  /** 建议标题 */
  title: string;
  /** 建议描述 */
  description: string;
  /** 预期收益 */
  expectedBenefit: string;
  /** 实施步骤 */
  steps: string[];
  /** 优先级 */
  priority: 'high' | 'medium' | 'low';
  /** 相关指标 */
  relatedMetrics: string[];
}

/**
 * 性能趋势数据点
 */
export interface PerformanceTrendDataPoint {
  /** 时间戳 */
  timestamp: number;
  /** 版本号 */
  version: string;
  /** 评分 */
  score: number;
  /** 级别 */
  level: BenchmarkLevel;
  /** 关键指标 */
  keyMetrics: Map<string, number>;
}

/**
 * 性能趋势分析
 */
export interface PerformanceTrendAnalysis {
  /** 数据点数量 */
  dataPointCount: number;
  /** 时间范围 */
  timeRange: {
    start: number;
    end: number;
  };
  /** 趋势方向 */
  trend: 'improving' | 'degrading' | 'stable';
  /** 平均评分 */
  averageScore: number;
  /** 评分标准差 */
  scoreStandardDeviation: number;
  /** 关键指标趋势 */
  metricTrends: Map<string, {
    trend: 'improving' | 'degrading' | 'stable';
    averageValue: number;
    standardDeviation: number;
  }>;
  /** 预测 */
  predictions: {
    nextVersionScore: number;
    confidenceLevel: number;
  };
}

/**
 * 性能基准配置
 */
export interface PerformanceBenchmarkConfig {
  /** 基准版本 */
  baselineVersion: string;
  /** 是否启用对比 */
  enableComparison: boolean;
  /** 对比版本（可选） */
  comparisonVersion?: string;
  /** 测试次数 */
  testRuns: number;
  /** 预热次数 */
  warmupRuns: number;
  /** 超时时间（ms） */
  timeout: number;
  /** 是否生成详细报告 */
  detailedReport: boolean;
  /** 是否保存历史数据 */
  saveHistory: boolean;
  /** 历史数据保留天数 */
  historyRetentionDays: number;
}

/**
 * 默认性能基准配置
 */
export const DEFAULT_BENCHMARK_CONFIG: PerformanceBenchmarkConfig = {
  baselineVersion: '1.0.0',
  enableComparison: false,
  testRuns: 5,
  warmupRuns: 2,
  timeout: 30000,
  detailedReport: true,
  saveHistory: true,
  historyRetentionDays: 30,
};

/**
 * 性能基准指标（默认）
 */
export const DEFAULT_BASELINE_METRICS: PerformanceBaselineMetric[] = [
  // 渲染性能
  {
    name: 'initial-render-time',
    type: 'render',
    target: 1000,
    warningThreshold: 1500,
    errorThreshold: 3000,
    unit: 'ms',
    description: '初始渲染时间',
  },
  {
    name: 're-render-time',
    type: 'render',
    target: 16,
    warningThreshold: 33,
    errorThreshold: 100,
    unit: 'ms',
    description: '重渲染时间',
  },
  {
    name: 'fps',
    type: 'render',
    target: 60,
    warningThreshold: 45,
    errorThreshold: 30,
    unit: 'fps',
    description: '帧率',
  },

  // 内存性能
  {
    name: 'memory-usage',
    type: 'memory',
    target: 200,
    warningThreshold: 300,
    errorThreshold: 500,
    unit: 'MB',
    description: '内存使用量',
  },
  {
    name: 'memory-growth',
    type: 'memory',
    target: 10,
    warningThreshold: 20,
    errorThreshold: 50,
    unit: 'MB/h',
    description: '内存增长率',
  },
  {
    name: 'gc-pause-time',
    type: 'memory',
    target: 10,
    warningThreshold: 50,
    errorThreshold: 100,
    unit: 'ms',
    description: 'GC 暂停时间',
  },

  // CPU 性能
  {
    name: 'cpu-usage',
    type: 'cpu',
    target: 30,
    warningThreshold: 50,
    errorThreshold: 80,
    unit: '%',
    description: 'CPU 使用率',
  },
  {
    name: 'long-task-duration',
    type: 'cpu',
    target: 50,
    warningThreshold: 100,
    errorThreshold: 200,
    unit: 'ms',
    description: '长任务持续时间',
  },
  {
    name: 'script-execution-time',
    type: 'cpu',
    target: 100,
    warningThreshold: 200,
    errorThreshold: 500,
    unit: 'ms',
    description: '脚本执行时间',
  },

  // 网络性能
  {
    name: 'first-contentful-paint',
    type: 'network',
    target: 1000,
    warningThreshold: 2000,
    errorThreshold: 3000,
    unit: 'ms',
    description: '首次内容绘制',
  },
  {
    name: 'largest-contentful-paint',
    type: 'network',
    target: 2000,
    warningThreshold: 3000,
    errorThreshold: 4000,
    unit: 'ms',
    description: '最大内容绘制',
  },
  {
    name: 'time-to-interactive',
    type: 'network',
    target: 3000,
    warningThreshold: 5000,
    errorThreshold: 8000,
    unit: 'ms',
    description: '可交互时间',
  },

  // 启动性能
  {
    name: 'startup-time',
    type: 'startup',
    target: 2000,
    warningThreshold: 3000,
    errorThreshold: 5000,
    unit: 'ms',
    description: '启动时间',
  },
  {
    name: 'bundle-size',
    type: 'startup',
    target: 2000,
    warningThreshold: 3000,
    errorThreshold: 5000,
    unit: 'KB',
    description: '打包大小',
  },
  {
    name: 'chunk-load-time',
    type: 'startup',
    target: 500,
    warningThreshold: 1000,
    errorThreshold: 2000,
    unit: 'ms',
    description: '代码块加载时间',
  },

  // 运行时性能
  {
    name: 'interaction-latency',
    type: 'runtime',
    target: 50,
    warningThreshold: 100,
    errorThreshold: 200,
    unit: 'ms',
    description: '交互延迟',
  },
  {
    name: 'state-update-time',
    type: 'runtime',
    target: 10,
    warningThreshold: 20,
    errorThreshold: 50,
    unit: 'ms',
    description: '状态更新时间',
  },
  {
    name: 'event-handler-time',
    type: 'runtime',
    target: 5,
    warningThreshold: 10,
    errorThreshold: 20,
    unit: 'ms',
    description: '事件处理时间',
  },
];
