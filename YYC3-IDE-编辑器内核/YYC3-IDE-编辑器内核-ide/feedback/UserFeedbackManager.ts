/**
 * @file: UserFeedbackManager.ts
 * @description: UserFeedbackManager — feedback 模块
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
 * 用户反馈收集系统 - 核心管理器
 *
 * 提供完整的用户反馈收集、分析和管理功能
 *
 * @module UserFeedbackManager
 * @version: 1.0.0
 * @author: YYC3-Family-AI Team
 */

import type {
  Survey,
  SurveyQuestion,
  SurveyResponse,
  UserFeedback,
  FeedbackAnalysisReport,
  ImprovementPlan,
  InterviewRecord,
  FeedbackSystemConfig,
  SentimentAnalysis,
  CategoryAnalysis,
  TrendAnalysis,
  IssueCluster,
  FeedbackPriority,
  FeedbackStatus,
} from './UserFeedbackTypes';
import { DEFAULT_FEEDBACK_CONFIG } from './UserFeedbackTypes';

/**
 * 用户反馈管理器
 */
export class UserFeedbackManager {
  private config: FeedbackSystemConfig;
  private feedbacks: Map<string, UserFeedback> = new Map();
  private surveys: Map<string, Survey> = new Map();
  private responses: Map<string, SurveyResponse> = new Map();
  private improvements: Map<string, ImprovementPlan> = new Map();
  private interviews: Map<string, InterviewRecord> = new Map();

  constructor(config: FeedbackSystemConfig = DEFAULT_FEEDBACK_CONFIG) {
    this.config = config;
  }

  // ============================================
  // 调研管理
  // ============================================

  /**
   * 创建调研
   */
  createSurvey(survey: Omit<Survey, 'id' | 'createdAt'>): Survey {
    const id = this.generateId('survey');
    const newSurvey: Survey = {
      ...survey,
      id,
      createdAt: new Date(),
    };
    this.surveys.set(id, newSurvey);
    return newSurvey;
  }

  /**
   * 获取调研
   */
  getSurvey(id: string): Survey | undefined {
    return this.surveys.get(id);
  }

  /**
   * 获取所有活跃调研
   */
  getActiveSurveys(): Survey[] {
    return Array.from(this.surveys.values()).filter((s) => s.isActive);
  }

  /**
   * 提交调研回答
   */
  submitSurveyResponse(response: Omit<SurveyResponse, 'id'>): SurveyResponse {
    const id = this.generateId('response');
    const newResponse: SurveyResponse = {
      ...response,
      id,
    };
    this.responses.set(id, newResponse);
    return newResponse;
  }

  /**
   * 获取调研结果
   */
  getSurveyResults(surveyId: string): SurveyResponse[] {
    return Array.from(this.responses.values()).filter((r) => r.surveyId === surveyId);
  }

  /**
   * 分析调研结果
   */
  analyzeSurveyResults(surveyId: string): {
    totalResponses: number;
    completionRate: number;
    avgDuration: number;
    questionStats: Map<string, any>;
  } {
    const responses = this.getSurveyResults(surveyId);
    const survey = this.getSurvey(surveyId);

    if (!survey || responses.length === 0) {
      return {
        totalResponses: 0,
        completionRate: 0,
        avgDuration: 0,
        questionStats: new Map(),
      };
    }

    // 计算基础统计
    const totalResponses = responses.length;
    const avgDuration = responses.reduce((sum, r) => sum + r.duration, 0) / totalResponses;

    // 计算问题统计
    const questionStats = new Map<string, any>();
    survey.questions.forEach((question) => {
      const answers = responses
        .map((r) => r.answers.find((a) => a.questionId === question.id))
        .filter(Boolean);

      if (question.type === 'rating' || question.type === 'nps') {
        const values = answers.map((a) => (a as any).value as number);
        const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
        const distribution: Record<number, number> = {};
        values.forEach((v) => {
          distribution[v] = (distribution[v] || 0) + 1;
        });

        questionStats.set(question.id, {
          average: avg,
          distribution,
          totalResponses: answers.length,
        });
      } else if (question.type === 'single_choice' || question.type === 'multiple_choice') {
        const distribution: Record<string, number> = {};
        answers.forEach((a) => {
          if (Array.isArray((a as any).value)) {
            ((a as any).value as string[]).forEach((v) => {
              distribution[v] = (distribution[v] || 0) + 1;
            });
          } else {
            const value = (a as any).value as string;
            distribution[value] = (distribution[value] || 0) + 1;
          }
        });

        questionStats.set(question.id, {
          distribution,
          totalResponses: answers.length,
        });
      } else if (question.type === 'text') {
        const texts = answers.map((a) => (a as any).value as string);
        questionStats.set(question.id, {
          totalResponses: texts.length,
          responses: texts.slice(0, 10), // 只保留前10个回答
        });
      }
    });

    return {
      totalResponses,
      completionRate: totalResponses / (survey.targetAudience ? 100 : 10), // 简化计算
      avgDuration,
      questionStats,
    };
  }

