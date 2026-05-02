import { useStore } from 'zustand';
import { container } from 'tsyringe';
import { AgentsStore } from '../../domain/agents/state/agents-store.js';
import { SendMessageOperation } from '../../domain/agents/operations/SendMessageOperation.js';
import { AttachStreamOperation } from '../../domain/agents/operations/AttachStreamOperation.js';
import { ValidateCanSendMessage } from '../../domain/agents/validations/ValidateCanSendMessage.js';
import { useEffect } from 'react';

export function useAgentWindowViewModel(agentId: string) {
  const agentsStore = container.resolve(AgentsStore);
  const sendMessageOp = container.resolve(SendMessageOperation);
  const attachStreamOp = container.resolve(AttachStreamOperation);
  const validateCanSend = container.resolve(ValidateCanSendMessage);

  const agent = useStore(agentsStore.api, (s) => s.agents[agentId]);
  const streamBuffer = useStore(agentsStore.api, (s) => s.streamBuffers[agentId] ?? '');

  useEffect(() => {
    if (!agent) return;
    const unsubscribe = attachStreamOp.execute(agentId);
    return unsubscribe;
  }, [agentId, agent]);

  const canSendMessage = validateCanSend.test(agentId);

  const onSendMessage = async (content: string) => {
    if (!canSendMessage) return;
    await sendMessageOp.execute(agentId, content);
  };

  return { agent, streamBuffer, canSendMessage, onSendMessage };
}
