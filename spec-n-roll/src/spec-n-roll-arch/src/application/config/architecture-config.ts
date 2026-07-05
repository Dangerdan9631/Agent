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
}
