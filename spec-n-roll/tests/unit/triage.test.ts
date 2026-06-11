import { describe, expect, it } from 'vitest';

import { assessTriage } from '../../src/specs/triage.js';

const defaultInput = {
  defaultWorkflowId: 'quick',
  availableWorkflowIds: ['papercut', 'quick', 'full'] as const,
};

describe('triage heuristic', () => {
  it('routes single-file fix to papercut with rationale', () => {
    const result = assessTriage({
      ...defaultInput,
      description: 'Fix typo in the login button label copy',
    });

    expect(result.mode).toBe('heuristic');
    expect(result.proposedWorkflowVariantId).toBe('papercut');
    expect(result.rationale.length).toBeGreaterThan(0);
    expect(result.rationale.toLowerCase()).toMatch(/single|file|fix|copy|papercut|trivial/);
  });

  it('routes new behavior without architecture change to quick', () => {
    const result = assessTriage({
      ...defaultInput,
      description: 'Add email notification when an order ships to the customer',
    });

    expect(result.mode).toBe('heuristic');
    expect(result.proposedWorkflowVariantId).toBe('quick');
    expect(result.rationale.toLowerCase()).toMatch(/behavior|feature|quick/);
  });

  it('routes cross-cutting subsystem work to full', () => {
    const result = assessTriage({
      ...defaultInput,
      description:
        'Redesign authentication across web, mobile, and API subsystems with multi-actor flows',
    });

    expect(result.mode).toBe('heuristic');
    expect(result.proposedWorkflowVariantId).toBe('full');
    expect(result.rationale.toLowerCase()).toMatch(/cross|subsystem|architect|full/);
  });

  it('requires manual picker for ambiguous descriptions with defaultWorkflowId pre-select', () => {
    const result = assessTriage({
      ...defaultInput,
      description: 'improve',
    });

    expect(result.mode).toBe('manual');
    expect(result.proposedWorkflowVariantId).toBeNull();
    expect(result.defaultWorkflowVariantId).toBe('quick');
    expect(result.availableWorkflowVariantIds).toEqual(['papercut', 'quick', 'full']);
    expect(result.rationale.toLowerCase()).toMatch(/ambiguous|manual|pick/);
  });
});
