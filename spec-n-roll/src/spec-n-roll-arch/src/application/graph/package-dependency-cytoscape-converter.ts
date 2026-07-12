import type { ArchitectureExclusionFilter } from '#arch/application/config/architecture-exclusion-filter.js';
import type { ArchitectureLandscapeDependencySplitter } from '#arch/application/config/architecture-landscape-dependency-splitter.js';
import type { CytoscapeElement } from '#arch/application/graph/cytoscape-element.js';
import { DirectoryCytoscapeGroupBuilder } from '#arch/application/graph/directory-cytoscape-group-builder.js';
import { DisconnectedCytoscapeElementPruner } from '#arch/application/graph/disconnected-cytoscape-element-pruner.js';
import { ExternalDependencyIdentifier } from '#arch/application/graph/external-dependency-identifier.js';
import { PackageImportSymbolReader } from '#arch/application/graph/package-import-symbol-reader.js';
import type { PackagePublicApiExportIndex } from '#arch/application/graph/package-public-api-export-index.js';
import type { WorkspacePackage } from '#arch/application/packages/workspace-package.js';

/**
 * Converts workspace package dependency reports into a project-level Cytoscape graph.
 */
export class PackageDependencyCytoscapeConverter {
  /**
   * Creates a project dependency graph converter.
   *
   * @param importSymbolReader - Reader that maps package imports to requested public symbols.
   * @param directoryGroupBuilder - Builder that turns package-relative file paths into nested Cytoscape groups.
   * @param externalDependencyIdentifier - Classifier for npm and Node.js core dependencies.
   * @param disconnectedElementPruner - Pruner that removes nodes disconnected by project filtering.
   */
  constructor(
    private readonly importSymbolReader = new PackageImportSymbolReader(),
    private readonly directoryGroupBuilder = new DirectoryCytoscapeGroupBuilder(),
    private readonly externalDependencyIdentifier = new ExternalDependencyIdentifier(),
    private readonly disconnectedElementPruner = new DisconnectedCytoscapeElementPruner(),
  ) {}

