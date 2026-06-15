import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { runInit } from '../../src/sdk/init.js';
import { readProjectMetadata } from '../../src/sdk/core/project-metadata.js';
import { workflowConfigSchema } from '../../src/sdk/config/schema.js';

const tempDirs: string[] = [];

/**
 * Creates a temporary project directory for init integration tests.
 *
 * @param prefix - Prefix for the temp directory name.
 * @returns Absolute path to the created directory.
 */
function createTempProject(prefix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-init-${prefix}-${Date.now()}`);
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

describe('spec-n-roll init', () => {
  beforeAll(() => {
    if (!existsSync(path.resolve('dist/cli/index.js'))) {
      throw new Error('Build output missing. Run `npm run build` before integration tests.');
    }
  });

  it('initializes two agents with skills, rules, MCP config, workflow config, and binaries', async () => {
    const projectRoot = createTempProject('multi-agent');
    const preExistingMcp = path.join(projectRoot, '.cursor', 'mcp.json');
    mkdirSync(path.dirname(preExistingMcp), { recursive: true });
    writeFixtureMcp(preExistingMcp);

    await runInit({
      projectRoot,
      agents: ['cursor', 'claude-code'],
    });

    expect(existsSync(path.join(projectRoot, '.agents', 'skills'))).toBe(true);
    expect(existsSync(path.join(projectRoot, '.spec-n-roll', 'AGENTS.md'))).toBe(true);
    expect(existsSync(path.join(projectRoot, '.cursor', 'rules', 'spec-n-roll.mdc'))).toBe(true);
    expect(existsSync(path.join(projectRoot, 'CLAUDE.md'))).toBe(true);

    const workflowConfig = workflowConfigSchema.parse(
      JSON.parse(
        readFileSync(
          path.join(projectRoot, '.spec-n-roll', 'config', 'workflow.config.json'),
          'utf8',
        ),
      ),
    );
    expect(workflowConfig.workflows.map((workflow) => workflow.id).sort()).toEqual([
      'full',
      'papercut',
      'quick',
    ]);
    for (const workflow of workflowConfig.workflows) {
      expect(workflow.steps[0]).toBe('specify');
    }
    expect(workflowConfig.agents.map((agent) => agent.id).sort()).toEqual([
      'claude-code',
      'cursor',
    ]);

    const metadata = await readProjectMetadata(projectRoot);
    expect(metadata?.nextTaskSpecId).toBe(1);

    const cursorMcp = JSON.parse(readFileSync(preExistingMcp, 'utf8')) as {
      mcpServers: Record<string, { args?: string[] }>;
    };
    expect(cursorMcp.mcpServers['other-server']).toBeDefined();
    expect(cursorMcp.mcpServers['spec-n-roll']).toBeDefined();
    expect(cursorMcp.mcpServers['spec-n-roll'].args).toContain(
      '.spec-n-roll/cli/bin/spec-n-roll-mcp',
    );

    const claudeMcpPath = path.join(projectRoot, '.mcp.json');
    expect(existsSync(claudeMcpPath)).toBe(true);
    const claudeMcp = JSON.parse(readFileSync(claudeMcpPath, 'utf8')) as {
      mcpServers: Record<string, { args?: string[] }>;
    };
    expect(claudeMcp.mcpServers['spec-n-roll']).toBeDefined();

    const localCli = path.join(projectRoot, '.spec-n-roll', 'cli', 'bin', 'spec-n-roll');
    const localSnr = path.join(projectRoot, '.spec-n-roll', 'cli', 'bin', 'snr');
    const localMcp = path.join(projectRoot, '.spec-n-roll', 'cli', 'bin', 'spec-n-roll-mcp');
    expect(existsSync(localCli)).toBe(true);
    expect(existsSync(localSnr)).toBe(true);
    expect(existsSync(localMcp)).toBe(true);

    if (process.platform === 'win32') {
      expect(
        existsSync(path.join(projectRoot, '.spec-n-roll', 'cli', 'bin', 'spec-n-roll.cmd')),
      ).toBe(true);
      expect(existsSync(path.join(projectRoot, '.spec-n-roll', 'cli', 'bin', 'snr.cmd'))).toBe(
        true,
      );
      expect(
        existsSync(path.join(projectRoot, '.spec-n-roll', 'cli', 'bin', 'spec-n-roll-mcp.cmd')),
      ).toBe(true);
    }
  });
});

/**
 * Writes a pre-existing Cursor MCP config fixture with an unrelated server entry.
 *
 * @param filePath - Absolute path to the MCP config file.
 */
function writeFixtureMcp(filePath: string): void {
  const fixture = path.resolve(
    'tests/fixtures/pre-existing-agent-mcp-config-templates/.cursor/mcp.json',
  );
  writeFileSync(filePath, readFileSync(fixture, 'utf8'), 'utf8');
}
