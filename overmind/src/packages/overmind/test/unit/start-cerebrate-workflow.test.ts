import { describe, expect, it } from 'vitest';

import { CerebrateRegistry } from '../../src/application/cerebrate-registry.js';
import { StartCerebrateWorkflowUseCase } from '../../src/application/use-cases/start-cerebrate-workflow.js';
import { WorkflowRun } from '../../src/domain/workflow/workflow-run.js';
import { createWorkflowFixture, createWorkflowFixtureOutputSink } from './workflow-test-fixtures.js';

describe('StartCerebrateWorkflowUseCase', () => {
  it('follows default transitions and completes on END', async () => {
    const { cerebrate, outputSink } = createWorkflowFixture({
      workflows: [{ name: 'daily-review', initialState: 'inspect' }],
      states: [
        { name: 'inspect', command: 'run', next: 'summarize', branches: [] },
        { name: 'summarize', command: 'summarize', next: 'END', branches: [] },
      ],
      outputs: {
        run: 'ran inspect',
        summarize: 'ran summarize',
      },
    });

    const run = new WorkflowRun('hello', 'daily-review', 'inspect');
    const useCase = new StartCerebrateWorkflowUseCase(
      new CerebrateRegistry(),
      { execute: async ({ command }) => ({ output: cerebrate.outputs[command] ?? '' }) },
      outputSink,
    );

    await useCase.executeWorkflowRun(cerebrate as never, cerebrate.workflow, run);

    expect(run.status).toBe('completed');
    expect(outputSink.lines.some((line) => line.includes('[workflow:default]'))).toBe(true);
    expect(outputSink.lines.some((line) => line.includes('[workflow:completion]'))).toBe(true);
  });

  it('uses the first matching branch when multiple branches match', async () => {
    const { cerebrate, outputSink } = createWorkflowFixture({
      workflows: [{ name: 'daily-review', initialState: 'inspect' }],
      states: [
        {
          name: 'inspect',
          command: 'run',
          next: 'summarize',
          branches: [
            { when: { outputContains: 'needs-validation' }, next: 'validate' },
            { when: { outputContains: 'needs-validation' }, next: 'fallback' },
          ],
        },
        { name: 'validate', command: 'validate', next: 'END', branches: [] },
        { name: 'summarize', command: 'summarize', next: 'END', branches: [] },
        { name: 'fallback', command: 'fallback', next: 'END', branches: [] },
      ],
      outputs: {
        run: 'needs-validation now',
        validate: 'validated',
      },
    });

    const run = new WorkflowRun('hello', 'daily-review', 'inspect');
    const useCase = new StartCerebrateWorkflowUseCase(
      new CerebrateRegistry(),
      { execute: async ({ command }) => ({ output: cerebrate.outputs[command] ?? '' }) },
      outputSink,
    );

    await useCase.executeWorkflowRun(cerebrate as never, cerebrate.workflow, run);

    expect(outputSink.lines.some((line) => line.includes('inspect -> validate'))).toBe(true);
    expect(outputSink.lines.some((line) => line.includes('[workflow:branch]'))).toBe(true);
    expect(outputSink.lines.some((line) => line.includes('fallback'))).toBe(false);
  });

  it('follows onError when a command fails and fails otherwise', async () => {
    const { cerebrate: recoverCerebrate, outputSink: recoverSink } = createWorkflowFixture({
      workflows: [{ name: 'daily-review', initialState: 'inspect' }],
      states: [
        { name: 'inspect', command: 'run', next: 'END', branches: [], onError: 'recover' },
        { name: 'recover', command: 'shutdown', next: 'END', branches: [] },
      ],
      outputs: {
        shutdown: 'recovered',
      },
      failingCommands: new Set(['run']),
    });

    const recoveryUseCase = new StartCerebrateWorkflowUseCase(
      new CerebrateRegistry(),
      {
        execute: async ({ command }) => {
          if (recoverCerebrate.failingCommands.has(command)) {
            throw new Error('boom');
          }
          return { output: recoverCerebrate.outputs[command] ?? '' };
        },
      },
      recoverSink,
    );
    const recoveredRun = new WorkflowRun('hello', 'daily-review', 'inspect');
    await recoveryUseCase.executeWorkflowRun(
      recoverCerebrate as never,
      recoverCerebrate.workflow,
      recoveredRun,
    );
    expect(recoveredRun.status).toBe('completed');
    expect(recoverSink.lines.some((line) => line.includes('[workflow:error]'))).toBe(true);

    const { cerebrate: failingCerebrate, outputSink: failingSink } = createWorkflowFixture({
      workflows: [{ name: 'daily-review', initialState: 'inspect' }],
      states: [
        { name: 'inspect', command: 'run', next: 'END', branches: [] },
      ],
      outputs: {},
      failingCommands: new Set(['run']),
    });
    const failingUseCase = new StartCerebrateWorkflowUseCase(
      new CerebrateRegistry(),
      {
        execute: async ({ command }) => {
          if (failingCerebrate.failingCommands.has(command)) {
            throw new Error('boom');
          }
          return { output: failingCerebrate.outputs[command] ?? '' };
        },
      },
      failingSink,
    );
    const failedRun = new WorkflowRun('hello', 'daily-review', 'inspect');
    await failingUseCase.executeWorkflowRun(
      failingCerebrate as never,
      failingCerebrate.workflow,
      failedRun,
    );
    expect(failedRun.status).toBe('failed');
    expect(failedRun.lastError).toBe('boom');
    expect(failingSink.lines.some((line) => line.includes('[workflow:failure]'))).toBe(true);
  });

  it('completes when onError targets END', async () => {
    const { cerebrate, outputSink } = createWorkflowFixture({
      workflows: [{ name: 'daily-review', initialState: 'inspect' }],
      states: [
        { name: 'inspect', command: 'run', next: 'summarize', branches: [], onError: 'END' },
      ],
      outputs: {},
      failingCommands: new Set(['run']),
    });

    const useCase = new StartCerebrateWorkflowUseCase(
      new CerebrateRegistry(),
      {
        execute: async ({ command }) => {
          if (cerebrate.failingCommands.has(command)) {
            throw new Error('boom');
          }
          return { output: cerebrate.outputs[command] ?? '' };
        },
      },
      outputSink,
    );
    const run = new WorkflowRun('hello', 'daily-review', 'inspect');

    await useCase.executeWorkflowRun(cerebrate as never, cerebrate.workflow, run);

    expect(run.status).toBe('completed');
    expect(outputSink.lines.some((line) => line.includes('[workflow:completion]'))).toBe(true);
    expect(outputSink.lines.some((line) => line.includes('error path'))).toBe(true);
  });

  it('rejects concurrent workflow starts for the same cerebrate', async () => {
    const registry = new CerebrateRegistry();
    registry.add({
      name: 'hello',
      getWorkflowDefinition: () => ({ name: 'daily-review', initialState: 'inspect' }),
    } as never);
    registry.startWorkflow('hello', new WorkflowRun('hello', 'other', 'inspect'));

    const useCase = new StartCerebrateWorkflowUseCase(
      registry,
      { execute: async () => ({ output: '' }) },
      createWorkflowFixtureOutputSink(),
    );

    await expect(
      useCase.execute({ cerebrateName: 'hello', workflowName: 'daily-review' }),
    ).rejects.toThrow('Workflow already running for cerebrate "hello".');
  });
});
