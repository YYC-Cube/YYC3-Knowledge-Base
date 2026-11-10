// @ts-nocheck
/**
 * @file: IntentConfidenceCalculator.ts
 * @description: 意图置信度计算器 - 计算意图置信度、检测冲突、提供建议
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: intent,confidence,calculator,llm
 */

import {
  IntentType,
  IntentCandidate,
  IntentConflict,
  IntentSuggestion,
  IntentPriority,
  ConflictSeverity,
  _IntentCategory,
} from './IntentTypes';

/**
 * 意图冲突规则
 */
const CONFLICT_RULES: Array<{
  intents: IntentType[];
  severity: ConflictSeverity;
  description: string;
  suggestion: string;
}> = [
  {
    intents: [IntentType.CREATE, IntentType.MODIFY],
    severity: ConflictSeverity.MEDIUM,
    description: '创建和修改意图冲突：需要区分是创建新代码还是修改现有代码',
    suggestion: '询问用户是创建新文件还是修改现有文件',
  },
  {
    intents: [IntentType.OPTIMIZE, IntentType.REFACTOR],
    severity: ConflictSeverity.LOW,
    description: '优化和重构意图相似：两者都涉及代码改进',
    suggestion: '可以合并为代码改进意图',
  },
  {
    intents: [IntentType.DEBUG, IntentType.TEST],
    severity: ConflictSeverity.LOW,
    description: '调试和测试意图相关：可能需要先编写测试来调试',
    suggestion: '建议先编写测试用例，然后进行调试',
  },
  {
    intents: [IntentType.CREATE, IntentType.DELETE],
    severity: ConflictSeverity.HIGH,
    description: '创建和删除意图冲突：操作方向相反',
    suggestion: '需要明确用户的具体需求',
  },
];

/**
 * 意图建议库
 */
const INTENT_SUGGESTIONS: IntentSuggestion[] = [
  {
    type: IntentType.CREATE,
    description: '创建新的代码、文件或功能',
    example: '帮我创建一个用户登录组件',
    priority: IntentPriority.HIGH,
  },
  {
    type: IntentType.MODIFY,
    description: '修改现有的代码或功能',
    example: '修改这个函数的返回值类型',
    priority: IntentPriority.HIGH,
  },
  {
    type: IntentType.DEBUG,
    description: '调试代码问题或修复错误',
    example: '帮我调试这个错误：TypeError',
    priority: IntentPriority.HIGH,
  },
  {
    type: IntentType.OPTIMIZE,
    description: '优化代码性能或结构',
    example: '优化这个函数的性能',
    priority: IntentPriority.MEDIUM,
  },
  {
    type: IntentType.REFACTOR,
    description: '重构代码结构或设计',
    example: '重构这个类的设计模式',
    priority: IntentPriority.MEDIUM,
  },
  {
    type: IntentType.TEST,
    description: '编写或运行测试',
    example: '为这个函数编写单元测试',
    priority: IntentPriority.MEDIUM,
  },
  {
    type: IntentType.ANALYZE,
    description: '分析代码或数据',
    example: '分析这个项目的代码质量',
    priority: IntentPriority.MEDIUM,
  },
  {
    type: IntentType.DOCUMENT,
    description: '生成文档或注释',
    example: '为这个API生成文档',
    priority: IntentPriority.LOW,
  },
];

/**
 * 意图置信度计算器
 */
