import React from 'react';
import { useAppShellViewModel } from './use-app-shell-viewmodel.js';
import { AgentWindow } from '../agent-window/AgentWindow.js';
import { ServiceStats } from '../service-stats/ServiceStats.js';
import type { AgentType } from 'overmind';

const AGENT_TYPES: AgentType[] = [
  'cursor-sdk',
  'gemini-cli',
  'codex-cli',
  'claude-cli',
  'copilot-cli',
  'windsurf-cli',
];

export function AppShell(): React.ReactElement {
  const { agents, onCreateAgent, onTerminateAgent } = useAppShellViewModel();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header style={{ padding: '8px 16px', borderBottom: '1px solid #333' }}>
        <strong>Overmind</strong>
        <span style={{ marginLeft: 16 }}>
          {AGENT_TYPES.map((type) => (
            <button key={type} onClick={() => onCreateAgent(type)} style={{ marginRight: 4 }}>
              + {type}
            </button>
          ))}
        </span>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', overflow: 'auto', gap: 8, padding: 8 }}>
          {agents.map((agent) => (
            <AgentWindow
              key={agent.id}
              agentId={agent.id}
              onClose={() => onTerminateAgent(agent.id)}
            />
          ))}
        </div>
        <ServiceStats />
      </div>
    </div>
  );
}
