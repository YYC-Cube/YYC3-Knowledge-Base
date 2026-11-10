/**
 * @file: IntentClassifier.ts
 * @description: 意图分类器 - 基于规则和模式的意图分类系统
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-03-31
 * @updated: 2026-03-31
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: intent,classifier,llm,pattern
 */

import {
  IntentType,
  IntentCategory,
  IntentPriority,
  IntentPattern,
  IntentCandidate,
  IntentFeature,
  IntentConfig,
  DEFAULT_INTENT_CONFIG,
} from './IntentTypes';

/**
 * 预定义的意图模式
 */
const INTENT_PATTERNS: IntentPattern[] = [
  // 创建意图
  {
    type: IntentType.CREATE,
    patterns: [
      /创建|新建|生成|写一个|实现|开发/i,
      /create|new|generate|implement|develop/i,
      /帮我写|帮我生成|帮我创建/i,
      /写一个\s*(函数|类|组件|模块|文件)/i,
    ],
    keywords: ['创建', '新建', '生成', '写', '实现', 'create', 'new', 'generate', 'write'],
    priority: IntentPriority.HIGH,
    category: IntentCategory.CODE_OPERATION,
    description: '创建新的代码、文件或功能',
  },

  // 修改意图
  {
    type: IntentType.MODIFY,
    patterns: [
      /修改|更改|更新|编辑|调整/i,
      /modify|change|update|edit|adjust/i,
      /把.*改成|将.*修改为/i,
      /修改\s*(函数|类|组件|代码)/i,
    ],
    keywords: ['修改', '更改', '更新', '编辑', 'modify', 'change', 'update', 'edit'],
    priority: IntentPriority.HIGH,
    category: IntentCategory.CODE_OPERATION,
    description: '修改现有的代码或功能',
  },

  // 优化意图
  {
    type: IntentType.OPTIMIZE,
    patterns: [
      /优化|改进|提升|加速|提高性能/i,
      /optimize|improve|enhance|speed up/i,
      /性能优化|代码优化/i,
      /让.*更快|让.*更高效/i,
    ],
    keywords: ['优化', '改进', '提升', '性能', 'optimize', 'improve', 'performance'],
    priority: IntentPriority.MEDIUM,
    category: IntentCategory.CODE_OPERATION,
    description: '优化代码性能或结构',
  },

  // 重构意图
  {
    type: IntentType.REFACTOR,
    patterns: [
      /重构|重写|重做|重新设计/i,
      /refactor|rewrite|redesign/i,
      /代码重构|结构重构/i,
      /改进\s*(架构|结构|设计)/i,
    ],
    keywords: ['重构', '重写', '重新', 'refactor', 'rewrite', 'restructure'],
    priority: IntentPriority.MEDIUM,
    category: IntentCategory.CODE_OPERATION,
    description: '重构代码结构或设计',
  },

  // 调试意图
  {
    type: IntentType.DEBUG,
    patterns: [
      /调试|修复|解决|bug|错误|异常|报错/i,
      /debug|fix|solve|error|bug|exception/i,
      /为什么.*错误|为什么.*失败/i,
      /运行.*出错|执行.*失败/i,
      /帮我找.*问题|帮我.*调试/i,
    ],
    keywords: ['调试', '修复', 'bug', '错误', '异常', 'debug', 'fix', 'error', 'bug'],
    priority: IntentPriority.HIGH,
    category: IntentCategory.DEVELOPMENT_FLOW,
    description: '调试代码问题或修复错误',
  },

  // 测试意图
  {
    type: IntentType.TEST,
    patterns: [
      /测试|test|单元测试|集成测试/i,
      /写.*测试|添加.*测试/i,
      /如何测试|怎么测试/i,
      /测试用例|测试代码/i,
    ],
    keywords: ['测试', 'test', '单元测试', '集成测试', 'unit test', 'integration test'],
    priority: IntentPriority.MEDIUM,
    category: IntentCategory.DEVELOPMENT_FLOW,
    description: '编写或运行测试',
  },

  // 部署意图
  {
    type: IntentType.DEPLOY,
    patterns: [
      /部署|发布|上线|deploy|release/i,
      /如何部署|怎么部署/i,
      /部署.*到|发布.*到/i,
    ],
    keywords: ['部署', '发布', '上线', 'deploy', 'release', 'publish'],
    priority: IntentPriority.MEDIUM,
    category: IntentCategory.DEVELOPMENT_FLOW,
    description: '部署或发布相关',
  },

  // 查询意图
  {
    type: IntentType.QUERY,
    patterns: [
      /查询|搜索|查找|找到|获取/i,
      /query|search|find|get|retrieve/i,
      /什么是|怎么用|如何使用/i,
      /有没有|是否存在/i,
    ],
    keywords: ['查询', '搜索', '查找', '什么是', '怎么用', 'query', 'search', 'find'],
    priority: IntentPriority.LOW,
    category: IntentCategory.INFORMATION,
    description: '查询信息或知识',
  },

  // 分析意图
  {
    type: IntentType.ANALYZE,
    patterns: [
      /分析|评估|检查|诊断|审查/i,
      /analyze|evaluate|assess|examine|review/i,
      /帮我分析|帮我评估/i,
      /代码分析|性能分析/i,
    ],
    keywords: ['分析', '评估', '检查', 'analyze', 'evaluate', 'assess', 'review'],
    priority: IntentPriority.MEDIUM,
    category: IntentCategory.INFORMATION,
    description: '分析代码或数据',
  },

  // 文档意图
  {
    type: IntentType.DOCUMENT,
    patterns: [
      /文档|注释|说明|document|comment/i,
      /写.*文档|生成.*文档|添加.*文档/i,
      /添加注释|写注释/i,
      /API文档|接口文档|代码文档/i,
      /生成.*文档/i,  // 强调"生成文档"
    ],
    keywords: ['文档', '注释', '说明', 'document', 'comment', 'documentation'],
    priority: IntentPriority.HIGH,  // 提高优先级
    category: IntentCategory.INFORMATION,
    description: '生成文档或注释',
  },

  // 解释意图
  {
    type: IntentType.EXPLAIN,
    patterns: [
      /解释|说明|讲解|阐述/i,
      /explain|describe|illustrate/i,
      /是什么意思|什么作用/i,
      /帮我理解|能不能解释/i,
    ],
    keywords: ['解释', '说明', '是什么', 'explain', 'describe', 'what is'],
    priority: IntentPriority.LOW,
    category: IntentCategory.INFORMATION,
    description: '解释代码或概念',
  },

  // 转换意图
  {
    type: IntentType.CONVERT,
    patterns: [
      /转换|转化|翻译|convert|transform|translate/i,
      /从.*转换为|将.*转为/i,
      /TypeScript.*JavaScript|JS.*TS/i,
    ],
    keywords: ['转换', '转化', '翻译', 'convert', 'transform', 'translate'],
    priority: IntentPriority.MEDIUM,
    category: IntentCategory.OTHER,
    description: '转换格式或语言',
  },

  // 审查意图
  {
    type: IntentType.REVIEW,
    patterns: [
      /审查|审核|检查|review|audit/i,
      /代码审查|code review/i,
      /帮我.*审查|检查.*代码/i,
    ],
    keywords: ['审查', '审核', '检查', 'review', 'audit', 'check'],
    priority: IntentPriority.MEDIUM,
    category: IntentCategory.OTHER,
    description: '代码审查或检查',
  },
];

