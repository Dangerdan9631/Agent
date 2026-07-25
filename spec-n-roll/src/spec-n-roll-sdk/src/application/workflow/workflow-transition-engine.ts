import type { Logger } from 'tslog';
import {
  WORKFLOW_RUN_CONTROL_FIELDS,
  type WorkflowContextValue,
  type WorkflowHookPhase,
  type WorkflowHookResultV1,
  type WorkflowHookV1,
  type WorkflowRunStateV1,
} from 'spec-n-roll-api';
import { WorkflowHookTransitionError } from '#sdk/application/workflow/workflow-hook-transition-error.js';

/**
 * Applies validated hook outcomes to workflow run state without exposing mutable state.
 */
export class WorkflowTransitionEngine {
  /**
   * Creates a workflow transition engine.
   *
   * @param logger - Logger that records hook decisions and rejected proposals.
   */
  constructor(private readonly logger: Logger<unknown>) {}

  /**
   * Runs the pre-hook that gates entry into the current workflow step.
   *
   * @param state - Current workflow state owned by the caller.
   * @param hook - Hook implementation evaluated against an immutable snapshot.
   * @returns A new workflow state containing the validated hook outcome.
   */
  async runPreHook(
    state: WorkflowRunStateV1,
    hook: WorkflowHookV1,
  ): Promise<WorkflowRunStateV1> {
    return this.runHook(state, hook, 'pre');
  }

  /**
   * Runs the post-hook that gates completion of the current workflow step.
   *
   * @param state - Active workflow state owned by the caller.
   * @param hook - Hook implementation evaluated against an immutable snapshot.
   * @returns A new workflow state completed only when the post-hook continues.
   */
  async runPostHook(
    state: WorkflowRunStateV1,
    hook: WorkflowHookV1,
  ): Promise<WorkflowRunStateV1> {
    if (state.completionStatus !== 'in-progress') {
      throw new WorkflowHookTransitionError(
        'A post-hook can run only while its step is in progress.',
      );
    }

    return this.runHook(state, hook, 'post');
  }

  private async runHook(
    state: WorkflowRunStateV1,
    hook: WorkflowHookV1,
    phase: WorkflowHookPhase,
  ): Promise<WorkflowRunStateV1> {
    this.logger.debug('Running workflow hook.', {
      runId: state.runId,
      stepId: state.currentStepId,
      attemptCount: state.attemptCount,
      phase,
    });
    const snapshot = this.createImmutableSnapshot(state);
    const result = await hook.execute(snapshot);
    this.validateResult(result);
    const context = this.applyContextPatch(state.context, result);
    const completionStatus = this.resolveCompletionStatus(phase, result);
    const nextState: WorkflowRunStateV1 = {
      ...state,
      context,
      completionStatus,
      hookOutcomes: [
        ...state.hookOutcomes,
        { contractVersion: 1, phase, result: this.clone(result) },
      ],
    };
    this.logger.info('Applied workflow hook outcome.', {
      runId: state.runId,
      stepId: state.currentStepId,
      phase,
      hookStatus: result.status,
      completionStatus,
    });
    return nextState;
  }

  private validateResult(result: WorkflowHookResultV1): void {
    if (result.contractVersion !== 1) {
      throw new WorkflowHookTransitionError(
        `Unsupported hook result contract version: ${String(result.contractVersion)}.`,
      );
    }
    for (const field of Object.keys(result.contextPatch ?? {})) {
      if ((WORKFLOW_RUN_CONTROL_FIELDS as readonly string[]).includes(field)) {
        this.logger.warn('Rejected workflow hook control-field mutation.', {
          field,
        });
        throw new WorkflowHookTransitionError(
          `Hook context patch cannot mutate protected field "${field}".`,
        );
      }
    }
  }

  private applyContextPatch(
    context: Readonly<Record<string, WorkflowContextValue>>,
    result: WorkflowHookResultV1,
  ): Readonly<Record<string, WorkflowContextValue>> {
    return this.clone({ ...context, ...result.contextPatch });
  }

  private resolveCompletionStatus(
    phase: WorkflowHookPhase,
    result: WorkflowHookResultV1,
  ): WorkflowRunStateV1['completionStatus'] {
    switch (result.status) {
      case 'continue':
        return phase === 'post' ? 'completed' : 'in-progress';
      case 'retry':
        return 'pending';
      case 'block':
        return 'blocked';
      case 'fail':
        return 'failed';
    }
  }

  private createImmutableSnapshot(
    state: WorkflowRunStateV1,
  ): WorkflowRunStateV1 {
    return this.deepFreeze(this.clone(state));
  }

  private clone<Value>(value: Value): Value {
    return structuredClone(value);
  }

  private deepFreeze<Value>(value: Value): Value {
    if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
      return value;
    }
    Object.freeze(value);
    for (const child of Object.values(value)) {
      this.deepFreeze(child);
    }
    return value;
  }
}
