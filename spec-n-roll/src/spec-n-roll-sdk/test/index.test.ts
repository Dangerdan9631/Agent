import { describe, expect, it } from 'vitest';
import { ExpectedPackageNames } from 'spec-n-roll-test';
import type { StepDefinition, WorkflowDefinition } from 'spec-n-roll-api';
import { SpecNRollSdk, WorkflowDefinitionValidator } from '#sdk/index.js';

describe('SpecNRollSdk', () => {
  it('returns stub package names', () => {
    const sdk = new SpecNRollSdk();
    const expectedPackageNames = new ExpectedPackageNames();

    expect(sdk.name()).toBe(expectedPackageNames.runtime);
    expect(sdk.mcpName()).toBe(expectedPackageNames.mcp);
  });
});

describe('WorkflowDefinitionValidator', () => {
  const createStep = (
    id: string,
    skillId = `spec-n-roll.${id}`,
  ): StepDefinition => ({
    id,
    skillId,
    inputSchema: { type: 'object' },
    outputSchema: {
      type: 'object',
      properties: { artifact: { type: 'string' } },
    },
    completionCriteria: {
      description: 'The artifact exists after required post-hooks.',
      requiredOutputProperties: ['artifact'],
    },
    failurePolicy: { strategy: 'stop' },
  });

  const createWorkflow = (): WorkflowDefinition => ({
    schemaVersion: '1',
    id: 'feature-delivery',
    version: '1.0.0',
    metadata: { name: 'Feature delivery' },
    stepDefinitions: [createStep('specify'), createStep('implement')],
    steps: ['specify', 'implement'],
  });

  it('accepts a neutral definition and preserves its explicit ordering', () => {
    const definition = createWorkflow();
    const result = new WorkflowDefinitionValidator().validate(definition);

    expect(result).toEqual({ status: 'accepted', definition });
    expect(result.status === 'accepted' && result.definition.steps).toEqual([
      'specify',
      'implement',
    ]);
  });

  it('rejects unsupported serialized contract versions', () => {
    const definition = {
      ...createWorkflow(),
      schemaVersion: '2',
    } as unknown as WorkflowDefinition;

    const result = new WorkflowDefinitionValidator().validate(definition);

    expect(result).toMatchObject({
      status: 'rejected',
      issues: [
        {
          path: 'schemaVersion',
          message: 'Workflow schema version "2" is not supported.',
        },
      ],
    });
  });

  it('rejects duplicate definitions, duplicate ordering, and missing references', () => {
    const definition: WorkflowDefinition = {
      ...createWorkflow(),
      stepDefinitions: [createStep('specify'), createStep('specify')],
      steps: ['specify', 'missing', 'specify'],
    };

    const result = new WorkflowDefinitionValidator().validate(definition);

    expect(result.status).toBe('rejected');
    expect(
      result.status === 'rejected' &&
        result.issues.map((issue) => issue.message),
    ).toEqual(
      expect.arrayContaining([
        'Step definition identifier "specify" is duplicated.',
        'Ordered step reference "missing" has no definition.',
        'Ordered step reference "specify" is duplicated.',
      ]),
    );
  });

  it('rejects definitions omitted from the ordered workflow', () => {
    const definition: WorkflowDefinition = {
      ...createWorkflow(),
      steps: ['specify'],
    };

    const result = new WorkflowDefinitionValidator().validate(definition);

    expect(result).toMatchObject({
      status: 'rejected',
      issues: [
        {
          path: 'stepDefinitions.1.id',
          message:
            'Step definition "implement" is missing from the ordered steps.',
        },
      ],
    });
  });

  it('rejects empty neutral skill identifiers and non-object data schemas', () => {
    const invalidStep: StepDefinition = {
      ...createStep('specify', ' '),
      inputSchema: { type: 'string' },
      outputSchema: {},
    };
    const definition: WorkflowDefinition = {
      ...createWorkflow(),
      stepDefinitions: [invalidStep],
      steps: ['specify'],
    };

    const result = new WorkflowDefinitionValidator().validate(definition);

    expect(result.status).toBe('rejected');
    expect(
      result.status === 'rejected'
        ? result.issues.map((issue) => issue.path)
        : [],
    ).toEqual(
      expect.arrayContaining([
        'stepDefinitions.0.skillId',
        'stepDefinitions.0.inputSchema',
        'stepDefinitions.0.outputSchema',
      ]),
    );
  });

  it('rejects completion outputs absent from the output schema', () => {
    const invalidStep: StepDefinition = {
      ...createStep('specify'),
      completionCriteria: {
        description: 'A review is recorded.',
        requiredOutputProperties: ['review'],
      },
    };
    const definition: WorkflowDefinition = {
      ...createWorkflow(),
      stepDefinitions: [invalidStep],
      steps: ['specify'],
    };

    const result = new WorkflowDefinitionValidator().validate(definition);

    expect(result).toMatchObject({
      status: 'rejected',
      issues: [
        {
          path: 'stepDefinitions.0.completionCriteria.requiredOutputProperties.0',
          message:
            'Required output property "review" is absent from the output schema.',
        },
      ],
    });
  });

  it('rejects retry policies without a meaningful bounded attempt count', () => {
    const invalidStep: StepDefinition = {
      ...createStep('implement'),
      failurePolicy: { strategy: 'retry', maxAttempts: 1 },
    };
    const definition: WorkflowDefinition = {
      ...createWorkflow(),
      stepDefinitions: [invalidStep],
      steps: ['implement'],
    };

    const result = new WorkflowDefinitionValidator().validate(definition);

    expect(result).toMatchObject({
      status: 'rejected',
      issues: [
        {
          path: 'stepDefinitions.0.failurePolicy.maxAttempts',
          message: 'Retry maxAttempts must be an integer of at least two.',
        },
      ],
    });
  });
});
