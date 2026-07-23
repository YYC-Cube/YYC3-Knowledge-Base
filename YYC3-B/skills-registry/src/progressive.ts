/**
 * @description YYC³ 渐进式知识披露系统
 * @module @yyc3/skills-registry/progressive
 * 
 * 实现四级渐进式知识披露架构
 * Level 1: 概述 (~100 tokens)
 * Level 2: 核心模式 (~500 tokens)
 * Level 3: 实现 (~2000 tokens)
 * Level 4: 高级技术 (~5000 tokens)
 */

import type {
  SkillDefinition,
  ProgressiveDisclosure,
  SkillOverviewLevel,
  CorePatternsLevel,
  ImplementationLevel,
  AdvancedTechniquesLevel,
  SkillPattern,
  SkillStep,
} from './types.js';

export interface ProgressiveLevel {
  level: 1 | 2 | 3 | 4;
  name: string;
  content: string;
  tokenEstimate: number;
}

export interface DisclosureContext {
  currentLevel: number;
  requestedTokens: number;
  focusAreas?: string[];
  skipSections?: string[];
}

export class ProgressiveDisclosureManager {
  private disclosures: Map<string, ProgressiveDisclosure> = new Map();

  generateDisclosure(skill: SkillDefinition): ProgressiveDisclosure {
    const disclosure: ProgressiveDisclosure = {
      level1: this.generateLevel1(skill),
      level2: this.generateLevel2(skill),
      level3: this.generateLevel3(skill),
      level4: this.generateLevel4(skill),
    };

    this.disclosures.set(skill.id, disclosure);
    return disclosure;
  }

  private generateLevel1(skill: SkillDefinition): SkillOverviewLevel {
    const useCases = this.extractUseCases(skill);
    
    return {
      name: skill.name,
      description: skill.description,
      useCases,
      tokenEstimate: 100,
    };
  }

  private generateLevel2(skill: SkillDefinition): CorePatternsLevel {
    const patterns = this.extractPatterns(skill);
    const bestPractices = this.extractBestPractices(skill);

    return {
      patterns,
      bestPractices,
      tokenEstimate: 500,
    };
  }

  private generateLevel3(skill: SkillDefinition): ImplementationLevel {
    const steps = skill.steps || [];
    const codeExamples = this.generateCodeExamples(skill);

    return {
      steps,
      codeExamples,
      tokenEstimate: 2000,
    };
  }

  private generateLevel4(skill: SkillDefinition): AdvancedTechniquesLevel {
    const optimizations = this.extractOptimizations(skill);
    const edgeCases = this.extractEdgeCases(skill);
    const integrations = this.extractIntegrations(skill);

    return {
      optimizations,
      edgeCases,
      integrations,
      tokenEstimate: 5000,
    };
  }

  private extractUseCases(skill: SkillDefinition): string[] {
    const useCases: string[] = [];

    if (skill.examples) {
      for (const example of skill.examples) {
        useCases.push(example.description);
      }
    }

    if (useCases.length === 0) {
      useCases.push(`使用${skill.name}处理相关任务`);
    }

    return useCases.slice(0, 5);
  }

  private extractPatterns(skill: SkillDefinition): SkillPattern[] {
    const patterns: SkillPattern[] = [];

    for (const step of skill.steps || []) {
      patterns.push({
        name: step.name,
        description: step.description || step.action,
        template: this.generatePatternTemplate(step),
      });
    }

    return patterns;
  }

  private generatePatternTemplate(step: SkillStep): string {
    return `// ${step.name}
await executeStep({
  action: "${step.action}",
  input: ${JSON.stringify(step.input, null, 2)}
});`;
  }

  private extractBestPractices(skill: SkillDefinition): string[] {
    const practices: string[] = [];

    if (skill.gates) {
      for (const gate of skill.gates) {
        practices.push(`确保${gate.name}: ${gate.criteria.map(c => c.condition).join(', ')}`);
      }
    }

    practices.push('遵循参数验证规范');
    practices.push('处理错误情况');

    return practices;
  }

  private generateCodeExamples(skill: SkillDefinition): string[] {
    const examples: string[] = [];

    if (skill.examples) {
      for (const example of skill.examples) {
        examples.push(`// ${example.description}
const result = await skill.execute(${JSON.stringify(example.input, null, 2)});
// 输出: ${JSON.stringify(example.output)}`);
      }
    }

    if (examples.length === 0) {
      examples.push(`// 使用${skill.name}
const result = await skill.execute({
  // 填入参数
});`);
    }

    return examples;
  }

