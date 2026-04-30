import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createTempDir, removeDir, withTempHome } from '../test-utils';
import { runCli } from './cli-test-utils';
import { defineCliTargetSuite } from './cli-target-suite';
import { writeGeneratorFixture } from './fixtures';

defineCliTargetSuite({
  target: 'codex',
  generate: {
    expectedFileCount: 6,
    checks: [
      { path: 'AGENTS.md', contains: ['Always keep changes reviewable.', '> **Apply only when:** working on performance-sensitive code'] },
      { path: '.codex/instructions/migration-guide.md', contains: ['Follow the migration guide carefully.'] },
      { path: '.agents/skills/deploy/SKILL.md', contains: ['disable-model-invocation: true'] },
      { path: '.codex/agents/security-reviewer.toml', contains: ['sandbox_mode = "read-only"', 'developer_instructions = """'] },
      { path: '.agents/skills/review-skill/SKILL.md', contains: ['# Review skill'] },
      { path: '.codex/hooks.json', contains: ['"PreToolUse"'] },
    ],
  },
  initialize: {
    expectedSummary: 'Initialized 2 instruction(s), 1 agent(s)',
    checks: [
      { path: '.agentconfig/config.yaml', contains: ['- codex'] },
      { path: '.agentconfig/instructions/agents.md', contains: ['activation: always'] },
      { path: '.agentconfig/instructions/migrate.md', contains: ['activation: manual'] },
      { path: '.agentconfig/agents/security-reviewer.md', contains: ['name: security-reviewer'] },
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
  const homeDir = createTempDir('agentconfig-codex-extra-home-');
  tempDirs.push(homeDir);
  restoreHome = withTempHome(homeDir);
}

describe('codex validation command', () => {
  it('fails strict validation through the CLI when warnings are present', async () => {
    const projectDir = createTempDir('agentconfig-codex-validate-');
    tempDirs.push(projectDir);
    useTempHome();

    writeGeneratorFixture(projectDir, 'codex');

    const result = await runCli([
      'validate',
      '--config',
      path.join(projectDir, '.agentconfig'),
      '--strict',
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('[warn]');
  });
});