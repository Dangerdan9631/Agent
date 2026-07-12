import { spawnSync } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import type { DispatcherEnvironment } from '#dispatcher/application/environment/dispatcher-environment.js';
import type { RuntimeProcessExecutor } from '#dispatcher/application/runtime/runtime-process-executor.js';
import type { RuntimeProcessRequest } from '#dispatcher/application/runtime/runtime-process-request.js';

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
   * Executes the selected runtime natively in the current terminal.
   *
   * @param request - Raw process launch data prepared by application behavior.
   * @returns Runtime process exit code.
   */
  execute(request: RuntimeProcessRequest): number {
    this.validateReadableExecutable(request.executablePath);
    const result = spawnSync(
      this.environment.nodeExecutablePath(),
      [request.executablePath, ...request.argv],
      {
        cwd: request.cwd,
        env: {
          ...process.env,
          [request.invocationEnvironmentVariable]: request.invocation,
        },
        stdio: 'inherit',
      },
    );

    this.throwIfSpawnFailed(request.executablePath, result);
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
    result: { readonly error?: Error },
  ): void {
    if (result.error != null) {
      throw new Error(
        `Failed to execute Spec-N-Roll runtime at ${executablePath}: ${result.error.message}`,
      );
    }
  }
}
