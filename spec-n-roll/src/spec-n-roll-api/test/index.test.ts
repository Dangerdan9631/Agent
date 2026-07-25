import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DISPATCHER_LOCAL_SOURCE_MARKER_FILE,
  LOCAL_CLI_RELATIVE_PATH_SEGMENTS,
  SPEC_N_ROLL_CONFIG_DIRECTORY_NAME,
  type PathResolutionContext,
  type RuntimeInvocation,
  type RuntimeTarget,
  type WorkflowDefinition,
} from '#api/index.js';

describe('spec-n-roll-api contracts', () => {
  it('describes dispatcher runtime invocation payloads', () => {
    const invocation: RuntimeInvocation = {
      argv: ['--global', '--root', 'project', 'version'],
      dispatcher: {
        installSource: 'local',
        installDirectory: '/toolkit/dist',
        packageVersion: '0.1.0',
      },
      projectRoot: '/repo/project',
      cwd: '/repo/project',
    };
    const target: RuntimeTarget = {
      executablePath: '/repo/project/.spec-n-roll/cli/bin/spec-n-roll',
      projectLocal: true,
    };
    const context: PathResolutionContext = {
      cwd: '/repo',
      requestedProjectRoot: 'project',
    };

    expect(invocation.argv).toEqual([
      '--global',
      '--root',
      'project',
      'version',
    ]);
    expect(invocation.dispatcher.installSource).toBe('local');
    expect(target.projectLocal).toBe(true);
    expect(context.requestedProjectRoot).toBe('project');
  });

  it('publishes shared dispatcher path constants', () => {
    expect(SPEC_N_ROLL_CONFIG_DIRECTORY_NAME).toBe('.spec-n-roll');
    expect(DISPATCHER_LOCAL_SOURCE_MARKER_FILE).toBe('.source-package-root');
    expect(join(...LOCAL_CLI_RELATIVE_PATH_SEGMENTS)).toMatch(
      /\.spec-n-roll[\\/]cli[\\/]bin[\\/]spec-n-roll/u,
    );
  });

  it('publishes versioned agent-agnostic workflow contracts', () => {
    const workflow: WorkflowDefinition = {
      schemaVersion: '1',
      id: 'feature-delivery',
      version: '1.0.0',
      metadata: { name: 'Feature delivery' },
      stepDefinitions: [
        {
          id: 'specify',
          skillId: 'spec-n-roll.specify',
          inputSchema: { type: 'object' },
          outputSchema: {
            type: 'object',
            properties: { specification: { type: 'string' } },
          },
          completionCriteria: {
            description: 'A specification is available after required hooks.',
            requiredOutputProperties: ['specification'],
          },
          failurePolicy: { strategy: 'stop' },
        },
      ],
      steps: ['specify'],
    };

    expect(workflow.schemaVersion).toBe('1');
    expect(workflow.steps).toEqual(['specify']);
    expect(workflow.stepDefinitions[0]?.skillId).toBe('spec-n-roll.specify');
    expect(workflow.stepDefinitions[0]).not.toHaveProperty('agent');
  });
});
