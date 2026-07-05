import { describe, expect, it } from 'vitest';

import { createDefaultWorkflowConfig } from '../../src/sdk/init.js';
import { workflowConfigSchema } from '../../src/sdk/config/schema.js';

describe('createDefaultWorkflowConfig', () => {
  it('defines papercut, quick, and full tiers with specify as step 1', () => {
    const config = createDefaultWorkflowConfig({
      toolkitVersion: '0.1.0',
      selectedAgentIds: ['cursor', 'claude-code'],
    });

    const parsed = workflowConfigSchema.parse(config);
    expect(parsed.workflows.map((workflow) => workflow.id).sort()).toEqual([
      'full',
      'papercut',
      'quick',
    ]);

    for (const workflow of parsed.workflows) {
      expect(workflow.steps[0]).toBe('specify');
    }

    expect(parsed.workflows.find((workflow) => workflow.id === 'papercut')?.steps).toEqual([
      'specify',
      'implement',
    ]);
    expect(parsed.workflows.find((workflow) => workflow.id === 'quick')?.steps).toEqual([
      'specify',
      'tasks',
      'implement',
    ]);
    expect(parsed.workflows.find((workflow) => workflow.id === 'full')?.steps).toEqual([
      'specify',
      'plan',
      'tasks',
      'implement',
    ]);
  });

  it('includes only selected agents as enabled entries', () => {
    const config = createDefaultWorkflowConfig({
      toolkitVersion: '0.1.0',
      selectedAgentIds: ['cursor', 'codex'],
    });

    expect(config.agents.map((agent) => agent.id).sort()).toEqual(['codex', 'cursor']);
    expect(config.agents.every((agent) => agent.enabled)).toBe(true);
    expect(config.agents.every((agent) => agent.commandPrefix === 'spec-n-')).toBe(true);
  });
});
