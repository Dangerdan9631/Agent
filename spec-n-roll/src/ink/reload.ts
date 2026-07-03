import { spawnSync } from 'node:child_process';

/**
 * Options for reloading the interactive CLI in a child process.
 */
export interface ReloadInteractiveAppOptions {
  /**
   * Working directory passed to the spawned child process.
   */
  cwd?: string;
  /**
   * Raw argv slice passed to the child after the entry script path.
   */
  argv?: readonly string[];
  /**
   * Absolute path to the CLI entry script executed by the child process.
   */
  executedBinaryPath?: string;
  /**
   * Command to execute instead of the current Node entry script.
   */
  command?: string;
}

/**
 * Spawns a fresh interactive CLI process and returns the child exit code.
 *
 * @param options - Optional cwd, argv, and entry path overrides.
 * @returns Exit code from the spawned child process.
 */
export function reloadInteractiveApp(options: ReloadInteractiveAppOptions = {}): number {
  const cwd = options.cwd ?? process.cwd();
  const args = options.argv ?? process.argv.slice(2);

  const result =
    options.command != null
      ? spawnSync(options.command, [...args], {
          cwd,
          stdio: 'inherit',
          env: process.env,
          shell: process.platform === 'win32',
        })
      : spawnCurrentNodeEntrypoint(cwd, args, options.executedBinaryPath);

  return result.status ?? 1;
}

/**
 * Spawns the current Node entrypoint with inherited stdio.
 *
 * @param cwd - Working directory passed to the child process.
 * @param args - Arguments passed after the entry script path.
 * @param executedBinaryPath - Optional entrypoint override, otherwise `process.argv[1]`.
 * @returns Child process result from the synchronous spawn.
 */
function spawnCurrentNodeEntrypoint(
  cwd: string,
  args: readonly string[],
  executedBinaryPath?: string,
): ReturnType<typeof spawnSync> {
  const entry = executedBinaryPath ?? process.argv[1];
  if (entry == null) {
    return spawnSync(process.execPath, ['-e', 'process.exit(1)'], {
      cwd,
      stdio: 'inherit',
      env: process.env,
    });
  }

  return spawnSync(process.execPath, [entry, ...args], {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });
}
