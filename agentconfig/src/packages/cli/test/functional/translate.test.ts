import { describe, expect, it, afterEach } from 'vitest';
import { runCli } from './cli-test-utils';
import { createTempDir, readText, removeDir, writeTree } from '../test-utils';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    removeDir(tempDirs.pop() as string);
  }
});

describe('translate CLI', () => {
  it('translates from a source target to a destination target', async () => {
    const projectDir = createTempDir('agentconfig-cli-translate-');
    tempDirs.push(projectDir);

    writeTree(projectDir, {
      '.github/copilot-instructions.md': 'Always keep changes reviewable.\n',
    });

    const result = await runCli([
      'translate',
      '--source-target',
      'copilot',
      '--dest-target',
      'cursor',
      '--project-root',
      projectDir,
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Translated 1 instruction(s), 0 agent(s)');
    expect(readText(projectDir, '.cursor/rules/copilot-instructions.mdc')).toContain(
      'Always keep changes reviewable.',
    );
  });
});
