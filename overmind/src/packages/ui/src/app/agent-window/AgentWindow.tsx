import React, { useState } from 'react';
import { useAgentWindowViewModel } from './use-agent-window-viewmodel.js';

interface AgentWindowProps {
  agentId: string;
  onClose: () => void;
}

export function AgentWindow({ agentId, onClose }: AgentWindowProps): React.ReactElement {
  const { agent, streamBuffer, canSendMessage, onSendMessage } = useAgentWindowViewModel(agentId);
  const [input, setInput] = useState('');

  if (!agent) return <div style={{ color: 'red' }}>Agent not found: {agentId}</div>;

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg) return;
    setInput('');
    await onSendMessage(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div style={{ border: '1px solid #555', borderRadius: 4, width: 420, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '4px 8px', borderBottom: '1px solid #555', display: 'flex', justifyContent: 'space-between' }}>
        <span><strong>{agent.type}</strong> — {agent.state}</span>
        <span style={{ fontSize: 10, color: '#888' }}>{agent.id.slice(0, 8)}</span>
        <button onClick={onClose} style={{ marginLeft: 8 }}>✕</button>
      </div>

      <pre style={{ flex: 1, minHeight: 200, maxHeight: 400, overflow: 'auto', padding: 8, margin: 0, fontSize: 12 }}>
        {streamBuffer || '(no output yet)'}
      </pre>

      <div style={{ display: 'flex', padding: 4, borderTop: '1px solid #555' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message..."
          disabled={!canSendMessage}
          style={{ flex: 1 }}
        />
        <button onClick={handleSend} disabled={!canSendMessage} style={{ marginLeft: 4 }}>
          Send
        </button>
      </div>
    </div>
  );
}
