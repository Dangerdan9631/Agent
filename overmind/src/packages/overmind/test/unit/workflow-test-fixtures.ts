export interface WorkflowFixtureState {
  name: string;
  command: string;
  next: string;
  branches: Array<{ when: Record<string, string>; next: string }>;
  onError?: string;
}

export interface WorkflowFixtureConfig {
  workflows: Array<{ name: string; initialState: string }>;
  states: WorkflowFixtureState[];
  outputs: Record<string, string>;
  failingCommands?: Set<string>;
}

export interface WorkflowFixtureCerebrate {
  name: string;
  workflow: { name: string; initialState: string };
  outputs: Record<string, string>;
  failingCommands: Set<string>;
  getWorkflowDefinition(workflowName: string): { name: string; initialState: string } | undefined;
  getWorkflowStateDefinition(stateName: string): WorkflowFixtureState | undefined;
}

export interface WorkflowFixtureOutputSink {
  lines: string[];
  append(event: { line: string }): void;
  subscribe(): () => void;
}

export function createWorkflowFixture(config: WorkflowFixtureConfig): {
  cerebrate: WorkflowFixtureCerebrate;
  outputSink: WorkflowFixtureOutputSink;
} {
  const outputSink = createWorkflowFixtureOutputSink();

  return {
    cerebrate: {
      name: 'hello',
      workflow: config.workflows[0]!,
      outputs: config.outputs,
      failingCommands: config.failingCommands ?? new Set<string>(),
      getWorkflowDefinition(workflowName: string) {
        return config.workflows.find((workflow) => workflow.name === workflowName);
      },
      getWorkflowStateDefinition(stateName: string) {
        return config.states.find((state) => state.name === stateName);
      },
    },
    outputSink,
  };
}

export function createWorkflowFixtureOutputSink(): WorkflowFixtureOutputSink {
  const lines: string[] = [];

  return {
    lines,
    append(event: { line: string }) {
      lines.push(event.line);
    },
    subscribe() {
      return () => undefined;
    },
  };
}
