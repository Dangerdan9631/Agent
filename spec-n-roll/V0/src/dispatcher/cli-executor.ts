import { spawnSync } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getDispatcherEnv, getGlobalCliNodeRoot } from './dispatcher-resolver.js';

const DISPATCHER_DIR = path.dirname(fileURLToPath(import.meta.url));
const GLOBAL_CLI_PATH = path.join(DISPATCHER_DIR, 'index.js');
const LOCAL_CLI_RELATIVE_PATH = path.join('.spec-n-roll', 'cli', 'bin', 'spec-n-roll');

/**
 * Spawns the CLI runtime.
 *
 * @param options - Runtime selection and process execution options.
 * @returns Exit code from the spawned process, or 1 when spawning fails.
 */
export function executeCli(options: {
  /**
   * Project root for a project-local runtime. When omitted the global runtime is
   * used instead.
   */
  localProjectRoot?: string;

  /**
   * Runtime arguments passed verbatim to the selected CLI entrypoint.
   */
  args: string[];

  /**
   * Working directory used by the spawned CLI process.
   */
  cwd: string;
}) {
  const cliPath =
    options.localProjectRoot
      ? path.join(options.localProjectRoot, LOCAL_CLI_RELATIVE_PATH) 
      : GLOBAL_CLI_PATH;
  
  validateIsExecutable(cliPath)
  const delegatedEnv = {
    ...getDispatcherEnv(),
    NODE_PATH: getGlobalCliNodeRoot(),
  };
  
  const result = spawnSync(process.execPath, [cliPath, ...options.args], {
    cwd: options.cwd ?? process.cwd(),
    env: delegatedEnv,
    stdio: 'inherit',
  });

  if (result.error != null) {
    throw new Error(`Failed to execute Spec N' Roll CLI at ${cliPath}: ${result.error.message}`);
  }

  if (result.status != 0) {
    throw new Error(`Failed to execute Spec N' Roll CLI at ${cliPath}: ${result.status}`);
  }
}

/**
 * Checks that a CLI entrypoint exists and has execute permissions before it is
 * handed to Node.
 *
 * @param scriptPath - Absolute JavaScript entrypoint path to validate.
 */
function validateIsExecutable(scriptPath: string) {
  try {
    accessSync(scriptPath, constants.X_OK);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot execute Spec N' Roll CLI at ${scriptPath}: ${message}`);
  }
}
