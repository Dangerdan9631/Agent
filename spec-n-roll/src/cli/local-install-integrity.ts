import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Layout generation for self-contained project-local CLI installs.
 */
export const LOCAL_INSTALL_LAYOUT_VERSION = 1;

/**
 * Relative path from the project root to the local CLI install directory.
 */
export const LOCAL_CLI_ROOT_RELATIVE_PATH = '.spec-n-roll/cli';

/**
 * Machine-readable categories for local install integrity failures.
 */
export type LocalInstallInvalidReason =
  /**
   * Install still references an external toolkit package root or legacy launcher source.
   */
  | 'legacy-layout'
  /**
   * One or more required bundle paths are absent or unreadable.
   */
  | 'missing-paths'
  /**
   * `install.json` declares a layout generation other than the supported v1 model.
   */
  | 'unknown-layout-version'
  /**
   * `package.json` exists but its `name` field is not `spec-n-roll`.
   */
  | 'invalid-package-name';

/**
 * Ephemeral result describing whether a project-local CLI install is runnable.
 */
export interface LocalInstallValidationResult {
  /**
   * Whether the install passed all integrity checks.
   */
  status: 'valid' | 'invalid';
  /**
   * Project-relative paths under the CLI root that were expected but missing.
   */
  missingPaths: string[];
  /**
   * Layout version read from `install.json` when present.
   */
  layoutVersion?: number;
  /**
   * Machine-readable failure category when `status` is `invalid`.
   */
  reason?: LocalInstallInvalidReason;
  /**
   * Actionable human-readable message when `status` is `invalid`.
   */
  message?: string;
}

const REQUIRED_RELATIVE_PATHS = [
  'install.json',
  'package.json',
  'dist/cli/index.js',
  'dist/mcp/server.js',
  'bin/spec-n-roll',
] as const;

/**
 * Top-level CLI commands that can repair or replace an invalid local install.
 */
const INTEGRITY_BYPASS_COMMANDS = new Set(['update', 'init', 'remove']);

/**
 * Determines whether dispatcher integrity validation should be skipped so
 * repair commands can migrate legacy or incomplete project-local installs.
 *
 * @param args - Command-line arguments after the dispatcher script path.
 * @returns True when delegation should proceed without integrity validation.
 */
export function shouldBypassLocalInstallIntegrity(args: string[]): boolean {
  if (args.length === 0) {
    return true;
  }

  for (const arg of args) {
    if (!arg.startsWith('-')) {
      return INTEGRITY_BYPASS_COMMANDS.has(arg);
    }
  }

  return false;
}

/**
 * Detects whether a CLI root still uses the legacy wrapper layout that spawns
 * from an external toolkit package root.
 *
 * @param cliRoot - Absolute path to `.spec-n-roll/cli`.
 * @returns True when legacy markers are present in the manifest or launchers.
 */
export function isLegacyLocalInstall(cliRoot: string): boolean {
  const manifestPath = path.join(cliRoot, 'install.json');
  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
      if (
        typeof manifest.toolkitPackageRoot === 'string' &&
        manifest.toolkitPackageRoot.length > 0
      ) {
        return true;
      }
    } catch {
      // Fall through to launcher inspection.
    }
  }

  const launcherPath = path.join(cliRoot, 'bin', 'spec-n-roll');
  if (existsSync(launcherPath)) {
    const launcherSource = readFileSync(launcherPath, 'utf8');
    if (launcherSource.includes('toolkitPackageRoot')) {
      return true;
    }
  }

  return false;
}

/**
 * Validates that a project-local CLI install contains a complete layout v1 bundle.
 *
 * @param cliRoot - Absolute path to `.spec-n-roll/cli`.
 * @returns Validation outcome with missing paths and actionable errors when invalid.
 */
export function validateLocalInstall(cliRoot: string): LocalInstallValidationResult {
  if (isLegacyLocalInstall(cliRoot)) {
    return {
      status: 'invalid',
      missingPaths: [],
      reason: 'legacy-layout',
      message:
        'Local Spec-N-Roll install uses a deprecated layout. Run `spec-n-roll update` in this project to refresh the local runtime.',
    };
  }

  const missingPaths: string[] = [];
  for (const relativePath of REQUIRED_RELATIVE_PATHS) {
    if (!existsSync(path.join(cliRoot, relativePath))) {
      missingPaths.push(relativePath);
    }
  }

  if (missingPaths.length > 0) {
    const firstMissing = missingPaths[0];
    return {
      status: 'invalid',
      missingPaths,
      reason: 'missing-paths',
      message: `Local Spec-N-Roll install is incomplete (missing ${firstMissing}). Run \`spec-n-roll update\` or \`spec-n-roll init\` to repair.`,
    };
  }

  let layoutVersion: number | undefined;
  try {
    const manifest = JSON.parse(readFileSync(path.join(cliRoot, 'install.json'), 'utf8')) as {
      layoutVersion?: unknown;
    };
    if (typeof manifest.layoutVersion === 'number') {
      layoutVersion = manifest.layoutVersion;
    }
  } catch {
    return {
      status: 'invalid',
      missingPaths: ['install.json'],
      reason: 'missing-paths',
      message:
        'Local Spec-N-Roll install is incomplete (missing install.json). Run `spec-n-roll update` or `spec-n-roll init` to repair.',
    };
  }

  if (layoutVersion !== LOCAL_INSTALL_LAYOUT_VERSION) {
    return {
      status: 'invalid',
      missingPaths: [],
      layoutVersion,
      reason: 'unknown-layout-version',
      message: `Local Spec-N-Roll install uses unsupported layout version ${String(layoutVersion)}. Run \`spec-n-roll update\` to refresh the local runtime.`,
    };
  }

  try {
    const packageJson = JSON.parse(readFileSync(path.join(cliRoot, 'package.json'), 'utf8')) as {
      name?: unknown;
    };
    if (packageJson.name !== 'spec-n-roll') {
      return {
        status: 'invalid',
        missingPaths: [],
        layoutVersion,
        reason: 'invalid-package-name',
        message:
          'Local Spec-N-Roll install has an invalid package descriptor. Run `spec-n-roll update` to refresh the local runtime.',
      };
    }
  } catch {
    return {
      status: 'invalid',
      missingPaths: ['package.json'],
      reason: 'missing-paths',
      message:
        'Local Spec-N-Roll install is incomplete (missing package.json). Run `spec-n-roll update` or `spec-n-roll init` to repair.',
    };
  }

  return {
    status: 'valid',
    missingPaths: [],
    layoutVersion,
  };
}
