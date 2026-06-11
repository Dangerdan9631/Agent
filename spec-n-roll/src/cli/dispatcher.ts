import { accessSync, constants } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

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
  /** Working directory for delegation. Defaults to process.cwd() if not provided. */
  cwd?: string;
  /** Environment variables for the spawned process. Defaults to process.env if not provided. */
  env?: NodeJS.ProcessEnv;
}

/**
 * Result of a successful local CLI lookup operation encapsulating both the
 * project root and the resolved CLI path needed to execute the local CLI.
 */
export interface LocalCliLookupResult {
  /** Absolute path to the project root directory containing the local CLI. */
  projectRoot: string;
  /** Platform-resolved absolute path to the CLI executable. */
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
      `Local spec-n-roll CLI found at ${cliPath} but is not executable. ` +
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

        const result = spawnSync(resolved, args, {
          cwd,
          env,
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
