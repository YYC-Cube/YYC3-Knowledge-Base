/**
 * @file: UserFeedbackTypes.ts
 * @description: UserFeedbackTypes — feedback 模块
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-01
 * @updated: 2026-04-01
 * @status: stable
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: module,typescript,feedback
 */

/**
 * 用户反馈收集系统 - 类型定义
 *
 * 提供完整的用户反馈收集、分析和管理功能
 *
 * @module UserFeedbackTypes
 * @version: 1.0.0
 * @author: YYC3-Family-AI Team
 */

// ============================================
// 用户调研相关类型
// ============================================

/**
 * 调研类型
 */
export type SurveyType =
  | 'satisfaction' // 满意度调研
  | 'feature_feedback' // 功能反馈
  | 'bug_report' // Bug报告
  | 'improvement' // 改进建议
  | 'user_experience' // 用户体验调研
  | 'nps' // 净推荐值
  | 'csat'; // 客户满意度

/**
 * 问题类型
 */
export type QuestionType =
  | 'single_choice' // 单选题
  | 'multiple_choice' // 多选题
  | 'rating' // 评分题
  | 'text' // 文本题
  | 'nps' // NPS评分
  | 'likert'; // 李克特量表

/**
 * 调研问题
 */
export interface SurveyQuestion {
  /** 问题ID */
  id: string;
  /** 问题标题 */
  title: string;
  /** 问题描述 */
  description?: string;
  /** 问题类型 */
  type: QuestionType;
  /** 是否必答 */
  required: boolean;
  /** 选项列表（单选/多选题） */
  options?: string[];
  /** 评分范围（评分题） */
  ratingScale?: {
    min: number;
    max: number;
    minLabel?: string;
    maxLabel?: string;
  };
  /** 李克特量表标签 */
  likertLabels?: [string, string, string, string, string];
  /** 条件显示 */
  condition?: {
    questionId: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
  };
}

/**
 * 调研问卷
 */
export interface Survey {
  /** 调研ID */
  id: string;
  /** 调研标题 */
  title: string;
  /** 调研描述 */
  description: string;
  /** 调研类型 */
  type: SurveyType;
  /** 问题列表 */
  questions: SurveyQuestion[];
  /** 创建时间 */
  createdAt: Date;
  /** 过期时间 */
  expiresAt?: Date;
  /** 是否激活 */
  isActive: boolean;
  /** 目标用户群 */
  targetAudience?: {
    userTypes?: ('developer' | 'designer' | 'tester' | 'manager')[];
    experience?: ('beginner' | 'intermediate' | 'advanced')[];
    usageFrequency?: ('daily' | 'weekly' | 'monthly')[];
  };
  /** 奖励设置 */
  rewards?: {
    type: 'points' | 'badge' | 'gift';
    value: number;
    description: string;
  };
}

// ============================================
// 反馈收集相关类型
// ============================================

/**
 * 反馈类型
 */
export type FeedbackType =
  | 'bug' // Bug反馈
  | 'feature_request' // 功能请求
  | 'improvement' // 改进建议
  | 'compliment' // 表扬
  | 'complaint' // 投诉
  | 'question'; // 问题咨询

/**
 * 反馈优先级
 */
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * 反馈状态
 */
export type FeedbackStatus =
  | 'new' // 新建
  | 'acknowledged' // 已确认
  | 'in_progress' // 处理中
  | 'resolved' // 已解决
  | 'closed' // 已关闭
  | 'wont_fix'; // 不予修复

/**
 * 反馈来源
 */
export type FeedbackSource =
  | 'in_app' // 应用内
  | 'email' // 邮件
  | 'github' // GitHub
  | 'survey' // 调研
  | 'interview' // 访谈
  | 'social_media'; // 社交媒体

/**
 * 用户反馈
 */
