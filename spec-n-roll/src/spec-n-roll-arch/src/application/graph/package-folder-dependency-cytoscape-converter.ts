import { basename } from 'node:path';
import type { ArchitectureExclusionFilter } from '#arch/application/config/architecture-exclusion-filter.js';
import type { CytoscapeElement } from '#arch/application/graph/cytoscape-element.js';
import { DirectoryCytoscapeGroupBuilder } from '#arch/application/graph/directory-cytoscape-group-builder.js';
import { ExternalDependencyIdentifier } from '#arch/application/graph/external-dependency-identifier.js';
import type { WorkspacePackage } from '#arch/application/packages/workspace-package.js';

/**
 * Converts dependency-cruiser reports into scoped package folder graph elements.
 */
export class PackageFolderDependencyCytoscapeConverter {
  /**
   * Creates a package folder dependency graph converter.
   *
   * @param directoryGroupBuilder - Builder that turns package-relative file paths into nested Cytoscape groups.
   * @param externalDependencyIdentifier - Classifier for npm and Node.js core dependencies.
   */
  constructor(
    private readonly directoryGroupBuilder = new DirectoryCytoscapeGroupBuilder(),
    private readonly externalDependencyIdentifier = new ExternalDependencyIdentifier(),
  ) {}

  /**
   * Converts a dependency-cruiser report into elements for one package folder.
   *
   * @param dependencyCruiserJson - Dependency-cruiser report serialized as JSON.
   * @param workspacePackage - Package metadata for the source package to inspect.
   * @param folderPath - Package-root-relative folder path that scopes source files.
   * @param packages - Runtime package metadata used to consolidate external workspace packages.
   * @param exclusionFilter - User-configured dependency and project file exclusion filter.
   * @returns Cytoscape elements for files in the folder and consolidated external package dependencies.
   */
  convert(
    dependencyCruiserJson: string,
    workspacePackage: WorkspacePackage,
    folderPath: string,
    packages: WorkspacePackage[] = [workspacePackage],
    exclusionFilter?: ArchitectureExclusionFilter,
  ): CytoscapeElement[] {
    const report = JSON.parse(dependencyCruiserJson) as {
      modules?: Array<{
        source: string;
        dependencies?: Array<{
          module: string;
          resolved: string;
          coreModule?: boolean;
        }>;
      }>;
    };
    const normalizedFolderPath = this.normalizeFolderPath(folderPath);
    const folderNodeId = this.folderNodeId(
      workspacePackage,
      normalizedFolderPath,
    );
    const fileNodes = new Map<string, CytoscapeElement>();
    const groupNodes = new Map<string, CytoscapeElement>();
    const externalNodes = new Map<string, CytoscapeElement>();
    const edges = new Map<string, CytoscapeElement>();

    for (const module of report.modules ?? []) {
      if (
        !this.belongsToFolder(
          module.source,
          workspacePackage,
          normalizedFolderPath,
        ) ||
        this.excludesProjectFile(
          module.source,
          workspacePackage,
          exclusionFilter,
        )
      ) {
        continue;
      }

      this.addFileNode(
        fileNodes,
        groupNodes,
        module.source,
        workspacePackage,
        folderNodeId,
        normalizedFolderPath,
      );

      for (const dependency of module.dependencies ?? []) {
        const dependencyNode = this.dependencyNode(
          dependency,
          workspacePackage,
          normalizedFolderPath,
          packages,
          exclusionFilter,
        );
        if (!dependencyNode) {
          continue;
        }

        if (dependencyNode.kind === 'file') {
          this.addFileNode(
            fileNodes,
            groupNodes,
            dependencyNode.id,
            workspacePackage,
            folderNodeId,
            normalizedFolderPath,
          );
        } else {
          this.addExternalNode(
            externalNodes,
            dependencyNode.id,
            dependencyNode.label,
          );
        }

        edges.set(`${module.source}->${dependencyNode.id}`, {
          data: {
            id: `${module.source}->${dependencyNode.id}`,
            source: module.source,
            target: dependencyNode.id,
          },
        });
      }
    }

    return [
      {
        data: {
          id: folderNodeId,
          label: normalizedFolderPath,
        },
      },
      ...groupNodes.values(),
      ...fileNodes.values(),
      ...externalNodes.values(),
      ...edges.values(),
    ];
  }

