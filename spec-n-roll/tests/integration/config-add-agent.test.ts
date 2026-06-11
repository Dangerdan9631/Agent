import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { runConfigAddAgent } from '../../src/cli/commands/config-add-agent.js';
import { runInit } from '../../src/cli/commands/init.js';
import { workflowConfigSchema } from '../../src/config/schema.js';

const tempDirs: string[] = [];

/**
 * Creates a temporary project directory for config add-agent integration tests.
 *
 * @param prefix - Prefix for the temp directory name.
 * @returns Absolute path to the created directory.
 */
function createTempProject(prefix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-add-agent-${prefix}-${Date.now()}`);
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

describe('spec-n-roll config add-agent', () => {
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
      yes: true,
    });

    const cursorMcpBefore = readFileSync(cursorMcpPath, 'utf8');

    const first = await runConfigAddAgent({
      projectRoot,
      agent: 'copilot',
      yes: true,
    });

    expect(first.addedAgent).toBe('copilot');
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

    const second = await runConfigAddAgent({
      projectRoot,
      agent: 'copilot',
      yes: true,
    });

    expect(second.alreadyConfigured).toBe(true);
    expect(readFileSync(copilotMcpPath, 'utf8')).toBe(copilotMcpAfterFirst);
  });
});
