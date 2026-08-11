import type {
  AtlasDeclarationKind,
  AtlasElement,
  AtlasModuleModel,
  AtlasRelationship,
  AtlasRelationshipTarget
} from '#application/federation/model/AtlasModuleModel.js';
import type { AtlasWorkspaceManifest } from '#application/federation/model/AtlasWorkspaceManifest.js';
import type { AtlasModelGenerator } from '#application/federation/ports/AtlasModelGenerator.js';
import type { DeclarationGraphBuilder } from '#application/graph/ports/DeclarationGraphBuilder.js';
import {
  DeclarationNode,
  type DeclarationRelationship
} from '#application/graph/model/DeclarationGraph.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

/**
 * Generates one deterministic language-neutral model per selected npm package and one manifest.
 */
export class TypeScriptWorkspaceModelGenerator implements AtlasModelGenerator {
  /**
   * Creates the generator from the existing TypeScript semantic graph boundary.
   *
   * @param graphBuilder - Builds language-specific facts before they are mapped to common model concepts.
   */
  public constructor(private readonly graphBuilder: DeclarationGraphBuilder) {}

  /**
   * Generates package model files and a manifest below the supplied model directory.
   *
   * @param workspace - Selected npm workspace packages and paths.
   * @param modelDirectoryPath - Output directory for package models and the workspace manifest.
   * @returns Absolute path of the generated workspace manifest.
   */
  public async generate(workspace: WorkspaceSnapshot, modelDirectoryPath: string): Promise<string> {
    const outputPath = resolve(modelDirectoryPath);
    await mkdir(outputPath, { recursive: true });
    const graph = await this.graphBuilder.build(workspace);
    const moduleRoots = new Map(
      workspace.packages.map((workspacePackage) => [
        workspacePackage.name,
        workspacePackage.relativeRootPath
      ])
    );
    const models = await Promise.all(
      workspace.packages.map(async (workspacePackage) => {
        const model = await this.toModel(
          workspacePackage.name,
          workspacePackage.rootPath,
          workspacePackage.relativeRootPath,
          moduleRoots,
          graph.nodes,
          graph.relationships
        );
        const modelPath = resolve(
          outputPath,
          `${this.toFileName(workspacePackage.name)}.atlas-module.json`
        );
        await this.writeJson(modelPath, model);
        return {
          moduleId: model.module.id,
          modelPath: relative(outputPath, modelPath).replaceAll('\\', '/')
        };
      })
    );
    const manifest: AtlasWorkspaceManifest = {
      schemaVersion: 1,
      modules: models.sort((left, right) => left.moduleId.localeCompare(right.moduleId))
    };
    const manifestPath = resolve(outputPath, 'atlas-workspace.json');
    await this.writeJson(manifestPath, manifest);
    return manifestPath;
  }

  /** Maps one selected package's graph ownership into a standalone portable module model. */
  private async toModel(
    packageName: string,
    packageRootPath: string,
    packageRelativeRootPath: string,
    moduleRoots: ReadonlyMap<string, string>,
    nodes: readonly DeclarationNode[],
    relationships: readonly DeclarationRelationship[]
  ): Promise<AtlasModuleModel> {
    const manifest = await this.readPackageManifest(packageRootPath);
    const ownedNodes = nodes
      .filter((node) => node.packageName === packageName)
      .map((node) => this.toModuleLocalNode(node, packageRelativeRootPath));
    const elementsByPath = this.toSourceUnitElements(packageName, ownedNodes);
    const elementByNodeId = this.toNodeElements(packageName, ownedNodes, elementsByPath);
    const elements = [
      ...new Map(
        [...elementsByPath.values(), ...elementByNodeId.values()].map((element) => [
          element.id,
          element
        ])
      ).values()
    ].sort((left, right) => left.id.localeCompare(right.id));
    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    return {
      schemaVersion: 1,
      generatorVersion: 'typescript-1',
      module: {
        id: packageName,
        displayName: packageName,
        version: manifest.version,
        category: 'npm-package'
      },
      sourceLanguage: 'typescript',
      elements,
      relationships: [
        ...new Map(
          relationships
            .filter((relationship) => elementByNodeId.has(relationship.sourceId))
            .map((relationship) =>
              this.toRelationship(relationship, elementByNodeId, nodesById, moduleRoots)
            )
            .map((relationship) => [relationship.id, relationship])
        ).values()
      ].sort((left, right) => left.id.localeCompare(right.id))
    };
  }

