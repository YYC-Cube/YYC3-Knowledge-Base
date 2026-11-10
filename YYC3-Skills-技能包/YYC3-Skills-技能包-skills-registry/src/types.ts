/**
 * @description YYC³ Skills注册中心类型定义
 * @module @yyc3/skills-registry/types
 * 
 * 支持渐进式知识披露的Skills系统
 * 基于CAGEERF推理框架
 */

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  category: SkillCategory;
  tags: string[];
  triggers: SkillTrigger[];
  parameters: SkillParameter[];
  steps: SkillStep[];
  gates?: QualityGate[];
  examples?: SkillExample[];
  metadata?: SkillMetadata;
}

export type SkillCategory =
  | 'development'
  | 'ai'
  | 'devops'
  | 'security'
  | 'testing'
  | 'documentation'
  | 'optimization'
  | 'collaboration'
  | 'analysis'
  | 'automation';

export interface SkillTrigger {
  type: 'keyword' | 'pattern' | 'context' | 'manual';
  value: string;
  priority: number;
}

export interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  default?: unknown;
  description: string;
  validation?: ValidationRule[];
}

export interface ValidationRule {
  type: 'min' | 'max' | 'pattern' | 'enum' | 'custom';
  value: unknown;
  message: string;
}

export interface SkillStep {
  id: string;
  name: string;
  description?: string;
  action: string;
  input: Record<string, unknown>;
  output: string;
  onError: 'continue' | 'stop' | 'retry';
  retryCount?: number;
  timeout?: number;
}

export interface QualityGate {
  id: string;
  name: string;
  description?: string;
  criteria: QualityCriteria[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  passAction: 'continue' | 'warn' | 'block';
}

export interface QualityCriteria {
  type: 'output_check' | 'state_check' | 'performance' | 'custom';
  condition: string;
  expectedValue?: unknown;
}

export interface SkillExample {
  input: Record<string, unknown>;
  output: unknown;
  description: string;
}

export interface SkillMetadata {
  author?: string;
  createdAt?: string;
  updatedAt?: string;
  dependencies?: string[];
  compatibility?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  estimatedTime?: number;
}

export interface ProgressiveDisclosure {
  level1: SkillOverviewLevel;
  level2: CorePatternsLevel;
  level3: ImplementationLevel;
  level4: AdvancedTechniquesLevel;
}

export interface SkillOverviewLevel {
  name: string;
  description: string;
  useCases: string[];
  tokenEstimate: number;
}

export interface CorePatternsLevel {
  patterns: SkillPattern[];
  bestPractices: string[];
  tokenEstimate: number;
}

export interface ImplementationLevel {
  steps: SkillStep[];
  codeExamples: string[];
  tokenEstimate: number;
}

export interface AdvancedTechniquesLevel {
  optimizations: string[];
  edgeCases: string[];
  integrations: string[];
  tokenEstimate: number;
}

export interface SkillPattern {
  name: string;
  description: string;
  template: string;
}

export interface SkillExecutionContext {
  sessionId: string;
  userId?: string;
  variables: Record<string, unknown>;
  history: SkillExecutionHistory[];
  metadata: Record<string, unknown>;
}

export interface SkillExecutionHistory {
  stepId: string;
  timestamp: number;
  input: Record<string, unknown>;
  output: unknown;
  duration: number;
  success: boolean;
}

export interface SkillResult {
  success: boolean;
  output: unknown;
  duration: number;
  logs: string[];
  errors: string[];
  metrics?: SkillMetrics;
}

export interface SkillMetrics {
  totalSteps: number;
  completedSteps: number;
  skippedSteps: number;
  failedSteps: number;
  totalDuration: number;
  gateResults?: GateResult[];
}

export interface GateResult {
  gateId: string;
  passed: boolean;
  message?: string;
}

export interface SkillConfig {
  timeout: number;
  retryCount: number;
  retryDelay: number;
  enableGates: boolean;
  enableProgressiveDisclosure: boolean;
  maxTokensPerLevel: number;
}

export interface SkillSearchOptions {
  query?: string;
  category?: SkillCategory;
  tags?: string[];
  difficulty?: SkillMetadata['difficulty'];
  limit?: number;
  offset?: number;
}

export interface SkillRegistryStats {
  totalSkills: number;
  byCategory: Record<SkillCategory, number>;
  byDifficulty: Record<string, number>;
  tagsCount: Record<string, number>;
}

export const CAGEERF_STAGES = {
  CONTEXT: 'context',
  ANALYZE: 'analyze',
  GENERATE: 'generate',
  EVALUATE: 'evaluate',
  EXECUTE: 'execute',
  REFINE: 'refine',
  FEEDBACK: 'feedback',
} as const;

export type CAGEERFStage = typeof CAGEERF_STAGES[keyof typeof CAGEERF_STAGES];

export interface CAGEERFContext {
  stage: CAGEERFStage;
  input: unknown;
  context: Record<string, unknown>;
  history: CAGEERFHistory[];
}

export interface CAGEERFHistory {
  stage: CAGEERFStage;
  timestamp: number;
  input: unknown;
  output: unknown;
  duration: number;
}

export const DEFAULT_SKILL_CONFIG: SkillConfig = {
  timeout: 30000,
  retryCount: 3,
  retryDelay: 1000,
  enableGates: true,
  enableProgressiveDisclosure: true,
  maxTokensPerLevel: {
    level1: 100,
    level2: 500,
    level3: 2000,
    level4: 5000,
  } as unknown as number,
};
