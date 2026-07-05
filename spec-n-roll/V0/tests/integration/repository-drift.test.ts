import path from 'node:path';

import fse from 'fs-extra';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { readWorkflowState } from '../../src/sdk/core/workflow-state.js';
import type { InterviewQuestion } from '../../src/sdk/specs/interview.js';
import { runClarify } from '../../src/sdk/specs/clarify.js';
import { checkSpecQuality } from '../../src/sdk/specs/quality.js';
import { runRepositoryDriftWorkflow } from '../../src/sdk/repository/workflow-run.js';
import {
  createRepositoryWorkflowFixtureRegistry,
  resolveRepositoryWorkflowFixture,
} from '../helpers/repository-workflows.js';

const fixtureRegistry = createRepositoryWorkflowFixtureRegistry();

afterEach(async () => {
  await fixtureRegistry.cleanup();
});

describe('repository drift integration', () => {
  beforeAll(() => {
    if (!fse.existsSync(path.resolve('dist/cli/index.js'))) {
      throw new Error('Build output missing. Run `npm run build` before integration tests.');
    }
  });

  it('categorizes drift by comparing existing living specs to current repository evidence', async () => {
    const projectRoot = await fixtureRegistry.copy('drift-basic', 'drift-flow');
    const fixtureRoot = resolveRepositoryWorkflowFixture('drift-basic');

    const livingSpecsBefore = await snapshotDirectory(path.join(fixtureRoot, 'living-specs'));
    const testsBefore = await snapshotDirectory(path.join(fixtureRoot, 'tests'));

    const questionsAsked: InterviewQuestion[] = [];
    const result = await runRepositoryDriftWorkflow({
      projectRoot,
      description: 'Refresh living specs after greeting behavior drift',
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

    const categories = new Set(result.run.driftFindings.map((finding) => finding.category));
    expect(categories.has('behavior')).toBe(true);
    expect(categories.has('documentation')).toBe(true);
    expect(result.run.driftFindings.some((finding) => finding.recommendedChange === 'none')).toBe(
      true,
    );

    const specPath = path.join(projectRoot, result.specifyOutputRef);
    const specContent = await fse.readFile(specPath, 'utf8');
    expect(specContent).toContain('## Repository Discovery Evidence');
    expect(specContent).toContain('## Proposed Living Spec Changes');
    expect(specContent).toContain('## Drift Findings');
    expect(specContent).toContain('behavior');
    expect(specContent).toContain('documentation');
    expect(specContent).toMatch(/unchanged/i);
    expect(specContent).toContain('living-specs/greeting.feature');
    expect(specContent).not.toContain('<!-- FILL:');

    const updateProposal = result.run.driftFindings.find(
      (finding) => finding.recommendedChange === 'update',
    );
    expect(updateProposal?.livingSpecRef).toMatch(/greeting\.feature/i);
    expect(updateProposal?.evidenceRefs.length).toBeGreaterThan(0);

    const workflowState = await readWorkflowState(projectRoot, result.taskSpecId, result.slug);
    expect(workflowState?.lastCompletedStepId).toBe('specify');
    expect(workflowState?.currentStepId).toBeNull();

    const livingSpecsAfter = await snapshotDirectory(path.join(projectRoot, 'living-specs'));
    const testsAfter = await snapshotDirectory(path.join(projectRoot, 'tests'));
    expect(livingSpecsAfter).toEqual(livingSpecsBefore);
    expect(testsAfter).toEqual(testsBefore);
  });

  it('requires maintainer authority choice when conflicting evidence has no default', async () => {
    const projectRoot = await fixtureRegistry.copy('drift-basic', 'drift-authority');

    const result = await runRepositoryDriftWorkflow({
      projectRoot,
      description: 'Resolve greeting drift authority conflicts',
      answerInterview: async (question) => question.recommendedAnswer,
      setListOverride: 'quick',
    });

    const authorityQuestions = result.run.driftFindings.filter(
      (finding) => finding.recommendedChange === 'update',
    );

    expect(result.run.driftFindings.some((finding) => finding.category === 'behavior')).toBe(true);

    const specPath = path.join(projectRoot, result.specifyOutputRef);
    const specContent = await fse.readFile(specPath, 'utf8');

    expect(specContent).toContain('## Unresolved Ambiguity');
    expect(specContent).toMatch(/authority-/i);
    expect(specContent).toMatch(/authoritative|authority/i);
    expect(specContent).not.toMatch(/defaults? to code/i);
    expect(specContent).not.toMatch(/defaults? to tests?/i);
    expect(specContent).not.toMatch(/defaults? to documentation/i);
    expect(specContent).not.toMatch(/defaults? to the existing living spec/i);

    const conflictEvidence = result.run.evidence.filter(
      (record) => record.evidenceKind === 'conflict',
    );
    expect(conflictEvidence.length).toBeGreaterThan(0);
    expect(authorityQuestions.length).toBeGreaterThan(0);
  });

  it('supports clarify after repository drift specify output without breaking quality checks', async () => {
    const projectRoot = await fixtureRegistry.copy('drift-basic', 'drift-clarify');

    const result = await runRepositoryDriftWorkflow({
      projectRoot,
      description: 'Refresh living specs and clarify authority choices',
      answerInterview: async (question) => question.recommendedAnswer,
      setListOverride: 'quick',
    });

    expect(result.status).toBe('complete');
    if (result.status !== 'complete') {
      return;
    }

    const clarifyResult = await runClarify({
      projectRoot,
      taskSpecId: result.taskSpecId,
      slug: result.slug,
      clarificationTopic: 'Confirm greeting authority resolution',
      answerInterview: async (question) => question.recommendedAnswer,
    });

    expect(clarifyResult.qualityPassed).toBe(true);

    const specPath = path.join(projectRoot, result.specifyOutputRef);
    const specContent = await fse.readFile(specPath, 'utf8');
    expect(specContent).toContain('## Repository Discovery Evidence');
    expect(specContent).toContain('## Proposed Living Spec Changes');
    expect(specContent).toContain('## Clarifications');
    expect(specContent).toMatch(/future downstream change|downstream intent/i);

    const qualityReport = await checkSpecQuality(
      projectRoot,
      result.taskSpecId,
      result.slug,
      clarifyResult.interviewSession,
    );
    expect(qualityReport.passed).toBe(true);
    expect(qualityReport.issues).toEqual([]);
  });
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
