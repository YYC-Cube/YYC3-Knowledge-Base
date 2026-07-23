import { describe, it, expect } from 'vitest';
import { AgentManager, AgentOrchestrator, AgentRouter } from '../src/index';
import type { Agent, AgentCapability, AgentConfig } from '../src/index';

describe('Agents System', () => {
  describe('AgentManager', () => {
    it('should create an agent manager', () => {
      const manager = new AgentManager();
      expect(manager).toBeDefined();
    });

    it('should register an agent', () => {
      const manager = new AgentManager();
      const capabilities: AgentCapability[] = [
        { id: 'test', name: 'Test', description: 'Test capability', proficiency: 0.9 }
      ];
      const config: AgentConfig = { timeout: 30000 };
      const agent: Agent = {
        id: 'test-agent',
        name: 'Test Agent',
        description: 'A test agent',
        version: '1.0.0',
        category: 'backend',
        capabilities,
        skills: [],
        config,
      };
      manager.register(agent);
      const retrieved = manager.get('test-agent');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Agent');
    });

    it('should list all agents', () => {
      const manager = new AgentManager();
      const capabilities: AgentCapability[] = [
        { id: 'test', name: 'Test', description: 'Test capability', proficiency: 0.9 }
      ];
      const config: AgentConfig = { timeout: 30000 };
      manager.register({
        id: 'agent-1',
        name: 'Agent 1',
        description: 'First agent',
        version: '1.0.0',
        category: 'backend',
        capabilities,
        skills: [],
        config,
      });
      manager.register({
        id: 'agent-2',
        name: 'Agent 2',
        description: 'Second agent',
        version: '1.0.0',
        category: 'frontend',
        capabilities,
        skills: [],
        config,
      });
      const agents = manager.getAll();
      expect(agents).toHaveLength(2);
    });

    it('should find agents by category', () => {
      const manager = new AgentManager();
      const capabilities: AgentCapability[] = [
        { id: 'test', name: 'Test', description: 'Test capability', proficiency: 0.9 }
      ];
      const config: AgentConfig = { timeout: 30000 };
      manager.register({
        id: 'agent-1',
        name: 'Agent 1',
        description: 'First agent',
        version: '1.0.0',
        category: 'backend',
        capabilities,
        skills: [],
        config,
      });
      manager.register({
        id: 'agent-2',
        name: 'Agent 2',
        description: 'Second agent',
        version: '1.0.0',
        category: 'frontend',
        capabilities,
        skills: [],
        config,
      });
      const backendAgents = manager.getByCategory('backend');
      expect(backendAgents).toHaveLength(1);
    });

    it('should execute a task', async () => {
      const manager = new AgentManager();
      const capabilities: AgentCapability[] = [
        { id: 'test', name: 'Test', description: 'Test capability', proficiency: 0.9 }
      ];
      const config: AgentConfig = { timeout: 30000 };
      manager.register({
        id: 'test-agent',
        name: 'Test Agent',
        description: 'A test agent',
        version: '1.0.0',
        category: 'backend',
        capabilities,
        skills: [],
        config,
      });
      const result = await manager.execute('test-agent', {
        id: 'task-1',
        type: 'test',
        description: 'Test task',
        input: { query: 'test' },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('AgentOrchestrator', () => {
    it('should create an orchestrator', () => {
      const agents = new Map();
      const orchestrator = new AgentOrchestrator(agents);
      expect(orchestrator).toBeDefined();
    });

    it('should have collaborate method', () => {
      const agents = new Map();
      const orchestrator = new AgentOrchestrator(agents);
      expect(typeof orchestrator.collaborate).toBe('function');
    });

    it('should have assignTasks method', () => {
      const agents = new Map();
      const orchestrator = new AgentOrchestrator(agents);
      expect(typeof orchestrator.assignTasks).toBe('function');
    });
  });

  describe('AgentRouter', () => {
    it('should create a router', () => {
      const agents = new Map();
      const router = new AgentRouter(agents);
      expect(router).toBeDefined();
    });

    it('should have route method', () => {
      const agents = new Map();
      const router = new AgentRouter(agents);
      expect(typeof router.route).toBe('function');
    });
  });
});