  // ============================================
  // 反馈管理
  // ============================================

  /**
   * 提交用户反馈
   */
  submitFeedback(feedback: Omit<UserFeedback, 'id' | 'createdAt' | 'updatedAt'>): UserFeedback {
    const id = this.generateId('feedback');
    const now = new Date();
    const newFeedback: UserFeedback = {
      ...feedback,
      id,
      createdAt: now,
      updatedAt: now,
      status: feedback.status || 'new',
      votes: feedback.votes || 0,
    };
    this.feedbacks.set(id, newFeedback);

    // 自动分析（如果启用）
    if (this.config.enableAutoAnalysis) {
      this.analyzeFeedback(id);
    }

    return newFeedback;
  }

  /**
   * 获取反馈
   */
  getFeedback(id: string): UserFeedback | undefined {
    return this.feedbacks.get(id);
  }

  /**
   * 更新反馈状态
   */
  updateFeedbackStatus(
    id: string,
    status: FeedbackStatus,
    resolution?: { comment: string; resolvedBy: string },
  ): UserFeedback | undefined {
    const feedback = this.feedbacks.get(id);
    if (!feedback) return undefined;

    feedback.status = status;
    feedback.updatedAt = new Date();

    if (resolution && status === 'resolved') {
      feedback.resolution = {
        ...resolution,
        resolvedAt: new Date(),
      };
    }

    this.feedbacks.set(id, feedback);
    return feedback;
  }

