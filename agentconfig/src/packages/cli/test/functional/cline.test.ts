import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createTempDir, removeDir, withTempHome } from '../test-utils';
import { runCli } from './cli-test-utils';
import { defineCliTargetSuite } from './cli-target-suite';
import { writeGeneratorFixture } from './fixtures';

defineCliTargetSuite({
  target: 'cline',
  generate: {
    expectedFileCount: 8,
    checks: [
      { path: '.clinerules/always-rule.md', contains: ['Always keep changes reviewable.'] },
      { path: '.clinerules/scoped-rule.md', contains: ['paths:', 'src/**/*.ts'] },
      { path: '.clinerules/ai-rule.md', contains: ['> **Apply only when:** working on performance-sensitive code'] },
      { path: '.clinerules/workflows/deploy.md', contains: ['Use the staged deployment workflow.'] },
      { path: '.cline/skills/review-skill/SKILL.md', contains: ['# Review skill'] },
      { path: '.clinerules/hooks/PreToolUse', contains: ['block-force-push'] },
      { path: '.clinerules/hooks/PreToolUse.ps1', contains: ['block-force-push'] },
    ],
  },
  initialize: {
    expectedSummary: 'Initialized 3 instruction(s), 0 agent(s)',
    checks: [
      { path: '.agentconfig/config.yaml', contains: ['- cline'] },
      { path: '.agentconfig/instructions/always-rule.md', contains: ['activation: always'] },
      { path: '.agentconfig/instructions/scoped-rule.md', contains: ['activation: scoped'] },
      { path: '.agentconfig/instructions/ai-rule.md', contains: ['activation: ai-decided'] },
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
  const homeDir = createTempDir('agentconfig-cline-extra-home-');
  tempDirs.push(homeDir);
  restoreHome = withTempHome(homeDir);
}

describe('cline fatal CLI handling', () => {
  it('surfaces unhandled command failures through the top-level fatal handler', async () => {
    useTempHome();

    const result = await runCli(['diff', '--config', path.join('D:\\missing-agentconfig', '.agentconfig')]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('fatal:');
  });
});