/**
 * @description YYC³ Agents - 229个专业Agent服务
 * @module @yyc3/agents
 * @author YanYuCloudCube Team
 * @version 1.0.0
 */

export { AgentManager } from './manager';
export type { 
  Agent, 
  AgentCapability, 
  AgentConfig,
  AgentResult 
} from './types';

export { AgentOrchestrator } from './orchestrator';
export type { 
  OrchestratorConfig, 
  CollaborationResult,
  TaskAssignment 
} from './orchestrator';

export { AgentRouter } from './router';
export type { RoutingResult } from './router';
