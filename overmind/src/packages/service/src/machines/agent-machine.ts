import { createMachine, state, transition, interpret } from 'robot3';
// robot3 v1.x API
import type { AgentState } from 'overmind';

export type AgentMachineEvent =
  | 'INITIALIZED'
  | 'SEND_MESSAGE'
  | 'RESPONSE_RECEIVED'
  | 'TERMINATE'
  | 'DONE';

export const agentMachine = createMachine({
  init: state(
    transition('INITIALIZED', 'idle')
  ),
  idle: state(
    transition('SEND_MESSAGE', 'processing'),
    transition('TERMINATE', 'terminating')
  ),
  processing: state(
    transition('RESPONSE_RECEIVED', 'idle')
  ),
  terminating: state(
    transition('DONE', 'terminated')
  ),
  terminated: state(),
});

export type AgentService = ReturnType<typeof interpret>;

export function createAgentService(
  onChange: (currentState: AgentState) => void
): AgentService {
  // robot3 interpret: onChange receives the updated service reference.
  // We wrap it so callers get the current state name directly.
  let service: AgentService;
  service = interpret(agentMachine, (updated: AgentService) => {
    service = updated;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onChange((updated as any).machine.current as AgentState);
  });
  return service;
}

export function getServiceState(service: AgentService): AgentState {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (service as any).machine.current as AgentState;
}
