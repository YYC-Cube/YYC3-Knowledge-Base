/**
 * @file: llm/PerformanceReporter.ts
 * @description: 性能报告生成 - 生成报告、识别瓶颈、提供建议、导出报告
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: performance,report,analysis
 */

import {
  PerformanceReport,
  PerformanceMetric,
  PerformanceBottleneck,
  OptimizationSuggestion,
  PerformanceLevel,
  MetricType,
  PerformanceStats,
} from './PerformanceTypes';
import { PerformanceOptimizer } from './PerformanceOptimizer';

/**
 * 性能报告生成器
 */
export class PerformanceReporter {
  private optimizer: PerformanceOptimizer;

  constructor() {
    this.optimizer = new PerformanceOptimizer();
  }

  /**
   * 生成性能报告
   */
  generateReport(metrics: PerformanceMetric[], duration: number = 60000): PerformanceReport {
    // 识别性能瓶颈
    const bottlenecks = this.identifyBottlenecks(metrics);

    // 生成优化建议
    const suggestions = this.optimizer.analyzeBottlenecks(bottlenecks);

    // 计算总体性能
    const summary = this.calculateSummary(metrics, bottlenecks);

    return {
      id: this.generateId(),
      timestamp: Date.now(),
      duration,
      metrics,
      bottlenecks,
      suggestions,
      summary,
    };
  }

  /**
   * 识别性能瓶颈
   */
  identifyBottlenecks(metrics: PerformanceMetric[]): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = [];
    const grouped = this.groupMetricsByType(metrics);

    for (const [type, typeMetrics] of grouped) {
      const poorMetrics = typeMetrics.filter(m =>
        m.level === PerformanceLevel.POOR || m.level === PerformanceLevel.CRITICAL
      );

      if (poorMetrics.length > 0) {
        const bottleneck = this.createBottleneck(type, poorMetrics);
        bottlenecks.push(bottleneck);
      }
    }

