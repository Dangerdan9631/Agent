import { singleton } from 'tsyringe';
import type { AgentType } from 'overmind';
import { AgentGateway } from '../../../gateway/agent-gateway.js';
import { AgentsStore } from '../state/agents-store.js';

@singleton()
export class CreateAgentOperation {
  constructor(
    private readonly agentGateway: AgentGateway,
    private readonly agentsStore: AgentsStore,
  ) {}

  async execute(type: AgentType): Promise<string> {
    const agent = await this.agentGateway.createAgent(type);
    this.agentsStore.getStore().setAgent(agent);
    return agent.id;
  }
}
