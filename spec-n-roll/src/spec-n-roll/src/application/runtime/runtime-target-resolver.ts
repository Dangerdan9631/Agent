import { dirname, join, resolve } from 'node:path';
import {
  LOCAL_CLI_RELATIVE_PATH_SEGMENTS,
  type RuntimeTarget,
} from 'spec-n-roll-api';
import type { DispatcherFileSystem } from '#dispatcher/application/filesystem/dispatcher-file-system.js';
import type { RuntimePackageManifestPathResolver } from '#dispatcher/application/runtime/runtime-package-manifest-path-resolver.js';

/**
 * Resolves the runtime executable selected for a dispatcher invocation.
 */
export class RuntimeTargetResolver {
  /**
   * Creates a runtime target resolver.
   *
   * @param fileSystem - Raw filesystem access used to read installed package metadata.
   * @param manifestPathResolver - Module resolver for the installed runtime manifest.
   */
  constructor(
    private readonly fileSystem: DispatcherFileSystem,
    private readonly manifestPathResolver: RuntimePackageManifestPathResolver,
  ) {}

  /**
   * Resolves the executable target for the invocation.
   *
   * @param projectRoot - Optional resolved project root.
   * @param forceGlobal - True when the caller requested global routing.
   * @param installDirectory - Directory containing the running dispatcher entry file.
   * @returns Runtime target selected for the invocation.
   */
  resolve(
    projectRoot: string | undefined,
    forceGlobal: boolean,
    installDirectory: string,
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
      executablePath: this.resolveGlobalRuntimeExecutable(installDirectory),
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
    return this.fileSystem.pathExists(executablePath)
      ? executablePath
      : undefined;
  }

  /**
   * Resolves the globally installed runtime package executable.
   *
   * @returns Absolute path to the `spec-n-roll-runtime` binary entrypoint.
   */
  private resolveGlobalRuntimeExecutable(installDirectory: string): string {
    const packageJsonPath = this.manifestPathResolver.resolve(installDirectory);
    const packageText = this.fileSystem.readText(packageJsonPath);
    const packageJson = this.parseRuntimePackageJson(packageText);
    const executableRelativePath = packageJson.bin?.['spec-n-roll-runtime'];

    if (executableRelativePath == null || executableRelativePath === '') {
      throw new Error(
        'spec-n-roll-runtime package does not define a runtime binary.',
      );
    }

    return resolve(dirname(packageJsonPath), executableRelativePath);
  }

  private parseRuntimePackageJson(packageText: string | undefined): {
    bin?: Record<string, string>;
  } {
    if (packageText == null) {
      throw new Error('Unable to read spec-n-roll-runtime package metadata.');
    }

    try {
      return JSON.parse(packageText) as {
        bin?: Record<string, string>;
      };
    } catch {
      throw new Error(
        'spec-n-roll-runtime package metadata is not valid JSON.',
      );
    }
  }
}
