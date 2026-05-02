import { singleton } from 'tsyringe';
import type { AgentType } from 'overmind';
import { AgentsStore } from '../state/agents-store.js';

@singleton()
export class ValidateCanCreateAgent {
  constructor(private readonly agentsStore: AgentsStore) {}

  test(type: AgentType): boolean {
    // For now, always allow. Extend with rate limits or capacity checks.
    void type;
    void this.agentsStore;
    return true;
  }
}
