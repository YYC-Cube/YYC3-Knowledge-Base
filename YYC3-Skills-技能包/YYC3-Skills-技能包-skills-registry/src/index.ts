/**
 * @description YYC³ Skills注册中心
 * @module @yyc3/skills-registry
 * 
 * 支持146个渐进式技能的完整实现
 * 包含注册表、执行器、渐进式知识披露
 */

import type {
  SkillDefinition,
  SkillExecutionContext,
  SkillResult,
  SkillConfig,
  SkillSearchOptions,
  SkillRegistryStats,
  ProgressiveDisclosure,
} from './types.js';
import { SkillsRegistry, globalSkillsRegistry } from './registry.js';
import { SkillExecutor, globalSkillExecutor } from './executor.js';
import { ProgressiveDisclosureManager, globalProgressiveManager } from './progressive.js';

export * from './types.js';
export * from './registry.js';
export * from './executor.js';
export * from './progressive.js';

export interface SkillsManagerConfig {
  registry?: SkillsRegistry;
  executor?: SkillExecutor;
  progressiveManager?: ProgressiveDisclosureManager;
  config?: Partial<SkillConfig>;
}

export class SkillsManager {
  private registry: SkillsRegistry;
  private executor: SkillExecutor;
  private progressiveManager: ProgressiveDisclosureManager;
  private initialized: boolean = false;

