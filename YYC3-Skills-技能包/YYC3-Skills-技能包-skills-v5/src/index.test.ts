import { describe, it, expect } from 'vitest';
import { SkillManager, SkillExecutor, SkillChain } from '../src/index';
import type { Skill, SkillParameter, SkillStep, ChainConfig } from '../src/index';

describe('Skills System', () => {
  describe('SkillManager', () => {
    it('should create a skill manager', () => {
      const manager = new SkillManager();
      expect(manager).toBeDefined();
    });

    it('should register a skill', () => {
      const manager = new SkillManager();
      const parameters: SkillParameter[] = [];
      const steps: SkillStep[] = [];
      const skill: Skill = {
        id: 'test-skill',
        name: 'Test Skill',
        description: 'A test skill',
        version: '1.0.0',
        category: 'development',
        triggers: [],
        parameters,
        steps,
      };
      manager.register(skill);
      const retrieved = manager.get('test-skill');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Skill');
    });

    it('should list all skills', () => {
      const manager = new SkillManager();
      const parameters: SkillParameter[] = [];
      const steps: SkillStep[] = [];
      manager.register({
        id: 'skill-1',
        name: 'Skill 1',
        description: 'First skill',
        version: '1.0.0',
        category: 'development',
        triggers: [],
        parameters,
        steps,
      });
      manager.register({
        id: 'skill-2',
        name: 'Skill 2',
        description: 'Second skill',
        version: '1.0.0',
        category: 'testing',
        triggers: [],
        parameters,
        steps,
      });
      const skills = manager.getAll();
      expect(skills).toHaveLength(2);
    });

    it('should filter skills by category', () => {
      const manager = new SkillManager();
      const parameters: SkillParameter[] = [];
      const steps: SkillStep[] = [];
      manager.register({
        id: 'skill-1',
        name: 'Skill 1',
        description: 'First skill',
        version: '1.0.0',
        category: 'development',
        triggers: [],
        parameters,
        steps,
      });
      manager.register({
        id: 'skill-2',
        name: 'Skill 2',
        description: 'Second skill',
        version: '1.0.0',
        category: 'testing',
        triggers: [],
        parameters,
        steps,
      });
      const devSkills = manager.getByCategory('development');
      expect(devSkills).toHaveLength(1);
      expect(devSkills[0].category).toBe('development');
    });

    it('should execute a skill', async () => {
      const manager = new SkillManager();
      const parameters: SkillParameter[] = [];
      const steps: SkillStep[] = [
        { id: 'step-1', name: 'Step 1', action: 'test', input: {}, output: 'result', onError: 'stop' }
      ];
      manager.register({
        id: 'test-skill',
        name: 'Test Skill',
        description: 'A test skill',
        version: '1.0.0',
        category: 'development',
        triggers: [],
        parameters,
        steps,
      });
      const result = await manager.execute('test-skill', { input: 'test' });
      expect(result.success).toBe(true);
    });
  });

  describe('SkillExecutor', () => {
    it('should create a skill executor', () => {
      const executor = new SkillExecutor();
      expect(executor).toBeDefined();
    });

    it('should have execute method', () => {
      const executor = new SkillExecutor();
      expect(typeof executor.execute).toBe('function');
    });
  });

  describe('SkillChain', () => {
    it('should create a skill chain', () => {
      const config: ChainConfig = {
        id: 'test-chain',
        name: 'Test Chain',
        description: 'A test chain',
        steps: [],
      };
      const chain = new SkillChain(config);
      expect(chain).toBeDefined();
    });

    it('should execute chain', async () => {
      const config: ChainConfig = {
        id: 'test-chain',
        name: 'Test Chain',
        description: 'A test chain',
        steps: [
          {
            skillId: 'skill-1',
            input: {},
            outputKey: 'result1',
          },
        ],
      };
      const chain = new SkillChain(config);
      const result = await chain.execute({ initial: 'value' });
      expect(result.success).toBe(true);
    });
  });
});