  private extractOptimizations(skill: SkillDefinition): string[] {
    const optimizations: string[] = [];

    optimizations.push('使用缓存减少重复计算');
    optimizations.push('并行执行独立步骤');

    if (skill.metadata?.dependencies) {
      optimizations.push(`预加载依赖: ${skill.metadata.dependencies.join(', ')}`);
    }

    return optimizations;
  }

  private extractEdgeCases(skill: SkillDefinition): string[] {
    const edgeCases: string[] = [];

    for (const param of skill.parameters || []) {
      if (param.validation) {
        for (const rule of param.validation) {
          edgeCases.push(`参数${param.name}: ${rule.message}`);
        }
      }
    }

    edgeCases.push('处理空输入');
    edgeCases.push('处理超时情况');

    return edgeCases;
  }

  private extractIntegrations(skill: SkillDefinition): string[] {
    const integrations: string[] = [];

    if (skill.metadata?.compatibility) {
      integrations.push(...skill.metadata.compatibility);
    }

    integrations.push('与其他Skills组合使用');
    integrations.push('集成到Agent工作流');

    return integrations;
  }

  getDisclosure(skillId: string): ProgressiveDisclosure | undefined {
    return this.disclosures.get(skillId);
  }

  getLevel(skillId: string, level: 1 | 2 | 3 | 4): ProgressiveLevel | undefined {
    const disclosure = this.disclosures.get(skillId);
    if (!disclosure) return undefined;

    const levelData = disclosure[`level${level}` as keyof ProgressiveDisclosure];
    
    return {
      level,
      name: levelData.name || `Level ${level}`,
      content: this.formatLevelContent(levelData),
      tokenEstimate: levelData.tokenEstimate,
    };
  }

  private formatLevelContent(levelData: SkillOverviewLevel | CorePatternsLevel | ImplementationLevel | AdvancedTechniquesLevel): string {
    if ('description' in levelData) {
      return `${levelData.name}\n${levelData.description}\n\n用例:\n${levelData.useCases.map(u => `- ${u}`).join('\n')}`;
    }

    if ('patterns' in levelData) {
      return `核心模式:\n${levelData.patterns.map(p => `- ${p.name}: ${p.description}`).join('\n')}\n\n最佳实践:\n${levelData.bestPractices.map(b => `- ${b}`).join('\n')}`;
    }

    if ('steps' in levelData) {
      return `实现步骤:\n${levelData.steps.map(s => `${s.id}. ${s.name}`).join('\n')}\n\n代码示例:\n${levelData.codeExamples.join('\n\n')}`;
    }

    if ('optimizations' in levelData) {
      return `优化技巧:\n${levelData.optimizations.map(o => `- ${o}`).join('\n')}\n\n边缘情况:\n${levelData.edgeCases.map(e => `- ${e}`).join('\n')}\n\n集成方案:\n${levelData.integrations.map(i => `- ${i}`).join('\n')}`;
    }

    return '';
  }

  getProgressiveContent(
    skillId: string,
    context: DisclosureContext
  ): ProgressiveLevel[] {
    const disclosure = this.disclosures.get(skillId);
    if (!disclosure) return [];

    const levels: ProgressiveLevel[] = [];
    let currentTokens = 0;

    for (let level = 1; level <= 4; level++) {
      const levelData = this.getLevel(skillId, level as 1 | 2 | 3 | 4);
      if (!levelData) continue;

      if (currentTokens + levelData.tokenEstimate <= context.requestedTokens) {
        levels.push(levelData);
        currentTokens += levelData.tokenEstimate;
      } else {
        break;
      }
    }

    return levels;
  }

  estimateTokens(skillId: string, level: 1 | 2 | 3 | 4): number {
    const disclosure = this.disclosures.get(skillId);
    if (!disclosure) return 0;

    const levelData = disclosure[`level${level}` as keyof ProgressiveDisclosure];
    return levelData?.tokenEstimate || 0;
  }

  getTotalTokens(skillId: string): number {
    let total = 0;
    for (let level = 1; level <= 4; level++) {
      total += this.estimateTokens(skillId, level as 1 | 2 | 3 | 4);
    }
    return total;
  }
}

export const globalProgressiveManager = new ProgressiveDisclosureManager();
