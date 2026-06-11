import { chmodSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fse from 'fs-extra';

/**
 * Logical platform family used to choose between PowerShell and shell scripts.
 */
export type PlatformKind = 'windows' | 'unix';

/**
 * File extension selected for automation scripts on a platform family.
 */
export type PlatformScriptExtension = '.ps1' | '.sh';

/**
 * Result of executing a platform automation script.
 */
export interface PlatformScriptExecutionResult {
  /** Process exit code from the script invocation. */
  exitCode: number;
  /** Captured standard output text. */
  stdout: string;
  /** Captured standard error text. */
  stderr: string;
}

/**
 * Outcome of checking whether the required shell runtime is installed.
 */
export interface ShellRuntimeCheckResult {
  /** True when the platform-appropriate shell can be invoked. */
  available: boolean;
  /** Remediation guidance when `available` is false. */
  remediation?: string;
}

/**
 * Injectable dependencies for platform script execution and runtime checks.
 */
export interface PlatformScriptDeps {
  /** Node process platform value used for script selection. */
  platform: NodeJS.Platform;
  /** Returns true when an executable with the given name is on PATH. */
  commandExists: (command: string) => boolean;
  /** Returns true when a standard bash path exists on disk. */
  bashPathExists: () => boolean;
  /**
   * Spawns a shell command and returns captured output.
   *
   * @param command - Executable to run.
   * @param args - Arguments passed to the executable.
   * @returns Exit code and captured stdout/stderr.
   */
  spawn: (command: string, args: string[]) => {
    status: number | null;
    stdout: string;
    stderr: string;
  };
}

/**
 * Base names (without extension) for bundled automation script pairs installed by init.
 */
export const BUNDLED_SCRIPT_BASE_NAMES = ['check-prerequisites'] as const;

/**
 * Bundled automation script identifier without platform extension.
 */
export type BundledScriptBaseName = (typeof BUNDLED_SCRIPT_BASE_NAMES)[number];

/**
 * Relative install path for project-local automation scripts.
 */
export const PROJECT_SCRIPTS_RELATIVE_DIR = '.spec-n-roll/scripts';

/**
 * Error thrown when platform script selection or execution cannot proceed.
 */
export class PlatformScriptError extends Error {
  /** Stable error code for callers and tests. */
  readonly code: string;
  /** Actionable remediation guidance for developers. */
  readonly remediation: string;

  /**
   * Creates a platform script error with remediation guidance.
   *
   * @param code - Stable error identifier.
   * @param message - Human-readable failure explanation.
   * @param remediation - Steps to resolve the failure.
   */
  constructor(code: string, message: string, remediation: string) {
    super(`${message} ${remediation}`);
    this.name = 'PlatformScriptError';
    this.code = code;
    this.remediation = remediation;
  }
}

/**
 * Options for executing a project-local automation script.
 */
export interface ExecutePlatformScriptOptions {
  /** Absolute path to the project root containing `.spec-n-roll/scripts/`. */
  projectRoot: string;
  /** Script base name without platform extension. */
  scriptBaseName: string;
  /** Optional arguments forwarded to the script. */
  args?: string[];
  /** Optional dependency overrides for tests. */
  deps?: PlatformScriptDeps;
}

/**
 * Maps a Node platform string to the script platform family.
 *
 * @param platform - Node `process.platform` value.
 * @returns `windows` for win32, otherwise `unix`.
 */
export function detectPlatformKind(platform: NodeJS.Platform): PlatformKind {
  return platform === 'win32' ? 'windows' : 'unix';
}

/**
 * Selects the script file extension for a platform family.
 *
 * @param platformKind - Logical platform family.
 * @returns `.ps1` on windows, `.sh` on unix.
 */
export function selectScriptExtension(platformKind: PlatformKind): PlatformScriptExtension {
  return platformKind === 'windows' ? '.ps1' : '.sh';
}

/**
 * Resolves the absolute path to a platform-specific project script.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param scriptBaseName - Script base name without extension.
 * @param platformKind - Logical platform family.
 * @returns Absolute path to the selected `.ps1` or `.sh` script.
 */
export function resolveProjectScriptPath(
  projectRoot: string,
  scriptBaseName: string,
  platformKind: PlatformKind,
): string {
  const extension = selectScriptExtension(platformKind);
  return path.join(projectRoot, PROJECT_SCRIPTS_RELATIVE_DIR, `${scriptBaseName}${extension}`);
}

/**
 * Resolves the toolkit directory containing bundled script source files.
 *
 * @param toolkitRoot - Absolute path to the toolkit package root.
 * @returns Absolute path to `dist/scripts` when built, otherwise `src/scripts`.
 */
export function resolveBundledScriptsSourceDir(toolkitRoot: string): string {
  const distDir = path.join(toolkitRoot, 'dist', 'scripts');
  const srcDir = path.join(toolkitRoot, 'src', 'scripts');
  return existsSync(distDir) ? distDir : srcDir;
}

/**
 * Returns default dependency implementations for runtime platform script execution.
 *
 * @returns Platform script dependencies backed by the current process environment.
 */
export function createDefaultPlatformScriptDeps(): PlatformScriptDeps {
  return {
    platform: process.platform,
    commandExists: defaultCommandExists,
    bashPathExists: defaultBashPathExists,
    spawn: defaultSpawn,
  };
}

/**
 * Checks whether the shell runtime required for the platform family is available.
 *
 * @param platformKind - Logical platform family.
 * @param overrides - Optional dependency overrides for tests.
 * @returns Availability result with remediation when the runtime is missing.
 */
export function checkShellRuntime(
  platformKind: PlatformKind,
  overrides: Partial<Pick<PlatformScriptDeps, 'commandExists' | 'bashPathExists'>> = {},
): ShellRuntimeCheckResult {
  const commandExists = overrides.commandExists ?? defaultCommandExists;
  const bashPathExists = overrides.bashPathExists ?? defaultBashPathExists;

  if (platformKind === 'windows') {
    const available = commandExists('pwsh') || commandExists('powershell');
    if (available) {
      return { available: true };
    }

    return {
      available: false,
      remediation:
        'Install PowerShell 7+ from https://aka.ms/powershell or ensure Windows PowerShell is available on PATH.',
    };
  }

  const available = bashPathExists() || commandExists('bash');
  if (available) {
    return { available: true };
  }

  return {
    available: false,
    remediation:
      'Install bash and ensure it is available (for example /bin/bash or bash on PATH).',
  };
}

/**
 * Installs bundled paired `.sh` and `.ps1` scripts into a project.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param toolkitRoot - Absolute path to the toolkit package root.
 */
export async function installBundledPlatformScripts(
  projectRoot: string,
  toolkitRoot: string,
): Promise<void> {
  const sourceDir = resolveBundledScriptsSourceDir(toolkitRoot);
  const targetDir = path.join(projectRoot, PROJECT_SCRIPTS_RELATIVE_DIR);
  await fse.ensureDir(targetDir);

  const sourceFiles = readdirSync(sourceDir);
  const scriptBaseNames = new Set<string>();
  for (const fileName of sourceFiles) {
    const match = /^(?<base>.+)\.(?:sh|ps1)$/.exec(fileName);
    if (match?.groups?.base != null) {
      scriptBaseNames.add(match.groups.base);
    }
  }

  for (const scriptBaseName of scriptBaseNames) {
    for (const extension of ['.sh', '.ps1'] as const) {
      const sourcePath = path.join(sourceDir, `${scriptBaseName}${extension}`);
      if (!existsSync(sourcePath)) {
        throw new PlatformScriptError(
          'MISSING_SCRIPT_PAIR',
          `Bundled script pair is incomplete for "${scriptBaseName}".`,
          `Add both ${scriptBaseName}.sh and ${scriptBaseName}.ps1 to the toolkit scripts bundle.`,
        );
      }

      const targetPath = path.join(targetDir, `${scriptBaseName}${extension}`);
      copyFileSync(sourcePath, targetPath);

      if (extension === '.sh' && process.platform !== 'win32') {
        chmodSync(targetPath, 0o755);
      }
    }
  }
}

/**
 * Executes the platform-appropriate project automation script.
 *
 * @param options - Project root, script base name, optional args, and test deps.
 * @returns Captured stdout/stderr and exit code from the script process.
 */
export async function executePlatformScript(
  options: ExecutePlatformScriptOptions,
): Promise<PlatformScriptExecutionResult> {
  const deps = options.deps ?? createDefaultPlatformScriptDeps();
  const platformKind = detectPlatformKind(deps.platform);
  const runtime = checkShellRuntime(platformKind, deps);

  if (!runtime.available) {
    throw new PlatformScriptError(
      'SHELL_RUNTIME_MISSING',
      `Required shell runtime is not available for ${platformKind}.`,
      runtime.remediation ?? 'Install the platform shell runtime and retry.',
    );
  }

  const scriptPath = resolveProjectScriptPath(
    options.projectRoot,
    options.scriptBaseName,
    platformKind,
  );

  if (!existsSync(scriptPath)) {
    const extension = selectScriptExtension(platformKind);
    throw new PlatformScriptError(
      'SCRIPT_NOT_FOUND',
      `Automation script "${options.scriptBaseName}${extension}" was not found.`,
      'Run `spec-n-roll init` or `spec-n-roll update` to install toolkit scripts.',
    );
  }

  const spawnCommand = resolveSpawnCommand(platformKind, deps);
  const spawnArgs = buildSpawnArgs(platformKind, spawnCommand, scriptPath, options.args ?? []);
  const result = deps.spawn(spawnCommand, spawnArgs);

  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

/**
 * Resolves the toolkit package root from the running module location.
 *
 * @returns Absolute path to the toolkit repository/package root.
 */
export function resolveToolkitRootFromModule(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
}

/**
 * Determines whether a command exists on the current PATH.
 *
 * @param command - Executable name to locate.
 * @returns True when the command resolves on PATH.
 */
function defaultCommandExists(command: string): boolean {
  const locator = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(locator, [command], { encoding: 'utf8', stdio: 'pipe' });
  return result.status === 0;
}

/**
 * Checks for a standard bash installation path on Unix-like systems.
 *
 * @returns True when `/bin/bash` exists.
 */
function defaultBashPathExists(): boolean {
  return existsSync('/bin/bash');
}

/**
 * Spawns a command synchronously and captures output for script execution.
 *
 * @param command - Executable to run.
 * @param args - Arguments passed to the executable.
 * @returns Exit code and captured stdout/stderr.
 */
function defaultSpawn(
  command: string,
  args: string[],
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(command, args, { encoding: 'utf8', stdio: 'pipe' });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

/**
 * Resolves the shell executable used to run the selected script.
 *
 * @param platformKind - Logical platform family.
 * @param deps - Platform script dependencies.
 * @returns Executable name for `deps.spawn`.
 */
function resolveSpawnCommand(platformKind: PlatformKind, deps: PlatformScriptDeps): string {
  if (platformKind === 'windows') {
    if (deps.commandExists('pwsh')) {
      return 'pwsh';
    }
    return 'powershell';
  }

  if (deps.bashPathExists()) {
    return '/bin/bash';
  }

  return 'bash';
}

/**
 * Builds spawn arguments for the selected platform script invocation.
 *
 * @param platformKind - Logical platform family.
 * @param spawnCommand - Shell executable name.
 * @param scriptPath - Absolute path to the selected script file.
 * @param scriptArgs - Arguments forwarded to the script.
 * @returns Argument list for `deps.spawn`.
 */
function buildSpawnArgs(
  platformKind: PlatformKind,
  spawnCommand: string,
  scriptPath: string,
  scriptArgs: string[],
): string[] {
  if (platformKind === 'windows') {
    const fileFlag = spawnCommand === 'pwsh' ? '-File' : '-File';
    return ['-NoProfile', '-NonInteractive', fileFlag, scriptPath, ...scriptArgs];
  }

  return [scriptPath, ...scriptArgs];
}
