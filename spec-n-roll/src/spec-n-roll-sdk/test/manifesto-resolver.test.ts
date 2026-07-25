import { describe, expect, it } from 'vitest';
import type { WorkflowDefinition } from 'spec-n-roll-api';
import { ManifestoResolver } from '#sdk/index.js';

describe('ManifestoResolver', () => {
  it('resolves global guidance before step refinements with provenance', () => {
    const workflow: WorkflowDefinition = {
      schemaVersion: '1',
      id: 'delivery',
      version: '1.0.0',
      metadata: { name: 'Delivery' },
      manifestoDefinitions: [
        {
          id: 'global-rules',
          version: '1.0.0',
          purpose: 'Protect user artifacts.',
          source: 'Preserve user-authored files.',
          protectedRules: ['artifact-ownership'],
        },
        {
          id: 'planning-rules',
          version: '1.0.0',
          purpose: 'Refine planning behavior.',
          source: 'Plan before editing.',
        },
      ],
      manifestos: [{ id: 'global-rules', version: '1.0.0', required: true }],
      stepDefinitions: [
        {
          id: 'plan',
          skillId: 'plan',
          inputSchema: { type: 'object' },
          outputSchema: { type: 'object' },
          failurePolicy: { strategy: 'stop' },
          manifestos: [
            { id: 'planning-rules', version: '1.0.0', required: true },
          ],
        },
      ],
      steps: ['plan'],
    };

    const result = new ManifestoResolver().resolve(
      workflow,
      workflow.stepDefinitions[0]!,
      { tools: new Set(), mcpServers: new Set() },
    );

    expect(result.blocking).toBe(false);
    expect(result.definitions.map((entry) => entry.id)).toEqual([
      'global-rules',
      'planning-rules',
    ]);
    expect(result.provenance.map((entry) => entry.scope)).toEqual([
      'global',
      'step',
    ]);
  });

  it('blocks required failures and skips optional failures', () => {
    const workflow: WorkflowDefinition = {
      schemaVersion: '1',
      id: 'delivery',
      version: '1.0.0',
      metadata: { name: 'Delivery' },
      manifestos: [
        { id: 'required-rules', version: '1.0.0', required: true },
        { id: 'optional-rules', version: '1.0.0', required: false },
      ],
      stepDefinitions: [
        {
          id: 'plan',
          skillId: 'plan',
          inputSchema: { type: 'object' },
          outputSchema: { type: 'object' },
          failurePolicy: { strategy: 'stop' },
        },
      ],
      steps: ['plan'],
    };

    const result = new ManifestoResolver().resolve(
      workflow,
      workflow.stepDefinitions[0]!,
      { tools: new Set(), mcpServers: new Set() },
    );

    expect(result.blocking).toBe(true);
    expect(result.provenance.map((entry) => entry.outcome)).toEqual([
      'blocked',
      'skipped',
    ]);
  });
});
