import { singleton } from 'tsyringe';
import { createStore } from 'zustand/vanilla';
import { immer } from 'zustand/middleware/immer';
import type { AgentInfo } from 'overmind';

interface AgentsState {
  agents: Record<string, AgentInfo>;
  streamBuffers: Record<string, string>;
  setAgent: (agent: AgentInfo) => void;
  removeAgent: (id: string) => void;
  appendStream: (agentId: string, chunk: string) => void;
  clearStream: (agentId: string) => void;
}

@singleton()
export class AgentsStore {
  private readonly store = createStore<AgentsState>()(
    immer((set) => ({
      agents: {},
      streamBuffers: {},

      setAgent: (agent: AgentInfo) =>
        set((s) => { s.agents[agent.id] = agent; }),

      removeAgent: (id: string) =>
        set((s) => { delete s.agents[id]; }),

      appendStream: (agentId: string, chunk: string) =>
        set((s) => {
          s.streamBuffers[agentId] = (s.streamBuffers[agentId] ?? '') + chunk;
        }),

      clearStream: (agentId: string) =>
        set((s) => { s.streamBuffers[agentId] = ''; }),
    }))
  );

  // Used by React: useStore(agentsStore.api, selector)
  readonly api = this.store;

  // Used by domain layer: agentsStore.getStore().agents
  getStore() {
    return this.store.getState();
  }
}
