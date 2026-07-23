/**
 * @description YYC³ Skills注册表
 * @module @yyc3/skills-registry/registry
 * 
 * 支持146个渐进式技能的注册、发现、分类管理
 */

import type {
  SkillDefinition,
  SkillCategory,
  SkillSearchOptions,
  SkillRegistryStats,
  SkillTrigger,
} from './types.js';

export class SkillsRegistry {
  private skills: Map<string, SkillDefinition> = new Map();
  private categoryIndex: Map<SkillCategory, Set<string>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private triggerIndex: Map<string, Set<string>> = new Map();
  private initialized: boolean = false;

  constructor() {
    this.initializeIndexes();
  }

  private initializeIndexes(): void {
    const categories: SkillCategory[] = [
      'development', 'ai', 'devops', 'security', 'testing',
      'documentation', 'optimization', 'collaboration', 'analysis', 'automation'
    ];
    for (const cat of categories) {
      this.categoryIndex.set(cat, new Set());
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
  }

  register(skill: SkillDefinition): void {
    this.skills.set(skill.id, skill);

    if (skill.category) {
      this.categoryIndex.get(skill.category)?.add(skill.id);
    }

    for (const tag of skill.tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)?.add(skill.id);
    }

    for (const trigger of skill.triggers) {
      const key = `${trigger.type}:${trigger.value}`;
      if (!this.triggerIndex.has(key)) {
        this.triggerIndex.set(key, new Set());
      }
      this.triggerIndex.get(key)?.add(skill.id);
    }
  }

  unregister(id: string): boolean {
    const skill = this.skills.get(id);
    if (!skill) return false;

    this.skills.delete(id);

    if (skill.category) {
      this.categoryIndex.get(skill.category)?.delete(id);
    }

    for (const tag of skill.tags) {
      this.tagIndex.get(tag)?.delete(id);
    }

    for (const trigger of skill.triggers) {
      const key = `${trigger.type}:${trigger.value}`;
      this.triggerIndex.get(key)?.delete(id);
    }

    return true;
  }

  get(id: string): SkillDefinition | undefined {
    return this.skills.get(id);
  }

  getAll(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  search(options: SkillSearchOptions = {}): SkillDefinition[] {
    let results = Array.from(this.skills.values());

    if (options.query) {
      const query = options.query.toLowerCase();
      results = results.filter(skill =>
        skill.name.toLowerCase().includes(query) ||
        skill.description.toLowerCase().includes(query) ||
        skill.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (options.category) {
      results = results.filter(skill => skill.category === options.category);
    }

    if (options.tags && options.tags.length > 0) {
      results = results.filter(skill =>
        options.tags!.some(tag => skill.tags.includes(tag))
      );
    }

    if (options.difficulty) {
      results = results.filter(skill =>
        skill.metadata?.difficulty === options.difficulty
      );
    }

    const offset = options.offset || 0;
    const limit = options.limit || results.length;

    return results.slice(offset, offset + limit);
  }

  getByCategory(category: SkillCategory): SkillDefinition[] {
    const ids = this.categoryIndex.get(category);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.skills.get(id)!)
      .filter(Boolean);
  }

  getByTag(tag: string): SkillDefinition[] {
    const ids = this.tagIndex.get(tag);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.skills.get(id)!)
      .filter(Boolean);
  }

  findByTrigger(type: SkillTrigger['type'], value: string): SkillDefinition[] {
    const key = `${type}:${value}`;
    const ids = this.triggerIndex.get(key);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.skills.get(id)!)
      .filter(Boolean)
      .sort((a, b) => {
        const aTrigger = a.triggers.find(t => t.type === type && t.value === value);
        const bTrigger = b.triggers.find(t => t.type === type && t.value === value);
        return (bTrigger?.priority || 0) - (aTrigger?.priority || 0);
      });
  }

  getStats(): SkillRegistryStats {
    const stats: SkillRegistryStats = {
      totalSkills: this.skills.size,
      byCategory: {} as Record<SkillCategory, number>,
      byDifficulty: {},
      tagsCount: {},
    };

    for (const [category, ids] of this.categoryIndex) {
      stats.byCategory[category] = ids.size;
    }

    for (const skill of this.skills.values()) {
      const difficulty = skill.metadata?.difficulty || 'unknown';
      stats.byDifficulty[difficulty] = (stats.byDifficulty[difficulty] || 0) + 1;
    }

    for (const [tag, ids] of this.tagIndex) {
      stats.tagsCount[tag] = ids.size;
    }

    return stats;
  }

  getCategories(): SkillCategory[] {
    return Array.from(this.categoryIndex.keys());
  }

  getTags(): string[] {
    return Array.from(this.tagIndex.keys());
  }

  bulkRegister(skills: SkillDefinition[]): void {
    for (const skill of skills) {
      this.register(skill);
    }
  }

  exportRegistry(): SkillDefinition[] {
    return this.getAll();
  }

  importRegistry(skills: SkillDefinition[]): void {
    this.bulkRegister(skills);
  }

  validate(skill: SkillDefinition): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!skill.id || skill.id.trim() === '') {
      errors.push('Skill ID is required');
    }

    if (!skill.name || skill.name.trim() === '') {
      errors.push('Skill name is required');
    }

    if (!skill.description || skill.description.trim() === '') {
      errors.push('Skill description is required');
    }

    if (!skill.steps || skill.steps.length === 0) {
      errors.push('Skill must have at least one step');
    }

    for (const step of skill.steps || []) {
      if (!step.id || step.id.trim() === '') {
        errors.push(`Step missing ID`);
      }
      if (!step.action || step.action.trim() === '') {
        errors.push(`Step ${step.id} missing action`);
      }
    }

    for (const param of skill.parameters || []) {
      if (!param.name || param.name.trim() === '') {
        errors.push('Parameter missing name');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const globalSkillsRegistry = new SkillsRegistry();