  /**
   * Converts workspace package dependency metadata into grouped Cytoscape graph elements.
   *
   * @param packages - Runtime package metadata to include as project-level groups.
   * @param packageReports - Dependency-cruiser reports keyed by package name.
   * @param exclusionFilter - User-configured project file exclusion filter.
   * @param sourceTexts - TypeScript source text keyed by dependency-cruiser source path.
   * @param publicApiExportIndex - Index of package public exports to their backing files.
   * @param dependencySplitter - User-configured landscape external dependency node splitter.
   * @returns Cytoscape parent package nodes, cross-package file nodes, and cross-package dependency edges.
   */
  convert(
    packages: WorkspacePackage[],
    packageReports: ReadonlyMap<string, string>,
    exclusionFilter?: ArchitectureExclusionFilter,
    sourceTexts?: ReadonlyMap<string, string>,
    publicApiExportIndex?: PackagePublicApiExportIndex,
    dependencySplitter?: ArchitectureLandscapeDependencySplitter,
  ): CytoscapeElement[] {
    const packagePaths = this.packagePaths(packages);
    const packageLookup = new Map(
      packagePaths.flatMap((packagePath) => [
        [packagePath.root, packagePath.name],
        [packagePath.relativeRoot, packagePath.name],
      ]),
    );
    const packageEntryPoints = new Map(
      packagePaths.map((packagePath) => [
        packagePath.name,
        packagePath.entryPoint,
      ]),
    );
    const packageRelativeRoots = new Map(
      packagePaths.map((packagePath) => [
        packagePath.name,
        packagePath.relativeRoot,
      ]),
    );
    const packageNodes: CytoscapeElement[] = packages.map(
      (workspacePackage) => ({
        data: {
          id: workspacePackage.name,
          label: workspacePackage.name,
          workspaceDependency: 'true',
        },
      }),
    );
    const fileNodes = new Map<string, CytoscapeElement>();
    const externalNodes = new Map<string, CytoscapeElement>();
    const groupNodes = new Map<string, CytoscapeElement>();
    const edges = new Map<string, CytoscapeElement>();

    for (const reportJson of packageReports.values()) {
      const report = JSON.parse(reportJson) as {
        modules?: Array<{
          source: string;
          dependencies?: Array<{
            module: string;
            resolved: string;
            coreModule?: boolean;
          }>;
        }>;
      };

      for (const module of report.modules ?? []) {
        const sourcePackage = this.findPackageName(
          module.source,
          packageLookup,
        );
        if (
          !sourcePackage ||
          this.excludesProjectNode(
            sourcePackage,
            module.source,
            packageRelativeRoots,
            exclusionFilter,
          )
        ) {
          continue;
        }

        for (const dependency of module.dependencies ?? []) {
          let hasWorkspaceDependency = false;

          for (const dependencyPath of this.resolveDependencyPaths(
            module.source,
            dependency,
            packageEntryPoints,
            sourceTexts,
            publicApiExportIndex,
          )) {
            const dependencyPackage = this.findPackageName(
              dependencyPath,
              packageLookup,
            );
            if (
              !dependencyPackage ||
              dependencyPackage === sourcePackage ||
              this.excludesProjectNode(
                dependencyPackage,
                dependencyPath,
                packageRelativeRoots,
                exclusionFilter,
              )
            ) {
              continue;
            }

            hasWorkspaceDependency = true;
            this.addFileNode(
              fileNodes,
              groupNodes,
              module.source,
              sourcePackage,
            );
            this.addFileNode(
              fileNodes,
              groupNodes,
              dependencyPath,
              dependencyPackage,
            );
            edges.set(`${module.source}->${dependencyPath}`, {
              data: {
                id: `${module.source}->${dependencyPath}`,
                source: module.source,
                target: dependencyPath,
              },
            });
          }

          if (hasWorkspaceDependency) {
            continue;
          }

          const externalId =
            this.externalDependencyIdentifier.identify(dependency);
          if (!externalId) {
            continue;
          }

          if (
            exclusionFilter?.excludesLandscapeDependency(
              this.externalDependencyIdentifier.label(externalId),
            )
          ) {
            continue;
          }

          this.addFileNode(fileNodes, groupNodes, module.source, sourcePackage);
          const externalNodeId =
            dependencySplitter?.nodeId(
              this.externalDependencyIdentifier.label(externalId),
              sourcePackage,
            ) ?? externalId;
          this.addExternalNode(
            externalNodes,
            externalNodeId,
            externalId,
            externalNodeId === externalId ? undefined : sourcePackage,
          );
          edges.set(`${module.source}->${externalNodeId}`, {
            data: {
              id: `${module.source}->${externalNodeId}`,
              source: module.source,
              target: externalNodeId,
            },
          });
        }
      }
    }

    return this.disconnectedElementPruner.prune(
      packageNodes.concat(
        [...groupNodes.values()],
        [...fileNodes.values()],
        [...externalNodes.values()],
        [...edges.values()],
      ),
    );
  }

  private packagePaths(packages: WorkspacePackage[]): Array<{
    name: string;
    root: string;
    relativeRoot: string;
    entryPoint: string;
  }> {
    return packages.map((workspacePackage) => {
      const packageRoot = this.normalizePath(workspacePackage.root);
      const packageDirectory =
        packageRoot.split('/').at(-1) ?? workspacePackage.name;
      const relativeRoot = `src/${packageDirectory}`;

      return {
        name: workspacePackage.name,
        root: packageRoot,
        relativeRoot,
        entryPoint: `${relativeRoot}/src/index.ts`,
      };
    });
  }

  private resolveDependencyPaths(
    sourcePath: string,
    dependency: { module: string; resolved: string },
    packageEntryPoints: ReadonlyMap<string, string>,
    sourceTexts?: ReadonlyMap<string, string>,
    publicApiExportIndex?: PackagePublicApiExportIndex,
  ): string[] {
    const packageName = this.packageDependencyName(
      dependency,
      packageEntryPoints,
    );
    if (!packageName || !sourceTexts || !publicApiExportIndex) {
      return [this.resolveDependencyPath(dependency, packageEntryPoints)];
    }

    const sourceText = sourceTexts.get(sourcePath);
    if (!sourceText) {
      return [this.resolveDependencyPath(dependency, packageEntryPoints)];
    }

    const exportNames = this.importSymbolReader.read(
      sourcePath,
      sourceText,
      packageName,
    );
    if (!exportNames) {
      return [this.resolveDependencyPath(dependency, packageEntryPoints)];
    }

    const resolvedPaths = exportNames.map((exportName) =>
      publicApiExportIndex.resolve(packageName, exportName),
    );

    if (resolvedPaths.some((resolvedPath) => resolvedPath == null)) {
      return [this.resolveDependencyPath(dependency, packageEntryPoints)];
    }

    return [...new Set(resolvedPaths.filter((path) => path != null))];
  }

