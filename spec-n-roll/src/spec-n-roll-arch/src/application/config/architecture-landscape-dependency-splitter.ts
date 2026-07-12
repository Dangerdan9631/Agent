import type { ArchitectureConfig } from '#arch/application/config/architecture-config.js';

/**
 * Resolves configured landscape external dependency node identities.
 */
export class ArchitectureLandscapeDependencySplitter {
  /**
   * Creates a landscape external dependency splitter.
   *
   * @param config - User-editable architecture diagram configuration.
   */
  constructor(private readonly config: ArchitectureConfig = {}) {}

  /**
   * Resolves the graph node id for one external dependency imported by a workspace package.
   *
   * @param dependencyName - Displayed external dependency name, such as "commander" or "node:path".
   * @param sourcePackageName - Name of the workspace package that imports the dependency.
   * @returns A shared external node id, or a package-specific external node id when configured for splitting.
   */
  nodeId(dependencyName: string, sourcePackageName: string): string {
    return this.splits(dependencyName, sourcePackageName)
      ? `external:${dependencyName}:${sourcePackageName}`
      : `external:${dependencyName}`;
  }

  private splits(dependencyName: string, sourcePackageName: string): boolean {
    return (
      this.config.split?.landscape?.externalDependencies?.[
        dependencyName
      ]?.includes(sourcePackageName) ?? false
    );
  }
}
