import { useStore } from 'zustand';
import { container } from 'tsyringe';
import { AgentsStore } from '../../domain/agents/state/agents-store.js';
import { CreateAgentOperation } from '../../domain/agents/operations/CreateAgentOperation.js';
import { TerminateAgentOperation } from '../../domain/agents/operations/TerminateAgentOperation.js';
import { ValidateCanCreateAgent } from '../../domain/agents/validations/ValidateCanCreateAgent.js';
import type { AgentType, AgentInfo } from 'overmind';
import type { AgentViewModel } from '../../model/agent.js';

export function useAppShellViewModel() {
  const agentsStore = container.resolve(AgentsStore);
  const createAgentOp = container.resolve(CreateAgentOperation);
  const terminateAgentOp = container.resolve(TerminateAgentOperation);
  const validateCanCreate = container.resolve(ValidateCanCreateAgent);

  const agentsMap = useStore(agentsStore.api, (s) => s.agents);
  const streamBuffers = useStore(agentsStore.api, (s) => s.streamBuffers);

  const agents: AgentViewModel[] = Object.values(agentsMap).map((a: AgentInfo) => ({
    ...a,
    streamBuffer: streamBuffers[a.id] ?? '',
    isActive: a.state === 'idle' || a.state === 'processing',
  }));

  const canCreateAgent = (type: AgentType) => validateCanCreate.test(type);

  const onCreateAgent = async (type: AgentType) => {
    if (!canCreateAgent(type)) return;
    await createAgentOp.execute(type);
  };

  const onTerminateAgent = async (agentId: string) => {
    await terminateAgentOp.execute(agentId);
  };

  return { agents, canCreateAgent, onCreateAgent, onTerminateAgent };
}
