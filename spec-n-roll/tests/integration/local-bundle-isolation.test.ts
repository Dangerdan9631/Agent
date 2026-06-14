import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { MCP_BINARY_RELATIVE_PATH } from '../../src/agents/mcp-config.js';
import { runInit } from '../../src/cli/commands/init.js';
import { LOCAL_INSTALL_LAYOUT_VERSION } from '../../src/cli/local-install-integrity.js';

const tempDirs: string[] = [];
const repoRoot = path.resolve('.');
const dispatcherPath = path.join(repoRoot, 'dist/cli/dispatcher.js');

/**
 * Creates a temporary project directory tracked for cleanup.
 *
 * @param prefix - Prefix for the temp directory name.
 * @returns Absolute path to the created directory.
 */
function createTempProject(prefix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-isolation-${prefix}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  tempDirs.push(dir);
  return dir;
}

/**
 * Runs the global dispatcher with arguments from a project root.
 *
 * @param projectRoot - Absolute project root used as cwd.
 * @param args - CLI arguments after the dispatcher script path.
 * @returns Spawn result with stdout and stderr captured.
 */
function runDispatcher(
  projectRoot: string,
  args: string[],
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [dispatcherPath, ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
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

beforeAll(() => {
  if (!existsSync(dispatcherPath)) {
    throw new Error('Build output missing. Run `npm run build` before integration tests.');
  }
});

describe('local bundle isolation (SC-002)', () => {
  it('runs commands via dispatcher without external toolkitPackageRoot coupling', async () => {
    const projectRoot = createTempProject('isolated');
    await runInit({ projectRoot, agents: ['cursor'] });

    const cliDir = path.join(projectRoot, '.spec-n-roll', 'cli');
    expect(existsSync(path.join(cliDir, 'dist', 'cli', 'index.js'))).toBe(true);
    expect(existsSync(path.join(cliDir, 'dist', 'mcp', 'server.js'))).toBe(true);

    const installManifest = JSON.parse(readFileSync(path.join(cliDir, 'install.json'), 'utf8')) as {
      layoutVersion: number;
      toolkitPackageRoot?: string;
    };
    expect(installManifest.layoutVersion).toBe(LOCAL_INSTALL_LAYOUT_VERSION);
    expect(installManifest.toolkitPackageRoot).toBeUndefined();

    for (const launcherName of readdirSync(path.join(cliDir, 'bin'))) {
      const launcherPath = path.join(cliDir, 'bin', launcherName);
      if (!launcherName.endsWith('.cmd')) {
        const content = readFileSync(launcherPath, 'utf8');
        expect(content).not.toContain('toolkitPackageRoot');
      }
    }

    const version = runDispatcher(projectRoot, ['version']);
    expect(version.status).toBe(0);
    expect(version.stdout).toContain('toolkit version');
    expect(version.stdout).toContain('invocation: local');

    const initHelp = runDispatcher(projectRoot, ['init', '--help']);
    expect(initHelp.status).toBe(0);
    expect(initHelp.stdout).toContain('Initialize Spec-N-Roll in a project');

    const mcpLauncher = path.join(cliDir, 'bin', 'spec-n-roll-mcp');
    const mcpSpawn = spawnSync(process.execPath, [mcpLauncher], {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: 5_000,
    });
    expect(mcpSpawn.status).toBe(0);
  }, 30_000);

  it('writes agent MCP config targeting the bundled local server after init', async () => {
    const projectRoot = createTempProject('mcp-config');
    await runInit({ projectRoot, agents: ['cursor'] });

    const mcpConfigPath = path.join(projectRoot, '.cursor', 'mcp.json');
    expect(existsSync(mcpConfigPath)).toBe(true);

    const mcpConfig = JSON.parse(readFileSync(mcpConfigPath, 'utf8')) as {
      mcpServers: Record<string, { command: string; args?: string[] }>;
    };
    const specNRollServer = mcpConfig.mcpServers['spec-n-roll'];
    expect(specNRollServer).toBeDefined();
    expect(specNRollServer.command).toBe('node');
    expect(specNRollServer.args).toContain(MCP_BINARY_RELATIVE_PATH);
    expect(specNRollServer.args).toContain('.spec-n-roll/cli/bin/spec-n-roll-mcp');
  }, 30_000);
});
