import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { runInit } from '../../src/sdk/init.js';

const tempDirs: string[] = [];

/**
 * Creates a temporary project directory for non-interactive CLI tests.
 *
 * @param prefix - Prefix for the temp directory name.
 * @returns Absolute path to the created directory.
 */
function createTempProject(prefix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-non-interactive-${prefix}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir != null) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup.
      }
    }
  }
});

describe('SC-009 non-interactive management commands', () => {
  const cliPath = path.resolve('dist/cli/index.js');

  beforeAll(() => {
    if (!existsSync(cliPath)) {
      throw new Error('Build output missing. Run `npm run build` before integration tests.');
    }
  });

  it('completes init with --agents, update, and config agent add with zero Ink prompts', async () => {
    const inkModule = await import('../../src/ink/init-prompts.js');
    const addAgentInkModule = await import('../../src/ink/add-agent-prompt.js');
    const updateInkModule = await import('../../src/ink/update-prompts.js');

    const initPromptSpy = vi.spyOn(inkModule, 'promptForAgentSelection');
    const addAgentPromptSpy = vi.spyOn(addAgentInkModule, 'promptForAgentToAdd');
    const updatePromptSpy = vi.spyOn(updateInkModule, 'promptForUpdateConfirmation');

    const projectRoot = createTempProject('sc009');

    const initResult = spawnSync(
      process.execPath,
      [cliPath, 'init', projectRoot, '--agents', 'cursor'],
      { encoding: 'utf8' },
    );
    expect(initResult.status).toBe(0);
    expect(initPromptSpy).not.toHaveBeenCalled();

    const updateResult = spawnSync(process.execPath, [cliPath, 'update'], {
      cwd: projectRoot,
      encoding: 'utf8',
    });
    expect(updateResult.status).toBe(0);
    expect(updatePromptSpy).not.toHaveBeenCalled();

    const addAgentResult = spawnSync(
      process.execPath,
      [cliPath, 'config', 'agent', 'add', 'claude-code'],
      {
        cwd: projectRoot,
        encoding: 'utf8',
      },
    );
    expect(addAgentResult.status).toBe(0);
    expect(addAgentPromptSpy).not.toHaveBeenCalled();

    expect(existsSync(path.join(projectRoot, '.spec-n-roll', 'cli', 'bin', 'spec-n-roll'))).toBe(
      true,
    );
    expect(existsSync(path.join(projectRoot, 'CLAUDE.md'))).toBe(true);

    const workflowConfig = JSON.parse(
      readFileSync(
        path.join(projectRoot, '.spec-n-roll', 'config', 'workflow.config.json'),
        'utf8',
      ),
    ) as { agents: Array<{ id: string }> };
    expect(workflowConfig.agents.map((agent) => agent.id).sort()).toEqual([
      'claude-code',
      'cursor',
    ]);

    initPromptSpy.mockRestore();
    addAgentPromptSpy.mockRestore();
    updatePromptSpy.mockRestore();
  }, 30_000);

  it('lists agents non-interactively via list agents', () => {
    const result = spawnSync(process.execPath, [cliPath, 'list', 'agents'], {
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('id           name');
    expect(result.stdout).toContain('claude-code  Claude Code');
    expect(result.stdout).toContain('codex        Codex');
    expect(result.stdout).toContain('copilot      GitHub Copilot');
    expect(result.stdout).toContain('cursor       Cursor');
  });

  it('lists only enabled project agents when --enabled is passed', async () => {
    const projectRoot = createTempProject('list-enabled');

    await runInit({
      projectRoot,
      agents: ['cursor', 'claude-code'],
    });

    const workflowConfigPath = path.join(
      projectRoot,
      '.spec-n-roll',
      'config',
      'workflow.config.json',
    );
    const workflowConfig = JSON.parse(readFileSync(workflowConfigPath, 'utf8')) as {
      agents: Array<{ id: string; enabled: boolean }>;
    };
    workflowConfig.agents = workflowConfig.agents.map((agent) =>
      agent.id === 'claude-code' ? { ...agent, enabled: false } : agent,
    );
    writeFileSync(workflowConfigPath, `${JSON.stringify(workflowConfig, null, 2)}\n`);

    const result = spawnSync(process.execPath, [cliPath, 'list', 'agents', '--enabled'], {
      cwd: projectRoot,
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe('id      name\ncursor  Cursor\n');
  });

  it('remove --yes deletes managed files without Ink prompts', async () => {
    const projectRoot = createTempProject('remove-yes');

    await runInit({
      projectRoot,
      agents: ['cursor'],
    });

    const specsDir = path.join(projectRoot, 'specs');
    mkdirSync(specsDir, { recursive: true });
    writeFileSync(path.join(specsDir, 'keep-me.md'), '# preserved\n');

    const removeResult = spawnSync(process.execPath, [cliPath, 'remove', '--yes'], {
      cwd: projectRoot,
      encoding: 'utf8',
    });

    expect(removeResult.status).toBe(0);
    expect(removeResult.stdout).toContain('Removed Spec-N-Roll managed files');
    expect(existsSync(path.join(projectRoot, '.spec-n-roll'))).toBe(false);
    expect(existsSync(path.join(specsDir, 'keep-me.md'))).toBe(true);
  });
});
