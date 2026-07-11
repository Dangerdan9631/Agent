import type {
  ArchitectureConfig,
  ArchitectureFolderDiagramConfig,
} from '#arch/application/config/architecture-config.js';

/**
 * Resolves user-configured external dependency collapse decisions.
 */
export class ArchitectureCollapseFilter {
  /**
   * Creates an architecture collapse filter.
   *
   * @param config - User-editable architecture diagram configuration.
   */
  constructor(private readonly config: ArchitectureConfig = {}) {}

  /**
   * Creates a collapse filter for a configured folder diagram.
   *
   * @param folderDiagram - Folder diagram configuration with optional collapse overrides.
   * @returns Collapse filter using the folder override when present and workspace defaults otherwise.
   */
  forFolderDiagram(
    folderDiagram: ArchitectureFolderDiagramConfig,
  ): ArchitectureCollapseFilter {
    return new ArchitectureCollapseFilter({
      collapsed: {
        externalDependencies:
          folderDiagram.collapsed?.externalDependencies ??
          this.config.collapsed?.externalDependencies,
      },
    });
  }

  /**
   * Checks whether an external dependency should be represented by one package-level node.
   *
   * @param dependencyName - Displayed external dependency name, such as "tslog" or "node:path".
   * @returns true when the external dependency is configured for collapse.
   */
  collapsesExternalDependency(dependencyName: string): boolean {
    return new Set(this.config.collapsed?.externalDependencies ?? []).has(
      dependencyName,
    );
  }
}