/**
 * 意图分类器
 */
export class IntentClassifier {
  private config: IntentConfig;
  private patterns: IntentPattern[];
  private statistics: Map<IntentType, number> = new Map();

  constructor(config: Partial<IntentConfig> = {}) {
    this.config = { ...DEFAULT_INTENT_CONFIG, ...config };
    this.patterns = [...INTENT_PATTERNS];
  }

  /**
   * 分类意图
   */
  classify(input: string): IntentCandidate[] {
    const startTime = Date.now();
    const candidates: IntentCandidate[] = [];

    // 遍历所有模式
    for (const pattern of this.patterns) {
      const score = this.calculatePatternScore(input, pattern);

      if (score > 0) {
        const features = this.extractFeatures(input, pattern);
        const confidence = this.calculateConfidence(score, pattern);

        candidates.push({
          type: pattern.type,
          confidence,
          features,
          reason: this.generateReason(pattern, score),
          metadata: {
            pattern: pattern.description,
            score,
            priority: pattern.priority,
            category: pattern.category,
          },
        });
      }
    }

    // 按置信度排序
    candidates.sort((a, b) => b.confidence - a.confidence);

    // 限制候选数量
    const limitedCandidates = candidates.slice(0, this.config.maxCandidates);

    // 更新统计
    if (limitedCandidates.length > 0) {
      const topIntent = limitedCandidates[0].type;
      this.statistics.set(topIntent, (this.statistics.get(topIntent) || 0) + 1);
    }

    return limitedCandidates;
  }