  private dependencyNode(
    dependency: { module: string; resolved: string; coreModule?: boolean },
    workspacePackage: WorkspacePackage,
    folderPath: string,
    packages: WorkspacePackage[],
    exclusionFilter?: ArchitectureExclusionFilter,
  ):
    | { kind: 'file'; id: string }
    | { kind: 'external'; id: string; label: string }
    | undefined {
    const externalId = this.externalDependencyIdentifier.identify(dependency);
    if (externalId) {
      const label = this.externalDependencyIdentifier.label(externalId);
      return exclusionFilter?.excludesExternalDependency(label)
        ? undefined
        : { kind: 'external', id: externalId, label };
    }

    const dependencyPackage = this.findPackage(
      dependency,
      packages,
      workspacePackage,
    );
    if (dependencyPackage && dependencyPackage.name !== workspacePackage.name) {
      return exclusionFilter?.excludesExternalDependency(dependencyPackage.name)
        ? undefined
        : {
            kind: 'external',
            id: `external:${dependencyPackage.name}`,
            label: dependencyPackage.name,
          };
    }

    if (!this.belongsToPackage(dependency.resolved, workspacePackage)) {
      const packageName = this.externalPackageName(
        dependency,
        workspacePackage,
      );
      return packageName &&
        !exclusionFilter?.excludesExternalDependency(packageName)
        ? {
            kind: 'external',
            id: `external:${packageName}`,
            label: packageName,
          }
        : undefined;
    }

    if (
      this.excludesProjectFile(
        dependency.resolved,
        workspacePackage,
        exclusionFilter,
      )
    ) {
      return undefined;
    }

    return this.belongsToFolder(
      dependency.resolved,
      workspacePackage,
      folderPath,
    )
      ? { kind: 'file', id: dependency.resolved }
      : {
          kind: 'external',
          id: `external:${workspacePackage.name}:${this.topLevelPackagePath(dependency.resolved, workspacePackage)}`,
          label: this.topLevelPackagePath(
            dependency.resolved,
            workspacePackage,
          ),
        };
  }

  private addFileNode(
    fileNodes: Map<string, CytoscapeElement>,
    groupNodes: Map<string, CytoscapeElement>,
    filePath: string,
    workspacePackage: WorkspacePackage,
    folderNodeId: string,
    folderPath: string,
  ): void {
    if (fileNodes.has(filePath)) {
      return;
    }

    const grouping = this.directoryGroupBuilder.build(
      filePath,
      this.scopedFolderRelativePath(filePath, workspacePackage, folderPath),
      folderNodeId,
    );
    for (const group of grouping.groups) {
      groupNodes.set(group.data.id, group);
    }

    fileNodes.set(filePath, {
      data: {
        id: filePath,
        label: grouping.fileLabel,
        parent: grouping.parentId ?? folderNodeId,
      },
    });
  }

  private addExternalNode(
    externalNodes: Map<string, CytoscapeElement>,
    id: string,
    label: string,
  ): void {
    if (externalNodes.has(id)) {
      return;
    }

    externalNodes.set(id, {
      data: {
        id,
        label,
        externalDependency: 'true',
      },
    });
  }

  private excludesProjectFile(
    filePath: string,
    workspacePackage: WorkspacePackage,
    exclusionFilter?: ArchitectureExclusionFilter,
  ): boolean {
    return (
      exclusionFilter?.excludesProjectFile(
        workspacePackage.name,
        this.packageRelativePath(filePath, workspacePackage),
      ) ?? false
    );
  }