  /** Creates one owned source-unit parent for every workspace-relative source file. */
  private toSourceUnitElements(
    moduleId: string,
    nodes: readonly DeclarationNode[]
  ): ReadonlyMap<string, AtlasElement> {
    return new Map(
      [
        ...new Set(
          nodes.map((node) => node.sourcePath).filter((path): path is string => path !== undefined)
        )
      ]
        .sort((left, right) => left.localeCompare(right))
        .map((sourcePath) => [sourcePath, this.toSourceUnitElement(moduleId, sourcePath)])
    );
  }

  /** Maps graph node ownership to either its source unit or a declaration nested under that unit. */
  private toNodeElements(
    moduleId: string,
    nodes: readonly DeclarationNode[],
    elementsByPath: ReadonlyMap<string, AtlasElement>
  ): ReadonlyMap<string, AtlasElement> {
    return new Map(
      nodes.map((node) => {
        const sourceUnit =
          node.sourcePath === undefined ? undefined : elementsByPath.get(node.sourcePath);
        const element =
          node.moduleNode || node.kind === 'module'
            ? (sourceUnit ?? this.toElement(moduleId, node, undefined))
            : this.toElement(moduleId, node, sourceUnit?.id);
        return [node.id, element];
      })
    );
  }

  /** Creates a stable source-unit parent element for one normalized workspace-relative file path. */
  private toSourceUnitElement(moduleId: string, sourcePath: string): AtlasElement {
    return {
      id: `element:${encodeURIComponent(moduleId)}:${encodeURIComponent(sourcePath)}:source-unit`,
      name: sourcePath,
      qualifiedName: sourcePath,
      kind: 'source-unit',
      sourcePath
    };
  }

  /** Creates one stable common declaration representation from a compiler-neutral graph node. */
  private toElement(
    moduleId: string,
    node: DeclarationNode,
    parentId: string | undefined
  ): AtlasElement {
    const qualifiedName =
      node.sourcePath === undefined ? node.label : `${node.sourcePath}:${node.label}`;
    const kind: AtlasDeclarationKind =
      node.moduleNode || node.kind === 'module' || node.kind === 'external'
        ? 'source-unit'
        : node.kind;
    const element = {
      id: `element:${encodeURIComponent(moduleId)}:${encodeURIComponent(qualifiedName)}:${kind}`,
      name: node.label,
      qualifiedName,
      kind
    };
    if (node.sourcePath === undefined) return element;
    return parentId === undefined
      ? { ...element, sourcePath: node.sourcePath }
      : { ...element, sourcePath: node.sourcePath, parentId };
  }

  /** Maps a graph edge into a local target or a stable external artifact target. */
  private toRelationship(
    relationship: DeclarationRelationship,
    elementByNodeId: ReadonlyMap<string, AtlasElement>,
    nodesById: ReadonlyMap<string, DeclarationNode>,
    moduleRoots: ReadonlyMap<string, string>
  ): AtlasRelationship {
    const sourceElement = elementByNodeId.get(relationship.sourceId);
    if (sourceElement === undefined)
      throw new Error(
        `Atlas cannot serialize relationship '${relationship.id}' without an owned source.`
      );
    const localTarget = elementByNodeId.get(relationship.targetId);
    const targetNode = nodesById.get(relationship.targetId);
    const target = this.toTarget(localTarget, targetNode, relationship.targetId, moduleRoots);
    const kind = relationship.type === 'inheritance' ? 'inherits' : 'references';
    return {
      id: `relationship:${encodeURIComponent(sourceElement.id)}>${this.toTargetIdentity(target)}:${kind}`,
      sourceElementId: sourceElement.id,
      kind,
      target
    };
  }

