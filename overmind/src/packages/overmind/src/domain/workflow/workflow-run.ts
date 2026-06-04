export type WorkflowRunStatus = 'running' | 'completed' | 'failed';

export class WorkflowRun {
  status: WorkflowRunStatus = 'running';
  completedAt: string | undefined;
  lastError: string | undefined;

  constructor(
    readonly cerebrateName: string,
    readonly workflowName: string,
    currentState: string,
    readonly startedAt: string = new Date().toISOString(),
  ) {
    this.currentState = currentState;
  }

  currentState: string;

  transitionTo(nextState: string): void {
    this.currentState = nextState;
  }

  complete(completedAt = new Date().toISOString()): void {
    this.status = 'completed';
    this.completedAt = completedAt;
  }

  fail(lastError: string, completedAt = new Date().toISOString()): void {
    this.status = 'failed';
    this.lastError = lastError;
    this.completedAt = completedAt;
  }
}
