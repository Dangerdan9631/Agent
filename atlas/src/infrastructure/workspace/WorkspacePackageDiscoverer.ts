import type {
  AtlasConfiguration,
  AtlasPackagePolicy
} from '#application/configuration/model/AtlasConfiguration.js';
import type { WorkspacePackageDiscoverer as WorkspacePackageDiscovererPort } from '#application/workspace/ports/WorkspacePackageDiscoverer.js';
import { WorkspacePackage } from '#application/workspace/model/WorkspacePackage.js';
import fastGlob from 'fast-glob';
import { minimatch } from 'minimatch';
import { readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

import type { PackagePolicySelector } from '#infrastructure/workspace/PackagePolicySelector.js';
import { WorkspacePackageDiscoveryError } from '#infrastructure/workspace/WorkspacePackageDiscoveryError.js';

/**
 * Discovers package manifests under a workspace and applies explicit Atlas inclusion policies.
 */
export class NodeWorkspacePackageDiscoverer implements WorkspacePackageDiscovererPort {
  /**
   * Creates a discoverer with a focused policy-selection collaborator.
   *
   * @param policySelector - Selects exactly one package policy for each discovered manifest.
   */
  public constructor(private readonly policySelector: PackagePolicySelector) {}

  /**
   * Discovers, validates, and classifies selected workspace packages.
   *
   * @param workspaceRootPath - Absolute workspace root path. Must name an existing directory.
   * @param configuration - Validated Atlas discovery configuration.
   * @returns Packages sorted by normalized workspace-relative root path.
   */
  public async discover(
    workspaceRootPath: string,
    configuration: AtlasConfiguration
  ): Promise<readonly WorkspacePackage[]> {
    const realWorkspaceRootPath = await this.resolveDirectory(workspaceRootPath, 'workspace root');
    const candidateRoots = await this.findCandidateRoots(
      realWorkspaceRootPath,
      configuration.discovery.packageGlobs
    );
    const packages = await Promise.all(
      candidateRoots.map((candidateRootPath) =>
        this.readPackage(candidateRootPath, realWorkspaceRootPath, configuration)
      )
    );
    const selectedPackages = packages.filter(
      (candidate): candidate is WorkspacePackage => candidate !== undefined
    );

    if (selectedPackages.length === 0) {
      throw new WorkspacePackageDiscoveryError(
        'No package manifests matched the configured discovery policy.'
      );
    }

    this.assertUniquePackageNames(selectedPackages);
    return selectedPackages.sort((left, right) =>
      left.relativeRootPath.localeCompare(right.relativeRootPath)
    );
  }

  /**
   * Resolves configured package-directory patterns into canonical real directory paths.
   *
   * @param workspaceRootPath - Canonical workspace root directory path.
   * @param packageGlobs - Optional workspace-relative package directory patterns.
   * @returns Unique sorted candidate package directory paths.
   */
  private async findCandidateRoots(
    workspaceRootPath: string,
    packageGlobs: readonly string[] | undefined
  ): Promise<readonly string[]> {
    if (packageGlobs === undefined) {
      return [workspaceRootPath];
    }

    const matches = await fastGlob(
      packageGlobs.map((glob) => this.normalizeGlob(glob)),
      {
        cwd: workspaceRootPath,
        onlyDirectories: true,
        absolute: true,
        followSymbolicLinks: false,
        ignore: ['**/node_modules/**']
      }
    );
    const resolvedMatches = await Promise.all(
      matches.map((match) => this.resolveDirectory(match, 'configured package directory'))
    );

    return [...new Set(resolvedMatches)].sort((left, right) => left.localeCompare(right));
  }

  /**
   * Reads, classifies, and resolves settings for one candidate package directory.
   *
   * @param packageRootPath - Canonical candidate package root directory.
   * @param workspaceRootPath - Canonical workspace root directory.
   * @param configuration - Validated Atlas configuration.
   * @returns Classified package or undefined when the candidate is excluded or has no manifest.
   */
  private async readPackage(
    packageRootPath: string,
    workspaceRootPath: string,
    configuration: AtlasConfiguration
  ): Promise<WorkspacePackage | undefined> {
    const relativeRootPath = this.toRelativePath(workspaceRootPath, packageRootPath);

    if (this.isExcluded(relativeRootPath, configuration.discovery.excludePackageGlobs)) {
      return undefined;
    }

    const manifest = await this.readManifest(packageRootPath);

    if (manifest === undefined) {
      return undefined;
    }

    const policy = this.policySelector.select(
      configuration.discovery,
      manifest.name,
      relativeRootPath
    );
    const sourceRootPaths = await this.resolveSourceRoots(
      packageRootPath,
      policy,
      configuration.discovery.defaultSourceRoots
    );
    const tsconfigPath = await this.resolveTsconfigPath(packageRootPath, policy.tsconfig);

    return new WorkspacePackage(
      manifest.name,
      packageRootPath,
      relativeRootPath,
      sourceRootPaths,
      policy.classification,
      [...(policy.classes ?? [])].sort((left, right) => left.localeCompare(right)),
      tsconfigPath
    );
  }

  /**
   * Reads the minimum package-manifest data Atlas requires from one package root.
   *
   * @param packageRootPath - Canonical package directory path.
   * @returns Package name when a valid manifest exists, otherwise undefined.
   */
  private async readManifest(
    packageRootPath: string
  ): Promise<{ readonly name: string } | undefined> {
    const manifestPath = resolve(packageRootPath, 'package.json');
    let manifestText: string;

    try {
      manifestText = await readFile(manifestPath, 'utf8');
    } catch {
      return undefined;
    }

    let manifest: unknown;

    try {
      manifest = JSON.parse(manifestText) as unknown;
    } catch {
      throw new WorkspacePackageDiscoveryError(
        `Package manifest '${manifestPath}' is not valid JSON.`
      );
    }

    if (
      typeof manifest !== 'object' ||
      manifest === null ||
      !('name' in manifest) ||
      typeof manifest.name !== 'string' ||
      manifest.name.trim().length === 0
    ) {
      throw new WorkspacePackageDiscoveryError(
        `Package manifest '${manifestPath}' must contain a non-empty string name.`
      );
    }

    return { name: manifest.name };
  }

  /**
   * Resolves configured source-root directories and rejects paths outside the package root.
   *
   * @param packageRootPath - Canonical package directory path.
   * @param policy - Selected package policy.
   * @param defaultSourceRoots - Optional default source-root paths.
   * @returns Existing canonical source-root directory paths.
   */
  private async resolveSourceRoots(
    packageRootPath: string,
    policy: AtlasPackagePolicy,
    defaultSourceRoots: readonly string[] | undefined
  ): Promise<readonly string[]> {
    const configuredRoots = policy.sourceRoots ?? defaultSourceRoots ?? ['src'];
    const sourceRoots = await Promise.all(
      configuredRoots.map(async (configuredRoot) => {
        const sourceRootPath = this.resolveContainedPath(
          packageRootPath,
          configuredRoot,
          'source root'
        );
        return this.resolveDirectory(sourceRootPath, `source root '${configuredRoot}'`);
      })
    );

    return [...new Set(sourceRoots)].sort((left, right) => left.localeCompare(right));
  }

  /**
   * Resolves an optional package TypeScript configuration file.
   *
   * @param packageRootPath - Canonical package directory path.
   * @param configuredTsconfig - Optional package-relative TypeScript configuration path.
   * @returns Canonical TypeScript configuration file path or undefined when no path was configured.
   */
  private async resolveTsconfigPath(
    packageRootPath: string,
    configuredTsconfig: string | undefined
  ): Promise<string | undefined> {
    if (configuredTsconfig === undefined) {
      return undefined;
    }

    const tsconfigPath = this.resolveContainedPath(packageRootPath, configuredTsconfig, 'tsconfig');

    try {
      const tsconfigStat = await stat(tsconfigPath);
      if (!tsconfigStat.isFile()) {
        throw new WorkspacePackageDiscoveryError(
          `Configured tsconfig '${configuredTsconfig}' is not a file.`
        );
      }
      return await realpath(tsconfigPath);
    } catch (error: unknown) {
      if (error instanceof WorkspacePackageDiscoveryError) {
        throw error;
      }
      throw new WorkspacePackageDiscoveryError(
        `Configured tsconfig '${configuredTsconfig}' does not exist.`
      );
    }
  }

  /**
   * Ensures a configured path remains inside its package root before filesystem access.
   *
   * @param packageRootPath - Canonical package directory path.
   * @param configuredPath - User-owned relative path.
   * @param subject - Human-readable path role for diagnostics.
   * @returns Resolved contained path.
   */
  private resolveContainedPath(
    packageRootPath: string,
    configuredPath: string,
    subject: string
  ): string {
    if (isAbsolute(configuredPath)) {
      throw new WorkspacePackageDiscoveryError(
        `Configured ${subject} '${configuredPath}' must be package-relative.`
      );
    }

    const resolvedPath = resolve(packageRootPath, configuredPath);
    const relativePath = relative(packageRootPath, resolvedPath);

    if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
      throw new WorkspacePackageDiscoveryError(
        `Configured ${subject} '${configuredPath}' escapes its package root.`
      );
    }

    return resolvedPath;
  }

  /**
   * Resolves a path to an existing canonical directory.
   *
   * @param directoryPath - Candidate directory path.
   * @param subject - Human-readable directory role for diagnostics.
   * @returns Canonical real directory path.
   */
  private async resolveDirectory(directoryPath: string, subject: string): Promise<string> {
    try {
      const directoryStat = await stat(directoryPath);
      if (!directoryStat.isDirectory()) {
        throw new WorkspacePackageDiscoveryError(
          `${subject} '${directoryPath}' is not a directory.`
        );
      }
      return await realpath(directoryPath);
    } catch (error: unknown) {
      if (error instanceof WorkspacePackageDiscoveryError) {
        throw error;
      }
      throw new WorkspacePackageDiscoveryError(`${subject} '${directoryPath}' does not exist.`);
    }
  }

  /**
   * Tests package paths against configured exclusion globs.
   *
   * @param relativeRootPath - Slash-normalized package directory path.
   * @param exclusionGlobs - Optional user-owned exclusion patterns.
   * @returns True when a configured exclusion pattern matches the package path.
   */
  private isExcluded(
    relativeRootPath: string,
    exclusionGlobs: readonly string[] | undefined
  ): boolean {
    return (exclusionGlobs ?? []).some((glob) =>
      minimatch(relativeRootPath, this.normalizeGlob(glob), { dot: true })
    );
  }

  /**
   * Converts a real package directory into a canonical workspace-relative identifier.
   *
   * @param workspaceRootPath - Canonical workspace root directory.
   * @param packageRootPath - Canonical package directory path.
   * @returns Slash-normalized workspace-relative path, using a dot for the workspace root package.
   */
  private toRelativePath(workspaceRootPath: string, packageRootPath: string): string {
    const relativePath = relative(workspaceRootPath, packageRootPath);

    if (relativePath === '') {
      return '.';
    }

    if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
      throw new WorkspacePackageDiscoveryError(
        `Package directory '${packageRootPath}' escapes the workspace root.`
      );
    }

    return this.normalizeGlob(relativePath);
  }

  /**
   * Converts a filesystem path or glob into canonical slash-separated form.
   *
   * @param value - User-owned path or glob value.
   * @returns Slash-normalized value.
   */
  private normalizeGlob(value: string): string {
    return value.replaceAll('\\', '/');
  }

  /**
   * Rejects duplicate manifest names because package scopes require stable unique names.
   *
   * @param packages - Fully discovered packages.
   */
  private assertUniquePackageNames(packages: readonly WorkspacePackage[]): void {
    const names = new Set<string>();

    for (const workspacePackage of packages) {
      if (names.has(workspacePackage.name)) {
        throw new WorkspacePackageDiscoveryError(
          `Package manifest name '${workspacePackage.name}' appears in multiple discovered directories.`
        );
      }
      names.add(workspacePackage.name);
    }
  }
}
