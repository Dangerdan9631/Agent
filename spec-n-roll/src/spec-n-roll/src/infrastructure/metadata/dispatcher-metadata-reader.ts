import { readFileSync } from 'node:fs';
import { dirname, join, parse, resolve } from 'node:path';
import {
  DISPATCHER_LOCAL_SOURCE_MARKER_FILE,
  type DispatcherInstallSource,
  type DispatcherMetadata,
} from 'spec-n-roll-api';

/**
 * Reads dispatcher package metadata from its installed package layout.
 */
export class DispatcherMetadataReader {
  /**
   * Creates a dispatcher metadata reader.
   *
   * @param entryDirectory - Directory containing the running dispatcher entry file.
   */
  constructor(private readonly entryDirectory: string) {}

  /**
   * Reads metadata that must be sent to delegated runtimes.
   *
   * @returns Dispatcher metadata for the current install.
   */
  read(): DispatcherMetadata {
    const packageRoot = this.findPackageRoot();

    return {
      installSource: this.resolveInstallSource(),
      installDirectory: packageRoot,
      packageVersion: this.readPackageVersion(packageRoot),
    };
  }

  /**
   * Finds the package root containing the dispatcher package manifest.
   *
   * @returns Absolute package root for the dispatcher install.
   */
  findPackageRoot(): string {
    for (
      let current = resolve(this.entryDirectory);
      ;
      current = dirname(current)
    ) {
      if (this.isDispatcherPackageRoot(current)) {
        return current;
      }

      if (current === parse(current).root) {
        throw new Error(
          `Unable to locate spec-n-roll package root from ${this.entryDirectory}.`,
        );
      }
    }
  }

  /**
   * Resolves whether this dispatcher came from npm or a linked local build.
   *
   * @returns Install source detected from the local source marker.
   */
  private resolveInstallSource(): DispatcherInstallSource {
    const sourcePath = this.readLocalSourceMarker();
    return sourcePath != null && this.isDispatcherPackageRoot(sourcePath)
      ? 'local'
      : 'remote';
  }

  /**
   * Reads the package version from package.json.
   *
   * @param packageRoot - Absolute dispatcher package root.
   * @returns Package version when present, otherwise `0.0.0`.
   */
  private readPackageVersion(packageRoot: string): string {
    const packageJson = this.readPackageJson(packageRoot);
    return typeof packageJson.version === 'string' && packageJson.version !== ''
      ? packageJson.version
      : '0.0.0';
  }

  /**
   * Checks whether a directory contains the dispatcher package manifest.
   *
   * @param directory - Absolute directory path to inspect.
   * @returns true when the directory contains package.json for `spec-n-roll`.
   */
  private isDispatcherPackageRoot(directory: string): boolean {
    return this.readPackageJson(directory).name === 'spec-n-roll';
  }

  /**
   * Reads the local source marker next to the built dispatcher entrypoint.
   *
   * @returns Absolute linked source root when a marker is readable.
   */
  private readLocalSourceMarker(): string | undefined {
    try {
      const markerPath = join(
        this.entryDirectory,
        DISPATCHER_LOCAL_SOURCE_MARKER_FILE,
      );
      const sourcePath = readFileSync(markerPath, 'utf8').trim();
      return sourcePath === '' ? undefined : resolve(sourcePath);
    } catch {
      return undefined;
    }
  }

  /**
   * Reads package metadata without exposing filesystem or JSON parse errors.
   *
   * @param packageRoot - Directory that may contain a package.json file.
   * @returns Parsed package metadata or an empty object.
   */
  private readPackageJson(packageRoot: string): {
    name?: string;
    version?: string;
  } {
    try {
      return JSON.parse(
        readFileSync(join(packageRoot, 'package.json'), 'utf8'),
      ) as {
        name?: string;
        version?: string;
      };
    } catch {
      return {};
    }
  }
}
