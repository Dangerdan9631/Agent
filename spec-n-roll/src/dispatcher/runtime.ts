import { spawnSync } from 'node:child_process';
import { accessSync, constants, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Directory containing the built dispatcher entrypoint.
 */
const DISPATCHER_DIR = path.dirname(fileURLToPath(import.meta.url));

/**
 * Defines the project-local CLI launcher path relative to the project root.
 */
export const LOCAL_CLI_RELATIVE_PATH = path.join('.spec-n-roll', 'cli', 'bin', 'spec-n-roll');

/**
 * Local install constants used while validating project-local dispatch targets.
 */
const LOCAL_INSTALL = {
  layoutVersion: 1,
  repairCommands: new Set(['update', 'init', 'remove']),
  requiredPaths: [
    'install.json',
    'package.json',
    'dist/cli/index.js',
    'dist/ink/index.js',
    'dist/mcp/server.js',
    'bin/spec-n-roll',
  ],
} as const;

/**
 * Configuration for dispatcher child process execution.
 */
export interface DispatchOptions {
  /**
   * Working directory used for local CLI discovery and spawned processes.
   */
  cwd?: string;

  /**
   * Environment variables inherited by spawned processes.
   */
  env?: NodeJS.ProcessEnv;
}

/**
 * Describes a discovered project-local CLI launcher.
 */
export interface LocalCliLookupResult {
  /**
   * Absolute project root containing the local CLI installation.
   */
  projectRoot: string;

  /**
   * Absolute executable launcher path, using a Windows command shim when needed.
   */
  cliPath: string;
}

/**
 * Error thrown when a local CLI exists but cannot be executed.
 */
class LocalCliNotExecutableError extends Error {
  constructor(cliPath: string) {
    super(
      `Local Spec-N-Roll CLI found at ${cliPath} but is not executable. ` +
        `Run: chmod +x "${cliPath}" (Unix) or verify the Windows .cmd shim.`,
    );
    this.name = 'LocalCliNotExecutableError';
  }
}

/**
 * Removes dispatcher-only flags from argv before runtime selection.
 *
 * @param argv - Raw command arguments after the node executable and dispatcher script.
 * @returns Parsed dispatcher flags and forwarded runtime arguments.
 */
export function parseDispatcherArgs(argv: string[]): { forceGlobal: boolean; args: string[] } {
  const args = [...argv];
  const globalIndex = args.indexOf('--global');
  if (globalIndex >= 0) {
    args.splice(globalIndex, 1);
  }
  return { forceGlobal: globalIndex >= 0, args };
}

/**
 * Finds the nearest project-local CLI launcher by walking upward.
 *
 * @param startDir - Directory where discovery should begin.
 * @returns Local CLI details when an executable launcher exists, otherwise null.
 */
export function findLocalCli(startDir: string): LocalCliLookupResult | null {
  try {
    return findLocalCliOrThrow(startDir);
  } catch (error) {
    if (error instanceof LocalCliNotExecutableError) {
      return null;
    }
    throw error;
  }
}

/**
 * Finds the nearest project-local CLI launcher and reports permission failures.
 *
 * @param startDir - Directory where discovery should begin.
 * @returns Local CLI details when a launcher exists, otherwise null.
 */
export function findLocalCliOrThrow(startDir: string): LocalCliLookupResult | null {
  for (let current = path.resolve(startDir); ; current = path.dirname(current)) {
    const scriptPath = path.join(current, LOCAL_CLI_RELATIVE_PATH);
    const cmdPath = `${scriptPath}.cmd`;
    const hasLauncher =
      existsSync(scriptPath) || (process.platform === 'win32' && existsSync(cmdPath));

    if (hasLauncher) {
      const cliPath = process.platform === 'win32' && existsSync(cmdPath) ? cmdPath : scriptPath;
      try {
        accessSync(cliPath, constants.X_OK);
      } catch {
        throw new LocalCliNotExecutableError(cliPath);
      }
      return { projectRoot: current, cliPath };
    }

    if (path.dirname(current) === current) {
      return null;
    }
  }
}

/**
 * Executes the selected global runtime.
 *
 * @param isInteractive - True when bare invocation should open Ink.
 * @param args - Runtime arguments without dispatcher-only flags.
 * @param options - Optional process execution configuration.
 * @returns Exit code from the selected global runtime.
 */
export function runGlobal(
  isInteractive: boolean,
  args: string[],
  options: DispatchOptions,
): number {
  const scriptPath = isInteractive
    ? path.join(DISPATCHER_DIR, '..', 'ink', 'index.js')
    : path.join(DISPATCHER_DIR, 'index.js');
  const label = isInteractive ? 'global Spec-N-Roll Ink UI' : 'global Spec-N-Roll CLI';
  return spawnNode(scriptPath, args, options, label);
}

/**
 * Validates and executes the project-local CLI.
 *
 * @param localCli - Discovered local CLI information.
 * @param isInteractive - True when bare invocation should open Ink through the local CLI.
 * @param args - Runtime arguments without dispatcher-only flags.
 * @param options - Optional process execution configuration.
 * @returns Exit code from the local CLI process, or 1 when validation fails.
 */
export function runLocal(
  localCli: LocalCliLookupResult,
  isInteractive: boolean,
  args: string[],
  options: DispatchOptions,
): number {
  const validationError =
    isInteractive || canRepairLocalInstall(args)
      ? null
      : validateLocalInstall(path.join(localCli.projectRoot, '.spec-n-roll', 'cli'));

  if (validationError != null) {
    console.error(validationError);
    return 1;
  }

  return spawnNode(
    path.join(localCli.projectRoot, LOCAL_CLI_RELATIVE_PATH),
    args,
    {
      ...options,
      env: buildDelegatedCliEnv(options.env ?? process.env),
    },
    'local Spec-N-Roll CLI',
  );
}

/**
 * Builds environment variables for delegated local CLI execution.
 *
 * @param baseEnv - Parent process environment to extend.
 * @returns Environment including dispatcher metadata and local dependency lookup.
 */
export function buildDelegatedCliEnv(baseEnv: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const packageRoot = findToolkitPackageRoot(DISPATCHER_DIR);
  const linkedSourcePath = readLinkedSourcePath(DISPATCHER_DIR);
  return {
    ...baseEnv,
    SPEC_N_ROLL_DISPATCHED: '1',
    SPEC_N_ROLL_DISPATCHER_VERSION: readPackageJson(packageRoot).version,
    SPEC_N_ROLL_DISPATCHER_INSTALL_SOURCE: linkedSourcePath == null ? 'remote' : 'local',
    SPEC_N_ROLL_DISPATCHER_CLI_DIRECTORY: DISPATCHER_DIR,
    SPEC_N_ROLL_DISPATCHER_PACKAGE_ROOT: packageRoot,
    ...(linkedSourcePath == null
      ? {}
      : { SPEC_N_ROLL_DISPATCHER_LINKED_SOURCE_PATH: linkedSourcePath }),
    NODE_PATH: [path.join(packageRoot, 'node_modules'), baseEnv.NODE_PATH]
      .filter(Boolean)
      .join(path.delimiter),
  };
}

/**
 * Resolves the global full CLI binary path relative to the dispatcher install.
 *
 * @returns Absolute path to the global CLI entrypoint or Windows command shim.
 */
export function resolveGlobalCliPath(): string {
  const cmdPath = path.join(DISPATCHER_DIR, 'spec-n-roll.cmd');
  return process.platform === 'win32' && existsSync(cmdPath)
    ? cmdPath
    : path.join(DISPATCHER_DIR, 'index.js');
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
 * Spawns a Node entrypoint with inherited stdio.
 *
 * @param scriptPath - Absolute JavaScript entrypoint to execute with Node.
 * @param args - Runtime arguments passed verbatim to the entrypoint.
 * @param options - Optional process execution configuration.
 * @param label - Human-readable runtime label for spawn errors.
 * @returns Exit code from the spawned process, or 1 when spawning fails.
 */
function spawnNode(
  scriptPath: string,
  args: string[],
  options: DispatchOptions,
  label: string,
): number {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: options.cwd ?? process.cwd(),
    env: options.env ?? process.env,
    stdio: 'inherit',
  });

  if (result.error != null) {
    console.error(`Failed to execute ${label} at ${scriptPath}: ${result.error.message}`);
    return 1;
  }

  return result.status ?? 1;
}

