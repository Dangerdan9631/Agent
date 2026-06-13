import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { mergeAgentMcpConfig } from '../../src/agents/mcp-config.js';
import { runInit } from '../../src/cli/commands/init.js';
import { runUpdate } from '../../src/cli/commands/update.js';

const tempDirs: string[] = [];

/**
 * Creates a temporary project directory for update integration tests.
 *
 * @param prefix - Prefix for the temp directory name.
 * @returns Absolute path to the created directory.
 */
function createTempProject(prefix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-update-${prefix}-${Date.now()}`);
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

describe('spec-n-roll update', () => {
  beforeAll(() => {
    if (!existsSync(path.resolve('dist/cli/index.js'))) {
      throw new Error('Build output missing. Run `npm run build` before integration tests.');
    }
  });

  it('overwrites toolkit-owned files, preserves user-owned files, backs up modified toolkit-owned, and refreshes MCP paths', async () => {
    const projectRoot = createTempProject('apply');
    const workflowConfigPath = path.join(
      projectRoot,
      '.spec-n-roll',
      'config',
      'workflow.config.json',
    );
    const metadataPath = path.join(
      projectRoot,
      '.spec-n-roll',
      'config',
      'project-metadata.json',
    );
    const specPath = path.join(projectRoot, 'specs', '001-user-owned', 'spec.md');
    const agentsMdPath = path.join(projectRoot, '.spec-n-roll', 'AGENTS.md');
    const cursorMcpPath = path.join(projectRoot, '.cursor', 'mcp.json');

    await runInit({
      projectRoot,
      agents: ['cursor'],
    });

    const workflowConfigBefore = readFileSync(workflowConfigPath, 'utf8');
    const metadataBefore = readFileSync(metadataPath, 'utf8');

    mkdirSync(path.dirname(specPath), { recursive: true });
    writeFileSync(specPath, '# User-owned spec content\n', 'utf8');

    writeFileSync(agentsMdPath, '# Locally modified toolkit-owned AGENTS.md\n', 'utf8');

    await mergeAgentMcpConfig({
      projectRoot,
      targetPath: '.cursor/mcp.json',
      format: 'cursor-mcp-json',
      serverId: 'spec-n-roll',
      mcpBinaryRelativePath: 'stale/wrong-path/spec-n-roll-mcp',
    });

    const result = await runUpdate({
      projectRoot,
    });

    expect(result.backupConflicts.length).toBeGreaterThanOrEqual(1);
    expect(existsSync(`${agentsMdPath}.bak`)).toBe(true);
    expect(readFileSync(`${agentsMdPath}.bak`, 'utf8')).toContain('Locally modified');

    const agentsMdAfter = readFileSync(agentsMdPath, 'utf8');
    expect(agentsMdAfter).not.toContain('Locally modified');
    expect(agentsMdAfter).toContain('Spec-n-Roll Agent Rules');

    expect(readFileSync(workflowConfigPath, 'utf8')).toBe(workflowConfigBefore);
    expect(readFileSync(metadataPath, 'utf8')).toBe(metadataBefore);
    expect(readFileSync(specPath, 'utf8')).toBe('# User-owned spec content\n');

    const cursorMcp = JSON.parse(readFileSync(cursorMcpPath, 'utf8')) as {
      mcpServers: Record<string, { args?: string[] }>;
    };
    expect(cursorMcp.mcpServers['spec-n-roll'].args).toContain(
      '.spec-n-roll/cli/bin/spec-n-roll-mcp',
    );
    expect(result.mcpRefresh.some((entry) => entry.agentId === 'cursor' && entry.refreshed)).toBe(
      true,
    );

    expect(existsSync(path.join(projectRoot, '.spec-n-roll', 'cli', 'bin', 'spec-n-roll'))).toBe(
      true,
    );
    expect(existsSync(path.join(projectRoot, '.spec-n-roll', 'cli', 'bin', 'spec-n-roll-mcp'))).toBe(
      true,
    );
  });
});