export interface UserFeedback {
  /** 反馈ID */
  id: string;
  /** 用户ID */
  userId: string;
  /** 用户信息 */
  user: {
    name?: string;
    email?: string;
    role?: string;
    experience?: 'beginner' | 'intermediate' | 'advanced';
  };
  /** 反馈类型 */
  type: FeedbackType;
  /** 反馈标题 */
  title: string;
  /** 反馈内容 */
  content: string;
  /** 优先级 */
  priority: FeedbackPriority;
  /** 状态 */
  status: FeedbackStatus;
  /** 来源 */
  source: FeedbackSource;
  /** 关联功能模块 */
  module?: string;
  /** 标签 */
  tags: string[];
  /** 附件 */
  attachments?: {
    type: 'screenshot' | 'log' | 'video' | 'file';
    url: string;
    name: string;
  }[];
  /** 环境信息 */
  environment?: {
    browser?: string;
    os?: string;
    version?: string;
    device?: string;
    screenSize?: string;
  };
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 处理人 */
  assignee?: string;
  /** 处理记录 */
  resolution?: {
    comment: string;
    resolvedAt: Date;
    resolvedBy: string;
  };
  /** 投票数 */
  votes?: number;
  /** 用户满意度评分 */
  satisfactionScore?: number;
}

/**
 * 调研回答
 */
export interface SurveyResponse {
  /** 回答ID */
  id: string;
  /** 调研ID */
  surveyId: string;
  /** 用户ID */
  userId: string;
  /** 回答内容 */
  answers: {
    questionId: string;
    value: string | number | string[];
    timestamp: Date;
  }[];
  /** 完成时间 */
  completedAt: Date;
  /** 耗时（秒） */
  duration: number;
  /** 设备信息 */
  device?: {
    browser: string;
    os: string;
    screenSize: string;
  };
  /** 用户满意度评分 */
  npsScore?: number;
  /** csat分数 */
  csatScore?: number;
}

// ============================================
// 反馈分析相关类型
// ============================================

/**
 * 分析维度
 */
export type AnalysisDimension =
  | 'sentiment' // 情感分析
  | 'category' // 分类分析
  | 'trend' // 趋势分析
  | 'priority' // 优先级分析
  | 'module' // 模块分析
  | 'user_type'; // 用户类型分析

/**
 * 情感分析结果
 */
export interface SentimentAnalysis {
  /** 情感类型 */
  sentiment: 'positive' | 'negative' | 'neutral';
  /** 置信度 */
  confidence: number;
  /** 情感分数 */
  score: number;
  /** 关键词 */
  keywords: string[];
  /** 情感维度 */
  dimensions?: {
    joy: number;
    sadness: number;
    anger: number;
    fear: number;
    surprise: number;
    disgust: number;
  };
}

/**
 * 分类分析结果
 */
export interface CategoryAnalysis {
  /** 分类名称 */
  category: string;
  /** 反馈数量 */
  count: number;
  /** 占比 */
  percentage: number;
  /** 平均满意度 */
  avgSatisfaction?: number;
  /** 示例反馈 */
  examples?: string[];
}

/**
 * 趋势分析结果
 */
export interface TrendAnalysis {
  /** 时间周期 */
  period: 'daily' | 'weekly' | 'monthly';
  /** 数据点 */
  data: {
    date: string;
    count: number;
    avgSatisfaction?: number;
    avgResolutionTime?: number;
  }[];
  /** 趋势方向 */
  trend: 'increasing' | 'decreasing' | 'stable';
  /** 变化率 */
  changeRate: number;
  /** 预测值 */
  forecast?: number;
}

/**
 * 问题聚类
 */
export interface IssueCluster {
  /** 聚类ID */
  id: string;
  /** 聚类名称 */
  name: string;
  /** 问题描述 */
  description: string;
  /** 关联反馈 */
  feedbackIds: string[];
  /** 严重程度 */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** 影响用户数 */
  affectedUsers: number;
  /** 出现频率 */
  frequency: number;
  /** 建议优先级 */
  suggestedPriority: FeedbackPriority;
}

