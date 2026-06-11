import {
  executePlatformScript,
  type ExecutePlatformScriptOptions,
  type PlatformScriptDeps,
  type PlatformScriptExecutionResult,
} from './platform-scripts.js';

/**
 * Options for running a workflow automation script through the workflow engine.
 */
export interface RunAutomationScriptOptions {
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
 * Runs a toolkit automation script using platform-appropriate selection.
 *
 * The workflow engine never spawns the wrong platform script variant; runtime
 * detection chooses `.ps1` on Windows and `.sh` on Unix-like systems.
 *
 * @param options - Project root, script id, optional args, and test overrides.
 * @returns Captured stdout/stderr and exit code from the script process.
 */
export async function runAutomationScript(
  options: RunAutomationScriptOptions,
): Promise<PlatformScriptExecutionResult> {
  const executeOptions: ExecutePlatformScriptOptions = {
    projectRoot: options.projectRoot,
    scriptBaseName: options.scriptBaseName,
    args: options.args,
    deps: options.deps,
  };

  return executePlatformScript(executeOptions);
}
