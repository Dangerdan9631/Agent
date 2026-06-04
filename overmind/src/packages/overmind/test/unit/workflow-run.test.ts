import { describe, expect, it } from 'vitest';

import { WorkflowRun } from '../../src/domain/workflow/workflow-run.js';

describe('WorkflowRun', () => {
  it('tracks transitions, completion, and failures', () => {
    const run = new WorkflowRun('hello', 'daily-review', 'inspect', '2026-06-04T00:00:00.000Z');

    expect(run.status).toBe('running');
    expect(run.currentState).toBe('inspect');

    run.transitionTo('summarize');
    expect(run.currentState).toBe('summarize');

    run.complete('2026-06-04T00:01:00.000Z');
    expect(run.status).toBe('completed');
    expect(run.completedAt).toBe('2026-06-04T00:01:00.000Z');

    const failed = new WorkflowRun('hello', 'daily-review', 'inspect');
    failed.fail('boom', '2026-06-04T00:02:00.000Z');
    expect(failed.status).toBe('failed');
    expect(failed.lastError).toBe('boom');
    expect(failed.completedAt).toBe('2026-06-04T00:02:00.000Z');
  });
});
