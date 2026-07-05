import { describe, expect, it } from 'vitest';

import { createDefaultSetListsFile } from '../../src/sdk/setlists/index.js';
import { assessTriage } from '../../src/sdk/specs/triage.js';

const enabledSetLists = createDefaultSetListsFile().setLists;

const defaultInput = {
  defaultWorkflowId: 'quick',
  availableWorkflowIds: ['papercut', 'quick', 'full'] as const,
  enabledSetLists,
};

describe('triage heuristic', () => {
  it('routes single-file fix to papercut with rationale', () => {
    const result = assessTriage({
      ...defaultInput,
      description: 'Fix typo in the login button label copy',
    });

    expect(result.mode).toBe('heuristic');
    expect(result.proposedSetListId).toBe('papercut');
    expect(result.proposedWorkflowId).toBe('papercut');
    expect(result.rationale.length).toBeGreaterThan(0);
    expect(result.rationale.toLowerCase()).toMatch(/papercut|single|trivial|minimal/);
  });

  it('routes new behavior without architecture change to quick', () => {
    const result = assessTriage({
      ...defaultInput,
      description: 'Add email notification when an order ships to the customer',
    });

    expect(result.mode).toBe('heuristic');
    expect(result.proposedSetListId).toBe('quick');
    expect(result.proposedWorkflowId).toBe('quick');
    expect(result.rationale.toLowerCase()).toMatch(/quick|feature|small/);
  });

  it('routes cross-cutting subsystem work to full', () => {
    const result = assessTriage({
      ...defaultInput,
      description:
        'Redesign authentication across web, mobile, and API subsystems with multi-actor flows',
    });

    expect(result.mode).toBe('heuristic');
    expect(result.proposedSetListId).toBe('full');
    expect(result.proposedWorkflowId).toBe('full');
    expect(result.rationale.toLowerCase()).toMatch(/full|cross|subsystem|architect/);
  });

  it('requires manual picker for ambiguous descriptions with default set list pre-select', () => {
    const result = assessTriage({
      ...defaultInput,
      description: 'improve',
    });

    expect(result.mode).toBe('manual');
    expect(result.proposedSetListId).toBeNull();
    expect(result.defaultSetListId).toBe('quick');
    expect(result.defaultWorkflowId).toBe('quick');
    expect(result.eligibleSetLists.map((entry) => entry.id)).toEqual(['papercut', 'quick', 'full']);
    expect(result.rationale.toLowerCase()).toMatch(/ambiguous|manual|pick/);
  });
});
