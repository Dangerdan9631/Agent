import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { findLocalCli } from '../dispatcher.js';

/**
 * Invocation target describing how the full CLI binary was executed.
 */
export type VersionInvocationTarget = 'local' | 'global' | 'direct';

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
   * Whether the binary ran as local, global, or direct invocation.
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
 * Reads the toolkit package version from package.json adjacent to the CLI build.
 *
 * @returns Semver string for the running toolkit package.
 */
export function readToolkitPackageVersion(): string {
  const packageJsonPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../package.json',
  );
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version: string };
  return pkg.version;
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

  if (process.env.SPEC_N_ROLL_DISPATCHED === '1') {
    return { invocation: 'global' };
  }

  return { invocation: 'direct' };
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
  const toolkitVersion = readToolkitPackageVersion();
  const { invocation, localCliPath } = detectLocalInvocation(cwd, executedBinaryPath);

  const report: VersionReport = {
    toolkitVersion,
    invocation,
    localCliPath,
  };

  if (process.env.SPEC_N_ROLL_DISPATCHED === '1') {
    report.dispatcherVersion = toolkitVersion;
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
