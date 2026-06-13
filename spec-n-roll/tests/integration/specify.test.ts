import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { runInit } from '../../src/cli/commands/init.js';
import { readTaskSpecStatus } from '../../src/core/task-lifecycle.js';
import { readWorkflowState } from '../../src/core/workflow-state.js';
import type { InterviewQuestion } from '../../src/specs/interview.js';
import { runSpecify } from '../../src/specs/specify.js';
import type { TriageAssessment } from '../../src/specs/triage.js';

const tempDirs: string[] = [];

/**
 * Creates a temporary project directory for specify integration tests.
 *
 * @param prefix - Prefix for the temp directory name.
 * @returns Absolute path to the created directory.
 */
function createTempProject(prefix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-specify-${prefix}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir != null) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup.
      }
    }
  }
});

describe('/spec-n-specify integration', () => {
  beforeAll(() => {
    if (!existsSync(path.resolve('dist/cli/index.js'))) {
      throw new Error('Build output missing. Run `npm run build` before integration tests.');
    }
  });

  it('runs triage, instantiates spec.md, interviews, and writes state via core', async () => {
    const projectRoot = createTempProject('full-flow');
    await runInit({ projectRoot, agents: ['cursor'] });

    const questionsAsked: InterviewQuestion[] = [];
    let triageSeen: TriageAssessment | undefined;

    const result = await runSpecify({
      projectRoot,
      description: 'Add something useful to the application',
      confirmTriage: async (assessment) => {
        triageSeen = assessment;
        return assessment.proposedWorkflowVariantId ?? assessment.defaultWorkflowVariantId;
      },
      answerInterview: async (question) => {
        questionsAsked.push(question);
        return question.recommendedAnswer;
      },
    });

    expect(triageSeen).toBeDefined();
    expect(triageSeen!.proposedWorkflowVariantId).toBe('quick');
    expect(questionsAsked.length).toBeGreaterThanOrEqual(1);
    expect(questionsAsked[0]!.recommendedAnswer.length).toBeGreaterThan(0);

    expect(result.taskSpecId).toBe('001');
    expect(result.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(result.workflowVariantId).toBe('quick');
    expect(result.qualityPassed).toBe(true);

    const specPath = path.join(
      projectRoot,
      'specs',
      `${result.taskSpecId}-${result.slug}`,
      'spec.md',
    );
    expect(existsSync(specPath)).toBe(true);
    const specContent = readFileSync(specPath, 'utf8');
    expect(specContent).toContain('status: Active');
    expect(specContent).not.toContain('<!-- FILL:');

    const status = await readTaskSpecStatus(projectRoot, result.taskSpecId, result.slug);
    expect(status).toBe('Active');

    const workflowState = await readWorkflowState(projectRoot, result.taskSpecId, result.slug);
    expect(workflowState).not.toBeNull();
    expect(workflowState!.taskSpecId).toBe('001');
    expect(workflowState!.slug).toBe(result.slug);
    expect(workflowState!.workflowVariantId).toBe('quick');
    expect(workflowState!.lastCompletedStepId).toBe('specify');
    expect(workflowState!.status).toBe('active');
  });
});
