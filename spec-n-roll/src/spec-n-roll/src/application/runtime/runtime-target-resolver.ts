import { dirname, join, resolve } from 'node:path';
import {
  LOCAL_CLI_RELATIVE_PATH_SEGMENTS,
  LOCAL_FRAMEWORK_METADATA_RELATIVE_PATH_SEGMENTS,
  type RuntimeTarget,
} from 'spec-n-roll-api';
import type { DispatcherFileSystem } from '#dispatcher/application/filesystem/dispatcher-file-system.js';
import type { RuntimePackageManifestPathResolver } from '#dispatcher/application/runtime/runtime-package-manifest-path-resolver.js';

/**
 * Describes the globally installed runtime metadata used to identify a selected target.
 */
interface GlobalRuntimeMetadata {
  /**
   * Absolute runtime executable path from the package manifest.
   */
  readonly executablePath: string;
  /**
   * Runtime package version from the package manifest.
   */
  readonly packageVersion: string;
}

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
    const globalRuntime = this.resolveGlobalRuntime(installDirectory);
    const localExecutable =
      projectRoot == null
        ? undefined
        : this.findProjectLocalExecutable(projectRoot);

    if (!forceGlobal && localExecutable != null) {
      return {
        executablePath: localExecutable,
        packageVersion: this.readLocalRuntimeVersion(projectRoot, globalRuntime.packageVersion),
        projectLocal: true,
      };
    }

    return {
      executablePath: globalRuntime.executablePath,
      packageVersion: globalRuntime.packageVersion,
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
   * Reads copied local runtime metadata with a compatible fallback for old projects.
   *
   * @param projectRoot - Absolute project root containing the local framework.
   * @param fallbackVersion - Global runtime version used by projects without metadata.
   * @returns Local runtime semantic version.
   */
  private readLocalRuntimeVersion(projectRoot: string, fallbackVersion: string): string {
    const metadataText = this.fileSystem.readText(join(projectRoot, ...LOCAL_FRAMEWORK_METADATA_RELATIVE_PATH_SEGMENTS));
    try {
      const metadata = metadataText == null ? undefined : JSON.parse(metadataText) as { runtimeVersion?: unknown };
      return typeof metadata?.runtimeVersion === 'string' && metadata.runtimeVersion !== '' ? metadata.runtimeVersion : fallbackVersion;
    } catch {
      return fallbackVersion;
    }
  }

  /**
   * Resolves the globally installed runtime package executable.
   *
   * @returns Executable path and package version for the globally installed runtime.
   */
  private resolveGlobalRuntime(
    installDirectory: string,
  ): GlobalRuntimeMetadata {
    const packageJsonPath = this.manifestPathResolver.resolve(installDirectory);
    const packageText = this.fileSystem.readText(packageJsonPath);
    const packageJson = this.parseRuntimePackageJson(packageText);
    const executableRelativePath = packageJson.bin?.['spec-n-roll-runtime'];

    if (executableRelativePath == null || executableRelativePath === '') {
      throw new Error(
        'spec-n-roll-runtime package does not define a runtime binary.',
      );
    }

    return {
      executablePath: resolve(dirname(packageJsonPath), executableRelativePath),
      packageVersion:
        typeof packageJson.version === 'string' && packageJson.version !== ''
          ? packageJson.version
          : '0.0.0',
    };
  }

  private parseRuntimePackageJson(packageText: string | undefined): {
    bin?: Record<string, string>;
    version?: string;
  } {
    if (packageText == null) {
      throw new Error('Unable to read spec-n-roll-runtime package metadata.');
    }

    try {
      return JSON.parse(packageText) as {
        bin?: Record<string, string>;
        version?: string;
      };
    } catch {
      throw new Error(
        'spec-n-roll-runtime package metadata is not valid JSON.',
      );
    }
  }
}

