import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { runConfigAgentAdd } from '../../src/sdk/config-agent.js';
import { runConfigAgentRemove } from '../../src/sdk/config-agent.js';
import { runInit } from '../../src/sdk/init.js';
import { workflowConfigSchema } from '../../src/sdk/config/schema.js';

const tempDirs: string[] = [];

/**
 * Creates a temporary project directory for config agent integration tests.
 *
 * @param prefix - Prefix for the temp directory name.
 * @returns Absolute path to the created directory.
 */
function createTempProject(prefix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-config-agent-${prefix}-${Date.now()}`);
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

describe('spec-n-roll config agent add', () => {
  beforeAll(() => {
    if (!existsSync(path.resolve('dist/cli/index.js'))) {
      throw new Error('Build output missing. Run `npm run build` before integration tests.');
    }
  });

  it('adds a new agent only, leaves existing agents unchanged, and is idempotent', async () => {
    const projectRoot = createTempProject('add-agent');
    const cursorMcpPath = path.join(projectRoot, '.cursor', 'mcp.json');

    await runInit({
      projectRoot,
      agents: ['cursor'],
    });

    const cursorMcpBefore = readFileSync(cursorMcpPath, 'utf8');

    const first = await runConfigAgentAdd({
      projectRoot,
      agents: ['copilot'],
    });

    expect(first.agents).toEqual([{ agentId: 'copilot', alreadyConfigured: false }]);
    expect(existsSync(path.join(projectRoot, '.github', 'copilot-instructions.md'))).toBe(true);
    expect(readFileSync(cursorMcpPath, 'utf8')).toBe(cursorMcpBefore);

    const copilotMcpPath = path.join(projectRoot, '.vscode', 'mcp.json');
    expect(existsSync(copilotMcpPath)).toBe(true);
    const copilotMcp = JSON.parse(readFileSync(copilotMcpPath, 'utf8')) as {
      mcpServers: Record<string, { args?: string[] }>;
    };
    expect(copilotMcp.mcpServers['spec-n-roll']).toBeDefined();

    const workflowConfig = workflowConfigSchema.parse(
      JSON.parse(
        readFileSync(
          path.join(projectRoot, '.spec-n-roll', 'config', 'workflow.config.json'),
          'utf8',
        ),
      ),
    );
    expect(workflowConfig.agents.map((agent) => agent.id).sort()).toEqual(['copilot', 'cursor']);

    const copilotMcpAfterFirst = readFileSync(copilotMcpPath, 'utf8');

    const second = await runConfigAgentAdd({
      projectRoot,
      agents: ['copilot'],
    });

    expect(second.agents).toEqual([{ agentId: 'copilot', alreadyConfigured: true }]);
    expect(readFileSync(copilotMcpPath, 'utf8')).toBe(copilotMcpAfterFirst);
  });

  it('adds multiple agents in one request', async () => {
    const projectRoot = createTempProject('add-multiple');

    await runInit({
      projectRoot,
      agents: ['cursor'],
    });

    const result = await runConfigAgentAdd({
      projectRoot,
      agents: ['copilot', 'claude-code'],
    });

    expect(result.agents).toEqual([
      { agentId: 'copilot', alreadyConfigured: false },
      { agentId: 'claude-code', alreadyConfigured: false },
    ]);

    const workflowConfig = workflowConfigSchema.parse(
      JSON.parse(
        readFileSync(
          path.join(projectRoot, '.spec-n-roll', 'config', 'workflow.config.json'),
          'utf8',
        ),
      ),
    );
    expect(workflowConfig.agents.map((agent) => agent.id).sort()).toEqual([
      'claude-code',
      'copilot',
      'cursor',
    ]);
  });
});

describe('spec-n-roll config agent remove', () => {
  beforeAll(() => {
    if (!existsSync(path.resolve('dist/cli/index.js'))) {
      throw new Error('Build output missing. Run `npm run build` before integration tests.');
    }
  });

  it('removes one agent, leaves others unchanged, and is idempotent', async () => {
    const projectRoot = createTempProject('remove-agent');
    const cursorMcpPath = path.join(projectRoot, '.cursor', 'mcp.json');

    await runInit({
      projectRoot,
      agents: ['cursor', 'copilot'],
    });

    const cursorMcpBefore = readFileSync(cursorMcpPath, 'utf8');

    const first = await runConfigAgentRemove({
      projectRoot,
      agents: ['copilot'],
    });

    expect(first.agents).toEqual([{ agentId: 'copilot', notConfigured: false }]);
    expect(existsSync(path.join(projectRoot, '.github', 'copilot-instructions.md'))).toBe(false);
    expect(existsSync(path.join(projectRoot, '.vscode', 'mcp.json'))).toBe(false);
    expect(readFileSync(cursorMcpPath, 'utf8')).toBe(cursorMcpBefore);

    const workflowConfig = workflowConfigSchema.parse(
      JSON.parse(
        readFileSync(
          path.join(projectRoot, '.spec-n-roll', 'config', 'workflow.config.json'),
          'utf8',
        ),
      ),
    );
    expect(workflowConfig.agents.map((agent) => agent.id)).toEqual(['cursor']);

    const second = await runConfigAgentRemove({
      projectRoot,
      agents: ['copilot'],
    });

    expect(second.agents).toEqual([{ agentId: 'copilot', notConfigured: true }]);
    expect(readFileSync(cursorMcpPath, 'utf8')).toBe(cursorMcpBefore);
  });

  it('removes the last configured agent', async () => {
    const projectRoot = createTempProject('remove-last-agent');

    await runInit({
      projectRoot,
      agents: ['cursor'],
    });

    const result = await runConfigAgentRemove({
      projectRoot,
      agents: ['cursor'],
    });

    expect(result.agents).toEqual([{ agentId: 'cursor', notConfigured: false }]);

    const workflowConfig = workflowConfigSchema.parse(
      JSON.parse(
        readFileSync(
          path.join(projectRoot, '.spec-n-roll', 'config', 'workflow.config.json'),
          'utf8',
        ),
      ),
    );
    expect(workflowConfig.agents).toEqual([]);
  });

  it('removes multiple agents in one request', async () => {
    const projectRoot = createTempProject('remove-multiple');

    await runInit({
      projectRoot,
      agents: ['cursor', 'copilot', 'claude-code'],
    });

    const result = await runConfigAgentRemove({
      projectRoot,
      agents: ['copilot', 'claude-code'],
    });

    expect(result.agents).toEqual([
      { agentId: 'copilot', notConfigured: false },
      { agentId: 'claude-code', notConfigured: false },
    ]);

    const workflowConfig = workflowConfigSchema.parse(
      JSON.parse(
        readFileSync(
          path.join(projectRoot, '.spec-n-roll', 'config', 'workflow.config.json'),
          'utf8',
        ),
      ),
    );
    expect(workflowConfig.agents.map((agent) => agent.id)).toEqual(['cursor']);
  });
});
