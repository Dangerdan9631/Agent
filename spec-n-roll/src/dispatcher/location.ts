import { existsSync } from 'node:fs';
import path from 'node:path';

import { findToolkitPackageRoot } from '../sdk/core/paths.js';

/**
 * Defines the project-local CLI launcher path relative to the project root.
 */
export const LOCAL_CLI_RELATIVE_PATH = path.join('.spec-n-roll', 'cli', 'bin', 'spec-n-roll');

/**
 * Finds the nearest project-local CLI launcher by walking upward.
 *
 * @param startDir - Directory where discovery should begin.
 * @returns Local CLI details when an executable launcher exists, otherwise null.
 */
export function findLocalCli(startDir: string): { projectRoot: string; cliPath: string } | null {
  return findLocalCliPath(startDir);
}

/**
 * Resolves the global full CLI JavaScript entrypoint relative to the dispatcher install.
 *
 * @returns Absolute path to the global CLI entrypoint.
 */
export function resolveGlobalCliPath(): string {
  return path.join(DISPATCHER_DIR, 'index.js');
}

/**
 * Resolves the globally installed toolkit root used by maintenance actions.
 *
 * @param env - Current process environment, including delegation metadata when present.
 * @returns Absolute path to the global toolkit package root.
 */
export function resolveGlobalToolkitRoot(env: NodeJS.ProcessEnv = process.env): string {
  const delegatedPackageRoot = env.SPEC_N_ROLL_DISPATCHER_PACKAGE_ROOT?.trim();
  return env.SPEC_N_ROLL_DISPATCHED === '1' &&
    delegatedPackageRoot != null &&
    delegatedPackageRoot !== ''
    ? path.resolve(delegatedPackageRoot)
    : findToolkitPackageRoot(path.dirname(resolveGlobalCliPath()));
}

/**
 * Finds the nearest project-local CLI launcher and reports permission failures.
 *
 * @param startDir - Directory where discovery should begin.
 * @returns Local CLI details when a launcher exists, otherwise null.
 */
function findLocalCliPath(startDir: string): { projectRoot: string; cliPath: string } | null {
  for (let current = path.resolve(startDir); ; current = path.dirname(current)) {
    const scriptPath = path.join(current, LOCAL_CLI_RELATIVE_PATH);
    const cmdPath = `${scriptPath}.cmd`;
    const hasLauncher =
      existsSync(scriptPath) || (process.platform === 'win32' && existsSync(cmdPath));

    if (hasLauncher) {
      const cliPath = process.platform === 'win32' && existsSync(cmdPath) ? cmdPath : scriptPath;
      return { projectRoot: current, cliPath };
    }

    if (path.dirname(current) === current) {
      return null;
    }
  }
}
