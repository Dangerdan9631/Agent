import path from 'node:path';

import fse from 'fs-extra';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { readWorkflowState } from '../../src/sdk/core/workflow-state.js';
import type { InterviewQuestion } from '../../src/sdk/specs/interview.js';
import {
  planRepositoryWorkflow,
  runRepositoryOnboardingWorkflow,
} from '../../src/sdk/repository/workflow-run.js';
import {
  createRepositoryWorkflowFixtureRegistry,
  resolveRepositoryWorkflowFixture,
  snapshotDirectoryContents,
} from '../helpers/repository-workflows.js';

const fixtureRegistry = createRepositoryWorkflowFixtureRegistry();

afterEach(async () => {
  await fixtureRegistry.cleanup();
});

describe('repository onboarding integration', () => {
  beforeAll(() => {
    if (!fse.existsSync(path.resolve('dist/cli/index.js'))) {
      throw new Error('Build output missing. Run `npm run build` before integration tests.');
    }
  });

  it('produces one specify output without mutating living-specs or tests', async () => {
    const projectRoot = await fixtureRegistry.copy('onboarding-basic', 'onboarding-flow');
    const fixtureRoot = resolveRepositoryWorkflowFixture('onboarding-basic');

    const livingSpecsBefore = await snapshotDirectory(path.join(fixtureRoot, 'living-specs'));
    const testsBefore = await snapshotDirectory(path.join(fixtureRoot, 'tests'));

    const questionsAsked: InterviewQuestion[] = [];
    const result = await runRepositoryOnboardingWorkflow({
      projectRoot,
      description: 'Document greeting behavior as living specs and tests',
      answerInterview: async (question) => {
        questionsAsked.push(question);
        return question.recommendedAnswer;
      },
      setListOverride: 'quick',
    });

    expect(result.status).toBe('complete');
    if (result.status !== 'complete') {
      return;
    }

    expect(result.taskSpecId).toBe('001');
    expect(result.specifyOutputRef).toMatch(/^specs\/001-[\w-]+\/spec\.md$/);
    expect(result.nextSteps).toEqual(
      expect.arrayContaining(['clarify', 'plan', 'tasks', 'implement']),
    );
    expect(questionsAsked.length).toBeGreaterThan(0);

    const specPath = path.join(projectRoot, result.specifyOutputRef);
    expect(await fse.pathExists(specPath)).toBe(true);

    const specContent = await fse.readFile(specPath, 'utf8');
    expect(specContent).toContain('status: Active');
    expect(specContent).toContain('## User Scenarios');
    expect(specContent).toContain('## Requirements');
    expect(specContent).toContain('## Success Criteria');
    expect(specContent).toContain('## Repository Discovery Evidence');
    expect(specContent).toContain('## Proposed Living Spec Changes');
    expect(specContent).toContain('## Test Coverage Mapping');
    expect(specContent).toContain('living-specs/');
    expect(specContent).not.toContain('<!-- FILL:');

    const greetingMapping = result.run.testCoverageMappings.find(
      (mapping) => mapping.behaviorId === 'greeting',
    );
    const notifyMapping = result.run.testCoverageMappings.find(
      (mapping) => mapping.behaviorId === 'notify',
    );

    expect(greetingMapping?.coverageType).toBe('direct');
    expect(greetingMapping?.testRefs.some((ref) => ref.includes('greet.test.ts'))).toBe(true);
    expect(specContent).toMatch(/greeting.*direct/i);
    expect(specContent).toMatch(/greet\.test\.ts/i);

    expect(notifyMapping?.coverageType).toBe('missing');
    expect(notifyMapping?.recommendedValidationTarget).toMatch(/alert|user/i);
    expect(specContent).toMatch(/notify.*missing/i);
    expect(specContent).toMatch(/recommended validation target/i);

    expect(result.testCoverageMappings).toEqual(result.run.testCoverageMappings);
    expect(result.testMappingSummary.direct).toBeGreaterThanOrEqual(1);
    expect(result.testMappingSummary.missing).toBeGreaterThanOrEqual(1);

    const workflowState = await readWorkflowState(projectRoot, result.taskSpecId, result.slug);
    expect(workflowState?.lastCompletedStepId).toBe('specify');
    expect(workflowState?.currentStepId).toBeNull();

    const planPath = path.join(
      projectRoot,
      'specs',
      `${result.taskSpecId}-${result.slug}`,
      'plan.md',
    );
    const tasksPath = path.join(
      projectRoot,
      'specs',
      `${result.taskSpecId}-${result.slug}`,
      'tasks.md',
    );
    expect(await fse.pathExists(planPath)).toBe(false);
    expect(await fse.pathExists(tasksPath)).toBe(false);

    const livingSpecsAfter = await snapshotDirectory(path.join(projectRoot, 'living-specs'));
    const testsAfter = await snapshotDirectory(path.join(projectRoot, 'tests'));
    expect(livingSpecsAfter).toEqual(livingSpecsBefore);
    expect(testsAfter).toEqual(testsBefore);
    expect(result.discoveryPlan.includedPaths).toEqual(
      expect.arrayContaining(['src', 'tests', 'docs']),
    );
  }, 60_000);

  it('bounded first pass limits scope and records omitted areas in report', async () => {
    const projectRoot = await fixtureRegistry.copy('large-repo', 'bounded-first-pass');

    const planResult = await planRepositoryWorkflow({
      projectRoot,
      workflowTypeId: 'repository-onboarding',
      bounds: { maxProductAreas: 5 },
    });

    expect(planResult.recommendedPlan.bounds.maxProductAreas).toBe(5);
    expect(planResult.recommendedPlan.includedPaths).toContain('src/areas/area-01');
    expect(planResult.recommendedPlan.includedPaths).not.toContain('src/areas/area-06');
    expect(planResult.recommendedPlan.omittedPaths).toContain('src/areas/area-24');
    expect(planResult.nextSuggestedScopedRun?.includedPaths.length).toBeGreaterThan(0);

    const result = await runRepositoryOnboardingWorkflow({
      projectRoot,
      description: 'Document bounded first-pass product areas as living specs',
      approvedPlan: planResult.recommendedPlan,
      answerInterview: async (question) => question.recommendedAnswer,
      setListOverride: 'quick',
    });

    expect(result.status).toBe('complete');
    if (result.status !== 'complete') {
      return;
    }

    expect(result.discoveryPlan).toEqual(planResult.recommendedPlan);
    expect(result.run.discoveryPlan.bounds.maxProductAreas).toBe(5);

    const reportPath = path.join(projectRoot, result.reportPath);
    const reportContent = await fse.readFile(reportPath, 'utf8');
    expect(reportContent).toMatch(/Included paths:/i);
    expect(reportContent).toMatch(/Omitted paths:/i);
    expect(reportContent).toMatch(/maxProductAreas:\s*5/i);
    expect(reportContent).toMatch(/next suggested scoped run/i);
    expect(reportContent).toMatch(/src\/areas\/area-06/);
  }, 60_000);

  it('preserves living-spec and test file contents across repository onboarding specify', async () => {
    const projectRoot = await fixtureRegistry.copy('drift-basic', 'onboarding-safety-snapshot');
    const fixtureRoot = resolveRepositoryWorkflowFixture('drift-basic');

    const livingSpecsBefore = await snapshotDirectoryContents(
      path.join(fixtureRoot, 'living-specs'),
    );
    const testsBefore = await snapshotDirectoryContents(path.join(fixtureRoot, 'tests'));
    expect(livingSpecsBefore.size).toBeGreaterThan(0);
    expect(testsBefore.size).toBeGreaterThan(0);

    const result = await runRepositoryOnboardingWorkflow({
      projectRoot,
      description: 'Propose living-spec work without mutating authoritative files',
      answerInterview: async (question) => question.recommendedAnswer,
      setListOverride: 'quick',
    });

    expect(result.status).toBe('complete');
    if (result.status !== 'complete') {
      return;
    }

    const livingSpecsAfter = await snapshotDirectoryContents(
      path.join(projectRoot, 'living-specs'),
    );
    const testsAfter = await snapshotDirectoryContents(path.join(projectRoot, 'tests'));
    expect(livingSpecsAfter).toEqual(livingSpecsBefore);
    expect(testsAfter).toEqual(testsBefore);
  }, 60_000);
});

/**
 * Returns a sorted list of relative file paths under a directory when it exists.
 *
 * @param directoryPath - Absolute directory path to snapshot.
 * @returns Sorted relative file paths or an empty list when the directory is absent.
 */
async function snapshotDirectory(directoryPath: string): Promise<string[]> {
  if (!(await fse.pathExists(directoryPath))) {
    return [];
  }

  const files: string[] = [];

  async function walk(currentPath: string, relativePrefix: string): Promise<void> {
    const entries = await fse.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const relativePath =
        relativePrefix.length > 0 ? `${relativePrefix}/${entry.name}` : entry.name;
      const absolutePath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath, relativePath);
      } else if (entry.isFile()) {
        files.push(relativePath.replace(/\\/g, '/'));
      }
    }
  }

  await walk(directoryPath, '');
  return files.sort();
}