  private packageDependencyName(
    dependency: { module: string; resolved: string },
    packageEntryPoints: ReadonlyMap<string, string>,
  ): string | undefined {
    if (packageEntryPoints.has(dependency.resolved)) {
      return dependency.resolved;
    }

    if (packageEntryPoints.has(dependency.module)) {
      return dependency.module;
    }

    return undefined;
  }

  private resolveDependencyPath(
    dependency: { module: string; resolved: string },
    packageEntryPoints: ReadonlyMap<string, string>,
  ): string {
    return (
      packageEntryPoints.get(dependency.resolved) ??
      packageEntryPoints.get(dependency.module) ??
      dependency.resolved
    );
  }

  private excludesProjectNode(
    packageName: string,
    filePath: string,
    packageRelativeRoots: ReadonlyMap<string, string>,
    exclusionFilter?: ArchitectureExclusionFilter,
  ): boolean {
    return (
      exclusionFilter?.excludesProjectNode(
        packageName,
        this.nodeName(filePath, packageRelativeRoots.get(packageName) ?? ''),
      ) ?? false
    );
  }

  private nodeName(filePath: string, packageRoot: string): string {
    const normalizedFilePath = this.normalizePath(filePath);
    const rootPrefix = `${packageRoot}/`;

    const packageRelativePath = normalizedFilePath.startsWith(rootPrefix)
      ? normalizedFilePath.slice(rootPrefix.length)
      : normalizedFilePath;
    return packageRelativePath.replace(/^src\//u, '').replace(/\.[^./]+$/u, '');
  }

  private addFileNode(
    fileNodes: Map<string, CytoscapeElement>,
    groupNodes: Map<string, CytoscapeElement>,
    filePath: string,
    packageName: string,
  ): void {
    if (fileNodes.has(filePath)) {
      return;
    }

    const grouping = this.directoryGroupBuilder.build(
      filePath,
      this.sourceRelativePath(filePath),
      packageName,
    );
    for (const group of grouping.groups) {
      groupNodes.set(group.data.id, group);
    }

    fileNodes.set(filePath, {
      data: {
        id: filePath,
        label: grouping.fileLabel,
        parent: grouping.parentId ?? packageName,
      },
    });
  }

  private addExternalNode(
    externalNodes: Map<string, CytoscapeElement>,
    externalNodeId: string,
    externalId: string,
    splitSourcePackage?: string,
  ): void {
    if (externalNodes.has(externalNodeId)) {
      return;
    }

    externalNodes.set(externalNodeId, {
      data: {
        id: externalNodeId,
        label: this.externalDependencyIdentifier.label(externalId),
        externalDependency: 'true',
        ...(splitSourcePackage
          ? { splitExternalDependency: 'true', splitSourcePackage }
          : {}),
      },
    });
  }

  private sourceRelativePath(filePath: string): string {
    const packageSourceRootMatch = /(?:^|\/)src\/[^/]+\/src\/(.+)$/u.exec(
      this.normalizePath(filePath),
    );

    return packageSourceRootMatch?.[1] ?? filePath;
  }

  private findPackageName(
    filePath: string,
    packageLookup: ReadonlyMap<string, string>,
  ): string | undefined {
    const normalizedFilePath = this.normalizePath(filePath);

    for (const [packageRoot, packageName] of packageLookup.entries()) {
      if (
        normalizedFilePath === packageRoot ||
        normalizedFilePath.startsWith(`${packageRoot}/`) ||
        normalizedFilePath.includes(`/${packageRoot}/`)
      ) {
        return packageName;
      }
    }

    return undefined;
  }

  private normalizePath(filePath: string): string {
    return filePath.replaceAll('\\', '/').replace(/^\.\//u, '');
  }
}
