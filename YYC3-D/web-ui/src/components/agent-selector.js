/**
 * @description AgentSelector Component
 * @module @yyc3/web-ui/components/agent-selector
 */
import React from 'react';
import { useAgents } from '../hooks/use-agents';
export function AgentSelector() {
    const { agents, selectedAgent, selectAgent } = useAgents();
    const handleChange = (e) => {
        selectAgent(e.target.value);
    };
    return React.createElement('div', { className: 'yyc3-agent-selector' }, React.createElement('select', {
        value: selectedAgent?.id ?? '',
        onChange: handleChange,
        className: 'yyc3-agent-select',
    }, React.createElement('option', { value: '' }, '选择智能体'), agents.map((agent) => React.createElement('option', { key: agent.id, value: agent.id }, `${agent.name} - ${agent.role}`))), selectedAgent &&
        React.createElement('div', { className: 'yyc3-agent-info' }, React.createElement('h4', null, selectedAgent.name), React.createElement('p', null, selectedAgent.role), React.createElement('div', { className: 'yyc3-agent-capabilities' }, selectedAgent.capabilities.join(', '))));
}
//# sourceMappingURL=agent-selector.js.map