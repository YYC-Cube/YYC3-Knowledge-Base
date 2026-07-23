/**
 * @description YYC³ Skills 类型定义
 * @module @yyc3/skills/types
 */

export interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  default?: unknown;
  description: string;
}

export interface SkillStep {
  id: string;
  name: string;
  action: string;
  input: Record<string, unknown>;
  output: string;
  onError: 'continue' | 'stop' | 'retry';
}

export interface QualityGate {
  id: string;
  name: string;
  criteria: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  passAction: 'continue' | 'warn' | 'block';
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  category: SkillCategory;
  triggers: string[];
  parameters: SkillParameter[];
  steps: SkillStep[];
  gates?: QualityGate[];
}

export type SkillCategory = 
  | 'development'
  | 'ai'
  | 'devops'
  | 'security'
  | 'testing'
  | 'documentation'
  | 'optimization';

export interface SkillResult {
  success: boolean;
  output: unknown;
  duration: number;
  logs: string[];
  errors: string[];
}

export interface SkillConfig {
  timeout: number;
  retryCount: number;
  retryDelay: number;
  enableGates: boolean;
}
