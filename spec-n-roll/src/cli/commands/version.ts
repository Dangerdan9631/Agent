import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';

import { readRuntimePackageVersion } from '../build-version.js';
import { findLocalCli } from '../dispatcher.js';

/**
 * Invocation target describing which full CLI binary is running.
 */
export type VersionInvocationTarget = 'local' | 'global';

/**
 * Combined version report for dispatcher and full CLI surfaces.
 */
export interface VersionReport {
  /**
   * Semver of the executed full CLI binary.
   */
  toolkitVersion: string;
  /**
   * Semver of the global dispatcher when execution was delegated.
   */
  dispatcherVersion?: string;
  /**
   * Whether the running binary is project-local or global.
   */
  invocation: VersionInvocationTarget;
  /**
   * Absolute path to the local CLI when invocation is local.
   */
  localCliPath?: string;
  /**
   * Latest published toolkit version when discoverable.
   */
  latestAvailable?: string;
}

/**
 * Options for building a combined version report.
 */
export interface VersionReportOptions {
  /**
   * Working directory used to resolve a local CLI installation.
   */
  cwd?: string;
  /**
   * Absolute path to the executed CLI entry script.
   */
  executedBinaryPath?: string;
}

/**
 * Options controlling where toolkit package version discovery begins.
 */
export interface ToolkitVersionOptions {
  /**
   * Directory to begin walking upward for `package.json`. Defaults to the running module directory.
   */
  startDir?: string;
}

/**
 * Reads the toolkit package version from the nearest `spec-n-roll` package.json.
 *
 * @param options - Optional start directory override for bundled or delegated entrypoints.
 * @returns Semver string for the resolved toolkit package.
 */
export function readToolkitPackageVersion(options: ToolkitVersionOptions = {}): string {
  const startDir = options.startDir ?? path.dirname(fileURLToPath(import.meta.url));
  return readRuntimePackageVersion(startDir);
}

/**
 * Detects whether the running process is the project-local CLI binary.
 *
 * @param cwd - Working directory for local CLI lookup.
 * @param executedBinaryPath - Absolute path to the running CLI script.
 * @returns Local CLI lookup when the executed path matches the local install.
 */
function detectLocalInvocation(
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
 * Builds the combined version report for CLI and dispatcher consumers.
 *
 * @param options - Optional cwd and executed binary path overrides.
 * @returns Structured version report fields.
 */
export function buildVersionReport(options: VersionReportOptions = {}): VersionReport {
  const cwd = options.cwd ?? process.cwd();
  const executedBinaryPath = options.executedBinaryPath ?? process.argv[1];
  const versionStartDir =
    executedBinaryPath != null ? path.dirname(path.resolve(executedBinaryPath)) : undefined;
  const toolkitVersion = readToolkitPackageVersion({ startDir: versionStartDir });
  const { invocation, localCliPath } = detectLocalInvocation(cwd, executedBinaryPath);

  const report: VersionReport = {
    toolkitVersion,
    invocation,
    localCliPath,
  };

  const dispatcherVersion = process.env.SPEC_N_ROLL_DISPATCHER_VERSION;
  if (process.env.SPEC_N_ROLL_DISPATCHED === '1' && dispatcherVersion != null) {
    report.dispatcherVersion = dispatcherVersion;
  }

  return report;
}

/**
 * Formats a version report as human-readable CLI output.
 *
 * @param report - Structured version report to print.
 * @returns Multi-line version summary text.
 */
export function formatVersionReport(report: VersionReport): string {
  const lines = [`toolkit version: ${report.toolkitVersion}`, `invocation: ${report.invocation}`];

  if (report.dispatcherVersion != null) {
    lines.push(`dispatcher version: ${report.dispatcherVersion}`);
  }

  if (report.localCliPath != null) {
    lines.push(`local CLI path: ${report.localCliPath}`);
  }

  if (report.latestAvailable != null) {
    lines.push(`latest available: ${report.latestAvailable}`);
  }

  return `${lines.join('\n')}\n`;
}

/**
 * Prints the combined version report to stdout.
 *
 * @param options - Optional cwd and executed binary path overrides.
 */
export function printVersionReport(options: VersionReportOptions = {}): void {
  const report = buildVersionReport(options);
  process.stdout.write(formatVersionReport(report));
}

/**
 * Registers the `version` subcommand on the root Commander program.
 *
 * @param program - Root Commander program to attach the command to.
 */
export function registerVersionCommand(program: Command): void {
  program
    .command('version')
    .description('Show installed Spec-N-Roll versions')
    .action(() => {
      handleVersionCommand();
    });
}

/**
 * Commander action handler for `spec-n-roll version`.
 */
export function handleVersionCommand(): void {
  printVersionReport();
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
