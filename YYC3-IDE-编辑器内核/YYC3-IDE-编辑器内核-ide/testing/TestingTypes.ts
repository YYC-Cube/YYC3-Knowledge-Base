/**
 * @file: TestingTypes.ts
 * @description: 大规模测试类型定义 - 性能测试、边界测试、兼容性测试
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: testing,performance,boundary,compatibility,report
 */

// ================================================================
// 性能测试类型
// ================================================================

/**
 * 性能测试配置
 */
export interface PerformanceTestConfig {
  /** 快照数量 */
  snapshotCount: number;
  /** 控制台日志数量 */
  consoleLogCount: number;
  /** 并发操作数 */
  concurrentOperations: number;
  /** 测试时长（毫秒） */
  duration: number;
  /** 采样间隔（毫秒） */
  samplingInterval: number;
  /** 是否启用内存监控 */
  enableMemoryMonitoring: boolean;
  /** 是否启用CPU监控 */
  enableCPUMonitoring: boolean;
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  /** 测试开始时间 */
  startTime: number;
  /** 测试结束时间 */
  endTime: number;
  /** 总耗时（毫秒） */
  totalDuration: number;
  /** 平均响应时间（毫秒） */
  averageResponseTime: number;
  /** 最大响应时间（毫秒） */
  maxResponseTime: number;
  /** 最小响应时间（毫秒） */
  minResponseTime: number;
  /** P50响应时间（毫秒） */
  p50ResponseTime: number;
  /** P95响应时间（毫秒） */
  p95ResponseTime: number;
  /** P99响应时间（毫秒） */
  p99ResponseTime: number;
  /** 吞吐量（操作/秒） */
  throughput: number;
  /** 错误率（%） */
  errorRate: number;
  /** 内存使用峰值（MB） */
  peakMemoryUsage: number;
  /** 平均内存使用（MB） */
  averageMemoryUsage: number;
  /** CPU使用峰值（%） */
  peakCPUUsage: number;
  /** 平均CPU使用（%） */
  averageCPUUsage: number;
}

/**
 * 性能测试结果
 */
export interface PerformanceTestResult {
  /** 测试名称 */
  testName: string;
  /** 测试配置 */
  config: PerformanceTestConfig;
  /** 性能指标 */
  metrics: PerformanceMetrics;
  /** 采样数据 */
  samples: PerformanceSample[];
  /** 是否通过 */
  passed: boolean;
  /** 错误信息 */
  errors: string[];
  /** 警告信息 */
  warnings: string[];
}

/**
 * 性能采样数据
 */
export interface PerformanceSample {
  /** 采样时间 */
  timestamp: number;
  /** 响应时间（毫秒） */
  responseTime: number;
  /** 内存使用（MB） */
  memoryUsage?: number;
  /** CPU使用（%） */
  cpuUsage?: number;
  /** 操作类型 */
  operationType: string;
  /** 是否成功 */
  success: boolean;
}

/**
 * 快照性能测试结果
 */
export interface SnapshotPerformanceResult {
  /** 快照创建时间 */
  creationTime: number;
  /** 快照读取时间 */
  readTime: number;
  /** 快照删除时间 */
  deleteTime: number;
  /** 快照列表时间 */
  listTime: number;
  /** 快照存储大小（字节） */
  storageSize: number;
  /** 快照数量 */
  snapshotCount: number;
}

/**
 * 控制台性能测试结果
 */
export interface ConsolePerformanceResult {
  /** 日志写入时间 */
  writeTime: number;
  /** 日志读取时间 */
  readTime: number;
  /** 日志清除时间 */
  clearTime: number;
  /** 日志过滤时间 */
  filterTime: number;
  /** 日志数量 */
  logCount: number;
  /** 存储大小（字节） */
  storageSize: number;
}

/**
 * 并发性能测试结果
 */
export interface ConcurrencyPerformanceResult {
  /** 并发操作数 */
  operationCount: number;
  /** 平均响应时间（毫秒） */
  averageResponseTime: number;
  /** 最大响应时间（毫秒） */
  maxResponseTime: number;
  /** 吞吐量（操作/秒） */
  throughput: number;
  /** 冲突次数 */
  conflictCount: number;
  /** 重试次数 */
  retryCount: number;
  /** 成功率（%） */
  successRate: number;
}

