/**
 * @description useAgents Hook
 * @module @yyc3/web-ui/hooks/use-agents
 */
interface Agent {
    id: string;
    name: string;
    role: string;
    capabilities: string[];
}
export declare function useAgents(): {
    agents: Agent[];
    selectedAgent: Agent | null;
    selectAgent: (agentId: string) => void;
};
export {};
//# sourceMappingURL=use-agents.d.ts.map