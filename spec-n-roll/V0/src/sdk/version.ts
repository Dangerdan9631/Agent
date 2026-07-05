import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readRuntimePackageVersion } from './install/build-version.js';

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
  /**
   * Whether the running binary is project-local or global.
   */
  invocation?: VersionInvocationTarget;
  /**
   * Absolute path to the local CLI when invocation is local.
   */
  localCliPath?: string;
  /**
   * Semver of the global dispatcher when execution was delegated.
   */
  dispatcherVersion?: string;
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
 * Builds the combined version report for CLI and dispatcher consumers.
 *
 * @param options - Optional cwd, executed binary path, and invocation metadata overrides.
 * @returns Structured version report fields.
 */
export function buildVersionReport(options: VersionReportOptions = {}): VersionReport {
  const executedBinaryPath = options.executedBinaryPath ?? process.argv[1];
  const versionStartDir =
    executedBinaryPath != null ? path.dirname(path.resolve(executedBinaryPath)) : undefined;
  const toolkitVersion = readToolkitPackageVersion({ startDir: versionStartDir });

  const report: VersionReport = {
    toolkitVersion,
    invocation: options.invocation ?? 'global',
    localCliPath: options.localCliPath,
  };

  const dispatcherVersion =
    options.dispatcherVersion ??
    (process.env.SPEC_N_ROLL_DISPATCHED === '1'
      ? process.env.SPEC_N_ROLL_DISPATCHER_VERSION
      : undefined);

  if (dispatcherVersion != null) {
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
