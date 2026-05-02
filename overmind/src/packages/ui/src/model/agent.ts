// UI-layer type extensions on top of core models.
// Core types (AgentInfo, AgentType, AgentState, etc.) are used directly from 'overmind'.
export type { AgentInfo, AgentId, AgentType, AgentState } from 'overmind';

export interface AgentViewModel {
  id: string;
  type: string;
  state: string;
  createdAt: number;
  streamBuffer: string;
  isActive: boolean;
}
