/**
 * Describes user-editable architecture diagram configuration loaded from the workspace root.
 */
export interface ArchitectureConfig {
  /**
   * Diagram exclusion settings. Omitted sections behave as empty exclusion lists.
   */
  exclusions?: {
    /**
     * External package or runtime module names to exclude from package diagrams.
     */
    externalDependencies?: string[];

    /**
     * Project file exclusions matched by basename, package-root-relative path, or package-root-relative glob.
     */
    projectFiles?: {
      /**
       * Project file exclusions applied to every workspace package.
       */
      allPackages?: string[];

      /**
       * Project file exclusions applied only to the package named by each property.
       */
      packages?: Record<string, string[]>;
    };
  };

  /**
   * Opt-in package folder diagrams keyed by workspace package name.
   */
  folderDiagrams?: {
    /**
     * Folder diagrams generated only for packages named by each property.
     */
    packages?: Record<string, ArchitectureFolderDiagramConfig[]>;
  };
}

/**
 * Describes one package folder diagram requested by architecture configuration.
 */
export interface ArchitectureFolderDiagramConfig {
  /**
   * Package-root-relative folder path to graph. The value must use slash or backslash separators.
   */
  path: string;

  /**
   * Human-readable page title. When omitted, the package name and folder path are used.
   */
  title?: string;

  /**
   * Diagram exclusion overrides. Omitted values inherit the containing package configuration.
   */
  exclusions?: {
    /**
     * External package or runtime module names to exclude from this folder diagram.
     */
    externalDependencies?: string[];

    /**
     * Project file exclusions matched by basename, package-root-relative path, or package-root-relative glob.
     */
    projectFiles?: string[];
  };
}
