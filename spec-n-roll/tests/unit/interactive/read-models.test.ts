import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assembleTaskSpecSummary,
  listTaskSpecSummaries,
} from '../../../src/cli/ink/read-models/task-specs.js';

/**
 * Absolute path to the multi-spec fixture used by interactive read-model tests.
 */
const FIXTURE_ROOT = path.resolve('tests/fixtures/interactive-multi-spec');

describe('interactive task spec read models', () => {
  it('assembles recognized task spec summaries with lifecycle, workflow, and artifact state', async () => {
    const summary = await assembleTaskSpecSummary(FIXTURE_ROOT, '001-active-checkout');

    expect(summary).toMatchObject({
      taskSpecId: '001',
      slug: 'active-checkout',
      directoryName: '001-active-checkout',
      lifecycleStatus: 'Active',
      operationalStatus: 'active',
      currentStepId: 'implement',
      lastCompletedStepId: 'tasks',
      workflowVariantId: 'quick',
      artifacts: {
        spec: true,
        plan: true,
        tasks: true,
      },
      unrecognized: false,
    });
    expect(summary.warnings).toEqual([]);
  });

  it('includes unrecognized directories separately with warnings', async () => {
    const summaries = await listTaskSpecSummaries(FIXTURE_ROOT);

    expect(summaries.recognized.map((summary) => summary.directoryName)).toEqual([
      '001-active-checkout',
      '002-completed-migration',
    ]);
    expect(summaries.unrecognized).toHaveLength(1);
    expect(summaries.unrecognized[0]).toMatchObject({
      directoryName: 'legacy-notes',
      lifecycleStatus: 'unknown',
      operationalStatus: 'missing',
      unrecognized: true,
    });
    expect(summaries.unrecognized[0]?.warnings).toContain(
      'Directory name does not match the required task spec pattern.',
    );
  });
});
