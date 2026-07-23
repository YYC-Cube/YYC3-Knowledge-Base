/**
 * @description useAgents Hook
 * @module @yyc3/web-ui/hooks/use-agents
 */

import { useState, useEffect, useCallback } from 'react';
import { useYYC3Context } from '../provider';

interface Agent {
  id: string;
  name: string;
  role: string;
  capabilities: string[];
}

export function useAgents() {
  const { hub } = useYYC3Context();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  useEffect(() => {
    if (hub) {
      setAgents([
        { id: 'meta-oracle', name: '元启·天枢', role: '总指挥', capabilities: ['intent-analysis', 'task-decomposition'] },
        { id: 'navigator', name: '言启·千行', role: '导航员', capabilities: ['navigation', 'path-planning'] },
        { id: 'thinker', name: '语枢·万物', role: '思考者', capabilities: ['analysis', 'reasoning'] },
        { id: 'prophet', name: '预见·先知', role: '预言家', capabilities: ['prediction', 'risk-assessment'] },
        { id: 'bolero', name: '知遇·伯乐', role: '推荐官', capabilities: ['recommendation', 'personalization'] },
        { id: 'sentinel', name: '智云·守护', role: '安全官', capabilities: ['security', 'compliance'] },
        { id: 'master', name: '格物·宗师', role: '质量官', capabilities: ['quality', 'review'] },
        { id: 'creative', name: '创想·灵韵', role: '创意官', capabilities: ['creative', 'innovation'] },
      ]);
    }
  }, [hub]);

  const selectAgent = useCallback((agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    if (agent) {
      setSelectedAgent(agent);
    }
  }, [agents]);

  return {
    agents,
    selectedAgent,
    selectAgent,
  };
}