// ================================================================
// 边界条件测试类型
// ================================================================

/**
 * 边界测试配置
 */
export interface BoundaryTestConfig {
  /** 空文件测试 */
  testEmptyFile: boolean;
  /** 超大文件测试 */
  testLargeFile: boolean;
  /** 超大文件大小（字节） */
  largeFileSize: number;
  /** 特殊字符测试 */
  testSpecialChars: boolean;
  /** 并发冲突测试 */
  testConcurrencyConflicts: boolean;
  /** 并发冲突数 */
  conflictCount: number;
}

/**
 * 边界测试结果
 */
export interface BoundaryTestResult {
  /** 测试名称 */
  testName: string;
  /** 测试配置 */
  config: BoundaryTestConfig;
  /** 空文件测试结果 */
  emptyFileResult?: EmptyFileTestResult;
  /** 超大文件测试结果 */
  largeFileResult?: LargeFileTestResult;
  /** 特殊字符测试结果 */
  specialCharsResult?: SpecialCharsTestResult;
  /** 并发冲突测试结果 */
  conflictResult?: ConflictTestResult;
  /** 是否通过 */
  passed: boolean;
  /** 错误信息 */
  errors: string[];
  /** 警告信息 */
  warnings: string[];
}

/**
 * 空文件测试结果
 */
export interface EmptyFileTestResult {
  /** 文件创建成功 */
  created: boolean;
  /** 文件读取成功 */
  read: boolean;
  /** 文件保存成功 */
  saved: boolean;
  /** 文件删除成功 */
  deleted: boolean;
  /** 处理时间（毫秒） */
  processingTime: number;
}

/**
 * 超大文件测试结果
 */
export interface LargeFileTestResult {
  /** 文件大小（字节） */
  fileSize: number;
  /** 加载时间（毫秒） */
  loadTime: number;
  /** 解析时间（毫秒） */
  parseTime: number;
  /** 渲染时间（毫秒） */
  renderTime: number;
  /** 内存使用（MB） */
  memoryUsage: number;
  /** 是否超时 */
  timeout: boolean;
  /** 是否崩溃 */
  crashed: boolean;
}

/**
 * 特殊字符测试结果
 */
export interface SpecialCharsTestResult {
  /** 测试的字符集 */
  charSets: CharSetTestResult[];
  /** 总测试字符数 */
  totalChars: number;
  /** 成功处理字符数 */
  successfulChars: number;
  /** 失败字符数 */
  failedChars: number;
  /** 处理时间（毫秒） */
  processingTime: number;
}

/**
 * 字符集测试结果
 */
export interface CharSetTestResult {
  /** 字符集名称 */
  name: string;
  /** 字符范围 */
  range: string;
  /** 测试字符数 */
  count: number;
  /** 成功数 */
  successCount: number;
  /** 失败数 */
  failCount: number;
  /** 错误字符列表 */
  failedChars: string[];
}

/**
 * 并发冲突测试结果
 */
export interface ConflictTestResult {
  /** 冲突场景 */
  scenarios: ConflictScenario[];
  /** 总冲突数 */
  totalConflicts: number;
  /** 解决冲突数 */
  resolvedConflicts: number;
  /** 未解决冲突数 */
  unresolvedConflicts: number;
  /** 平均解决时间（毫秒） */
  averageResolutionTime: number;
}

/**
 * 冲突场景
 */
export interface ConflictScenario {
  /** 场景名称 */
  name: string;
  /** 冲突类型 */
  type: ConflictType;
  /** 是否发生冲突 */
  conflictOccurred: boolean;
  /** 是否成功解决 */
  resolved: boolean;
  /** 解决时间（毫秒） */
  resolutionTime?: number;
  /** 错误信息 */
  error?: string;
}

/**
 * 冲突类型
 */
export enum ConflictType {
  /** 文件编辑冲突 */
  FILE_EDIT = 'file_edit',
  /** 快照创建冲突 */
  SNAPSHOT_CREATE = 'snapshot_create',
  /** 设置更新冲突 */
  SETTINGS_UPDATE = 'settings_update',
  /** 控制台日志冲突 */
  CONSOLE_LOG = 'console_log',
  /** 资源访问冲突 */
  RESOURCE_ACCESS = 'resource_access',
}

