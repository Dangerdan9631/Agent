import { describe, expect, it } from 'vitest';

import { projectMetadataSchema, workflowConfigSchema } from '../../src/sdk/config/schema.js';
import { extensionManifestSchema } from '../../src/sdk/extensions/manifest.js';
import { workflowStateSchema } from '../../src/sdk/workflow/state.js';

describe('workflowConfigSchema', () => {
  it('parses a minimal valid workflow config', () => {
    const parsed = workflowConfigSchema.parse({
      schemaVersion: '1',
      toolkitVersion: '0.1.0',
      agents: [{ id: 'cursor', enabled: true, commandPrefix: 'spec-n-' }],
      steps: [
        {
          id: 'specify',
          kind: 'built-in',
          command: 'spec-n-specify',
          enabled: true,
        },
      ],
      workflows: [
        {
          id: 'quick',
          name: 'Quick',
          steps: ['specify', 'tasks', 'implement'],
        },
      ],
      defaultWorkflowId: 'quick',
    });

    expect(parsed.defaultWorkflowId).toBe('quick');
  });

  it('allows an empty agents list', () => {
    const parsed = workflowConfigSchema.parse({
      schemaVersion: '1',
      toolkitVersion: '0.1.0',
      agents: [],
      steps: [
        {
          id: 'specify',
          kind: 'built-in',
          command: 'spec-n-specify',
          enabled: true,
        },
      ],
      workflows: [
        {
          id: 'quick',
          name: 'Quick',
          steps: ['specify', 'tasks', 'implement'],
        },
      ],
      defaultWorkflowId: 'quick',
    });

    expect(parsed.agents).toEqual([]);
  });

  it('rejects step ids that are not kebab-case', () => {
    expect(() =>
      workflowConfigSchema.parse({
        schemaVersion: '1',
        toolkitVersion: '0.1.0',
        agents: [{ id: 'cursor', enabled: true, commandPrefix: 'spec-n-' }],
        steps: [
          {
            id: 'Not_Valid',
            kind: 'built-in',
            command: 'spec-n-specify',
            enabled: true,
          },
        ],
        workflows: [
          {
            id: 'quick',
            name: 'Quick',
            steps: ['specify'],
          },
        ],
        defaultWorkflowId: 'quick',
      }),
    ).toThrow();
  });
});

describe('workflowStateSchema', () => {
  it('requires a numeric taskSpecId and slug', () => {
    const parsed = workflowStateSchema.parse({
      schemaVersion: '1',
      taskSpecId: '001',
      slug: 'sample-feature',
      workflowVariantId: 'quick',
      lastCompletedStepId: null,
      status: 'active',
      updatedAt: '2026-06-10T12:00:00.000Z',
    });

    expect(parsed.taskSpecId).toBe('001');
  });
});

describe('projectMetadataSchema', () => {
  it('requires currentTaskSlug when currentTaskSpecId is set', () => {
    expect(() =>
      projectMetadataSchema.parse({
        schemaVersion: '1',
        nextTaskSpecId: 2,
        currentTaskSpecId: '001',
        updatedAt: '2026-06-10T12:00:00.000Z',
      }),
    ).toThrow();
  });
});

describe('extensionManifestSchema', () => {
  it('parses a valid extension manifest', () => {
    const parsed = extensionManifestSchema.parse({
      manifestVersion: '1',
      id: 'cursor',
      name: 'Cursor',
      targetToolkitVersion: '0.1.0',
      steps: [
        {
          id: 'custom-specify',
          stepId: 'specify',
          command: 'spec-n-specify',
          entrypoint: 'index.js',
        },
      ],
    });

    expect(parsed.id).toBe('cursor');
  });

  it('accepts dynamic before_{stepId} hook events', () => {
    const parsed = extensionManifestSchema.parse({
      manifestVersion: '1',
      id: 'custom-gate',
      name: 'Custom Gate',
      targetToolkitVersion: '0.1.0',
      hooks: [
        {
          id: 'pre-gate',
          event: 'before_custom-gate',
          entrypoint: 'hooks/pre-gate.js',
        },
      ],
    });

    expect(parsed.hooks?.[0]?.event).toBe('before_custom-gate');
  });

  it('rejects CLI lifecycle hook events', () => {
    expect(() =>
      extensionManifestSchema.parse({
        manifestVersion: '1',
        id: 'bad-hooks',
        name: 'Bad Hooks',
        targetToolkitVersion: '0.1.0',
        hooks: [
          {
            id: 'on-update',
            event: 'before_update',
            entrypoint: 'hooks/on-update.js',
          },
        ],
      }),
    ).toThrow();
  });
});
