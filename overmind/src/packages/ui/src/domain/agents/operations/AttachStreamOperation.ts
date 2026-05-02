import { singleton } from 'tsyringe';
import { AgentGateway } from '../../../gateway/agent-gateway.js';
import { AgentsStore } from '../state/agents-store.js';

@singleton()
export class AttachStreamOperation {
  constructor(
    private readonly agentGateway: AgentGateway,
    private readonly agentsStore: AgentsStore,
  ) {}

  execute(agentId: string): () => void {
    return this.agentGateway.attachStream(agentId, (chunk, done) => {
      this.agentsStore.getStore().appendStream(agentId, chunk);
      if (done) {
        // Stream has ended; caller may decide to detach
      }
    });
  }
}
