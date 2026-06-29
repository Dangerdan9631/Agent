import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assembleRepositoryWorkflowReportSummary,
  listRepositoryWorkflowReportSummaries,
} from '../../../src/ink/read-models/repository-workflows.js';
import {
  assembleTaskSpecSummary,
  listTaskSpecSummaries,
} from '../../../src/ink/read-models/task-specs.js';

/**
 * Absolute path to the multi-spec fixture used by interactive read-model tests.
 */
const FIXTURE_ROOT = path.resolve('tests/fixtures/interactive-multi-spec');

describe('interactive repository workflow report read models', () => {
  it('lists task specs that have repository workflow report artifacts', async () => {
    const summaries = await listRepositoryWorkflowReportSummaries(FIXTURE_ROOT);

    expect(summaries.map((summary) => summary.directoryName)).toEqual(['001-active-checkout']);
    expect(summaries[0]).toMatchObject({
      taskSpecId: '001',
      slug: 'active-checkout',
      reportPath: 'specs/001-active-checkout/repository-workflow-report.md',
      hasReport: true,
    });
    expect(summaries[0]?.sectionHeadings).toEqual(
      expect.arrayContaining(['Scope', 'Specify Output', 'Recommended Next Steps']),
    );
  });

  it('assembles a repository workflow report summary with parsed section headings', async () => {
    const summary = await assembleRepositoryWorkflowReportSummary(
      FIXTURE_ROOT,
      '001-active-checkout',
    );

    expect(summary).toMatchObject({
      taskSpecId: '001',
      slug: 'active-checkout',
      directoryName: '001-active-checkout',
      reportPath: 'specs/001-active-checkout/repository-workflow-report.md',
      hasReport: true,
      workflowTypeName: 'Repository Onboarding',
    });
    expect(summary.sectionHeadings.length).toBeGreaterThan(0);
    expect(summary.specifyOutputRef).toBe('specs/001-active-checkout/spec.md');
  });
});

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
