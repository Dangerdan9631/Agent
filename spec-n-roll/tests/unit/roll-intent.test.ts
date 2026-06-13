import { describe, expect, it } from 'vitest';

import {
  detectRollIntent,
  resolveNextStepId,
  type RollIntentContext,
} from '../../src/workflow/engine.js';

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
    expect(resolveNextStepId('quick', 'specify')).toBe('tasks');
    expect(resolveNextStepId('quick', 'tasks')).toBe('implement');
    expect(resolveNextStepId('quick', 'implement')).toBeNull();
    expect(resolveNextStepId('papercut', 'specify')).toBe('implement');
    expect(resolveNextStepId('full', 'plan')).toBe('tasks');
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
