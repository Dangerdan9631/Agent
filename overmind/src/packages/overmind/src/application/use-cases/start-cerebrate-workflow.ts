import type {
  StartCerebrateWorkflowRequest,
  StartCerebrateWorkflowResponse,
} from 'overmind-sdk/api';
import { LogLevel } from 'overmind-sdk/logging';

import type { Cerebrate } from '../../domain/cerebrate/cerebrate.js';
import type {
  WorkflowDefinition,
  WorkflowStateDefinition,
} from '../../domain/cerebrate/cerebrate-definition.js';
import { evaluateWorkflowBranch, type WorkflowCommandResult } from '../../domain/workflow/workflow-branch-evaluator.js';
import { WorkflowRun } from '../../domain/workflow/workflow-run.js';
import { CerebrateRegistry } from '../cerebrate-registry.js';
import type { OutputSink } from '../ports/output-sink.js';

export interface WorkflowCommandExecutor {
  execute(request: { cerebrateName: string; command: string }): Promise<{ output: string }>;
}

export class StartCerebrateWorkflowUseCase {
  constructor(
    private readonly registry: CerebrateRegistry<Cerebrate>,
    private readonly commandExecutor: WorkflowCommandExecutor,
    private readonly outputSink: OutputSink,
  ) {}

  async execute(
    request: StartCerebrateWorkflowRequest,
  ): Promise<StartCerebrateWorkflowResponse> {
    const cerebrate = this.registry.get(request.cerebrateName);
    if (!cerebrate) {
      throw new Error(`Cerebrate "${request.cerebrateName}" is not running.`);
    }

    const workflow = cerebrate.getWorkflowDefinition(request.workflowName);
    if (!workflow) {
      throw new Error(
        `Workflow "${request.workflowName}" not found for cerebrate "${request.cerebrateName}".`,
      );
    }

    const run = new WorkflowRun(
      request.cerebrateName,
      request.workflowName,
      workflow.initialState,
    );
    this.registry.startWorkflow(request.cerebrateName, run);

    setTimeout(() => {
      void this.runWorkflow(cerebrate, workflow, run)
        .finally(() => {
          this.registry.finishWorkflow(request.cerebrateName);
        });
    }, 0);

    return {
      cerebrateName: request.cerebrateName,
      workflowName: request.workflowName,
      initialState: workflow.initialState,
      status: 'running',
    };
  }

  async executeWorkflowRun(
    cerebrate: Cerebrate,
    workflow: WorkflowDefinition,
    run: WorkflowRun,
  ): Promise<void> {
    await this.runWorkflow(cerebrate, workflow, run);
  }

  private async runWorkflow(
    cerebrate: Cerebrate,
    workflow: WorkflowDefinition,
    run: WorkflowRun,
  ): Promise<void> {
    while (run.status === 'running') {
      const state = cerebrate.getWorkflowStateDefinition(run.currentState);
      if (!state) {
        const error = `Workflow state "${run.currentState}" not found during execution.`;
        run.fail(error);
        this.log(run, run.currentState, run.currentState, 'failure', error);
        return;
      }

      try {
        const response = await this.commandExecutor.execute({
          cerebrateName: run.cerebrateName,
          command: state.command,
        });
        const result: WorkflowCommandResult = {
          output: response.output,
          status: 'success',
        };
        const branch = evaluateWorkflowBranch(state.branches, result);
        const nextState = branch?.next ?? state.next;

        if (nextState === 'END') {
          run.complete();
          this.log(
            run,
            state.name,
            'END',
            'completion',
            `Workflow completed from state "${state.name}" via ${branch ? 'branch' : 'default'} transition.`,
          );
          return;
        }

        this.log(
          run,
          state.name,
          nextState,
          branch ? 'branch' : 'default',
          branch
            ? `Workflow branched from "${state.name}" to "${nextState}".`
            : `Workflow advanced from "${state.name}" to "${nextState}".`,
        );
        run.transitionTo(nextState);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await this.handleCommandError(state, run, message);
        if (run.status !== 'running') {
          return;
        }
      }
    }
  }

  private async handleCommandError(
    state: WorkflowStateDefinition,
    run: WorkflowRun,
    message: string,
  ): Promise<void> {
    if (!state.onError) {
      run.fail(message);
      this.log(
        run,
        state.name,
        state.name,
        'failure',
        `Workflow failed in state "${state.name}": ${message}`,
      );
      return;
    }

    if (state.onError === 'END') {
      run.complete();
      this.log(
        run,
        state.name,
        'END',
        'completion',
        `Workflow completed from error path in state "${state.name}": ${message}`,
      );
      return;
    }

    this.log(
      run,
      state.name,
      state.onError,
      'error',
      `Workflow error in "${state.name}" transitioned to "${state.onError}": ${message}`,
    );
    run.transitionTo(state.onError);
  }

  private log(
    run: WorkflowRun,
    fromState: string,
    toState: string,
    transitionType: 'default' | 'branch' | 'error' | 'completion' | 'failure',
    message: string,
  ): void {
    this.outputSink.append({
      timestamp: new Date(),
      level: LogLevel.Info,
      category: 'workflow',
      line: `[workflow:${transitionType}] ${run.cerebrateName}:${run.workflowName} ${fromState} -> ${toState} ${message}`,
    });
  }
}