  /**
   * 获取反馈列表
   */
  getFeedbacks(filters?: {
    type?: string;
    status?: FeedbackStatus;
    priority?: FeedbackPriority;
    userId?: string;
    module?: string;
    startDate?: Date;
    endDate?: Date;
  }): UserFeedback[] {
    let results = Array.from(this.feedbacks.values());

    if (filters) {
      if (filters.type) {
        results = results.filter((f) => f.type === filters.type);
      }
      if (filters.status) {
        results = results.filter((f) => f.status === filters.status);
      }
      if (filters.priority) {
        results = results.filter((f) => f.priority === filters.priority);
      }
      if (filters.userId) {
        results = results.filter((f) => f.userId === filters.userId);
      }
      if (filters.module) {
        results = results.filter((f) => f.module === filters.module);
      }
      if (filters.startDate) {
        results = results.filter((f) => f.createdAt >= (filters.startDate as any));
      }
      if (filters.endDate) {
        results = results.filter((f) => f.createdAt <= (filters.endDate as any));
      }
    }

    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * 分析单个反馈
   */
  private analyzeFeedback(id: string): void {
    const feedback = this.feedbacks.get(id);
    if (!feedback) return;

    // 自动分类（如果启用）
    if (this.config.enableAutoCategorization) {
      feedback.tags = this.autoCategorize(feedback.content);
    }

    // 自动优先级判断
    if (!feedback.priority || feedback.priority === 'medium') {
      feedback.priority = this.autoPrioritize(feedback);
    }

    this.feedbacks.set(id, feedback);
  }

  /**
   * 自动分类
   */
  private autoCategorize(content: string): string[] {
    const tags: string[] = [];
    const lowerContent = content.toLowerCase();

    // 关键词匹配
    const keywordMap: Record<string, string[]> = {
      '主题': ['theme', 'color', 'dark', 'light', '颜色', '主题'],
      '设备': ['device', 'mobile', 'tablet', 'responsive', '设备', '响应式'],
      'AI': ['ai', 'llm', 'gpt', 'intent', '智能', '意图'],
      '性能': ['performance', 'slow', 'fast', '优化', '性能', '卡顿'],
      'UI': ['ui', '界面', '布局', 'layout', '样式'],
      'Bug': ['bug', 'error', 'crash', 'bug', '错误', '崩溃'],
    };

    Object.entries(keywordMap).forEach(([category, keywords]) => {
      if (keywords.some((keyword) => lowerContent.includes(keyword))) {
        tags.push(category);
      }
    });

    return tags;
  }

  /**
   * 自动优先级判断
   */
  private autoPrioritize(feedback: UserFeedback): FeedbackPriority {
    // 根据类型和关键词判断优先级
    const criticalKeywords = ['崩溃', 'crash', '无法使用', 'critical', '严重'];
    const highKeywords = ['bug', '错误', 'error', '问题', 'issue'];

    const content = feedback.content.toLowerCase();

    if (criticalKeywords.some((keyword) => content.includes(keyword))) {
      return 'critical';
    }
    if (highKeywords.some((keyword) => content.includes(keyword))) {
      return 'high';
    }
    if (feedback.type === 'bug') {
      return 'high';
    }
    if (feedback.type === 'feature_request') {
      return 'medium';
    }

    return 'low';
  }

  // ============================================
  // 反馈分析
  // ============================================

  /**
   * 生成分析报告
   */
  generateAnalysisReport(
    title: string,
    timeRange: { start: Date; end: Date },
  ): FeedbackAnalysisReport {
    const feedbacks = this.getFeedbacks({
      startDate: timeRange.start,
      endDate: timeRange.end,
    });

    // 总体统计
    const summary = this.calculateSummary(feedbacks);

    // 分类统计
    const categoryBreakdown = this.analyzeCategories(feedbacks);

    // 趋势分析
    const trends = this.analyzeTrends(feedbacks, 'daily');

    // 问题聚类
    const issueClusters = this.clusterIssues(feedbacks);

    // 情感分析
    const sentimentAnalysis = this.analyzeSentiment(feedbacks);

    // 模块统计
    const moduleStats = this.analyzeModules(feedbacks);

    // 生成洞察
    const insights = this.generateInsights(summary, categoryBreakdown, sentimentAnalysis);

    return {
      id: this.generateId('report'),
      title,
      generatedAt: new Date(),
      timeRange,
      summary,
      categoryBreakdown,
      trends,
      issueClusters,
      sentimentAnalysis,
      moduleStats,
      insights,
    };
  }

  /**
   * 计算总体统计
   */
  private calculateSummary(feedbacks: UserFeedback[]): FeedbackAnalysisReport['summary'] {
    const totalFeedback = feedbacks.length;
    const newFeedback = feedbacks.filter((f) => f.status === 'new').length;
    const resolvedFeedback = feedbacks.filter((f) => f.status === 'resolved').length;

    const resolvedItems = feedbacks.filter(
      (f) => f.status === 'resolved' && f.resolution,
    );
    const avgResolutionTime =
      resolvedItems.length > 0
        ? resolvedItems.reduce((sum, f) => {
            const resolutionTime =
              (f.resolution as any).resolvedAt.getTime() - f.createdAt.getTime();
            return sum + resolutionTime / (1000 * 60 * 60); // 转换为小时
          }, 0) / resolvedItems.length
        : 0;

    const satisfactionScores = feedbacks
      .filter((f) => f.satisfactionScore !== undefined)
      .map((f) => f.satisfactionScore as any);
    const avgSatisfaction =
      satisfactionScores.length > 0
        ? satisfactionScores.reduce((sum, score) => sum + score, 0) /
          satisfactionScores.length
        : 0;

    return {
      totalFeedback,
      newFeedback,
      resolvedFeedback,
      avgResolutionTime,
      avgSatisfaction,
    };
  }

  /**
   * 分析分类
   */
  private analyzeCategories(feedbacks: UserFeedback[]): CategoryAnalysis[] {
    const categoryMap = new Map<string, UserFeedback[]>();

    feedbacks.forEach((f) => {
      const category = f.type;
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(f);
    });

    return Array.from(categoryMap.entries()).map(([category, items]) => {
      const avgSatisfaction =
        items.filter((f) => f.satisfactionScore !== undefined).length > 0
          ? items
              .filter((f) => f.satisfactionScore !== undefined)
              .reduce((sum, f) => sum + f.satisfactionScore!, 0) /
            items.filter((f) => f.satisfactionScore !== undefined).length
          : undefined;

      return {
        category,
        count: items.length,
        percentage: (items.length / feedbacks.length) * 100,
        avgSatisfaction,
        examples: items.slice(0, 3).map((f) => f.title),
      };
    });
  }

  /**
   * 分析趋势
   */
  private analyzeTrends(
    feedbacks: UserFeedback[],
    period: 'daily' | 'weekly' | 'monthly',
  ): TrendAnalysis[] {
    const now = new Date();
    const data: { date: string; count: number; avgSatisfaction?: number }[] = [];

    // 简化实现：生成最近7天的趋势
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayFeedbacks = feedbacks.filter((f) => {
        const feedbackDate = f.createdAt.toISOString().split('T')[0];
        return feedbackDate === dateStr;
      });

      const avgSatisfaction =
        dayFeedbacks.filter((f) => f.satisfactionScore !== undefined).length > 0
          ? dayFeedbacks
              .filter((f) => f.satisfactionScore !== undefined)
              .reduce((sum, f) => sum + f.satisfactionScore!, 0) /
            dayFeedbacks.filter((f) => f.satisfactionScore !== undefined).length
          : undefined;

      data.push({
        date: dateStr,
        count: dayFeedbacks.length,
        avgSatisfaction,
      });
    }

    // 计算趋势
    const recentCount = data.slice(-3).reduce((sum, d) => sum + d.count, 0);
    const earlierCount = data.slice(0, 3).reduce((sum, d) => sum + d.count, 0);
    const trend =
      recentCount > earlierCount
        ? 'increasing'
        : recentCount < earlierCount
          ? 'decreasing'
          : 'stable';
    const changeRate =
      earlierCount > 0 ? ((recentCount - earlierCount) / earlierCount) * 100 : 0;

    return [
      {
        period,
        data,
        trend,
        changeRate,
        forecast: this.config.enableTrendForecasting
          ? Math.round(data[data.length - 1].count * (1 + changeRate / 100))
          : undefined,
      },
    ];
  }

