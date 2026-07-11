import { dirname, join, parse, resolve } from 'node:path';
import {
  DISPATCHER_LOCAL_SOURCE_MARKER_FILE,
  type DispatcherInstallSource,
  type DispatcherMetadata,
} from 'spec-n-roll-api';
import type { DispatcherFileSystem } from '#dispatcher/application/filesystem/dispatcher-file-system.js';

/**
 * Resolves dispatcher installation metadata from raw package-layout files.
 */
export class DispatcherMetadataResolver {
  /**
   * Creates a resolver for dispatcher package metadata.
   *
   * @param fileSystem - Raw filesystem access used to read package-layout files.
   */
  constructor(private readonly fileSystem: DispatcherFileSystem) {}

  /**
   * Resolves metadata that must be sent to delegated runtimes.
   *
   * @param entryDirectory - Directory containing the running dispatcher entry file.
   * @returns Dispatcher metadata for the current install.
   */
  resolve(entryDirectory: string): DispatcherMetadata {
    const packageRoot = this.findPackageRoot(entryDirectory);

    return {
      installSource: this.resolveInstallSource(entryDirectory),
      installDirectory: packageRoot,
      packageVersion: this.readPackageVersion(packageRoot),
    };
  }

  private findPackageRoot(entryDirectory: string): string {
    for (let current = resolve(entryDirectory); ; current = dirname(current)) {
      if (this.isDispatcherPackageRoot(current)) {
        return current;
      }

      if (current === parse(current).root) {
        throw new Error(
          `Unable to locate spec-n-roll package root from ${entryDirectory}.`,
        );
      }
    }
  }

  private resolveInstallSource(
    entryDirectory: string,
  ): DispatcherInstallSource {
    const sourceText = this.fileSystem.readText(
      join(entryDirectory, DISPATCHER_LOCAL_SOURCE_MARKER_FILE),
    );
    const sourcePath =
      sourceText == null ? undefined : resolve(sourceText.trim());

    return sourcePath != null && this.isDispatcherPackageRoot(sourcePath)
      ? 'local'
      : 'remote';
  }

  private readPackageVersion(packageRoot: string): string {
    const packageJson = this.readPackageJson(packageRoot);
    return typeof packageJson.version === 'string' && packageJson.version !== ''
      ? packageJson.version
      : '0.0.0';
  }

  private isDispatcherPackageRoot(directory: string): boolean {
    return this.readPackageJson(directory).name === 'spec-n-roll';
  }

  private readPackageJson(packageRoot: string): {
    name?: string;
    version?: string;
  } {
    const packageText = this.fileSystem.readText(
      join(packageRoot, 'package.json'),
    );

    try {
      return packageText == null
        ? {}
        : (JSON.parse(packageText) as { name?: string; version?: string });
    } catch {
      return {};
    }
  }
}
