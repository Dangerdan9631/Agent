#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { accessSync, constants, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LOCAL_CLI_ROOT_RELATIVE_PATH,
  shouldBypassLocalInstallIntegrity,
  validateLocalInstall,
} from '../sdk/install/local-install-integrity.js';
import { findToolkitPackageRoot, isCurrentModuleEntrypoint } from '../sdk/core/paths.js';

/**
 * Defines the standard installation location for project-local CLI versions
 * relative to the project root.
 */
export const LOCAL_CLI_RELATIVE_PATH = path.join('.spec-n-roll', 'cli', 'bin', 'spec-n-roll');

/**
 * Configuration options for CLI dispatch operations allowing customization of
 * working directory and environment variables when delegating to a local CLI.
 */
export interface DispatchOptions {
  /**
   * Working directory for delegation. Defaults to process.cwd() when omitted.
   */
  cwd?: string;
  /**
   * Environment variables for spawned child processes. Defaults to process.env when omitted.
   */
  env?: NodeJS.ProcessEnv;
}

/**
 * Result of a successful local CLI lookup operation encapsulating both the
 * project root and the resolved CLI path needed to execute the local CLI.
 */
export interface LocalCliLookupResult {
  /**
   * Absolute path to the project root directory containing the local CLI.
   */
  projectRoot: string;
  /**
   * Platform-resolved absolute path to the local launcher executable.
   */
  cliPath: string;
}

/**
 * Result of a delegation resolution attempt as a discriminated union allowing
 * callers to handle three distinct outcomes: delegated, continue, or error.
 */
export type DelegateResult =
  | { action: 'delegated'; exitCode: number }
  | { action: 'continue' }
  | { action: 'error'; exitCode: number; message: string };

/**
 * Runtime mode selected from stripped command arguments.
 */
export type DispatchRuntimeMode = 'interactive' | 'non-interactive';

/**
 * Determines whether dispatcher execution should enter Ink or the command CLI.
 *
 * @param args - Command arguments after dispatcher-only flags are removed.
 * @returns `interactive` for bare invocation, otherwise `non-interactive`.
 */
export function selectDispatchRuntimeMode(args: readonly string[]): DispatchRuntimeMode {
  return args.length === 0 ? 'interactive' : 'non-interactive';
}

/**
 * Removes the --global flag from argv if present to separate the flag from
 * the remaining arguments for clean delegation logic.
 *
 * @param argv - Raw command-line arguments array. Must be a non-null array of strings.
 * @returns Object containing forceGlobal flag and cleaned args array.
 */
export function stripGlobalFlag(argv: string[]): { forceGlobal: boolean; args: string[] } {
  const args = [...argv];
  const globalIndex = args.indexOf('--global');

  if (globalIndex === -1) {
    return { forceGlobal: false, args };
  }

  args.splice(globalIndex, 1);
  return { forceGlobal: true, args };
}

/**
 * Checks if a file path is executable to prevent attempting to run non-executable
 * files which would cause spawn failures.
 *
 * @param filePath - Absolute or relative path to check. Must be a non-empty string.
 * @returns true if the file exists and has execute permissions, false otherwise.
 */