    return bottlenecks;
  }

  /**
   * 创建性能瓶颈
   */
  private createBottleneck(type: MetricType, metrics: PerformanceMetric[]): PerformanceBottleneck {
    const avgValue = this.average(metrics.map(m => m.value));
    const threshold = metrics[0].threshold;

    const descriptions: Record<MetricType, string> = {
      [MetricType.RENDER]: `渲染性能较差，平均渲染时间 ${avgValue.toFixed(2)}ms，超过阈值 ${threshold}ms`,
      [MetricType.MEMORY]: `内存使用过高，平均使用率 ${avgValue.toFixed(2)}%，超过阈值 ${threshold}%`,
      [MetricType.CPU]: `CPU使用过高，平均使用率 ${avgValue.toFixed(2)}%，超过阈值 ${threshold}%`,
      [MetricType.NETWORK]: `网络响应缓慢，平均响应时间 ${avgValue.toFixed(2)}ms，超过阈值 ${threshold}ms`,
      [MetricType.INTERACTION]: `交互响应缓慢，平均响应时间 ${avgValue.toFixed(2)}ms`,
      [MetricType.BUNDLE]: `包体积过大，大小 ${avgValue.toFixed(2)}KB`,
      [MetricType.CACHE]: `缓存命中率低，命中率 ${avgValue.toFixed(2)}%`,
    };

    const suggestions: Record<MetricType, string[]> = {
      [MetricType.RENDER]: [
        '使用React.memo避免不必要的重渲染',
        '实现虚拟滚动优化长列表',
        '减少DOM操作和样式计算',
      ],
      [MetricType.MEMORY]: [
        '及时清理不需要的引用',
        '使用WeakMap避免内存泄漏',
        '优化数据结构，减少内存占用',
      ],
      [MetricType.CPU]: [
        '使用Web Worker处理CPU密集型任务',
        '优化算法复杂度',
        '使用防抖和节流减少计算频率',
      ],
      [MetricType.NETWORK]: [
        '实现请求缓存',
        '使用CDN加速资源加载',
        '启用HTTP/2和Gzip压缩',
      ],
      [MetricType.INTERACTION]: [
        '优化事件处理函数',
        '使用requestAnimationFrame优化动画',
        '避免长任务阻塞主线程',
      ],
      [MetricType.BUNDLE]: [
        '实现代码分割',
        '使用Tree Shaking删除无用代码',
        '压缩和混淆代码',
      ],
      [MetricType.CACHE]: [
        '优化缓存策略',
        '增加缓存时间',
        '预加载常用资源',
      ],
    };

    const impact = this.calculateImpact(avgValue, threshold);

    return {
      id: this.generateId(),
      type,
      description: descriptions[type],
      impact,
      suggestions: suggestions[type],
      metrics,
      detectedAt: Date.now(),
    };
  }

  /**
   * 计算总体性能摘要
   */
  private calculateSummary(
    metrics: PerformanceMetric[],
    bottlenecks: PerformanceBottleneck[]
  ): PerformanceReport['summary'] {
    // 计算性能评分
    const score = this.calculateScore(metrics);

    // 确定总体级别
    const overallLevel = this.determineOverallLevel(score);

    // 收集改进点
    const improvements = this.collectImprovements(metrics);

    // 收集警告
    const warnings = this.collectWarnings(bottlenecks);

    return {
      overallLevel,
      score,
      improvements,
      warnings,
    };
  }

  /**
   * 计算性能评分
   */
  private calculateScore(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 100;

    const weights: Record<PerformanceLevel, number> = {
      [PerformanceLevel.EXCELLENT]: 100,
      [PerformanceLevel.GOOD]: 80,
      [PerformanceLevel.FAIR]: 60,
      [PerformanceLevel.POOR]: 40,
      [PerformanceLevel.CRITICAL]: 20,
    };

    const totalScore = metrics.reduce((sum, m) => sum + weights[m.level], 0);
    return Math.round(totalScore / metrics.length);
  }

  /**
   * 确定总体性能级别
   */
  private determineOverallLevel(score: number): PerformanceLevel {
    if (score >= 90) return PerformanceLevel.EXCELLENT;
    if (score >= 75) return PerformanceLevel.GOOD;
    if (score >= 60) return PerformanceLevel.FAIR;
    if (score >= 40) return PerformanceLevel.POOR;
    return PerformanceLevel.CRITICAL;
  }

  /**
   * 收集改进点
   */
  private collectImprovements(metrics: PerformanceMetric[]): string[] {
    const improvements: string[] = [];
    const grouped = this.groupMetricsByType(metrics);

    for (const [type, typeMetrics] of grouped) {
      const excellentCount = typeMetrics.filter(m => m.level === PerformanceLevel.EXCELLENT).length;
      const ratio = excellentCount / typeMetrics.length;

      if (ratio > 0.5) {
        improvements.push(`${this.getTypeName(type)}表现优秀，继续保持`);
      }
    }

    return improvements;
  }

  /**
   * 收集警告
   */
  private collectWarnings(bottlenecks: PerformanceBottleneck[]): string[] {
    return bottlenecks.map(b => `${this.getTypeName(b.type)}: ${b.description}`);
  }

  /**
   * 计算影响级别
   */
  private calculateImpact(value: number, threshold: number): 'high' | 'medium' | 'low' {
    const ratio = value / threshold;

    if (ratio > 2) return 'high';
    if (ratio > 1.5) return 'medium';
    return 'low';
  }

  /**
   * 按类型分组指标
   */
  private groupMetricsByType(metrics: PerformanceMetric[]): Map<MetricType, PerformanceMetric[]> {
    const grouped = new Map<MetricType, PerformanceMetric[]>();

    for (const metric of metrics) {
      if (!grouped.has(metric.type)) {
        grouped.set(metric.type, []);
      }
      grouped.get(metric.type)!.push(metric);
    }

    return grouped;
  }

  /**
   * 获取类型名称
   */
  private getTypeName(type: MetricType): string {
    const names: Record<MetricType, string> = {
      [MetricType.RENDER]: '渲染性能',
      [MetricType.MEMORY]: '内存使用',
      [MetricType.CPU]: 'CPU使用',
      [MetricType.NETWORK]: '网络请求',
      [MetricType.INTERACTION]: '交互响应',
      [MetricType.BUNDLE]: '包大小',
      [MetricType.CACHE]: '缓存',
    };
    return names[type];
  }

  /**
   * 导出报告为JSON
   */
  exportAsJSON(report: PerformanceReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * 导出报告为Markdown
   */
  exportAsMarkdown(report: PerformanceReport): string {
    const lines: string[] = [
      `# 性能报告`,
      ``,
      `**生成时间**: ${new Date(report.timestamp).toLocaleString()}`,
      `**监控时长**: ${(report.duration / 1000).toFixed(2)}秒`,
      `**总体评分**: ${report.summary.score}/100`,
      `**性能级别**: ${this.getLevelName(report.summary.overallLevel)}`,
      ``,
      `## 📊 性能指标`,
      ``,
    ];

    // 按类型分组
    const grouped = this.groupMetricsByType(report.metrics);
    for (const [type, metrics] of grouped) {
      lines.push(`### ${this.getTypeName(type)}`);
      lines.push(``);
      lines.push(`| 指标 | 值 | 级别 |`);
      lines.push(`|------|----|----|`);

      for (const metric of metrics) {
        lines.push(`| ${metric.name} | ${metric.value.toFixed(2)}${metric.unit} | ${this.getLevelName(metric.level)} |`);
      }
      lines.push(``);
    }

    // 瓶颈分析
    if (report.bottlenecks.length > 0) {
      lines.push(`## ⚠️ 性能瓶颈`);
      lines.push(``);

      for (const bottleneck of report.bottlenecks) {
        lines.push(`### ${this.getTypeName(bottleneck.type)}`);
        lines.push(``);
        lines.push(`**描述**: ${bottleneck.description}`);
        lines.push(``);
        lines.push(`**影响级别**: ${bottleneck.impact}`);
        lines.push(``);
        lines.push(`**优化建议**:`);
        for (const suggestion of bottleneck.suggestions) {
          lines.push(`- ${suggestion}`);
        }
        lines.push(``);
      }
    }

    // 优化建议
    if (report.suggestions.length > 0) {
      lines.push(`## 💡 优化建议`);
      lines.push(``);

      for (const suggestion of report.suggestions) {
        lines.push(`### ${suggestion.title}`);
        lines.push(``);
        lines.push(`**描述**: ${suggestion.description}`);
        lines.push(``);
        lines.push(`**影响**: ${suggestion.impact} | **难度**: ${suggestion.effort}`);
        lines.push(``);
      }
    }

    // 摘要
    lines.push(`## 📝 摘要`);
    lines.push(``);

    if (report.summary.improvements.length > 0) {
      lines.push(`**改进点**:`);
      for (const improvement of report.summary.improvements) {
        lines.push(`- ${improvement}`);
      }
      lines.push(``);
    }

    if (report.summary.warnings.length > 0) {
      lines.push(`**警告**:`);
      for (const warning of report.summary.warnings) {
        lines.push(`- ${warning}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * 获取级别名称
   */
  private getLevelName(level: PerformanceLevel): string {
    const names: Record<PerformanceLevel, string> = {
      [PerformanceLevel.EXCELLENT]: '优秀',
      [PerformanceLevel.GOOD]: '良好',
      [PerformanceLevel.FAIR]: '一般',
      [PerformanceLevel.POOR]: '较差',
      [PerformanceLevel.CRITICAL]: '严重',
    };
    return names[level];
  }

  /**
   * 计算平均值
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * 生成ID
   */
  private generateId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
