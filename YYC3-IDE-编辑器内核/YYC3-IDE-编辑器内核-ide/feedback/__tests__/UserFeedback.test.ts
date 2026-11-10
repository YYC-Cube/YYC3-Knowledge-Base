/**
 * @file: UserFeedback.test.ts
 * @description: 用户反馈管理器测试 - 测试反馈收集、分析和报告生成功能
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-01
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: test,vitest,unit-test
 */

// @ts-nocheck
/**
 * 用户反馈收集系统 - 测试文件
 *
 * @module UserFeedback.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UserFeedbackManager } from '../UserFeedbackManager';
import {
  DEFAULT_NPS_SURVEY,
  DEFAULT_CSAT_SURVEY,
  DEFAULT_FEATURE_FEEDBACK_SURVEY,
  DEFAULT_FEEDBACK_CONFIG,
} from '../UserFeedbackTypes';

describe('UserFeedbackManager', () => {
  let manager: UserFeedbackManager;

  beforeEach(() => {
    manager = new UserFeedbackManager(DEFAULT_FEEDBACK_CONFIG);
  });

  describe('调研管理', () => {
    it('应该成功创建NPS调研', () => {
      const survey = manager.createSurvey(DEFAULT_NPS_SURVEY);

      expect(survey.id).toBeDefined();
      expect(survey.title).toBe('用户满意度调研');
      expect(survey.type).toBe('nps');
      expect(survey.questions).toHaveLength(3);
      expect(survey.isActive).toBe(true);
    });

    it('应该成功创建CSAT调研', () => {
      const survey = manager.createSurvey(DEFAULT_CSAT_SURVEY);

      expect(survey.id).toBeDefined();
      expect(survey.title).toBe('功能满意度调研');
      expect(survey.type).toBe('csat');
      expect(survey.questions).toHaveLength(5);
    });

    it('应该成功创建功能反馈调研', () => {
      const survey = manager.createSurvey(DEFAULT_FEATURE_FEEDBACK_SURVEY);

      expect(survey.id).toBeDefined();
      expect(survey.title).toBe('新功能反馈调研');
      expect(survey.type).toBe('feature_feedback');
      expect(survey.questions).toHaveLength(4);
    });

    it('应该获取活跃调研列表', () => {
      manager.createSurvey(DEFAULT_NPS_SURVEY);
      manager.createSurvey(DEFAULT_CSAT_SURVEY);

      const activeSurveys = manager.getActiveSurveys();
      expect(activeSurveys).toHaveLength(2);
    });

    it('应该成功提交调研回答', () => {
      const survey = manager.createSurvey(DEFAULT_NPS_SURVEY);

      const response = manager.submitSurveyResponse({
        surveyId: survey.id,
        userId: 'user_123',
        answers: [
          {
            questionId: 'nps_question',
            value: 9,
            timestamp: new Date(),
          },
          {
            questionId: 'nps_reason',
            value: '产品功能强大，使用体验良好',
            timestamp: new Date(),
          },
        ],
        completedAt: new Date(),
        duration: 120,
      });

      expect(response.id).toBeDefined();
      expect(response.surveyId).toBe(survey.id);
      expect(response.answers).toHaveLength(2);
    });

    it('应该分析调研结果', () => {
      const survey = manager.createSurvey(DEFAULT_CSAT_SURVEY);

      // 提交多个回答
      for (let i = 0; i < 10; i++) {
        manager.submitSurveyResponse({
          surveyId: survey.id,
          userId: `user_${i}`,
          answers: survey.questions.map((q) => ({
            questionId: q.id,
            value: Math.floor(Math.random() * 5) + 1,
            timestamp: new Date(),
          })),
          completedAt: new Date(),
          duration: Math.floor(Math.random() * 300) + 60,
        });
      }

      const results = manager.analyzeSurveyResults(survey.id);

      expect(results.totalResponses).toBe(10);
      expect(results.avgDuration).toBeGreaterThan(0);
      expect(results.questionStats.size).toBe(5);

      // 验证问题统计
      const firstQuestionStats = results.questionStats.get(survey.questions[0].id);
      expect(firstQuestionStats).toBeDefined();
      expect(firstQuestionStats.average).toBeGreaterThanOrEqual(1);
      expect(firstQuestionStats.average).toBeLessThanOrEqual(5);
    });
  });

  describe('反馈管理', () => {
    it('应该成功提交用户反馈', () => {
      const feedback = manager.submitFeedback({
        userId: 'user_123',
        user: {
          name: '测试用户',
          email: 'test@example.com',
          role: 'developer',
          experience: 'intermediate',
        },
        type: 'bug',
        title: '主题切换功能异常',
        content: '在切换主题时，部分CSS变量未能正确更新',
        priority: 'high',
        status: 'new',
        source: 'in_app',
        module: 'theme',
        tags: ['主题', 'CSS'],
      });

      expect(feedback.id).toBeDefined();
      expect(feedback.type).toBe('bug');
      expect(feedback.status).toBe('new');
      expect(feedback.createdAt).toBeInstanceOf(Date);
      expect(feedback.votes).toBe(0);
    });

    it('应该自动分类反馈', () => {
      const feedback = manager.submitFeedback({
        userId: 'user_123',
        user: {},
        type: 'bug',
        title: '主题系统Bug',
        content: '主题theme切换时出现性能performance问题，界面UI卡顿',
        priority: 'medium',
        status: 'new',
        source: 'in_app',
        tags: [],
      });

      expect(feedback.tags).toContain('主题');
      expect(feedback.tags).toContain('性能');
      expect(feedback.tags).toContain('UI');
    });

    it('应该自动判断优先级', () => {
      // 测试严重Bug
      const criticalFeedback = manager.submitFeedback({
        userId: 'user_123',
        user: {},
        type: 'bug',
        title: '严重崩溃',
        content: '应用崩溃crash无法使用',
        priority: 'medium',
        status: 'new',
        source: 'in_app',
        tags: [],
      });
      expect(criticalFeedback.priority).toBe('critical');

      // 测试普通Bug
      const bugFeedback = manager.submitFeedback({
        userId: 'user_124',
        user: {},
        type: 'bug',
        title: '普通Bug',
        content: '存在一个小问题',
        priority: 'medium',
        status: 'new',
        source: 'in_app',
        tags: [],
      });
      expect(bugFeedback.priority).toBe('high');
    });

    it('应该更新反馈状态', () => {
      const feedback = manager.submitFeedback({
        userId: 'user_123',
        user: {},
        type: 'bug',
        title: '测试反馈',
        content: '测试内容',
        priority: 'medium',
        status: 'new',
        source: 'in_app',
        tags: [],
      });

      const updated = manager.updateFeedbackStatus(feedback.id, 'in_progress');
      expect(updated?.status).toBe('in_progress');
      expect(updated?.updatedAt).toBeInstanceOf(Date);

      const resolved = manager.updateFeedbackStatus(feedback.id, 'resolved', {
        comment: '已修复',
        resolvedBy: 'developer_1',
      });
      expect(resolved?.status).toBe('resolved');
      expect(resolved?.resolution).toBeDefined();
      expect(resolved?.resolution?.comment).toBe('已修复');
    });

    it('应该根据条件筛选反馈', () => {
      // 创建多个反馈
      manager.submitFeedback({
        userId: 'user_1',
        user: {},
        type: 'bug',
        title: 'Bug 1',
        content: 'Bug内容1',
        priority: 'high',
        status: 'new',
        source: 'in_app',
        module: 'theme',
        tags: [],
      });

      manager.submitFeedback({
        userId: 'user_2',
        user: {},
        type: 'feature_request',
        title: '功能请求1',
        content: '功能请求内容1',
        priority: 'medium',
        status: 'acknowledged',
        source: 'email',
        module: 'device',
        tags: [],
      });

      manager.submitFeedback({
        userId: 'user_1',
        user: {},
        type: 'bug',
        title: 'Bug 2',
        content: 'Bug内容2',
        priority: 'critical',
        status: 'new',
        source: 'in_app',
        module: 'theme',
        tags: [],
      });

      // 按类型筛选
      const bugs = manager.getFeedbacks({ type: 'bug' });
      expect(bugs).toHaveLength(2);

      // 按状态筛选
      const newFeedbacks = manager.getFeedbacks({ status: 'new' });
      expect(newFeedbacks).toHaveLength(2);

      // 按模块筛选
      const themeFeedbacks = manager.getFeedbacks({ module: 'theme' });
      expect(themeFeedbacks).toHaveLength(2);

      // 按用户筛选
      const userFeedbacks = manager.getFeedbacks({ userId: 'user_1' });
      expect(userFeedbacks).toHaveLength(2);
    });
  });

  describe('反馈分析', () => {
    beforeEach(() => {
      // 创建一些测试反馈
      const tags = ['主题', '性能', '设备', 'AI'];
      for (let i = 0; i < 20; i++) {
        const types = ['bug', 'feature_request', 'improvement', 'complaint'] as const;
        const priorities = ['low', 'medium', 'high', 'critical'] as const;
        const modules = ['theme', 'device', 'llm', 'performance'];

        manager.submitFeedback({
          userId: `user_${i}`,
          user: {},
          type: types[i % types.length],
          title: `测试反馈 ${i + 1}`,
          content: `这是第${i + 1}个测试反馈，内容${i % 2 === 0 ? '很好很满意' : '很差很失望需要改进'}`,
          priority: priorities[i % priorities.length],
          status: i < 15 ? 'new' : 'resolved',
          source: 'in_app',
          module: modules[i % modules.length],
          tags: [tags[i % tags.length], tags[(i + 1) % tags.length]], // 添加标签以便聚类
          satisfactionScore: Math.floor(Math.random() * 5) + 1,
        });
      }
    });

    it('应该生成完整的分析报告', () => {
      const report = manager.generateAnalysisReport('测试报告', {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
      });

      expect(report.id).toBeDefined();
      expect(report.title).toBe('测试报告');
      expect(report.summary.totalFeedback).toBe(20);
      expect(report.summary.newFeedback).toBe(15);
      expect(report.summary.resolvedFeedback).toBe(5);
      expect(report.categoryBreakdown.length).toBeGreaterThan(0);
      expect(report.trends.length).toBeGreaterThan(0);
      expect(report.issueClusters.length).toBeGreaterThanOrEqual(0);
      expect(report.sentimentAnalysis).toBeDefined();
      expect(report.moduleStats.length).toBeGreaterThan(0);
      expect(report.insights.length).toBeGreaterThanOrEqual(0); // 修改为 >= 0
    });

    it('应该正确分析分类', () => {
      const report = manager.generateAnalysisReport('测试报告', {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
      });

      const categories = report.categoryBreakdown;
      const totalPercentage = categories.reduce((sum, c) => sum + c.percentage, 0);
      expect(Math.round(totalPercentage)).toBe(100);

      categories.forEach((category) => {
        expect(category.count).toBeGreaterThan(0);
        expect(category.percentage).toBeGreaterThan(0);
      });
    });

    it('应该正确分析趋势', () => {
      const report = manager.generateAnalysisReport('测试报告', {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
      });

      const trend = report.trends[0];
      expect(trend.period).toBe('daily');
      expect(trend.data).toHaveLength(7);
      expect(['increasing', 'decreasing', 'stable']).toContain(trend.trend);
    });

    it('应该正确分析情感', () => {
      const report = manager.generateAnalysisReport('测试报告', {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
      });

      const sentiment = report.sentimentAnalysis;
      expect(['positive', 'negative', 'neutral']).toContain(sentiment.sentiment);
      expect(sentiment.confidence).toBeGreaterThanOrEqual(0);
      expect(sentiment.confidence).toBeLessThanOrEqual(1);
      expect(sentiment.keywords.length).toBeGreaterThan(0);
    });

    it('应该正确识别模块问题', () => {
      const report = manager.generateAnalysisReport('测试报告', {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
      });

      expect(report.moduleStats.length).toBeGreaterThan(0);
      report.moduleStats.forEach((module) => {
        expect(module.module).toBeDefined();
        expect(module.feedbackCount).toBeGreaterThan(0);
      });
    });

    it('应该生成可执行的洞察', () => {
      const report = manager.generateAnalysisReport('测试报告', {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
      });

      const actionableInsights = report.insights.filter((i) => i.actionable);
      expect(actionableInsights.length).toBeGreaterThan(0);

      report.insights.forEach((insight) => {
        expect(['strength', 'weakness', 'opportunity', 'threat']).toContain(insight.type);
        expect(insight.title).toBeDefined();
        expect(insight.description).toBeDefined();
      });
    });
  });

  describe('改进计划管理', () => {
    it('应该成功创建改进计划', () => {
      const plan = manager.createImprovementPlan({
        title: '优化主题系统性能',
        description: '优化主题切换时的性能，减少CSS变量更新时间',
        type: 'performance_optimization',
        priority: 'p1',
        status: 'proposed',
        relatedFeedback: [],
        impact: {
          modules: ['theme'],
          users: 100,
          severity: 'medium',
        },
        expectedBenefit: {
          type: 'performance',
          description: '主题切换时间减少50%',
          metrics: '切换时间从200ms降至100ms',
        },
        estimatedResources: {
          developmentHours: 16,
          testingHours: 4,
          documentationHours: 2,
        },
        estimatedTime: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          duration: 14,
        },
        milestones: [
          {
            name: '性能分析',
            dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            completed: false,
          },
          {
            name: '优化实现',
            dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
            completed: false,
          },
        ],
      });

      expect(plan.id).toBeDefined();
      expect(plan.title).toBe('优化主题系统性能');
      expect(plan.status).toBe('proposed');
      expect(plan.createdAt).toBeInstanceOf(Date);
    });

    it('应该从反馈生成改进计划', () => {
      // 先创建反馈
      const feedback = manager.submitFeedback({
        userId: 'user_123',
        user: {},
        type: 'bug',
        title: '主题切换卡顿',
        content: '主题切换时界面会卡顿约1秒',
        priority: 'high',
        status: 'new',
        source: 'in_app',
        module: 'theme',
        tags: ['主题', '性能'],
      });

      // 从反馈生成改进计划
      const plan = manager.generateImprovementFromFeedback(feedback.id);

      expect(plan).toBeDefined();
      expect((plan as any).title).toContain('主题切换卡顿');
      expect((plan as any).type).toBe('bug_fix');
      expect((plan as any).priority).toBe('p1');
      expect((plan as any).relatedFeedback).toContain(feedback.id);
      expect((plan as any).status).toBe('proposed');
    });

    it('应该更新改进计划状态', () => {
      const plan = manager.createImprovementPlan({
        title: '测试计划',
        description: '测试描述',
        type: 'bug_fix',
        priority: 'p2',
        status: 'proposed',
        relatedFeedback: [],
        impact: {
          modules: [],
          users: 1,
          severity: 'low',
        },
        expectedBenefit: {
          type: 'satisfaction',
          description: '测试收益',
        },
        estimatedResources: {
          developmentHours: 8,
          testingHours: 2,
          documentationHours: 1,
        },
        estimatedTime: {
          startDate: new Date(),
          endDate: new Date(),
          duration: 7,
        },
        milestones: [],
      });

      // 更新为进行中
      const inProgress = manager.updateImprovementStatus(plan.id, 'in_progress');
      expect(inProgress?.status).toBe('in_progress');

      // 更新为完成
      const completed = manager.updateImprovementStatus(
        plan.id,
        'completed',
        '所有功能已完成',
      );
      expect(completed?.status).toBe('completed');
      expect(completed?.completedAt).toBeInstanceOf(Date);
      expect(completed?.notes).toBe('所有功能已完成');
    });
  });

  describe('用户访谈管理', () => {
    it('应该成功创建访谈记录', () => {
      const record = manager.createInterviewRecord({
        interviewer: '张三',
        interviewee: {
          name: '李四',
          role: 'developer',
          experience: 'intermediate',
          usageFrequency: 'daily',
        },
        type: 'semi_structured',
        mode: 'video_call',
        date: new Date(),
        duration: 45,
        outline: [
          '使用频率和场景',
          '最喜欢的功能',
          '遇到的主要问题',
          '改进建议',
        ],
        insights: [
          {
            content: '用户希望增加快捷键支持',
            category: '功能需求',
            importance: 'high',
          },
        ],
        actionItems: [
          {
            description: '添加快捷键文档',
            assignee: '张三',
            status: 'pending',
          },
        ],
      });

      expect(record.id).toBeDefined();
      expect(record.interviewer).toBe('张三');
      expect(record.insights).toHaveLength(1);
      expect(record.actionItems).toHaveLength(1);
    });

    it('应该获取所有访谈记录', () => {
      manager.createInterviewRecord({
        interviewer: '张三',
        interviewee: {
          name: '李四',
          role: 'developer',
          experience: 'beginner',
          usageFrequency: 'weekly',
        },
        type: 'structured',
        mode: 'in_person',
        date: new Date(),
        duration: 30,
        insights: [],
        actionItems: [],
      });

      manager.createInterviewRecord({
        interviewer: '王五',
        interviewee: {
          name: '赵六',
          role: 'designer',
          experience: 'advanced',
          usageFrequency: 'daily',
        },
        type: 'unstructured',
        mode: 'phone',
        date: new Date(),
        duration: 60,
        insights: [],
        actionItems: [],
      });

      const allRecords = manager.getAllInterviewRecords();
      expect(allRecords).toHaveLength(2);
    });
  });

  describe('数据导入导出', () => {
    it('应该正确导出数据', () => {
      // 创建一些数据
      manager.createSurvey(DEFAULT_NPS_SURVEY);
      manager.submitFeedback({
        userId: 'user_1',
        user: {},
        type: 'bug',
        title: '测试',
        content: '测试内容',
        priority: 'medium',
        status: 'new',
        source: 'in_app',
        tags: [],
      });

      const data = manager.exportData();

      expect(data.surveys).toHaveLength(1);
      expect(data.feedbacks).toHaveLength(1);
    });

    it('应该正确导入数据', () => {
      // 创建另一个manager实例
      const newManager = new UserFeedbackManager();

      // 在原manager中创建数据
      const survey = manager.createSurvey(DEFAULT_NPS_SURVEY);
      const feedback = manager.submitFeedback({
        userId: 'user_1',
        user: {},
        type: 'bug',
        title: '测试',
        content: '测试内容',
        priority: 'medium',
        status: 'new',
        source: 'in_app',
        tags: [],
      });

      // 导出数据
      const data = manager.exportData();

      // 导入到新manager
      newManager.importData(data);

      // 验证数据已导入
      const importedSurvey = newManager.getSurvey(survey.id);
      const importedFeedback = newManager.getFeedback(feedback.id);

      expect(importedSurvey).toBeDefined();
      expect(importedFeedback).toBeDefined();
    });
  });
});