/**
 * Determines whether the requested command can repair a broken local install.
 *
 * @param args - Runtime arguments without dispatcher-only flags.
 * @returns True when local validation should be skipped.
 */
function canRepairLocalInstall(args: string[]): boolean {
  const command = args.find((arg) => !arg.startsWith('-'));
  return command == null || LOCAL_INSTALL.repairCommands.has(command);
}

/**
 * Validates the project-local CLI bundle required for normal commands.
 *
 * @param cliRoot - Absolute `.spec-n-roll/cli` directory to validate.
 * @returns Null when valid, otherwise an actionable error message.
 */
function validateLocalInstall(cliRoot: string): string | null {
  const legacyMarker =
    readJsonField(path.join(cliRoot, 'install.json'), 'toolkitPackageRoot') ??
    readText(path.join(cliRoot, 'bin', 'spec-n-roll'))?.includes('toolkitPackageRoot');
  if (legacyMarker != null && legacyMarker !== false) {
    return 'Local Spec-N-Roll install uses a deprecated layout. Run `spec-n-roll update` in this project to refresh the local runtime.';
  }

  const missingPath = LOCAL_INSTALL.requiredPaths.find(
    (relativePath) => !existsSync(path.join(cliRoot, relativePath)),
  );
  if (missingPath != null) {
    return `Local Spec-N-Roll install is incomplete (missing ${missingPath}). Run \`spec-n-roll update\` or \`spec-n-roll init\` to repair.`;
  }

  const layoutVersion = readJsonField(path.join(cliRoot, 'install.json'), 'layoutVersion');
  if (layoutVersion !== LOCAL_INSTALL.layoutVersion) {
    return `Local Spec-N-Roll install uses unsupported layout version ${String(layoutVersion)}. Run \`spec-n-roll update\` to refresh the local runtime.`;
  }

  return readJsonField(path.join(cliRoot, 'package.json'), 'name') === 'spec-n-roll'
    ? null
    : 'Local Spec-N-Roll install has an invalid package descriptor. Run `spec-n-roll update` to refresh the local runtime.';
}

