import { afterEach, describe, expect, it } from 'vitest';
import { createTempDir, removeDir, withTempHome } from '../test-utils';
import { runCli } from './cli-test-utils';
import { defineCliTargetSuite } from './cli-target-suite';

defineCliTargetSuite({
  target: 'copilot-cli',
  generate: {
    expectedFileCount: 6,
    checks: [
      { path: '.github/copilot-instructions.md', contains: ['Always keep changes reviewable.'] },
      { path: '.github/instructions/scoped-rule.instructions.md', contains: ['applyTo: "src/**/*.ts, src/**/*.tsx"'] },
      { path: '.github/instructions/ai-rule.instructions.md', contains: ['> **Apply only when:** working on performance-sensitive code'] },
      { path: '.github/prompts/migration-guide.prompt.md', contains: ['Follow the migration guide carefully.'] },
      { path: '.github/prompts/deploy.prompt.md', contains: ['Use the staged deployment workflow.'] },
      { path: '.agents/skills/review-skill/SKILL.md', contains: ['# Review skill'] },
    ],
  },
  initialize: {
    expectedSummary: 'Initialized 4 instruction(s), 0 agent(s)',
    checks: [
      { path: '.agentconfig/config.yaml', contains: ['- copilot-cli'] },
      { path: '.agentconfig/instructions/copilot-instructions.md', contains: ['activation: always'] },
      { path: '.agentconfig/instructions/scoped.md', contains: ['activation: scoped'] },
      { path: '.agentconfig/instructions/ai.md', contains: ['activation: ai-decided'] },
      { path: '.agentconfig/instructions/migrate.md', contains: ['activation: manual'] },
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
  const homeDir = createTempDir('agentconfig-copilot-cli-extra-home-');
  tempDirs.push(homeDir);
  restoreHome = withTempHome(homeDir);
}

describe('copilot-cli error handling', () => {
  it('reports missing source directories through die()', async () => {
    useTempHome();

    const result = await runCli(['import', 'D:\\missing-agentconfig-source']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('error:');
  });
});