// ================================================================
// 兼容性测试类型
// ================================================================

/**
 * 兼容性测试配置
 */
export interface CompatibilityTestConfig {
  /** 测试浏览器 */
  browsers: BrowserConfig[];
  /** 测试操作系统 */
  operatingSystems: OSConfig[];
  /** 测试分辨率 */
  resolutions: ResolutionConfig[];
  /** 测试DPI设置 */
  dpiSettings: DPIConfig[];
}

/**
 * 浏览器配置
 */
export interface BrowserConfig {
  /** 浏览器名称 */
  name: 'chrome' | 'edge' | 'firefox' | 'safari';
  /** 版本 */
  version: string;
  /** 是否无头模式 */
  headless: boolean;
}

/**
 * 操作系统配置
 */
export interface OSConfig {
  /** 操作系统名称 */
  name: 'windows' | 'macos' | 'linux';
  /** 版本 */
  version: string;
  /** 架构 */
  arch: 'x64' | 'arm64';
}

/**
 * 分辨率配置
 */
export interface ResolutionConfig {
  /** 宽度 */
  width: number;
  /** 高度 */
  height: number;
  /** 名称 */
  name: string;
}

/**
 * DPI配置
 */
export interface DPIConfig {
  /** 缩放比例 */
  scale: number;
  /** 名称 */
  name: string;
}

/**
 * 兼容性测试结果
 */
export interface CompatibilityTestResult {
  /** 测试名称 */
  testName: string;
  /** 测试配置 */
  config: CompatibilityTestConfig;
  /** 浏览器测试结果 */
  browserResults: BrowserTestResult[];
  /** 操作系统测试结果 */
  osResults: OSTestResult[];
  /** 分辨率测试结果 */
  resolutionResults: ResolutionTestResult[];
  /** DPI测试结果 */
  dpiResults: DPITestResult[];
  /** 是否通过 */
  passed: boolean;
  /** 错误信息 */
  errors: string[];
  /** 警告信息 */
  warnings: string[];
}

/**
 * 浏览器测试结果
 */
export interface BrowserTestResult {
  /** 浏览器配置 */
  browser: BrowserConfig;
  /** 功能测试结果 */
  features: FeatureTestResult[];
  /** 性能得分 */
  performanceScore: number;
  /** 兼容性得分 */
  compatibilityScore: number;
  /** 是否通过 */
  passed: boolean;
  /** 错误信息 */
  errors: string[];
}

/**
 * 操作系统测试结果
 */
export interface OSTestResult {
  /** 操作系统配置 */
  os: OSConfig;
  /** 功能测试结果 */
  features: FeatureTestResult[];
  /** 性能得分 */
  performanceScore: number;
  /** 兼容性得分 */
  compatibilityScore: number;
  /** 是否通过 */
  passed: boolean;
  /** 错误信息 */
  errors: string[];
}

/**
 * 分辨率测试结果
 */
export interface ResolutionTestResult {
  /** 分辨率配置 */
  resolution: ResolutionConfig;
  /** UI布局测试结果 */
  layoutTestPassed: boolean;
  /** 响应式测试结果 */
  responsiveTestPassed: boolean;
  /** 性能得分 */
  performanceScore: number;
  /** 是否通过 */
  passed: boolean;
  /** 错误信息 */
  errors: string[];
}

/**
 * DPI测试结果
 */
export interface DPITestResult {
  /** DPI配置 */
  dpi: DPIConfig;
  /** UI缩放测试结果 */
  scalingTestPassed: boolean;
  /** 字体渲染测试结果 */
  fontRenderingTestPassed: boolean;
  /** 图标清晰度测试结果 */
  iconClarityTestPassed: boolean;
  /** 是否通过 */
  passed: boolean;
  /** 错误信息 */
  errors: string[];
}

/**
 * 功能测试结果
 */