  private belongsToFolder(
    filePath: string,
    workspacePackage: WorkspacePackage,
    folderPath: string,
  ): boolean {
    const packageRelativePath = this.packageRelativePath(
      filePath,
      workspacePackage,
    );

    return (
      packageRelativePath === folderPath ||
      packageRelativePath.startsWith(`${folderPath}/`)
    );
  }

  private belongsToPackage(
    filePath: string,
    workspacePackage: WorkspacePackage,
  ): boolean {
    const normalizedFilePath = this.normalizePath(filePath);
    const packageRoot = this.packageRelativeRoot(workspacePackage);

    return (
      normalizedFilePath === packageRoot ||
      normalizedFilePath.startsWith(`${packageRoot}/`)
    );
  }

  private packageRelativePath(
    filePath: string,
    workspacePackage: WorkspacePackage,
  ): string {
    const normalizedFilePath = this.normalizePath(filePath);
    const packageRootPrefix = `${this.packageRelativeRoot(workspacePackage)}/`;

    return normalizedFilePath.startsWith(packageRootPrefix)
      ? normalizedFilePath.slice(packageRootPrefix.length)
      : normalizedFilePath;
  }

  private folderRelativePath(
    filePath: string,
    workspacePackage: WorkspacePackage,
  ): string {
    return this.packageRelativePath(filePath, workspacePackage).replace(
      /^src\//u,
      '',
    );
  }

  private scopedFolderRelativePath(
    filePath: string,
    workspacePackage: WorkspacePackage,
    folderPath: string,
  ): string {
    const packageRelativePath = this.packageRelativePath(
      filePath,
      workspacePackage,
    );
    const folderPrefix = `${folderPath}/`;

    return packageRelativePath.startsWith(folderPrefix)
      ? packageRelativePath.slice(folderPrefix.length)
      : this.folderRelativePath(filePath, workspacePackage);
  }

  private topLevelPackagePath(
    filePath: string,
    workspacePackage: WorkspacePackage,
  ): string {
    return (
      this.folderRelativePath(filePath, workspacePackage).split('/')[0] ??
      'package'
    );
  }

  private findPackage(
    dependency: { module: string; resolved: string },
    packages: WorkspacePackage[],
    fallbackPackage: WorkspacePackage,
  ): WorkspacePackage | undefined {
    return (
      packages.find(
        (workspacePackage) =>
          dependency.module === workspacePackage.name ||
          dependency.resolved === workspacePackage.name ||
          this.belongsToPackage(dependency.resolved, workspacePackage),
      ) ??
      (this.belongsToPackage(dependency.resolved, fallbackPackage)
        ? fallbackPackage
        : undefined)
    );
  }

  private externalPackageName(
    dependency: { module: string; resolved: string },
    workspacePackage: WorkspacePackage,
  ): string | undefined {
    if (workspacePackage.dependencies[dependency.module]) {
      return dependency.module;
    }

    return Object.keys(workspacePackage.dependencies).find(
      (packageName) =>
        dependency.resolved === packageName ||
        dependency.resolved.startsWith(`${packageName}/`),
    );
  }

  private folderNodeId(
    workspacePackage: WorkspacePackage,
    folderPath: string,
  ): string {
    return `folder:${workspacePackage.name}:${folderPath}`;
  }

  private normalizeFolderPath(folderPath: string): string {
    return folderPath
      .replaceAll('\\', '/')
      .replace(/^\.\//u, '')
      .replace(/\/$/u, '');
  }

  private packageRelativeRoot(workspacePackage: WorkspacePackage): string {
    const normalizedPackageRoot = this.normalizePath(workspacePackage.root);
    const packageDirectory = basename(normalizedPackageRoot);

    return `src/${packageDirectory}`;
  }

  private normalizePath(filePath: string): string {
    return filePath.replaceAll('\\', '/').replace(/^\.\//u, '');
  }
}
