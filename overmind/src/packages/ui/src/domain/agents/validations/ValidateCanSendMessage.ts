import { singleton } from 'tsyringe';
import { AgentsStore } from '../state/agents-store.js';

@singleton()
export class ValidateCanSendMessage {
  constructor(private readonly agentsStore: AgentsStore) {}

  test(agentId: string): boolean {
    const agent = this.agentsStore.getStore().agents[agentId];
    return agent?.state === 'idle';
  }
}
