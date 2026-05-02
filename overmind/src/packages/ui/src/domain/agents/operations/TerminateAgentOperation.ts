import { singleton } from 'tsyringe';
import { AgentGateway } from '../../../gateway/agent-gateway.js';
import { AgentsStore } from '../state/agents-store.js';

@singleton()
export class TerminateAgentOperation {
  constructor(
    private readonly agentGateway: AgentGateway,
    private readonly agentsStore: AgentsStore,
  ) {}

  async execute(agentId: string): Promise<void> {
    await this.agentGateway.terminateAgent(agentId);
    this.agentsStore.getStore().removeAgent(agentId);
  }
}
