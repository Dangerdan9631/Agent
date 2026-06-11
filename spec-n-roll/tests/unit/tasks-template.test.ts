import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const templatesDir = path.resolve('src/templates');

describe('FR-009 tasks and plan templates', () => {
  it('mandates living-spec updates as the first implementation phase in tasks.md', () => {
    const tasksContent = readFileSync(path.join(templatesDir, 'tasks.md'), 'utf8');
    const livingSpecPhaseIndex = tasksContent.indexOf('Living Specification Updates');
    const testsPhaseIndex = tasksContent.indexOf('## Phase 2: Tests');

    expect(livingSpecPhaseIndex).toBeGreaterThanOrEqual(0);
    expect(testsPhaseIndex).toBeGreaterThan(livingSpecPhaseIndex);
    expect(tasksContent).toMatch(/FR-009/i);
    expect(tasksContent).toMatch(/before any test or production code/i);
  });

  it('includes a Living Spec Targets section in plan.md', () => {
    const planContent = readFileSync(path.join(templatesDir, 'plan.md'), 'utf8');

    expect(planContent).toContain('## Living Spec Targets');
    expect(planContent).toMatch(/living-specs\//i);
  });
});
