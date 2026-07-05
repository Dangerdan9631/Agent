import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import {
  LOCAL_CLI_RELATIVE_PATH_SEGMENTS,
  type RuntimeTarget,
} from 'spec-n-roll-api';

/**
 * Resolves the runtime executable selected for a dispatcher invocation.
 */
export class RuntimeTargetResolver {
  /**
   * Creates a runtime target resolver.
   *
   * @param installDirectory - Directory containing the running dispatcher entry file.
   */
  constructor(private readonly installDirectory: string) {}

  /**
   * Resolves the executable target for the invocation.
   *
   * @param projectRoot - Optional resolved project root.
   * @param forceGlobal - True when the caller requested global routing.
   * @returns Runtime target selected for the invocation.
   */
  resolve(
    projectRoot: string | undefined,
    forceGlobal: boolean,
  ): RuntimeTarget {
    const localExecutable =
      projectRoot == null
        ? undefined
        : this.findProjectLocalExecutable(projectRoot);

    if (!forceGlobal && localExecutable != null) {
      return {
        executablePath: localExecutable,
        projectLocal: true,
      };
    }

    return {
      executablePath: this.resolveGlobalRuntimeExecutable(),
      projectLocal: false,
    };
  }

  /**
   * Finds the project-local JavaScript CLI launcher under a project root.
   *
   * @param projectRoot - Absolute project root to inspect.
   * @returns Absolute launcher path when present, otherwise undefined.
   */
  private findProjectLocalExecutable(projectRoot: string): string | undefined {
    const executablePath = join(
      projectRoot,
      ...LOCAL_CLI_RELATIVE_PATH_SEGMENTS,
    );
    return existsSync(executablePath) ? executablePath : undefined;
  }

  /**
   * Resolves the globally installed runtime package executable.
   *
   * @returns Absolute path to the `spec-n-roll-runtime` binary entrypoint.
   */
  private resolveGlobalRuntimeExecutable(): string {
    const requireFromDispatcher = createRequire(
      join(this.installDirectory, 'index.js'),
    );
    const packageJsonPath = requireFromDispatcher.resolve(
      'spec-n-roll-runtime/package.json',
    );
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      bin?: Record<string, string>;
    };
    const executableRelativePath = packageJson.bin?.['spec-n-roll-runtime'];

    if (executableRelativePath == null || executableRelativePath === '') {
      throw new Error(
        'spec-n-roll-runtime package does not define a runtime binary.',
      );
    }

    return resolve(dirname(packageJsonPath), executableRelativePath);
  }
}