  /**
   * 问题聚类
   */
  private clusterIssues(feedbacks: UserFeedback[]): IssueCluster[] {
    const clusterMap = new Map<string, UserFeedback[]>();

    // 简化实现：基于标签聚类
    feedbacks.forEach((f) => {
      f.tags.forEach((tag) => {
        if (!clusterMap.has(tag)) {
          clusterMap.set(tag, []);
        }
        clusterMap.get(tag)!.push(f);
      });
    });

    return Array.from(clusterMap.entries())
      .filter(([_, items]) => items.length >= 2) // 至少2个反馈才形成聚类
      .map(([name, items]) => {
        const severity =
          items.filter((f) => f.priority === 'critical' || f.priority === 'high').length /
          items.length;

        return {
          id: this.generateId('cluster'),
          name,
          description: `${name}相关问题`,
          feedbackIds: items.map((f) => f.id),
          severity: severity > 0.5 ? 'high' : severity > 0.3 ? 'medium' : 'low',
          affectedUsers: new Set(items.map((f) => f.userId)).size,
          frequency: items.length,
          suggestedPriority: (severity > 0.5
            ? 'high'
            : severity > 0.3
              ? 'medium'
              : 'low') as FeedbackPriority,
        };
      });
  }

  /**
   * 情感分析
   */
  private analyzeSentiment(feedbacks: UserFeedback[]): SentimentAnalysis {
    // 简化实现：基于关键词的情感分析
    const positiveKeywords = [
      '好',
      '棒',
      '喜欢',
      '满意',
      '优秀',
      'great',
      'good',
      'excellent',
      'love',
    ];
    const negativeKeywords = [
      '差',
      '糟',
      '讨厌',
      '不满',
      '失望',
      'bad',
      'poor',
      'hate',
      'terrible',
    ];

    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    const allKeywords: string[] = [];

    feedbacks.forEach((f) => {
      const content = f.content.toLowerCase();
      const hasPositive = positiveKeywords.some((k) => content.includes(k));
      const hasNegative = negativeKeywords.some((k) => content.includes(k));

      if (hasPositive && !hasNegative) {
        positiveCount++;
      } else if (hasNegative && !hasPositive) {
        negativeCount++;
      } else {
        neutralCount++;
      }

      // 提取关键词（简化）
      const words = content.split(/\s+/);
      allKeywords.push(...words.slice(0, 5));
    });

    const total = feedbacks.length || 1;
    const sentiment =
      positiveCount > negativeCount && positiveCount > neutralCount
        ? 'positive'
        : negativeCount > positiveCount && negativeCount > neutralCount
          ? 'negative'
          : 'neutral';

    return {
      sentiment,
      confidence: Math.max(positiveCount, negativeCount, neutralCount) / total,
      score: (positiveCount - negativeCount) / total,
      keywords: [...new Set(allKeywords)].slice(0, 10),
    };
  }

