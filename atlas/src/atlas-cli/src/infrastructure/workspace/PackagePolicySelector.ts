import type {
  AtlasDiscoveryConfiguration,
  AtlasPackagePolicy
} from '#application/configuration/model/AtlasConfiguration.js';
import { minimatch } from 'minimatch';

/**
 * Selects exactly one explicit Atlas package policy for a discovered package.
 */
export class PackagePolicySelector {
  /**
   * Finds the single policy matching one package manifest name and workspace-relative root.
   *
   * @param discovery - Validated discovery configuration containing explicit policies.
   * @param packageName - Non-empty package manifest name.
   * @param relativeRootPath - Slash-normalized package path relative to the workspace root.
   * @returns Matching package policy.
   */
  public select(
    discovery: AtlasDiscoveryConfiguration,
    packageName: string,
    relativeRootPath: string
  ): AtlasPackagePolicy {
    const matches = discovery.packages.filter((policy) =>
      this.matchesPolicy(policy, packageName, relativeRootPath)
    );

    if (matches.length === 0) {
      throw new Error(
        `Package '${packageName}' at '${relativeRootPath}' does not match an explicit discovery policy.`
      );
    }

    if (matches.length > 1) {
      throw new Error(
        `Package '${packageName}' at '${relativeRootPath}' matches multiple discovery policies.`
      );
    }

    return matches[0]!;
  }

  /**
   * Determines whether all supplied name and path matchers select a package.
   *
   * @param policy - Candidate package policy.
   * @param packageName - Package manifest name to evaluate.
   * @param relativeRootPath - Workspace-relative package directory path to evaluate.
   * @returns True when the policy's configured matchers select the package.
   */
  private matchesPolicy(
    policy: AtlasPackagePolicy,
    packageName: string,
    relativeRootPath: string
  ): boolean {
    const nameMatches =
      policy.match.name === undefined ||
      minimatch(packageName, this.normalizeGlob(policy.match.name), { dot: true });
    const pathMatches =
      policy.match.path === undefined ||
      minimatch(relativeRootPath, this.normalizeGlob(policy.match.path), { dot: true });

    return nameMatches && pathMatches;
  }

  /**
   * Converts Windows-style separator input into canonical slash-based glob input.
   *
   * @param glob - User-owned glob pattern validated as a non-empty string.
   * @returns Slash-normalized glob pattern.
   */
  private normalizeGlob(glob: string): string {
    return glob.replaceAll('\\', '/');
  }
}