/**
 * 反馈分析报告
 */
export interface FeedbackAnalysisReport {
  /** 报告ID */
  id: string;
  /** 报告标题 */
  title: string;
  /** 生成时间 */
  generatedAt: Date;
  /** 时间范围 */
  timeRange: {
    start: Date;
    end: Date;
  };
  /** 总体统计 */
  summary: {
    totalFeedback: number;
    newFeedback: number;
    resolvedFeedback: number;
    avgResolutionTime: number;
    avgSatisfaction: number;
    npsScore?: number;
    csatScore?: number;
  };
  /** 分类统计 */
  categoryBreakdown: CategoryAnalysis[];
  /** 趋势分析 */
  trends: TrendAnalysis[];
  /** 问题聚类 */
  issueClusters: IssueCluster[];
  /** 情感分析 */
  sentimentAnalysis: SentimentAnalysis;
  /** 模块统计 */
  moduleStats: {
    module: string;
    feedbackCount: number;
    avgSatisfaction: number;
    topIssues: string[];
  }[];
  /** 关键洞察 */
  insights: {
    type: 'strength' | 'weakness' | 'opportunity' | 'threat';
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    actionable: boolean;
  }[];
}

// ============================================
// 改进计划相关类型
// ============================================

/**
 * 改进类型
 */
export type ImprovementType =
  | 'feature_enhancement' // 功能增强
  | 'bug_fix' // Bug修复
  | 'performance_optimization' // 性能优化
  | 'ux_improvement' // 用户体验改进
  | 'accessibility' // 可访问性改进
  | 'documentation'; // 文档改进

/**
 * 改进优先级
 */
export type ImprovementPriority = 'p0' | 'p1' | 'p2' | 'p3';

/**
 * 改进状态
 */
export type ImprovementStatus =
  | 'proposed' // 提议
  | 'approved' // 已批准
  | 'in_progress' // 进行中
  | 'testing' // 测试中
  | 'completed' // 已完成
  | 'cancelled'; // 已取消

/**
 * 改进计划
 */
export interface ImprovementPlan {
  /** 计划ID */
  id: string;
  /** 标题 */
  title: string;
  /** 描述 */
  description: string;
  /** 改进类型 */
  type: ImprovementType;
  /** 优先级 */
  priority: ImprovementPriority;
  /** 状态 */
  status: ImprovementStatus;
  /** 关联反馈 */
  relatedFeedback: string[];
  /** 影响范围 */
  impact: {
    modules: string[];
    users: number;
    severity: 'low' | 'medium' | 'high';
  };
  /** 预期收益 */
  expectedBenefit: {
    type: 'satisfaction' | 'performance' | 'usability' | 'reliability';
    description: string;
    metrics?: string;
  };
  /** 资源估算 */
  estimatedResources: {
    developmentHours: number;
    testingHours: number;
    documentationHours: number;
  };
  /** 时间估算 */
  estimatedTime: {
    startDate: Date;
    endDate: Date;
    duration: number; // 天
  };
  /** 负责人 */
  assignee?: string;
  /** 团队成员 */
  team?: string[];
  /** 里程碑 */
  milestones: {
    name: string;
    dueDate: Date;
    completed: boolean;
  }[];
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 完成时间 */
  completedAt?: Date;
  /** 实际耗时 */
  actualTime?: number;
  /** 备注 */
  notes?: string;
}

/**
 * 改进路线图
 */
export interface ImprovementRoadmap {
  /** 路线图ID */
  id: string;
  /** 标题 */
  title: string;
  /** 描述 */
  description: string;
  /** 时间范围 */
  timeRange: {
    start: Date;
    end: Date;
  };
  /** 版本规划 */
  versions: {
    version: string;
    releaseDate: Date;
    improvements: string[]; // 改进计划ID列表
    features: string[];
  }[];
  /** 总体进度 */
  progress: {
    total: number;
    completed: number;
    inProgress: number;
    proposed: number;
  };
  /** 更新时间 */
  updatedAt: Date;
}