export function isExecutable(filePath: string): boolean {
  try {
    accessSync(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a file path exists to avoid attempting operations on non-existent files
 * which would cause unnecessary errors.
 *
 * @param filePath - Absolute or relative path to check. Must be a non-empty string.
 * @returns true if the file exists, false otherwise.
 */
function pathExists(filePath: string): boolean {
  try {
    accessSync(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves the platform-specific path to the local CLI binary abstracting Windows
 * .cmd shim requirements versus Unix direct binary paths.
 *
 * @param projectRoot - Absolute path to the project root directory. Must be a valid directory path.
 * @returns The resolved CLI executable path (.cmd on Windows if it exists, otherwise the standard path).
 */
export function resolveLocalCliPath(projectRoot: string): string {
  if (process.platform === 'win32') {
    const cmdPath = path.join(projectRoot, LOCAL_CLI_RELATIVE_PATH + '.cmd');
    if (pathExists(cmdPath)) {
      return cmdPath;
    }
  }

  return path.join(projectRoot, LOCAL_CLI_RELATIVE_PATH);
}

/**
 * Searches upward from startDir to find a locally installed CLI by walking the
 * directory tree to locate the project root containing the local CLI.
 *
 * @param startDir - Directory to start searching from. Can be absolute or relative.
 * @returns LocalCliLookupResult with projectRoot and cliPath if found and executable, null otherwise.
 */
export function findLocalCli(startDir: string): LocalCliLookupResult | null {
  let current = path.resolve(startDir);

  while (true) {
    const cliPath = path.join(current, LOCAL_CLI_RELATIVE_PATH);
    const cmdPath = path.join(current, LOCAL_CLI_RELATIVE_PATH + '.cmd');
    const exists = pathExists(cliPath) || (process.platform === 'win32' && pathExists(cmdPath));

    if (exists) {
      const resolved = resolveLocalCliPath(current);
      if (!isExecutable(resolved)) {
        return null;
      }
      return { projectRoot: current, cliPath: resolved };
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

/**
 * Searches upward from startDir to find a locally installed CLI with stricter
 * validation distinguishing between "not found" and "found but not executable" scenarios.
 *
 * @param startDir - Directory to start searching from. Can be absolute or relative.
 * @returns LocalCliLookupResult with projectRoot and cliPath if found and executable, null if not found.
 * @throws LocalCliNotExecutableError if CLI is found but lacks execute permissions.
 */
export function findLocalCliOrThrow(startDir: string): LocalCliLookupResult | null {
  let current = path.resolve(startDir);

  while (true) {
    const cliPath = path.join(current, LOCAL_CLI_RELATIVE_PATH);
    const cmdPath = path.join(current, LOCAL_CLI_RELATIVE_PATH + '.cmd');
    const exists = pathExists(cliPath) || (process.platform === 'win32' && pathExists(cmdPath));

    if (exists) {
      const resolved = resolveLocalCliPath(current);
      if (!isExecutable(resolved)) {
        throw new LocalCliNotExecutableError(current, resolved);
      }
      return { projectRoot: current, cliPath: resolved };
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

/**
 * Determines whether command execution should be delegated to the local CLI by
 * checking if a local CLI exists and the user hasn't forced global mode.
 *
 * @param argv - Command-line arguments array. Must contain the raw argv to check for --global flag.
 * @param localCli - Result from findLocalCli, or null if no local CLI was found.
 * @returns true if delegation should occur (local CLI exists and --global not present), false otherwise.
 */
export function shouldDelegateToLocal(
  argv: string[],
  localCli: LocalCliLookupResult | null,
): boolean {
  const { forceGlobal } = stripGlobalFlag(argv);
  return !forceGlobal && localCli != null;
}

/**
 * Error thrown when a local CLI is found but lacks execute permissions to provide
 * actionable guidance to the user (e.g., chmod +x instructions).
 */
export class LocalCliNotExecutableError extends Error {
  readonly projectRoot: string;
  readonly cliPath: string;

  constructor(projectRoot: string, cliPath: string) {
    super(
      `Local Spec-N-Roll CLI found at ${cliPath} but is not executable. ` +
        `Run: chmod +x "${cliPath}" (Unix) or verify the Windows .cmd shim.`,
    );
    this.name = 'LocalCliNotExecutableError';
    this.projectRoot = projectRoot;
    this.cliPath = cliPath;
  }
}

/**
 * Resolves and executes delegation to a local CLI by searching for a local CLI,
 * validating it, and spawning the local process with inherited stdio.
 *
 * @param argv - Command-line arguments array. Must include all arguments to pass to the local CLI.
 * @param options - Optional dispatch configuration. cwd defaults to process.cwd(), env defaults to process.env.
 * @returns DelegateResult indicating the action taken: delegated (with exit code), continue (no local CLI), or error.
 */
export function resolveDelegation(argv: string[], options: DispatchOptions = {}): DelegateResult {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const { forceGlobal, args } = stripGlobalFlag(argv);

  if (forceGlobal) {
    return { action: 'continue' };
  }

  try {
    let current = path.resolve(cwd);

    while (true) {
      const cliPath = path.join(current, LOCAL_CLI_RELATIVE_PATH);
      const cmdPath = path.join(current, LOCAL_CLI_RELATIVE_PATH + '.cmd');
      const exists = pathExists(cliPath) || (process.platform === 'win32' && pathExists(cmdPath));

      if (exists) {
        const resolved = resolveLocalCliPath(current);
        if (!isExecutable(resolved)) {
          const error = new LocalCliNotExecutableError(current, resolved);
          return { action: 'error', exitCode: 1, message: error.message };
        }

        const cliRoot = path.join(current, LOCAL_CLI_ROOT_RELATIVE_PATH);
        const validation = shouldBypassLocalInstallIntegrity(args)
          ? { status: 'valid' as const, missingPaths: [] }
          : validateLocalInstall(cliRoot);
        if (validation.status === 'invalid') {
          return {
            action: 'error',
            exitCode: 1,
            message:
              validation.message ??
              'Local Spec-N-Roll install is invalid. Run `spec-n-roll update` to refresh the local runtime.',
          };
        }

        const result = spawnSync(resolved, args, {
          cwd,
          env: buildDelegatedCliEnv(env),
          stdio: 'inherit',
          shell: process.platform === 'win32',
        });

        if (result.error != null) {
          return { action: 'error', exitCode: 1, message: result.error.message };
        }

        return { action: 'delegated', exitCode: result.status ?? 1 };
      }

      const parent = path.dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }
  } catch (error) {
    if (error instanceof LocalCliNotExecutableError) {
      return { action: 'error', exitCode: 1, message: error.message };
    }
    throw error;
  }

  return { action: 'continue' };
}

/**
 * Main entry point for CLI dispatching that delegates to local CLI or continues
 * with global execution, returning an appropriate exit code.
 *
 * @param argv - Command-line arguments array. Must include all arguments from process.argv.
 * @param options - Optional dispatch configuration. cwd defaults to process.cwd(), env defaults to process.env.
 * @returns Exit code: 0 for continue/delegated success, non-zero for errors or delegated failure.
 */
export function dispatch(argv: string[], options: DispatchOptions = {}): number {
  const result = resolveDelegation(argv, options);

  switch (result.action) {
    case 'delegated':
    case 'error':
      if (result.action === 'error') {
        console.error(result.message);
      }
      return result.exitCode;
    case 'continue':
      return 0;
  }
}

/**
 * Resolves the node_modules directory adjacent to the installed toolkit package.
 *
 * @returns Absolute path to node_modules for dependency resolution when exec'ing local CLI.
 */
export function resolveToolkitNodeModulesPath(): string {
  const dispatcherDir = path.dirname(fileURLToPath(import.meta.url));
  return path.join(dispatcherDir, '..', '..', 'node_modules');
}

/**
 * Reads the semver of the globally installed dispatcher package.
 *
 * @returns Dispatcher package version from the adjacent toolkit package.json.
 */
export function readDispatcherPackageVersion(): string {
  const dispatcherDir = path.dirname(fileURLToPath(import.meta.url));
  const packageRoot = findToolkitPackageRoot(dispatcherDir);
  const pkg = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8')) as {
    version: string;
  };
  return pkg.version;
}

/**
 * Describes how the running global dispatcher was installed.
 */
export type DispatcherInstallSourceKind = 'local' | 'remote';

/**
 * Reads the linked toolkit source package root recorded by the dispatcher marker file.
 *
 * @param dispatcherDir - Directory containing the global dispatcher build artifacts.
 * @returns Absolute linked source package root, or null when the marker is absent or invalid.
 */
export function readDispatcherLinkedSourcePath(dispatcherDir: string): string | null {
  const markerPath = path.join(dispatcherDir, '.source-package-root');
  if (!pathExists(markerPath)) {
    return null;
  }

  const sourcePath = readFileSync(markerPath, 'utf8').trim();
  if (sourcePath.length === 0) {
    return null;
  }

  const packageJsonPath = path.join(sourcePath, 'package.json');
  if (!pathExists(packageJsonPath)) {
    return null;
  }

  try {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { name?: unknown };
    return pkg.name === 'spec-n-roll' ? path.resolve(sourcePath) : null;
  } catch {
    return null;
  }
}

/**
 * Reads whether the global dispatcher build records a linked source package root.
 *
 * @returns `local` when the dispatcher has a readable linked-source marker, otherwise `remote`.
 */
export function readDispatcherInstallSourceKind(): DispatcherInstallSourceKind {
  const dispatcherDir = path.dirname(fileURLToPath(import.meta.url));
  return readDispatcherLinkedSourcePath(dispatcherDir) != null ? 'local' : 'remote';
}

/**
 * Builds environment variables for delegated local CLI execution.
 *
 * @param baseEnv - Parent process environment to extend.
 * @returns Environment including delegation marker and NODE_PATH for local CLI imports.
 */
export function buildDelegatedCliEnv(baseEnv: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const dispatcherDir = path.dirname(fileURLToPath(import.meta.url));
  const nodeModulesPath = resolveToolkitNodeModulesPath();
  const mergedNodePath = [nodeModulesPath, baseEnv.NODE_PATH].filter(Boolean).join(path.delimiter);
  const installSourceKind = readDispatcherInstallSourceKind();
  const linkedSourcePath = readDispatcherLinkedSourcePath(dispatcherDir);

  const env: NodeJS.ProcessEnv = {
    ...baseEnv,
    SPEC_N_ROLL_DISPATCHED: '1',
    SPEC_N_ROLL_DISPATCHER_VERSION: readDispatcherPackageVersion(),
    SPEC_N_ROLL_DISPATCHER_INSTALL_SOURCE: installSourceKind,
    SPEC_N_ROLL_DISPATCHER_CLI_DIRECTORY: dispatcherDir,
    SPEC_N_ROLL_DISPATCHER_PACKAGE_ROOT: findToolkitPackageRoot(dispatcherDir),
    NODE_PATH: mergedNodePath,
  };

  if (linkedSourcePath != null) {
    env.SPEC_N_ROLL_DISPATCHER_LINKED_SOURCE_PATH = linkedSourcePath;
  }

  return env;
}

/**
 * Resolves the global full CLI binary path relative to the dispatcher
 * install location, preferring Windows .cmd shims when present.
 *
 * @returns Absolute path to the full CLI executable adjacent to the dispatcher.
 */
export function resolveGlobalCliPath(): string {
  const dispatcherDir = path.dirname(fileURLToPath(import.meta.url));

  if (process.platform === 'win32') {
    const cmdPath = path.join(dispatcherDir, 'spec-n-roll.cmd');
    if (pathExists(cmdPath)) {
      return cmdPath;
    }
  }

  return path.join(dispatcherDir, 'index.js');
}

/**
 * Resolves the global Ink entrypoint path relative to the dispatcher install location.
 *
 * @returns Absolute path to the built Ink entrypoint.
 */
export function resolveGlobalInkPath(): string {
  const dispatcherDir = path.dirname(fileURLToPath(import.meta.url));
  return path.join(dispatcherDir, '..', 'ink', 'index.js');
}

/**
 * Resolves the globally installed toolkit package root for project maintenance actions.
 *
 * @param env - Environment variables for the current process. Uses dispatcher metadata when delegated.
 * @returns Absolute path to the global toolkit package root.
 */
export function resolveGlobalToolkitRoot(env: NodeJS.ProcessEnv = process.env): string {
  const delegatedPackageRoot = env.SPEC_N_ROLL_DISPATCHER_PACKAGE_ROOT?.trim();
  if (
    env.SPEC_N_ROLL_DISPATCHED === '1' &&
    delegatedPackageRoot != null &&
    delegatedPackageRoot.length > 0
  ) {
    return path.resolve(delegatedPackageRoot);
  }

  const globalCliPath = resolveGlobalCliPath();
  return findToolkitPackageRoot(path.dirname(globalCliPath));
}

/**
 * Executes the global full CLI as a child process when no local CLI
 * is found or when --global forces global execution.
 *
 * @param argv - Raw command-line arguments after the node executable and script path.
 * @param options - Optional dispatch configuration for cwd and environment.
 * @returns Exit code from the spawned full CLI process.
 */
export function execGlobalCli(argv: string[], options: DispatchOptions = {}): number {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const { args } = stripGlobalFlag(argv);
  const cliPath = resolveGlobalCliPath();

  const result = spawnSync(cliPath, args, {
    cwd,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error != null) {
    console.error(
      `Failed to execute global Spec-N-Roll CLI at ${cliPath}: ${result.error.message}`,
    );
    return 1;
  }

  return result.status ?? 1;
}

/**
 * Executes the global Ink entrypoint for bare interactive dispatcher invocation.
 *
 * @param argv - Raw command-line arguments after the node executable and script path.
 * @param options - Optional dispatch configuration for cwd and environment.
 * @returns Exit code from the spawned Ink process.
 */
export function execGlobalInk(argv: string[], options: DispatchOptions = {}): number {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const { args } = stripGlobalFlag(argv);
  const inkPath = resolveGlobalInkPath();

  const result = spawnSync(process.execPath, [inkPath, ...args], {
    cwd,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error != null) {
    console.error(
      `Failed to execute global Spec-N-Roll Ink UI at ${inkPath}: ${result.error.message}`,
    );
    return 1;
  }

  return result.status ?? 1;
}

/**
 * Global dispatcher entry point that delegates to a local CLI or exec's the
 * full CLI binary without loading full CLI code in-process.
 *
 * @param argv - Full process.argv array including node and script path entries.
 * @param options - Optional dispatch configuration for cwd and environment.
 * @returns Exit code from delegation or global CLI execution.
 */
export function runDispatcher(
  argv: string[] = process.argv,
  options: DispatchOptions = {},
): number {
  const rawArgs = argv.slice(2);
  const delegation = resolveDelegation(rawArgs, options);

  if (delegation.action === 'delegated') {
    return delegation.exitCode;
  }

  if (delegation.action === 'error') {
    console.error(delegation.message);
    return delegation.exitCode;
  }

  const { args } = stripGlobalFlag(rawArgs);
  return selectDispatchRuntimeMode(args) === 'interactive'
    ? execGlobalInk(rawArgs, options)
    : execGlobalCli(rawArgs, options);
}

const isDispatcherMain = isCurrentModuleEntrypoint(process.argv[1], import.meta.url, [
  'dispatcher.js',
  'dispatcher.ts',
]);

if (isDispatcherMain) {
  process.exit(runDispatcher());
}
