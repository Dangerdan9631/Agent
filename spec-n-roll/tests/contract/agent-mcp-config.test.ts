import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { mergeAgentMcpConfig } from '../../src/agents/mcp-config.js';

const tempDirs: string[] = [];

/**
 * Creates a temporary directory for MCP merge contract tests.
 *
 * @param prefix - Prefix for the temp directory name.
 * @returns Absolute path to the created directory.
 */
function createTempDir(prefix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-mcp-${prefix}-${Date.now()}`);
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

describe('agent MCP config merge', () => {
  it('upserts Spec-N-Roll serverId and preserves unrelated MCP servers', async () => {
    const projectRoot = createTempDir('upsert');
    const targetPath = '.cursor/mcp.json';
    const existingPath = path.join(projectRoot, targetPath);
    mkdirSync(path.dirname(existingPath), { recursive: true });
    writeFileSync(
      existingPath,
      JSON.stringify(
        {
          mcpServers: {
            'other-server': {
              command: 'node',
              args: ['other-mcp.js'],
            },
          },
        },
        null,
        2,
      ),
      'utf8',
    );

    await mergeAgentMcpConfig({
      projectRoot,
      targetPath,
      format: 'cursor-mcp-json',
      serverId: 'spec-n-roll',
      mcpBinaryRelativePath: '.spec-n-roll/cli/bin/spec-n-roll-mcp',
    });

    const parsed = JSON.parse(readFileSync(existingPath, 'utf8')) as {
      mcpServers: Record<string, { command: string; args?: string[] }>;
    };

    expect(parsed.mcpServers['other-server']).toEqual({
      command: 'node',
      args: ['other-mcp.js'],
    });
    expect(parsed.mcpServers['spec-n-roll']).toBeDefined();
    expect(parsed.mcpServers['spec-n-roll'].command).toBe('node');
    expect(parsed.mcpServers['spec-n-roll'].args).toContain('.spec-n-roll/cli/bin/spec-n-roll-mcp');
  });

  it('is idempotent when merge runs twice for the same agent target', async () => {
    const projectRoot = createTempDir('idempotent');
    const targetPath = '.cursor/mcp.json';
    const options = {
      projectRoot,
      targetPath,
      format: 'cursor-mcp-json' as const,
      serverId: 'spec-n-roll',
      mcpBinaryRelativePath: '.spec-n-roll/cli/bin/spec-n-roll-mcp',
    };

    await mergeAgentMcpConfig(options);
    const first = readFileSync(path.join(projectRoot, targetPath), 'utf8');

    await mergeAgentMcpConfig(options);
    const second = readFileSync(path.join(projectRoot, targetPath), 'utf8');

    expect(JSON.parse(second)).toEqual(JSON.parse(first));
  });
});