// ============================================
// 用户访谈相关类型
// ============================================

/**
 * 访谈类型
 */
export type InterviewType =
  | 'structured' // 结构化访谈
  | 'semi_structured' // 半结构化访谈
  | 'unstructured'; // 非结构化访谈

/**
 * 访谈模式
 */
export type InterviewMode =
  | 'in_person' // 当面
  | 'video_call' // 视频通话
  | 'phone' // 电话
  | 'chat'; // 在线聊天

/**
 * 访谈记录
 */
export interface InterviewRecord {
  /** 访谈ID */
  id: string;
  /** 访谈者 */
  interviewer: string;
  /** 受访者信息 */
  interviewee: {
    name: string;
    role: string;
    experience: 'beginner' | 'intermediate' | 'advanced';
    usageFrequency: 'daily' | 'weekly' | 'monthly' | 'rarely';
  };
  /** 访谈类型 */
  type: InterviewType;
  /** 访谈模式 */
  mode: InterviewMode;
  /** 访谈日期 */
  date: Date;
  /** 时长（分钟） */
  duration: number;
  /** 访谈提纲 */
  outline?: string[];
  /** 访谈记录 */
  transcript?: string;
  /** 关键洞察 */
  insights: {
    content: string;
    category: string;
    importance: 'low' | 'medium' | 'high';
  }[];
  /** 行动项 */
  actionItems: {
    description: string;
    assignee?: string;
    dueDate?: Date;
    status: 'pending' | 'in_progress' | 'completed';
  }[];
  /** 录音/录像链接 */
  recordingUrl?: string;
  /** 笔记 */
  notes?: string;
}

// ============================================
// 配置和默认值
// ============================================

/**
 * 反馈系统配置
 */
export interface FeedbackSystemConfig {
  /** 是否启用自动分析 */
  enableAutoAnalysis: boolean;
  /** 是否启用情感分析 */
  enableSentimentAnalysis: boolean;
  /** 是否启用自动分类 */
  enableAutoCategorization: boolean;
  /** 是否启用趋势预测 */
  enableTrendForecasting: boolean;
  /** 反馈过期时间（天） */
  feedbackExpiryDays: number;
  /** 自动关闭时间（天） */
  autoCloseDays: number;
  /** 提醒阈值 */
  reminderThresholds: {
    unacknowledgedHours: number;
    unresolvedDays: number;
    lowSatisfactionThreshold: number;
  };
  /** 分析周期 */
  analysisPeriod: 'daily' | 'weekly' | 'monthly';
  /** 报告生成频率 */
  reportFrequency: 'daily' | 'weekly' | 'monthly';
}

/**
 * 默认反馈系统配置
 */
export const DEFAULT_FEEDBACK_CONFIG: FeedbackSystemConfig = {
  enableAutoAnalysis: true,
  enableSentimentAnalysis: true,
  enableAutoCategorization: true,
  enableTrendForecasting: true,
  feedbackExpiryDays: 90,
  autoCloseDays: 30,
  reminderThresholds: {
    unacknowledgedHours: 24,
    unresolvedDays: 7,
    lowSatisfactionThreshold: 3,
  },
  analysisPeriod: 'weekly',
  reportFrequency: 'weekly',
};

// ============================================
// 默认调研模板
// ============================================

/**
 * 默认NPS调研模板
 */
