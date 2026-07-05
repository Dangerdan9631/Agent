import { describe, expect, it } from 'vitest';

import {
  detectRollIntent,
  resolveNextStepId,
  type RollIntentContext,
} from '../../src/sdk/workflow/engine.js';

const baseContext: RollIntentContext = {
  description: undefined,
  activeTaskSpecs: [],
  resumableTaskSpecs: [],
  totalTaskSpecCount: 0,
};

describe('/spec-n-roll intent detection', () => {
  it('routes a description argument to specify', () => {
    const intent = detectRollIntent({
      ...baseContext,
      description: 'Add export to CSV for orders',
    });

    expect(intent.kind).toBe('specify');
    if (intent.kind === 'specify') {
      expect(intent.description).toBe('Add export to CSV for orders');
    }
  });

  it('prompts for description when zero Active specs and nothing resumable', () => {
    const intent = detectRollIntent({
      ...baseContext,
      totalTaskSpecCount: 0,
    });

    expect(intent.kind).toBe('prompt_description');
  });

  it('presents a numbered task list when multiple Active specs exist', () => {
    const intent = detectRollIntent({
      ...baseContext,
      activeTaskSpecs: [
        { taskSpecId: '001', slug: 'alpha', label: '001-alpha' },
        { taskSpecId: '002', slug: 'beta', label: '002-beta' },
      ],
    });

    expect(intent.kind).toBe('task_selection');
    if (intent.kind === 'task_selection') {
      expect(intent.candidates).toHaveLength(2);
      expect(intent.candidates[0]!.taskSpecId).toBe('001');
      expect(intent.candidates[1]!.taskSpecId).toBe('002');
    }
  });

  it('prompts new or continue when resumable specs exist but none are Active', () => {
    const intent = detectRollIntent({
      ...baseContext,
      totalTaskSpecCount: 1,
      resumableTaskSpecs: [
        { taskSpecId: '001', slug: 'paused-feature', label: '001-paused-feature' },
      ],
    });

    expect(intent.kind).toBe('new_or_continue');
    if (intent.kind === 'new_or_continue') {
      expect(intent.resumableTaskSpecs).toHaveLength(1);
    }
  });

  it('resolves the next tier step from workflow state', () => {
    const quickSteps = ['specify', 'tasks', 'implement'] as const;
    const papercutSteps = ['specify', 'implement'] as const;
    const fullSteps = ['specify', 'plan', 'tasks', 'implement'] as const;

    expect(resolveNextStepId('quick', 'specify', quickSteps)).toBe('tasks');
    expect(resolveNextStepId('quick', 'tasks', quickSteps)).toBe('implement');
    expect(resolveNextStepId('quick', 'implement', quickSteps)).toBeNull();
    expect(resolveNextStepId('papercut', 'specify', papercutSteps)).toBe('implement');
    expect(resolveNextStepId('full', 'plan', fullSteps)).toBe('tasks');
  });

  it('advances a single Active spec without a selection prompt', () => {
    const intent = detectRollIntent({
      ...baseContext,
      activeTaskSpecs: [{ taskSpecId: '001', slug: 'solo', label: '001-solo' }],
    });

    expect(intent.kind).toBe('continue');
    if (intent.kind === 'continue') {
      expect(intent.taskSpecId).toBe('001');
      expect(intent.slug).toBe('solo');
    }
  });
});