/**
 * Locates the toolkit package root by walking upward from a built file location.
 *
 * @param startDir - Directory to begin searching from.
 * @returns Absolute package root containing the Spec-N-Roll package.json.
 */
function findToolkitPackageRoot(startDir: string): string {
  for (let current = path.resolve(startDir); ; current = path.dirname(current)) {
    if (readJsonField(path.join(current, 'package.json'), 'name') === 'spec-n-roll') {
      return current;
    }
    if (path.dirname(current) === current) {
      throw new Error(`Unable to locate Spec-N-Roll package root from ${startDir}.`);
    }
  }
}

/**
 * Reads the linked source package root recorded by the dispatcher marker file.
 *
 * @param dispatcherDir - Directory containing global dispatcher build artifacts.
 * @returns Absolute linked source package root, or null when absent or invalid.
 */
function readLinkedSourcePath(dispatcherDir: string): string | null {
  const sourcePath = readText(path.join(dispatcherDir, '.source-package-root'))?.trim();
  return sourcePath != null && readPackageJson(sourcePath).name === 'spec-n-roll'
    ? path.resolve(sourcePath)
    : null;
}

/**
 * Reads a package descriptor without exposing parse errors.
 *
 * @param packageRoot - Absolute package root containing `package.json`.
 * @returns Parsed package descriptor fields used by the dispatcher.
 */
function readPackageJson(packageRoot: string): { name?: unknown; version?: string } {
  try {
    return JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8')) as {
      name?: unknown;
      version?: string;
    };
  } catch {
    return {};
  }
}

/**
 * Reads a top-level JSON field from a file without exposing parse errors.
 *
 * @param filePath - Absolute JSON file path.
 * @param fieldName - Top-level field name to read.
 * @returns Field value when the file parses, otherwise undefined.
 */
function readJsonField(filePath: string, fieldName: string): unknown {
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, unknown>;
    return data[fieldName];
  } catch {
    return undefined;
  }
}

/**
 * Reads a text file without exposing file access errors.
 *
 * @param filePath - Absolute text file path.
 * @returns File text when readable, otherwise undefined.
 */
function readText(filePath: string): string | undefined {
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return undefined;
  }
}