export const DEFAULT_NPS_SURVEY: Omit<Survey, 'id' | 'createdAt'> = {
  title: '用户满意度调研',
  description: '感谢您使用我们的产品，请花几分钟时间完成此调研，帮助我们改进产品体验。',
  type: 'nps',
  isActive: true,
  questions: [
    {
      id: 'nps_question',
      title: '您有多大可能向朋友或同事推荐我们的产品？',
      type: 'nps',
      required: true,
      ratingScale: {
        min: 0,
        max: 10,
        minLabel: '完全不可能',
        maxLabel: '非常可能',
      },
    },
    {
      id: 'nps_reason',
      title: '您给出这个评分的主要原因是什么？',
      type: 'text',
      required: false,
    },
    {
      id: 'improvement_suggestions',
      title: '您认为我们最需要改进的方面是什么？',
      type: 'text',
      required: false,
    },
  ],
};

/**
 * 默认CSAT调研模板
 */
export const DEFAULT_CSAT_SURVEY: Omit<Survey, 'id' | 'createdAt'> = {
  title: '功能满意度调研',
  description: '请对以下功能的满意度进行评分',
  type: 'csat',
  isActive: true,
  questions: [
    {
      id: 'theme_satisfaction',
      title: '主题系统满意度',
      type: 'rating',
      required: true,
      ratingScale: {
        min: 1,
        max: 5,
        minLabel: '非常不满意',
        maxLabel: '非常满意',
      },
    },
    {
      id: 'device_satisfaction',
      title: '设备模拟满意度',
      type: 'rating',
      required: true,
      ratingScale: {
        min: 1,
        max: 5,
        minLabel: '非常不满意',
        maxLabel: '非常满意',
      },
    },
    {
      id: 'llm_satisfaction',
      title: 'AI助手满意度',
      type: 'rating',
      required: true,
      ratingScale: {
        min: 1,
        max: 5,
        minLabel: '非常不满意',
        maxLabel: '非常满意',
      },
    },
    {
      id: 'performance_satisfaction',
      title: '整体性能满意度',
      type: 'rating',
      required: true,
      ratingScale: {
        min: 1,
        max: 5,
        minLabel: '非常不满意',
        maxLabel: '非常满意',
      },
    },
    {
      id: 'overall_satisfaction',
      title: '总体满意度',
      type: 'rating',
      required: true,
      ratingScale: {
        min: 1,
        max: 5,
        minLabel: '非常不满意',
        maxLabel: '非常满意',
      },
    },
  ],
};

/**
 * 默认功能反馈调研模板
 */
export const DEFAULT_FEATURE_FEEDBACK_SURVEY: Omit<Survey, 'id' | 'createdAt'> = {
  title: '新功能反馈调研',
  description: '我们最近推出了一些新功能，请告诉我们您的使用体验',
  type: 'feature_feedback',
  isActive: true,
  questions: [
    {
      id: 'used_features',
      title: '您使用过以下哪些新功能？',
      type: 'multiple_choice',
      required: true,
      options: [
        '主题CSS变量动态注入',
        '设备模拟引擎',
        '意图识别增强',
        '性能监控',
        '上下文压缩',
        '可访问性增强',
      ],
    },
    {
      id: 'most_valuable_feature',
      title: '哪个功能对您最有价值？',
      type: 'single_choice',
      required: true,
      options: [
        '主题CSS变量动态注入',
        '设备模拟引擎',
        '意图识别增强',
        '性能监控',
        '上下文压缩',
        '可访问性增强',
      ],
    },
    {
      id: 'feature_quality',
      title: '您对新功能的整体质量满意吗？',
      type: 'likert',
      required: true,
      likertLabels: ['非常不满意', '不满意', '一般', '满意', '非常满意'],
    },
    {
      id: 'feature_suggestions',
      title: '您对新功能有什么建议？',
      type: 'text',
      required: false,
    },
  ],
};

/**
 * 默认改进优先级映射
 */
export const DEFAULT_PRIORITY_MAPPING: Record<string, ImprovementPriority> = {
  critical: 'p0',
  high: 'p1',
  medium: 'p2',
  low: 'p3',
};

/**
 * 情感分析阈值
 */
export const SENTIMENT_THRESHOLDS = {
  positive: 0.6,
  negative: 0.4,
  neutral: [0.4, 0.6],
};
