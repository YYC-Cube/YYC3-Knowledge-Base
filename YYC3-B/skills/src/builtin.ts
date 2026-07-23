/**
 * @description YYC³ 预置技能定义
 * @module @yyc3/skills/builtin
 */

import type { Skill, SkillResult } from './types';

export const ReasoningSkill: Skill = {
  id: 'core.reasoning.cageerf',
  name: 'CAGEERF 推理框架',
  description: 'Context-Analyze-Generate-Evaluate-Execute-Refine-Feedback 推理框架',
  category: 'reasoning',
  steps: [
    { id: 'context', name: '理解上下文', description: '理解上下文 (Context)' },
    { id: 'analyze', name: '分析问题', description: '分析问题 (Analyze)' },
    { id: 'generate', name: '生成方案', description: '生成方案 (Generate)' },
    { id: 'evaluate', name: '评估方案', description: '评估方案 (Evaluate)' },
    { id: 'execute', name: '执行方案', description: '执行方案 (Execute)' },
    { id: 'refine', name: '优化改进', description: '优化改进 (Refine)' },
    { id: 'feedback', name: '反馈总结', description: '反馈总结 (Feedback)' },
  ],
  metadata: {
    framework: 'CAGEERF',
    version: '1.0.0',
  },
};

export const GenerationSkill: Skill = {
  id: 'core.generation.content',
  name: '内容生成器',
  description: '根据提示生成文本、代码、文档等内容',
  category: 'generation',
  steps: [
    { id: 'analyze', name: '分析需求', description: '分析生成需求' },
    { id: 'generate', name: '生成内容', description: '生成内容' },
    { id: 'validate', name: '验证质量', description: '验证生成质量' },
  ],
  metadata: {
    supportedTypes: ['text', 'code', 'document', 'markdown'],
    version: '1.0.0',
  },
};

export const AnalysisSkill: Skill = {
  id: 'core.analysis.code',
  name: '代码分析器',
  description: '分析代码质量、性能、安全性等',
  category: 'analysis',
  steps: [
    { id: 'parse', name: '解析代码', description: '解析代码结构' },
    { id: 'quality', name: '质量分析', description: '代码质量分析' },
    { id: 'performance', name: '性能分析', description: '性能分析' },
    { id: 'security', name: '安全检查', description: '安全检查' },
    { id: 'report', name: '生成报告', description: '生成分析报告' },
  ],
  metadata: {
    supportedLanguages: ['typescript', 'javascript', 'python', 'go', 'rust'],
    version: '1.0.0',
  },
};

export const AutomationSkill: Skill = {
  id: 'core.automation.workflow',
  name: '工作流自动化',
  description: '自动化执行重复性任务和工作流',
  category: 'automation',
  steps: [
    { id: 'plan', name: '规划工作流', description: '规划工作流步骤' },
    { id: 'execute', name: '执行任务', description: '执行自动化任务' },
    { id: 'monitor', name: '监控进度', description: '监控执行进度' },
    { id: 'report', name: '生成报告', description: '生成执行报告' },
  ],
  metadata: {
    version: '1.0.0',
  },
};

export const IntegrationSkill: Skill = {
  id: 'core.integration.api',
  name: 'API集成器',
  description: '集成外部API和服务',
  category: 'integration',
  steps: [
    { id: 'discover', name: '发现API', description: '发现和解析API' },
    { id: 'connect', name: '建立连接', description: '建立API连接' },
    { id: 'transform', name: '数据转换', description: '数据格式转换' },
    { id: 'sync', name: '数据同步', description: '数据同步' },
  ],
  metadata: {
    version: '1.0.0',
  },
};

export const BuiltinSkills: Skill[] = [
  ReasoningSkill,
  GenerationSkill,
  AnalysisSkill,
  AutomationSkill,
  IntegrationSkill,
];
