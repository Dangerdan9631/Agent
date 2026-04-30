import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createTempDir, removeDir, withTempHome } from '../test-utils';
import { runCli } from './cli-test-utils';
import { defineCliTargetSuite } from './cli-target-suite';
import { writeGeneratorFixture } from './fixtures';

defineCliTargetSuite({
  target: 'cursor',
  generate: {
    expectedFileCount: 7,
    checks: [
      { path: '.cursor/rules/always-rule.mdc', contains: ['alwaysApply: true'] },
      { path: '.cursor/rules/scoped-rule.mdc', contains: ['globs: "src/**/*.ts, src/**/*.tsx"', 'alwaysApply: false'] },
      { path: '.cursor/rules/ai-rule.mdc', contains: ['description: working on performance-sensitive code'] },
      { path: '.cursor/skills/deploy/SKILL.md', contains: ['disable-model-invocation: true'] },
      { path: '.agents/skills/review-skill/SKILL.md', contains: ['# Review skill'] },
      { path: '.cursor/hooks.json', contains: ['"preToolUse"', '"failClosed": true'] },
    ],
  },
  initialize: {
    expectedSummary: 'Initialized 4 instruction(s), 0 agent(s)',
    checks: [
      { path: '.agentconfig/config.yaml', contains: ['- cursor'] },
      { path: '.agentconfig/instructions/always-rule.md', contains: ['activation: always'] },
      { path: '.agentconfig/instructions/scoped-rule.md', contains: ['activation: scoped'] },
      { path: '.agentconfig/instructions/ai-rule.md', contains: ['activation: ai-decided'] },
      { path: '.agentconfig/instructions/manual-rule.md', contains: ['activation: manual'] },
    ],
  },
});

const tempDirs: string[] = [];
let restoreHome: (() => void) | undefined;

afterEach(() => {
  restoreHome?.();
  restoreHome = undefined;
  while (tempDirs.length > 0) {
    removeDir(tempDirs.pop() as string);
  }
});

function useTempHome(): void {
  const homeDir = createTempDir('agentconfig-cursor-extra-home-');
  tempDirs.push(homeDir);
  restoreHome = withTempHome(homeDir);
}

describe('cursor diff and validate commands', () => {
  it('prints diff output in json format through the CLI', async () => {
    const projectDir = createTempDir('agentconfig-cursor-diff-');
    tempDirs.push(projectDir);
    useTempHome();

    writeGeneratorFixture(projectDir, 'cursor');

    const result = await runCli([
      'diff',
      '--config',
      path.join(projectDir, '.agentconfig'),
      '--format',
      'json',
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('"path": ".cursor/rules/always-rule.mdc"');
  });

  it('prints validation output in json format through the CLI', async () => {
    const projectDir = createTempDir('agentconfig-cursor-validate-');
    tempDirs.push(projectDir);
    useTempHome();

    writeGeneratorFixture(projectDir, 'cursor');

    const result = await runCli([
      'validate',
      '--config',
      path.join(projectDir, '.agentconfig'),
      '--format',
      'json',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('[]');
  });
});