export class IntentConfidenceCalculator {
  /**
   * 计算所有候选的置信度
   */
  calculateConfidence(candidates: IntentCandidate[]): IntentCandidate[] {
    if (candidates.length === 0) return [];

    // 归一化置信度
    const totalConfidence = candidates.reduce((sum, c) => sum + c.confidence, 0);

    if (totalConfidence > 0) {
      candidates.forEach(c => {
        c.confidence = c.confidence / totalConfidence;
      });
    }

    // 应用softmax归一化
    const expValues = candidates.map(c => Math.exp(c.confidence));
    const sumExp = expValues.reduce((sum, val) => sum + val, 0);

    candidates.forEach((c, i) => {
      c.confidence = expValues[i] / sumExp;
    });

    // 按置信度排序
    return candidates.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 检测意图冲突
   */
  detectConflicts(candidates: IntentCandidate[]): IntentConflict[] {
    const conflicts: IntentConflict[] = [];
    const intentTypes = candidates.map(c => c.type);

    for (const rule of CONFLICT_RULES) {
      // 检查是否所有冲突意图都存在
      const hasAllIntents = rule.intents.every(intent =>
        intentTypes.includes(intent)
      );

      if (hasAllIntents) {
        conflicts.push({
          intents: rule.intents,
          severity: rule.severity,
          description: rule.description,
          suggestion: rule.suggestion,
        });
      }
    }

    return conflicts;
  }

  /**
   * 获取意图建议
   */
  getSuggestions(context?: Partial<{
    currentFile: string;
    projectType: string;
    recentIntents: IntentType[];
  }>): IntentSuggestion[] {
    const suggestions = [...INTENT_SUGGESTIONS];

    // 根据上下文调整建议
    if (context?.recentIntents) {
      // 将最近使用的意图放在前面
      suggestions.sort((a, b) => {
        const aRecent = (context.recentIntents as any).includes(a.type) ? 1 : 0;
        const bRecent = (context.recentIntents as any).includes(b.type) ? 1 : 0;
        return bRecent - aRecent;
      });
    }

    return suggestions;
  }

  /**
   * 获取特定类型的建议
   */
  getSuggestionByType(type: IntentType): IntentSuggestion | undefined {
    return INTENT_SUGGESTIONS.find(s => s.type === type);
  }

  /**
   * 计算多意图场景的综合置信度
   */
  calculateMultiIntentConfidence(candidates: IntentCandidate[]): {
    primary: IntentCandidate;
    secondary: IntentCandidate[];
    combined: number;
  } {
    if (candidates.length === 0) {
      throw new Error('No candidates provided');
    }

    const sorted = this.calculateConfidence(candidates);
    const primary = sorted[0];
    const secondary = sorted.slice(1);

    // 计算综合置信度
    let combined = primary.confidence;

    // 如果有多个意图，考虑次要意图的影响
    if (secondary.length > 0) {
      const secondaryWeight = 0.3;
      const secondaryAvg = secondary.reduce((sum, c) => sum + c.confidence, 0) / secondary.length;
      combined = primary.confidence * (1 - secondaryWeight) + secondaryAvg * secondaryWeight;
    }

    return {
      primary,
      secondary,
      combined,
    };
  }

  /**
   * 判断是否为多意图场景
   */
  isMultiIntentScenario(candidates: IntentCandidate[], threshold: number = 0.2): boolean {
    if (candidates.length < 2) return false;

    const sorted = this.calculateConfidence(candidates);

    // 如果次要意图的置信度与主要意图差距小于阈值，认为是多意图场景
    const primaryConfidence = sorted[0].confidence;
    const secondaryConfidence = sorted[1].confidence;

    return (primaryConfidence - secondaryConfidence) < threshold;
  }

  /**
   * 获取意图解释
   */
  getIntentExplanation(candidate: IntentCandidate): string {
    const { type, confidence, features, reason } = candidate;

    const explanations: string[] = [];

    explanations.push(`意图类型: ${type}`);
    explanations.push(`置信度: ${(confidence * 100).toFixed(1)}%`);
    explanations.push(`判断理由: ${reason}`);

    if (features.keywords.length > 0) {
      explanations.push(`关键词: ${features.keywords.join(', ')}`);
    }

    if (features.entities.length > 0) {
      const entityTypes = [...new Set(features.entities.map(e => e.type))];
      explanations.push(`识别实体: ${entityTypes.join(', ')}`);
    }

    return explanations.join('\n');
  }

  /**
   * 生成意图报告
   */
  generateReport(candidates: IntentCandidate[]): string {
    if (candidates.length === 0) {
      return '未识别到明确意图';
    }

    const sorted = this.calculateConfidence(candidates);
    const conflicts = this.detectConflicts(sorted);

    const report: string[] = [];
    report.push('=== 意图识别报告 ===\n');

    // 主要意图
    report.push(`主要意图: ${sorted[0].type} (${(sorted[0].confidence * 100).toFixed(1)}%)`);

    // 次要意图
    if (sorted.length > 1) {
      report.push('\n次要意图:');
      sorted.slice(1, 4).forEach((c, i) => {
        report.push(`  ${i + 1}. ${c.type} (${(c.confidence * 100).toFixed(1)}%)`);
      });
    }

    // 冲突检测
    if (conflicts.length > 0) {
      report.push('\n检测到意图冲突:');
      conflicts.forEach((conflict, i) => {
        report.push(`  ${i + 1}. ${conflict.intents.join(' vs ')}: ${conflict.description}`);
        report.push(`     建议: ${conflict.suggestion}`);
      });
    }

    // 详细信息
    report.push('\n详细信息:');
    sorted.slice(0, 3).forEach((c, i) => {
      report.push(`\n${i + 1}. ${this.getIntentExplanation(c)}`);
    });

    return report.join('\n');
  }

  /**
   * 评估意图质量
   */
  assessIntentQuality(candidates: IntentCandidate[]): {
    score: number;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // 检查置信度
    if (candidates.length === 0) {
      issues.push('未识别到任何意图');
      suggestions.push('请提供更明确的指令');
      score = 0;
    } else {
      const primary = candidates[0];

      // 主要意图置信度过低
      if (primary.confidence < 0.5) {
        issues.push('主要意图置信度过低');
        suggestions.push('考虑提供更具体的描述');
        score -= 20;
      }

      // 检查冲突
      const conflicts = this.detectConflicts(candidates);
      if (conflicts.length > 0) {
        const highSeverityConflicts = conflicts.filter(c => c.severity === ConflictSeverity.HIGH);
        if (highSeverityConflicts.length > 0) {
          issues.push('存在高严重性意图冲突');
          suggestions.push('需要明确用户意图');
          score -= 30;
        }
      }

      // 检查多意图场景
      if (this.isMultiIntentScenario(candidates)) {
        issues.push('检测到多意图场景');
        suggestions.push('考虑分步骤处理多个意图');
        score -= 10;
      }
    }

    score = Math.max(0, score);

    return {
      score,
      issues,
      suggestions,
    };
  }
}

/**
 * 单例实例
 */
let instance: IntentConfidenceCalculator | null = null;

/**
 * 获取单例实例
 */
export function getIntentConfidenceCalculator(): IntentConfidenceCalculator {
  if (!instance) {
    instance = new IntentConfidenceCalculator();
  }
  return instance;
}