  /** Creates a local target or an external artifact target with an optional stable declaration identity. */
  private toTarget(
    localTarget: AtlasElement | undefined,
    targetNode: DeclarationNode | undefined,
    fallbackTargetId: string,
    moduleRoots: ReadonlyMap<string, string>
  ): AtlasRelationshipTarget {
    if (localTarget !== undefined) return { elementId: localTarget.id };
    if (targetNode?.packageName === undefined)
      return { label: targetNode?.label ?? fallbackTargetId };
    const elementId = this.toStableElementId(targetNode, moduleRoots);
    return elementId === undefined
      ? { moduleId: targetNode.packageName, label: targetNode.label }
      : { moduleId: targetNode.packageName, elementId, label: targetNode.label };
  }

  /** Derives the owning module's stable element ID without requiring its model file to be loaded. */
  private toStableElementId(
    node: DeclarationNode,
    moduleRoots: ReadonlyMap<string, string>
  ): string | undefined {
    const moduleId = node.packageName;
    if (moduleId === undefined) return undefined;
    const moduleNode = this.toModuleLocalNode(node, moduleRoots.get(moduleId) ?? '.');
    if (
      moduleNode.sourcePath !== undefined &&
      (moduleNode.moduleNode || moduleNode.kind === 'module')
    ) {
      return this.toSourceUnitElement(moduleId, moduleNode.sourcePath).id;
    }
    return this.toElement(moduleId, moduleNode, undefined).id;
  }

  /** Creates one stable identity from every populated portable target component. */
  private toTargetIdentity(target: AtlasRelationshipTarget): string {
    return encodeURIComponent(
      [target.moduleId ?? '', target.elementId ?? '', target.label ?? ''].join('\u0000')
    );
  }

  /** Converts a workspace-relative graph node into its module-local portable path form. */
  private toModuleLocalNode(node: DeclarationNode, moduleRootPath: string): DeclarationNode {
    return new DeclarationNode(
      node.id,
      node.label,
      node.kind,
      node.packageName,
      this.toModuleSourcePath(node.sourcePath, moduleRootPath),
      node.moduleNode,
      node.sourceLanguage
    );
  }

  /** Removes the owning package root while preserving normalized module-local source paths. */
  private toModuleSourcePath(
    sourcePath: string | undefined,
    moduleRootPath: string
  ): string | undefined {
    if (sourcePath === undefined) return undefined;
    const normalizedSourcePath = sourcePath.replaceAll('\\', '/').replace(/^\.\//, '');
    const normalizedRoot = moduleRootPath
      .replaceAll('\\', '/')
      .replace(/^\.\//, '')
      .replace(/\/$/, '');
    if (normalizedRoot === '' || normalizedRoot === '.') return normalizedSourcePath;
    const prefix = `${normalizedRoot}/`;
    if (!normalizedSourcePath.startsWith(prefix)) {
      throw new Error(
        `Atlas cannot persist source path '${sourcePath}' outside module root '${moduleRootPath}'.`
      );
    }
    return normalizedSourcePath.slice(prefix.length);
  }

  /** Reads package metadata needed for a published npm artifact identity. */
  private async readPackageManifest(
    packageRootPath: string
  ): Promise<{ readonly version: string }> {
    const value = JSON.parse(
      await readFile(resolve(packageRootPath, 'package.json'), 'utf8')
    ) as unknown;
    if (typeof value !== 'object' || value === null) {
      throw new Error(`Atlas package manifest '${packageRootPath}' must be a JSON object.`);
    }
    const version = (value as { readonly version?: unknown }).version;
    return { version: typeof version === 'string' && version.length > 0 ? version : '0.0.0' };
  }

  /** Converts a package name into a filesystem-safe deterministic model filename. */
  private toFileName(packageName: string): string {
    return packageName.replaceAll(/[^A-Za-z0-9._-]/g, '_');
  }

  /** Writes deterministic JSON through a temporary sibling file. */
  private async writeJson(filePath: string, value: object): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.tmp-${process.pid}`;
    await writeFile(temporaryPath, `${JSON.stringify(value, undefined, 2)}\n`, 'utf8');
    await rename(temporaryPath, filePath);
  }
}
