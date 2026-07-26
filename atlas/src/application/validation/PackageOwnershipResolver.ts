import type { WorkspacePackage } from '#application/workspace/model/WorkspacePackage.js';

/**
 * Resolves a workspace-relative source path to its most specific discovered package root.
 */
export class PackageOwnershipResolver {
  /**
   * Finds the most specific package whose workspace-relative root contains a source path.
   *
   * @param sourcePath - Slash-normalized workspace-relative source path.
   * @param packages - Explicitly discovered workspace packages.
   * @returns Owning package, or undefined when the path is external to all configured packages.
   */
  public resolve(
    sourcePath: string,
    packages: readonly WorkspacePackage[]
  ): WorkspacePackage | undefined {
    const matchingPackages = packages
      .filter((workspacePackage) => this.ownsPath(workspacePackage.relativeRootPath, sourcePath))
      .sort((left, right) => right.relativeRootPath.length - left.relativeRootPath.length);

    return matchingPackages[0];
  }

  /**
   * Tests whether a package root contains a normalized workspace-relative path.
   *
   * @param relativeRootPath - Package root path using a dot for the workspace root package.
   * @param sourcePath - Workspace-relative source path to test.
   * @returns True when the source path belongs to the package root.
   */
  private ownsPath(relativeRootPath: string, sourcePath: string): boolean {
    return (
      relativeRootPath === '.' ||
      sourcePath === relativeRootPath ||
      sourcePath.startsWith(`${relativeRootPath}/`)
    );
  }
}
