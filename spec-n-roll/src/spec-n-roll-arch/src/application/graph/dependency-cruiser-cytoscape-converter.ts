import { basename } from 'node:path';
import type { ArchitectureExclusionFilter } from '#arch/application/config/architecture-exclusion-filter.js';
import type { CytoscapeElement } from '#arch/application/graph/cytoscape-element.js';
import { DirectoryCytoscapeGroupBuilder } from '#arch/application/graph/directory-cytoscape-group-builder.js';
import { ExternalDependencyIdentifier } from '#arch/application/graph/external-dependency-identifier.js';
import type { WorkspacePackage } from '#arch/application/packages/workspace-package.js';

/**
 * Describes optional dependency-cruiser conversion settings.
 */
export interface DependencyCruiserCytoscapeConversionOptions {
  /**
   * Parent graph node used to contain package file and directory nodes.
   */
  rootParentId?: string;

  /**
   * Display label for the root parent node when one is configured.
   */
  rootParentLabel?: string;
}

/**
 * Converts dependency-cruiser reports into Cytoscape graph elements.
 */
export class DependencyCruiserCytoscapeConverter {
  /**
   * Creates a dependency-cruiser graph converter.
   *
   * @param directoryGroupBuilder - Builder that turns package-relative file paths into nested Cytoscape groups.
   * @param externalDependencyIdentifier - Classifier for npm and Node.js core dependencies.
   */
  constructor(
    private readonly directoryGroupBuilder = new DirectoryCytoscapeGroupBuilder(),
    private readonly externalDependencyIdentifier = new ExternalDependencyIdentifier(),
  ) {}

  /**
   * Converts a dependency-cruiser report into Cytoscape graph elements.
   *
   * @param dependencyCruiserJson - Dependency-cruiser report serialized as JSON.
   * @param workspacePackage - Package metadata used to apply package-specific file exclusions.
   * @param exclusionFilter - User-configured dependency and project file exclusion filter.
   * @param options - Optional graph conversion settings.
   * @returns Cytoscape node and edge elements derived from the report.
   */
  convert(
    dependencyCruiserJson: string,
    workspacePackage?: WorkspacePackage,
    exclusionFilter?: ArchitectureExclusionFilter,
    options: DependencyCruiserCytoscapeConversionOptions = {},
  ): CytoscapeElement[] {
    const report = JSON.parse(dependencyCruiserJson) as {
      modules?: Array<{
        source: string;
        coreModule?: boolean;
        dependencies?: Array<{
          module: string;
          resolved: string;
          coreModule?: boolean;
        }>;
      }>;
    };
    const nodeIds = new Set<string>();
    const externalNodeIds = new Set<string>();
    const edges = new Map<string, CytoscapeElement>();

    for (const module of report.modules ?? []) {
      const sourceId = this.normalizeDependencyId({
        module: module.source,
        resolved: module.source,
        coreModule: module.coreModule,
      });
      if (
        this.externalDependencyIdentifier.isExternalDependency(
          sourceId,
          module.coreModule,
        )
      ) {
        externalNodeIds.add(sourceId);
        continue;
      }
      if (
        this.excludesProjectFile(sourceId, workspacePackage, exclusionFilter)
      ) {
        continue;
      }

      nodeIds.add(sourceId);

      for (const dependency of module.dependencies ?? []) {
        const dependencyId = this.normalizeDependencyId(dependency);
        if (
          this.excludesDependency(
            dependencyId,
            dependency.coreModule,
            workspacePackage,
            exclusionFilter,
          )
        ) {
          continue;
        }

        nodeIds.add(dependencyId);
        if (
          this.externalDependencyIdentifier.isExternalDependency(
            dependencyId,
            dependency.coreModule,
          )
        ) {
          externalNodeIds.add(dependencyId);
        }
        edges.set(`${sourceId}->${dependencyId}`, {
          data: {
            id: `${sourceId}->${dependencyId}`,
            source: sourceId,
            target: dependencyId,
          },
        });
      }
    }

    const groupNodes = new Map<string, CytoscapeElement>();
    const nodes: CytoscapeElement[] = [...nodeIds].map((id) => {
      const data: Record<string, string> = {
        id,
        label: this.nodeLabel(id),
      };

      if (externalNodeIds.has(id)) {
        data.externalDependency = 'true';
        return { data };
      }

      const grouping = this.directoryGroupBuilder.build(
        id,
        data.label,
        options.rootParentId,
      );
      for (const group of grouping.groups) {
        groupNodes.set(group.data.id, group);
      }

      data.label = grouping.fileLabel;
      data.parent = grouping.parentId ?? options.rootParentId ?? '';
      if (!data.parent) {
        delete data.parent;
      }

      return { data };
    });

    return this.rootNode(options).concat([...groupNodes.values()], nodes, [
      ...edges.values(),
    ]);
  }

  private rootNode(
    options: DependencyCruiserCytoscapeConversionOptions,
  ): CytoscapeElement[] {
    if (!options.rootParentId) {
      return [];
    }

    return [
      {
        data: {
          id: options.rootParentId,
          label: options.rootParentLabel ?? options.rootParentId,
          workspaceDependency: 'true',
        },
      },
    ];
  }

  private excludesDependency(
    dependencyId: string,
    coreModule = false,
    workspacePackage?: WorkspacePackage,
    exclusionFilter?: ArchitectureExclusionFilter,
  ): boolean {
    if (
      this.externalDependencyIdentifier.isExternalDependency(
        dependencyId,
        coreModule,
      )
    ) {
      return (
        exclusionFilter?.excludesExternalDependency(
          this.externalDependencyIdentifier.label(dependencyId),
        ) ?? false
      );
    }

    return this.excludesProjectFile(
      dependencyId,
      workspacePackage,
      exclusionFilter,
    );
  }

  private excludesProjectFile(
    filePath: string,
    workspacePackage?: WorkspacePackage,
    exclusionFilter?: ArchitectureExclusionFilter,
  ): boolean {
    if (!workspacePackage || !exclusionFilter) {
      return false;
    }

    return exclusionFilter.excludesProjectFile(
      workspacePackage.name,
      this.packageRelativePath(filePath, workspacePackage),
    );
  }

  private packageRelativePath(
    filePath: string,
    workspacePackage: WorkspacePackage,
  ): string {
    const normalizedFilePath = filePath.replaceAll('\\', '/');
    const packageDirectory = basename(
      workspacePackage.root.replaceAll('\\', '/'),
    );
    const relativeRoot = `src/${packageDirectory}/`;

    return normalizedFilePath.startsWith(relativeRoot)
      ? normalizedFilePath.slice(relativeRoot.length)
      : normalizedFilePath;
  }

  private normalizeDependencyId(dependency: {
    module: string;
    resolved: string;
    coreModule?: boolean;
  }): string {
    return (
      this.externalDependencyIdentifier.identify(dependency) ??
      dependency.resolved
    );
  }

  private nodeLabel(id: string): string {
    if (id.startsWith('external:')) {
      return this.externalDependencyIdentifier.label(id);
    }

    const packageSourceRootMatch = /(?:^|\/)src\/[^/]+\/src\/(.+)$/u.exec(id);
    return packageSourceRootMatch?.[1] ?? id;
  }
}
