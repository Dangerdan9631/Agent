import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import type { RuntimeInvocation, RuntimeTarget } from 'spec-n-roll-api';
import type { DispatcherEnvironment } from '#dispatcher/infrastructure/environment/dispatcher-environment.js';
import type { RuntimeProcessExecutor } from '#dispatcher/application/runtime/runtime-process-executor.js';

/**
 * Executes runtime targets by spawning Node.js without shell interpolation.
 */
export class NodeRuntimeProcessExecutor implements RuntimeProcessExecutor {
  /**
   * Creates a process executor.
   *
   * @param environment - Process environment values used for execution.
   */
  constructor(private readonly environment: DispatcherEnvironment) {}

  /**
   * Executes the selected runtime with the invocation payload on stdin.
   *
   * @param target - Runtime target selected by the dispatcher.
   * @param invocation - Runtime invocation payload to serialize as JSON.
   * @returns Runtime process exit code.
   */
  execute(target: RuntimeTarget, invocation: RuntimeInvocation): number {
    this.validateReadableExecutable(target.executablePath);
    const result = spawnSync(
      this.environment.nodeExecutablePath(),
      [target.executablePath, ...invocation.argv],
      {
        cwd: invocation.cwd,
        encoding: 'utf8',
        input: `${JSON.stringify(invocation)}\n`,
        stdio: ['pipe', 'inherit', 'inherit'],
      },
    );

    this.throwIfSpawnFailed(target.executablePath, result);
    return result.status ?? 1;
  }

  /**
   * Checks whether a target script can be read before Node receives it.
   *
   * @param executablePath - Absolute JavaScript entrypoint path to validate.
   */
  private validateReadableExecutable(executablePath: string): void {
    try {
      accessSync(executablePath, constants.R_OK);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Cannot execute Spec-N-Roll runtime at ${executablePath}: ${message}`,
      );
    }
  }

  /**
   * Converts child process spawn errors into dispatcher errors.
   *
   * @param executablePath - Absolute executable path attempted.
   * @param result - Spawn result returned by Node.js.
   */
  private throwIfSpawnFailed(
    executablePath: string,
    result: SpawnSyncReturns<string>,
  ): void {
    if (result.error != null) {
      throw new Error(
        `Failed to execute Spec-N-Roll runtime at ${executablePath}: ${result.error.message}`,
      );
    }
  }
}
