import { Logger } from 'tslog';
import { describe, expect, it } from 'vitest';
import type {
  WorkflowHookResultV1,
  WorkflowHookV1,
  WorkflowRunStateV1,
} from 'spec-n-roll-api';
import {
  WorkflowHookTransitionError,
  WorkflowTransitionEngine,
} from '#sdk/index.js';

/**
 * Returns a configured result while observing the snapshot supplied by the engine.
 */
class RecordingHook implements WorkflowHookV1 {
  /**
   * Creates a recording hook.
   *
   * @param result - Result returned for every execution.
   * @param observer - Optional assertion callback invoked with the hook snapshot.
   */
  constructor(
    private readonly result: WorkflowHookResultV1,
    private readonly observer?: (snapshot: WorkflowRunStateV1) => void,
  ) {}

  /**
   * Observes the snapshot and returns the configured result.
   *
   * @param snapshot - Immutable workflow snapshot supplied by the engine.
   * @returns The result configured at construction.
   */
  async execute(
    snapshot: WorkflowRunStateV1,
  ): Promise<WorkflowHookResultV1> {
    this.observer?.(snapshot);
    return this.result;
  }
}

/**
 * Creates workflow transition test fixtures with diagnostics disabled.
 */
class WorkflowTransitionTestFixture {
  /**
   * Creates a fresh workflow transition engine.
   *
   * @returns An engine with a silent logger.
   */
  createEngine(): WorkflowTransitionEngine {
    return new WorkflowTransitionEngine(
      new Logger({ name: 'workflow-transition-test', minLevel: 6 }),
    );
  }

  /**
   * Creates a pending workflow run state.
   *
   * @returns A fresh state for the first step attempt.
   */
  createState(): WorkflowRunStateV1 {
    return {
      contractVersion: 1,
      runId: 'run-1',
      currentStepId: 'specify',
      attemptCount: 1,
      completionStatus: 'pending',
      context: {
        existing: 'preserved',
        nested: { value: true },
      },
      hookOutcomes: [],
    };
  }

  /**
   * Creates a version-one hook result.
   *
   * @param overrides - Result fields that differ from a continuing hook.
   * @returns A complete version-one result.
   */
  createResult(
    overrides: Partial<WorkflowHookResultV1> = {},
  ): WorkflowHookResultV1 {
    return {
      contractVersion: 1,
      status: 'continue',
      ...overrides,
    };
  }
}

describe('WorkflowTransitionEngine', () => {
  const fixture = new WorkflowTransitionTestFixture();

  it('supplies a detached, deeply immutable snapshot to a pre-hook', async () => {
    const state = fixture.createState();
    const hook = new RecordingHook(fixture.createResult(), (snapshot) => {
      expect(snapshot).not.toBe(state);
      expect(snapshot.context).not.toBe(state.context);
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.context)).toBe(true);
      expect(Object.isFrozen(snapshot.context.nested)).toBe(true);
    });

    const nextState = await fixture.createEngine().runPreHook(state, hook);

    expect(state.completionStatus).toBe('pending');
    expect(nextState.completionStatus).toBe('in-progress');
  });

  it('applies a valid context patch without mutating the input state', async () => {
    const state = fixture.createState();
    const result = fixture.createResult({
      contextPatch: { added: 42, existing: 'updated' },
      annotations: [{ type: 'note', message: 'context enriched' }],
      artifacts: [{ id: 'summary', type: 'json', data: { count: 1 } }],
    });

    const nextState = await fixture
      .createEngine()
      .runPreHook(state, new RecordingHook(result));

    expect(nextState.context).toEqual({
      existing: 'updated',
      nested: { value: true },
      added: 42,
    });
    expect(state.context).toEqual({
      existing: 'preserved',
      nested: { value: true },
    });
    expect(nextState.hookOutcomes).toEqual([
      { contractVersion: 1, phase: 'pre', result },
    ]);
  });

  it('rejects a context patch that targets a protected control field', async () => {
    const maliciousResult = fixture.createResult({
      contextPatch: {
        currentStepId: 'skip-ahead',
      },
    });

    await expect(
      fixture
        .createEngine()
        .runPreHook(
          fixture.createState(),
          new RecordingHook(maliciousResult),
        ),
    ).rejects.toThrow(
      new WorkflowHookTransitionError(
        'Hook context patch cannot mutate protected field "currentStepId".',
      ),
    );
  });

  it.each([
    ['continue', 'in-progress'],
    ['retry', 'pending'],
    ['block', 'blocked'],
    ['fail', 'failed'],
  ] as const)(
    'maps pre-hook status %s to workflow status %s',
    async (hookStatus, workflowStatus) => {
      const result = fixture.createResult({ status: hookStatus });

      const nextState = await fixture
        .createEngine()
        .runPreHook(fixture.createState(), new RecordingHook(result));

      expect(nextState.completionStatus).toBe(workflowStatus);
    },
  );

  it('gates completion on a successful post-hook', async () => {
    const engine = fixture.createEngine();
    const activeState = await engine.runPreHook(
      fixture.createState(),
      new RecordingHook(fixture.createResult()),
    );

    const retryState = await engine.runPostHook(
      activeState,
      new RecordingHook(fixture.createResult({ status: 'retry' })),
    );
    expect(retryState.completionStatus).toBe('pending');

    const completedState = await engine.runPostHook(
      activeState,
      new RecordingHook(fixture.createResult()),
    );
    expect(completedState.completionStatus).toBe('completed');
    expect(completedState.hookOutcomes.map(({ phase }) => phase)).toEqual([
      'pre',
      'post',
    ]);
  });
});

