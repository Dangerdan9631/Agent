/**
 * Describes user-editable architecture diagram configuration loaded from the workspace root.
 */
export interface ArchitectureConfig {
  /**
   * Diagram split settings. Omitted sections retain one shared node per external dependency.
   */
  split?: {
    /**
     * Landscape diagram settings that change how external dependency nodes are represented.
     */
    landscape?: {
      /**
       * Workspace package names that receive separate identically labelled nodes for each external dependency key.
       */
      externalDependencies?: Record<string, string[]>;
    };
  };

  /**
   * Diagram collapse settings. Omitted sections use each diagram's default node detail.
   */
  collapsed?: {
    /**
     * External package or runtime module names represented by one package-level node.
     */
    externalDependencies?: string[];
  };

  /**
   * Diagram exclusion settings. Omitted sections behave as empty exclusion lists.
   */
  exclusions?: {
    /**
     * External package or runtime module names to exclude from the landscape diagram.
     */
    landscape?: string[];

    /**
     * Project node exclusions matched by node name or node-name glob.
     */
    projectFiles?: {
      /**
       * Project node exclusions applied to every workspace package.
       */
      allPackages?: string[];

      /**
       * Project node exclusions applied only to the package named by each property.
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
   * Diagram collapse overrides. Omitted values inherit the workspace configuration.
   */
  collapsed?: {
    /**
     * External package or runtime module names represented by one node in this folder diagram.
     */
    externalDependencies?: string[];
  };

  /**
   * Diagram exclusion overrides. Omitted values inherit the containing package configuration.
   */
  exclusions?: {
    /**
     * Project node exclusions matched by node name or node-name glob.
     */
    projectFiles?: string[];
  };
}