  constructor(config: SkillsManagerConfig = {}) {
    this.registry = config.registry || globalSkillsRegistry;
    this.executor = config.executor || globalSkillExecutor;
    this.progressiveManager = config.progressiveManager || globalProgressiveManager;

    if (config.config) {
      this.executor.updateConfig(config.config);
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.registry.initialize();

    for (const skill of this.registry.getAll()) {
      this.progressiveManager.generateDisclosure(skill);
    }

    this.initialized = true;
  }

  registerSkill(skill: SkillDefinition): void {
    const validation = this.registry.validate(skill);
    if (!validation.valid) {
      throw new Error(`Invalid skill: ${validation.errors.join(', ')}`);
    }

    this.registry.register(skill);
    this.progressiveManager.generateDisclosure(skill);
  }

  unregisterSkill(id: string): boolean {
    return this.registry.unregister(id);
  }

  getSkill(id: string): SkillDefinition | undefined {
    return this.registry.get(id);
  }

  getAllSkills(): SkillDefinition[] {
    return this.registry.getAll();
  }

  searchSkills(options: SkillSearchOptions): SkillDefinition[] {
    return this.registry.search(options);
  }

  async executeSkill(
    skillId: string,
    variables: Record<string, unknown> = {},
    metadata: Record<string, unknown> = {}
  ): Promise<SkillResult> {
    const skill = this.registry.get(skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    const context: SkillExecutionContext = {
      sessionId: `session-${Date.now()}`,
      variables,
      history: [],
      metadata,
    };

    return this.executor.execute(skill, context);
  }

  getProgressiveDisclosure(skillId: string): ProgressiveDisclosure | undefined {
    return this.progressiveManager.getDisclosure(skillId);
  }

  getSkillForTokenBudget(
    skillId: string,
    maxTokens: number
  ): { skill: SkillDefinition; levels: ReturnType<ProgressiveDisclosureManager['getProgressiveContent']> } | undefined {
    const skill = this.registry.get(skillId);
    if (!skill) return undefined;

    const levels = this.progressiveManager.getProgressiveContent(skillId, {
      currentLevel: 1,
      requestedTokens: maxTokens,
    });

    return { skill, levels };
  }

  getStats(): SkillRegistryStats {
    return this.registry.getStats();
  }

  getRegistry(): SkillsRegistry {
    return this.registry;
  }

  getExecutor(): SkillExecutor {
    return this.executor;
  }

  getProgressiveManager(): ProgressiveDisclosureManager {
    return this.progressiveManager;
  }
}

export const globalSkillsManager = new SkillsManager();

export function createSkillsManager(config?: SkillsManagerConfig): SkillsManager {
  return new SkillsManager(config);
}

import { DEFAULT_SKILL_CONFIG, CAGEERF_STAGES } from './types.js';

export const builtinSkills: SkillDefinition[] = [
  {
    id: 'code-generation',
    name: '代码生成',
    description: '根据需求描述生成高质量代码',
    version: '1.0.0',
    category: 'development',
    tags: ['code', 'generation', 'ai'],
    triggers: [
      { type: 'keyword', value: '生成代码', priority: 10 },
      { type: 'keyword', value: '写代码', priority: 9 },
    ],
    parameters: [
      {
        name: 'language',
        type: 'string',
        required: true,
        description: '目标编程语言',
      },
      {
        name: 'description',
        type: 'string',
        required: true,
        description: '代码功能描述',
      },
      {
        name: 'style',
        type: 'string',
        required: false,
        default: 'clean',
        description: '代码风格',
      },
    ],
    steps: [
      {
        id: 'analyze',
        name: '分析需求',
        action: 'default',
        input: { type: 'analyze' },
        output: 'requirements',
        onError: 'stop',
      },
      {
        id: 'generate',
        name: '生成代码',
        action: 'default',
        input: { type: 'generate' },
        output: 'code',
        onError: 'retry',
        retryCount: 3,
      },
      {
        id: 'validate',
        name: '验证代码',
        action: 'validate',
        input: { source: 'code' },
        output: 'validation',
        onError: 'continue',
      },
    ],
    gates: [
      {
        id: 'syntax-check',
        name: '语法检查',
        criteria: [{ type: 'output_check', condition: 'valid' }],
        severity: 'critical',
        passAction: 'block',
      },
    ],
    metadata: {
      difficulty: 'intermediate',
      estimatedTime: 30,
    },
  },
  {
    id: 'code-review',
    name: '代码审查',
    description: '对代码进行全面的质量审查',
    version: '1.0.0',
    category: 'development',
    tags: ['review', 'quality', 'security'],
    triggers: [
      { type: 'keyword', value: '审查代码', priority: 10 },
      { type: 'keyword', value: '代码审查', priority: 10 },
    ],
    parameters: [
      {
        name: 'code',
        type: 'string',
        required: true,
        description: '待审查的代码',
      },
      {
        name: 'focus',
        type: 'string',
        required: false,
        default: 'all',
        description: '审查重点',
      },
    ],
    steps: [
      {
        id: 'parse',
        name: '解析代码',
        action: 'default',
        input: { type: 'parse' },
        output: 'ast',
        onError: 'stop',
      },
      {
        id: 'analyze',
        name: '分析代码',
        action: 'default',
        input: { type: 'analyze' },
        output: 'analysis',
        onError: 'continue',
      },
      {
        id: 'report',
        name: '生成报告',
        action: 'transform',
        input: { source: 'analysis' },
        output: 'report',
        onError: 'continue',
      },
    ],
    metadata: {
      difficulty: 'intermediate',
      estimatedTime: 20,
    },
  },
  {
    id: 'refactoring',
    name: '代码重构',
    description: '智能重构代码以提升质量',
    version: '1.0.0',
    category: 'optimization',
    tags: ['refactor', 'clean-code', 'patterns'],
    triggers: [
      { type: 'keyword', value: '重构', priority: 10 },
      { type: 'keyword', value: '优化代码', priority: 9 },
    ],
    parameters: [
      {
        name: 'code',
        type: 'string',
        required: true,
        description: '待重构的代码',
      },
      {
        name: 'goals',
        type: 'array',
        required: false,
        default: ['readability', 'performance'],
        description: '重构目标',
      },
    ],
    steps: [
      {
        id: 'analyze',
        name: '分析代码结构',
        action: 'default',
        input: { type: 'analyze' },
        output: 'structure',
        onError: 'stop',
      },
      {
        id: 'identify',
        name: '识别重构点',
        action: 'default',
        input: { type: 'identify' },
        output: 'refactorPoints',
        onError: 'continue',
      },
      {
        id: 'apply',
        name: '应用重构',
        action: 'default',
        input: { type: 'apply' },
        output: 'refactoredCode',
        onError: 'retry',
        retryCount: 2,
      },
    ],
    metadata: {
      difficulty: 'advanced',
      estimatedTime: 45,
    },
  },
  {
    id: 'testing',
    name: '测试生成',
    description: '自动生成单元测试和集成测试',
    version: '1.0.0',
    category: 'testing',
    tags: ['test', 'unit-test', 'integration'],
    triggers: [
      { type: 'keyword', value: '生成测试', priority: 10 },
      { type: 'keyword', value: '写测试', priority: 9 },
    ],
    parameters: [
      {
        name: 'code',
        type: 'string',
        required: true,
        description: '待测试的代码',
      },
      {
        name: 'framework',
        type: 'string',
        required: false,
        default: 'jest',
        description: '测试框架',
      },
      {
        name: 'coverage',
        type: 'number',
        required: false,
        default: 80,
        description: '目标覆盖率',
      },
    ],
    steps: [
      {
        id: 'analyze',
        name: '分析代码',
        action: 'default',
        input: { type: 'analyze' },
        output: 'codeAnalysis',
        onError: 'stop',
      },
      {
        id: 'generate',
        name: '生成测试用例',
        action: 'default',
        input: { type: 'generate' },
        output: 'testCases',
        onError: 'continue',
      },
      {
        id: 'validate',
        name: '验证测试',
        action: 'validate',
        input: { source: 'testCases' },
        output: 'validation',
        onError: 'continue',
      },
    ],
    metadata: {
      difficulty: 'intermediate',
      estimatedTime: 25,
    },
  },
  {
    id: 'documentation',
    name: '文档生成',
    description: '自动生成代码文档和API文档',
    version: '1.0.0',
    category: 'documentation',
    tags: ['docs', 'api', 'readme'],
    triggers: [
      { type: 'keyword', value: '生成文档', priority: 10 },
      { type: 'keyword', value: '写文档', priority: 9 },
    ],
    parameters: [
      {
        name: 'code',
        type: 'string',
        required: true,
        description: '待文档化的代码',
      },
      {
        name: 'format',
        type: 'string',
        required: false,
        default: 'markdown',
        description: '文档格式',
      },
    ],
    steps: [
      {
        id: 'parse',
        name: '解析代码',
        action: 'default',
        input: { type: 'parse' },
        output: 'parsed',
        onError: 'stop',
      },
      {
        id: 'extract',
        name: '提取信息',
        action: 'transform',
        input: { source: 'parsed' },
        output: 'extracted',
        onError: 'continue',
      },
      {
        id: 'generate',
        name: '生成文档',
        action: 'default',
        input: { type: 'generate' },
        output: 'documentation',
        onError: 'continue',
      },
    ],
    metadata: {
      difficulty: 'beginner',
      estimatedTime: 15,
    },
  },
];

for (const skill of builtinSkills) {
  globalSkillsRegistry.register(skill);
}
