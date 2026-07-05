/**
 * Identifies packages that participate in runtime architecture reports.
 */
export class RuntimePackagePolicy {
  /**
   * Package names excluded because they support development workflows.
   */
  private readonly excludedPackageNames = new Set([
    'spec-n-roll-arch',
    'spec-n-roll-test',
  ]);

  /**
   * Checks whether a package belongs in runtime architecture reports.
   *
   * @param packageName - Workspace package name from package.json.
   * @returns true when the package should be included in runtime reports.
   */
  includes(packageName: string): boolean {
    return !this.excludedPackageNames.has(packageName);
  }
}