  /**
   * 模块分析
   */
  private analyzeModules(
    feedbacks: UserFeedback[],
  ): FeedbackAnalysisReport['moduleStats'] {
    const moduleMap = new Map<string, UserFeedback[]>();

    feedbacks.forEach((f) => {
      const module = f.module || 'general';
      if (!moduleMap.has(module)) {
        moduleMap.set(module, []);
      }
      moduleMap.get(module)!.push(f);
    });

    return Array.from(moduleMap.entries()).map(([module, items]) => {
      const avgSatisfaction =
        items.filter((f) => f.satisfactionScore !== undefined).length > 0
          ? items
              .filter((f) => f.satisfactionScore !== undefined)
              .reduce((sum, f) => sum + f.satisfactionScore!, 0) /
            items.filter((f) => f.satisfactionScore !== undefined).length
          : 0;

      return {
        module,
        feedbackCount: items.length,
        avgSatisfaction,
        topIssues: items
          .filter((f) => f.type === 'bug' || f.type === 'complaint')
          .slice(0, 3)
          .map((f) => f.title),
      };
    });
  }

  /**
   * 生成洞察
   */
  private generateInsights(
    summary: FeedbackAnalysisReport['summary'],
    categoryBreakdown: CategoryAnalysis[],
    sentimentAnalysis: SentimentAnalysis,
  ): FeedbackAnalysisReport['insights'] {
    const insights: FeedbackAnalysisReport['insights'] = [];

    // 基于情感分析
    if (sentimentAnalysis.sentiment === 'positive') {
      insights.push({
        type: 'strength',
        title: '用户满意度较高',
        description: `整体情感倾向积极，积极反馈占比${Math.round(sentimentAnalysis.confidence * 100)}%`,
        impact: 'high',
        actionable: false,
      });
    } else if (sentimentAnalysis.sentiment === 'negative') {
      insights.push({
        type: 'weakness',
        title: '用户满意度偏低',
        description: `存在较多负面反馈，需要重点关注和改进`,
        impact: 'high',
        actionable: true,
      });
    }

    // 基于分类
    const topCategory = categoryBreakdown.sort((a, b) => b.count - a.count)[0];
    if (topCategory && topCategory.category === 'bug') {
      insights.push({
        type: 'threat',
        title: 'Bug反馈占比高',
        description: `${topCategory.category}类反馈最多，占比${Math.round(topCategory.percentage)}%`,
        impact: 'high',
        actionable: true,
      });
    }

    // 基于解决率
    const resolutionRate =
      summary.totalFeedback > 0
        ? summary.resolvedFeedback / summary.totalFeedback
        : 0;
    if (resolutionRate < 0.5) {
      insights.push({
        type: 'weakness',
        title: '反馈解决率较低',
        description: `当前解决率为${Math.round(resolutionRate * 100)}%，需要提升处理效率`,
        impact: 'medium',
        actionable: true,
      });
    }

    return insights;
  }

  // ============================================
  // 改进计划管理
  // ============================================

