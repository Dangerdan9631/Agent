/**
 * Describes a workspace package discovered from the source package roots.
 */
export interface WorkspacePackage {
  /**
   * Package name from package.json. The value must be a non-empty npm package name.
   */
  name: string;

  /**
   * Absolute filesystem path to the package root.
   */
  root: string;

  /**
   * Runtime and development package dependencies keyed by package name.
   */
  dependencies: Record<string, string>;
}