export interface FeatureTestResult {
  /** 功能名称 */
  featureName: string;
  /** 是否支持 */
  supported: boolean;
  /** 是否正常工作 */
  working: boolean;
  /** 性能影响 */
  performanceImpact: 'none' | 'minor' | 'moderate' | 'severe';
  /** 错误信息 */
  error?: string;
}

// ================================================================
// 测试报告类型
// ================================================================

/**
 * 测试报告
 */
export interface TestReport {
  /** 报告ID */
  id: string;
  /** 报告名称 */
  name: string;
  /** 生成时间 */
  generatedAt: number;
  /** 测试环境 */
  environment: TestEnvironment;
  /** 性能测试结果 */
  performanceResults: PerformanceTestResult[];
  /** 边界测试结果 */
  boundaryResults: BoundaryTestResult[];
  /** 兼容性测试结果 */
  compatibilityResults: CompatibilityTestResult[];
  /** 测试摘要 */
  summary: TestSummary;
  /** 问题列表 */
  issues: TestIssue[];
  /** 改进建议 */
  recommendations: TestRecommendation[];
}

/**
 * 测试环境
 */
export interface TestEnvironment {
  /** Node.js版本 */
  nodeVersion: string;
  /** 操作系统 */
  os: string;
  /** CPU核心数 */
  cpuCores: number;
  /** 总内存（GB） */
  totalMemory: number;
  /** 可用内存（GB） */
  availableMemory: number;
  /** 浏览器版本 */
  browserVersion?: string;
}

/**
 * 测试摘要
 */
export interface TestSummary {
  /** 总测试数 */
  totalTests: number;
  /** 通过测试数 */
  passedTests: number;
  /** 失败测试数 */
  failedTests: number;
  /** 跳过测试数 */
  skippedTests: number;
  /** 总断言数 */
  totalAssertions: number;
  /** 通过断言数 */
  passedAssertions: number;
  /** 失败断言数 */
  failedAssertions: number;
  /** 测试覆盖率（%） */
  coverage: number;
  /** 平均响应时间（毫秒） */
  averageResponseTime: number;
  /** 总测试时间（毫秒） */
  totalDuration: number;
}

/**
 * 测试问题
 */
export interface TestIssue {
  /** 问题ID */
  id: string;
  /** 问题标题 */
  title: string;
  /** 问题描述 */
  description: string;
  /** 严重程度 */
  severity: 'critical' | 'high' | 'medium' | 'low';
  /** 问题类型 */
  type: 'performance' | 'compatibility' | 'boundary' | 'functionality';
  /** 影响范围 */
  scope: string[];
  /** 复现步骤 */
  reproduction?: string[];
  /** 预期结果 */
  expected?: string;
  /** 实际结果 */
  actual?: string;
}

/**
 * 测试改进建议
 */
export interface TestRecommendation {
  /** 建议ID */
  id: string;
  /** 建议标题 */
  title: string;
  /** 建议描述 */
  description: string;
  /** 优先级 */
  priority: 'high' | 'medium' | 'low';
  /** 预期收益 */
  benefit: string;
  /** 实施难度 */
  difficulty: 'easy' | 'medium' | 'hard';
  /** 相关问题 */
  relatedIssues: string[];
}

// ================================================================
// 测试执行器类型
// ================================================================

/**
 * 测试执行器配置
 */
export interface TestExecutorConfig {
  /** 性能测试配置 */
  performance: PerformanceTestConfig;
  /** 边界测试配置 */
  boundary: BoundaryTestConfig;
  /** 兼容性测试配置 */
  compatibility: CompatibilityTestConfig;
  /** 是否并行执行 */
  parallel: boolean;
  /** 最大并发数 */
  maxConcurrency: number;
  /** 超时时间（毫秒） */
  timeout: number;
  /** 重试次数 */
  retryCount: number;
  /** 是否生成报告 */
  generateReport: boolean;
  /** 报告输出路径 */
  reportOutputPath?: string;
}

/**
 * 测试执行结果
 */
export interface TestExecutionResult {
  /** 执行开始时间 */
  startTime: number;
  /** 执行结束时间 */
  endTime: number;
  /** 总耗时（毫秒） */
  duration: number;
  /** 是否成功 */
  success: boolean;
  /** 测试报告 */
  report?: TestReport;
  /** 错误信息 */
  error?: string;
}