  /**
   * 创建改进计划
   */
  createImprovementPlan(
    plan: Omit<ImprovementPlan, 'id' | 'createdAt' | 'updatedAt'>,
  ): ImprovementPlan {
    const id = this.generateId('improvement');
    const now = new Date();
    const newPlan: ImprovementPlan = {
      ...plan,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.improvements.set(id, newPlan);
    return newPlan;
  }

  /**
   * 获取改进计划
   */
  getImprovementPlan(id: string): ImprovementPlan | undefined {
    return this.improvements.get(id);
  }

  /**
   * 更新改进计划状态
   */
  updateImprovementStatus(
    id: string,
    status: ImprovementPlan['status'],
    notes?: string,
  ): ImprovementPlan | undefined {
    const plan = this.improvements.get(id);
    if (!plan) return undefined;

    plan.status = status;
    plan.updatedAt = new Date();
    if (notes) {
      plan.notes = notes;
    }
    if (status === 'completed') {
      plan.completedAt = new Date();
    }

    this.improvements.set(id, plan);
    return plan;
  }

  /**
   * 从反馈生成改进计划
   */
  generateImprovementFromFeedback(feedbackId: string): ImprovementPlan | undefined {
    const feedback = this.feedbacks.get(feedbackId);
    if (!feedback) return undefined;

    const plan = this.createImprovementPlan({
      title: `改进: ${feedback.title}`,
      description: feedback.content,
      type: this.mapFeedbackToImprovementType(feedback.type),
      priority: this.mapPriority(feedback.priority),
      status: 'proposed',
      relatedFeedback: [feedbackId],
      impact: {
        modules: feedback.module ? [feedback.module] : [],
        users: 1,
        severity: feedback.priority === 'critical' || feedback.priority === 'high' ? 'high' : 'medium',
      },
      expectedBenefit: {
        type: 'satisfaction',
        description: `解决用户反馈的问题，提升用户满意度`,
      },
      estimatedResources: {
        developmentHours: 8,
        testingHours: 2,
        documentationHours: 1,
      },
      estimatedTime: {
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        duration: 7,
      },
      milestones: [
        {
          name: '需求分析',
          dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          completed: false,
        },
        {
          name: '开发实现',
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          completed: false,
        },
        {
          name: '测试验证',
          dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
          completed: false,
        },
        {
          name: '发布上线',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          completed: false,
        },
      ],
    });

    return plan;
  }

  /**
   * 映射反馈类型到改进类型
   */
  private mapFeedbackToImprovementType(
    feedbackType: UserFeedback['type'],
  ): ImprovementPlan['type'] {
    const mapping: Record<string, ImprovementPlan['type']> = {
      bug: 'bug_fix',
      feature_request: 'feature_enhancement',
      improvement: 'ux_improvement',
      complaint: 'ux_improvement',
    };
    return mapping[feedbackType] || 'feature_enhancement';
  }

  /**
   * 映射优先级
   */
  private mapPriority(feedbackPriority: FeedbackPriority): ImprovementPlan['priority'] {
    const mapping: Record<FeedbackPriority, ImprovementPlan['priority']> = {
      critical: 'p0',
      high: 'p1',
      medium: 'p2',
      low: 'p3',
    };
    return mapping[feedbackPriority];
  }

  // ============================================
  // 用户访谈管理
  // ============================================

  /**
   * 创建访谈记录
   */
  createInterviewRecord(
    record: Omit<InterviewRecord, 'id'>,
  ): InterviewRecord {
    const id = this.generateId('interview');
    const newRecord: InterviewRecord = {
      ...record,
      id,
    };
    this.interviews.set(id, newRecord);
    return newRecord;
  }

  /**
   * 获取访谈记录
   */
  getInterviewRecord(id: string): InterviewRecord | undefined {
    return this.interviews.get(id);
  }

  /**
   * 获取所有访谈记录
   */
  getAllInterviewRecords(): InterviewRecord[] {
    return Array.from(this.interviews.values());
  }

  // ============================================
  // 工具方法
  // ============================================

  /**
   * 生成ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 导出所有数据
   */
  exportData(): {
    feedbacks: UserFeedback[];
    surveys: Survey[];
    responses: SurveyResponse[];
    improvements: ImprovementPlan[];
    interviews: InterviewRecord[];
  } {
    return {
      feedbacks: Array.from(this.feedbacks.values()),
      surveys: Array.from(this.surveys.values()),
      responses: Array.from(this.responses.values()),
      improvements: Array.from(this.improvements.values()),
      interviews: Array.from(this.interviews.values()),
    };
  }

  /**
   * 导入数据
   */
  importData(data: {
    feedbacks?: UserFeedback[];
    surveys?: Survey[];
    responses?: SurveyResponse[];
    improvements?: ImprovementPlan[];
    interviews?: InterviewRecord[];
  }): void {
    if (data.feedbacks) {
      data.feedbacks.forEach((f) => this.feedbacks.set(f.id, f));
    }
    if (data.surveys) {
      data.surveys.forEach((s) => this.surveys.set(s.id, s));
    }
    if (data.responses) {
      data.responses.forEach((r) => this.responses.set(r.id, r));
    }
    if (data.improvements) {
      data.improvements.forEach((i) => this.improvements.set(i.id, i));
    }
    if (data.interviews) {
      data.interviews.forEach((i) => this.interviews.set(i.id, i));
    }
  }
}

// 导出默认实例
export const userFeedbackManager = new UserFeedbackManager();
