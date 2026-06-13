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
}

/**
 * Spawns a fresh interactive CLI process and returns the child exit code.
 *
 * @param options - Optional cwd, argv, and entry path overrides.
 * @returns Exit code from the spawned child process.
 */
export function reloadInteractiveApp(options: ReloadInteractiveAppOptions = {}): number {
  const cwd = options.cwd ?? process.cwd();
  const entry = options.executedBinaryPath ?? process.argv[1];
  const args = options.argv ?? process.argv.slice(2);

  if (entry == null) {
    return 1;
  }

  const result = spawnSync(process.execPath, [entry, ...args], {
    cwd,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });

  return result.status ?? 1;
}