  /**
   * 计算模式匹配分数
   */
  private calculatePatternScore(input: string, pattern: IntentPattern): number {
    let score = 0;

    // 模式匹配
    for (const regex of pattern.patterns) {
      if (regex.test(input)) {
        score += 2; // 模式匹配权重更高
      }
    }

    // 关键词匹配
    const lowerInput = input.toLowerCase();
    for (const keyword of pattern.keywords) {
      if (lowerInput.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }

    // 根据优先级调整分数
    if (pattern.priority === IntentPriority.HIGH) {
      score *= 1.2;
    } else if (pattern.priority === IntentPriority.LOW) {
      score *= 0.8;
    }

    return score;
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(score: number, pattern: IntentPattern): number {
    // 基础置信度计算
    let confidence = Math.min(score / 10, 1); // 归一化到0-1

    // 根据优先级调整
    if (pattern.priority === IntentPriority.HIGH) {
      confidence = Math.min(confidence * 1.1, 1);
    } else if (pattern.priority === IntentPriority.LOW) {
      confidence *= 0.9;
    }

    // 确保在0-1范围内
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * 提取意图特征
   */
  private extractFeatures(input: string, pattern: IntentPattern): IntentFeature {
    const keywords: string[] = [];
    const context: string[] = [];
    const codeSnippets: string[] = [];
    const parameters = new Map<string, any>();

    // 提取关键词
    const lowerInput = input.toLowerCase();
    for (const keyword of pattern.keywords) {
      if (lowerInput.includes(keyword.toLowerCase())) {
        keywords.push(keyword);
      }
    }

    // 提取代码片段（简单实现）
    const codePattern = /`([^`]+)`|```[\s\S]*?```/g;
    let match;
    while ((match = codePattern.exec(input)) !== null) {
      if (match[1]) {
        codeSnippets.push(match[1]);
      }
    }

    // 提取上下文（简单实现）
    const words = input.split(/\s+/);
    context.push(...words.slice(0, 5)); // 前5个词作为上下文

    return {
      keywords,
      context,
      codeSnippets,
      parameters,
      entities: [], // 实体提取在FeatureExtractor中实现
    };
  }

  /**
   * 生成判断理由
   */
  private generateReason(pattern: IntentPattern, score: number): string {
    const matchedPatterns = pattern.patterns.filter(regex =>
      regex.toString().includes(pattern.type)
    ).length;

    return `匹配到${pattern.keywords.length}个关键词和${matchedPatterns}个模式，得分${score.toFixed(2)}`;
  }

  /**
   * 添加自定义模式
   */
  addPattern(pattern: IntentPattern): void {
    this.patterns.push(pattern);
  }

  /**
   * 移除模式
   */
  removePattern(type: IntentType): void {
    this.patterns = this.patterns.filter(p => p.type !== type);
  }

  /**
   * 获取所有模式
   */
  getPatterns(): IntentPattern[] {
    return [...this.patterns];
  }

  /**
   * 获取配置
   */
  getConfig(): IntentConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<IntentConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取统计信息
   */
  getStatistics(): Map<IntentType, number> {
    return new Map(this.statistics);
  }

  /**
   * 重置统计信息
   */
  resetStatistics(): void {
    this.statistics.clear();
  }
}

/**
 * 单例实例
 */
let instance: IntentClassifier | null = null;

/**
 * 获取单例实例
 */
export function getIntentClassifier(config?: Partial<IntentConfig>): IntentClassifier {
  if (!instance) {
    instance = new IntentClassifier(config);
  }
  return instance;
}
