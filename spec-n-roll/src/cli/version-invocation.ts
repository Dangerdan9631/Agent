import path from 'node:path';

import { findLocalCli } from './dispatcher.js';
import {
  buildVersionReport,
  formatVersionReport,
  type VersionInvocationTarget,
  type VersionReportOptions,
} from '../sdk/version.js';

/**
 * Resolves local versus global CLI invocation metadata for version reporting.
 *
 * @param cwd - Working directory used to locate a project-local CLI install.
 * @param executedBinaryPath - Absolute path to the running CLI entry script.
 * @returns Invocation target and optional local CLI path.
 */
export function resolveVersionInvocation(
  cwd: string,
  executedBinaryPath: string | undefined,
): { invocation: VersionInvocationTarget; localCliPath?: string } {
  const localCli = findLocalCli(cwd);
  if (localCli != null) {
    const resolvedLocal = path.resolve(localCli.cliPath);
    const isLocalPin = process.env.SPEC_N_ROLL_LOCAL_PIN === '1';
    const isLocalEntry =
      executedBinaryPath != null && path.resolve(executedBinaryPath) === resolvedLocal;

    if (isLocalPin || isLocalEntry) {
      return {
        invocation: 'local',
        localCliPath: resolvedLocal,
      };
    }
  }

  return { invocation: 'global' };
}

/**
 * Builds a version report with CLI-layer invocation detection applied.
 *
 * @param options - Optional cwd and executed binary path overrides.
 * @returns Structured version report fields.
 */
export function buildCliVersionReport(options: VersionReportOptions = {}) {
  const cwd = options.cwd ?? process.cwd();
  const executedBinaryPath = options.executedBinaryPath ?? process.argv[1];
  const { invocation, localCliPath } = resolveVersionInvocation(cwd, executedBinaryPath);

  return buildVersionReport({
    ...options,
    invocation: options.invocation ?? invocation,
    localCliPath: options.localCliPath ?? localCliPath,
  });
}

/**
 * Prints the combined version report to stdout.
 *
 * @param options - Optional cwd and executed binary path overrides.
 */
export function printVersionReport(options: VersionReportOptions = {}): void {
  const report = buildCliVersionReport(options);
  process.stdout.write(formatVersionReport(report));
}

/**
 * Returns true when argv requests version output via -v or --version.
 *
 * @param argv - Raw CLI arguments after the node executable and script path.
 * @returns True when a version flag is present.
 */
export function argvRequestsVersion(argv: readonly string[]): boolean {
  return argv.includes('-v') || argv.includes('--version');
}
