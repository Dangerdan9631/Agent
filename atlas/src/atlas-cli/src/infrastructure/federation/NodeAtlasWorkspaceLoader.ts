import type {
  AtlasModuleModel,
  AtlasRelationshipTarget
} from '#application/federation/model/AtlasModuleModel.js';
import type { AtlasWorkspaceManifest } from '#application/federation/model/AtlasWorkspaceManifest.js';
import {
  ResolvedAtlasRelationship,
  ResolvedAtlasWorkspace
} from '#application/federation/model/ResolvedAtlasWorkspace.js';
import type { AtlasWorkspaceLoader } from '#application/federation/ports/AtlasWorkspaceLoader.js';
import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

/**
 * Loads JSON module models from a manifest and links only matching stable identities.
 */
export class NodeAtlasWorkspaceLoader implements AtlasWorkspaceLoader {
  /**
   * Loads a workspace manifest, validates each selected model, and resolves loaded targets.
   *
   * @param manifestPath - Absolute or current-directory-relative manifest path.
   * @returns Fully validated workspace with ordinary unresolved external dependencies.
   */
  public async load(manifestPath: string): Promise<ResolvedAtlasWorkspace> {
    const absoluteManifestPath = resolve(manifestPath);
    const manifest = this.toManifest(
      await this.readJson(absoluteManifestPath),
      absoluteManifestPath
    );
    const entries = [...manifest.modules].sort((left, right) =>
      left.moduleId.localeCompare(right.moduleId)
    );
    const duplicateId = entries.find(
      (entry, index) => index > 0 && entry.moduleId === entries[index - 1]?.moduleId
    );
    if (duplicateId !== undefined) {
      throw new Error(
        `Atlas manifest '${absoluteManifestPath}' declares duplicate module ID '${duplicateId.moduleId}'.`
      );
    }
    const models = new Map<string, AtlasModuleModel>();
    const ownedElementIds = new Set<string>();
    for (const entry of entries) {
      const modelPath = this.toContainedModelPath(absoluteManifestPath, entry.modelPath);
      const model = this.toModel(await this.readJson(modelPath), modelPath);
      if (model.module.id !== entry.moduleId) {
        throw new Error(
          `Atlas manifest expects '${entry.moduleId}' but model '${modelPath}' identifies '${model.module.id}'.`
        );
      }
      if (models.has(model.module.id)) {
        throw new Error(`Atlas workspace contains duplicate module ID '${model.module.id}'.`);
      }
      for (const element of model.elements) {
        if (ownedElementIds.has(element.id)) {
          throw new Error(`Atlas workspace contains duplicate owned element ID '${element.id}'.`);
        }
        ownedElementIds.add(element.id);
      }
      models.set(model.module.id, model);
    }
    return new ResolvedAtlasWorkspace(models, this.resolveRelationships(models));
  }

  /** Reads and parses one UTF-8 JSON document. */
  private async readJson(filePath: string): Promise<unknown> {
    try {
      return JSON.parse(await readFile(filePath, 'utf8')) as unknown;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown JSON error';
      throw new Error(`Atlas could not load '${filePath}': ${message}`);
    }
  }

  /** Ensures a manifest model path is relative and remains within its manifest directory. */
  private toContainedModelPath(manifestPath: string, modelPath: string): string {
    if (isAbsolute(modelPath)) {
      throw new Error(
        `Atlas manifest '${manifestPath}' must use a relative model path, not '${modelPath}'.`
      );
    }
    const absolutePath = resolve(dirname(manifestPath), modelPath);
    const pathFromManifest = relative(dirname(manifestPath), absolutePath);
    if (pathFromManifest === '..' || pathFromManifest.startsWith(`..${sep}`)) {
      throw new Error(
        `Atlas manifest '${manifestPath}' model path '${modelPath}' escapes its directory.`
      );
    }
    return absolutePath;
  }

  /** Validates the minimal canonical workspace-manifest shape. */
  private toManifest(value: unknown, filePath: string): AtlasWorkspaceManifest {
    const record = this.toRecord(value, filePath);
    if (record.schemaVersion !== 1 || !Array.isArray(record.modules)) {
      throw new Error(`Atlas manifest '${filePath}' must contain schemaVersion 1 and modules.`);
    }
    for (const entry of record.modules) {
      const item = this.toRecord(entry, filePath);
      if (!this.isText(item.moduleId) || !this.isText(item.modelPath)) {
        throw new Error(`Atlas manifest '${filePath}' contains an invalid module entry.`);
      }
    }
    return record as unknown as AtlasWorkspaceManifest;
  }

  /** Validates model ownership, stable IDs, paths, and relationship targets. */
  private toModel(value: unknown, filePath: string): AtlasModuleModel {
    const model = this.toRecord(value, filePath);
    if (
      model.schemaVersion !== 1 ||
      !this.isText(model.generatorVersion) ||
      !this.isText(model.sourceLanguage) ||
      !this.isArtifact(model.module) ||
      !Array.isArray(model.elements) ||
      !Array.isArray(model.relationships)
    ) {
      throw new Error(
        `Atlas module model '${filePath}' does not satisfy atlas-module schema version 1.`
      );
    }
    const elementIds = new Set<string>();
    const elements = model.elements as unknown[];
    for (const elementValue of elements) {
      const element = this.toRecord(elementValue, filePath);
      if (
        !this.isText(element.id) ||
        !this.isText(element.name) ||
        !this.isText(element.qualifiedName) ||
        !this.isDeclarationKind(element.kind) ||
        elementIds.has(element.id)
      ) {
        throw new Error(
          `Atlas module model '${filePath}' has invalid or duplicate owned element IDs.`
        );
      }
      elementIds.add(element.id);
      const parentId = element.parentId;
      if (
        parentId !== undefined &&
        (!this.isText(parentId) ||
          !elements.some((candidate) => this.toRecord(candidate, filePath).id === parentId))
      ) {
        throw new Error(`Atlas module model '${filePath}' references an unknown element parent.`);
      }
      if (
        element.sourcePath !== undefined &&
        (!this.isText(element.sourcePath) ||
          isAbsolute(element.sourcePath) ||
          element.sourcePath.includes('..'))
      ) {
        throw new Error(`Atlas module model '${filePath}' persists a non-relative source path.`);
      }
    }
    const relationshipIds = new Set<string>();
    for (const relationshipValue of model.relationships as unknown[]) {
      const relationship = this.toRecord(relationshipValue, filePath);
      if (
        !this.isText(relationship.id) ||
        relationshipIds.has(relationship.id) ||
        !this.isText(relationship.sourceElementId) ||
        !this.isRelationshipKind(relationship.kind) ||
        !elementIds.has(relationship.sourceElementId) ||
        !this.isTarget(relationship.target)
      ) {
        throw new Error(`Atlas module model '${filePath}' has an invalid relationship.`);
      }
      relationshipIds.add(relationship.id);
      if (
        relationship.target.moduleId === undefined &&
        relationship.target.elementId !== undefined &&
        !elementIds.has(relationship.target.elementId)
      ) {
        throw new Error(
          `Atlas module model '${filePath}' targets unowned element '${relationship.target.elementId}'.`
        );
      }
    }
    return model as unknown as AtlasModuleModel;
  }

  /** Resolves matching external module and optional element identities without diagnosing missing models. */
  private resolveRelationships(
    models: ReadonlyMap<string, AtlasModuleModel>
  ): readonly ResolvedAtlasRelationship[] {
    const qualifiedTargets = this.toQualifiedTargets(models);
    return [...models.values()]
      .flatMap((model) =>
        model.relationships.map((relationship) => {
          const target = this.toResolvedTarget(model, relationship, models, qualifiedTargets);
          return new ResolvedAtlasRelationship(
            model.module.id,
            relationship,
            target.module,
            target.elementId
          );
        })
      )
      .sort((left, right) => left.relationship.id.localeCompare(right.relationship.id));
  }

  /**
   * Builds a unique qualified-name lookup for generators that cannot know target module IDs.
   *
   * @param models Loaded workspace models keyed by stable module ID.
   * @returns Unique portable declaration targets keyed by their qualified names.
   */
  private toQualifiedTargets(
    models: ReadonlyMap<string, AtlasModuleModel>
  ): ReadonlyMap<string, AtlasQualifiedTarget | undefined> {
    const targets = new Map<string, AtlasQualifiedTarget | undefined>();
    for (const model of models.values()) {
      for (const element of model.elements) {
        const existing = targets.get(element.qualifiedName);
        if (existing === undefined && !targets.has(element.qualifiedName)) {
          targets.set(element.qualifiedName, new AtlasQualifiedTarget(model, element.id));
        } else {
          targets.set(element.qualifiedName, undefined);
        }
      }
    }
    return targets;
  }

  /**
   * Resolves explicit model targets first, then uniquely qualified label targets, without guessing ambiguities.
   *
   * @param sourceModel Model that owns the relationship.
   * @param relationship Relationship being resolved.
   * @param models Loaded workspace models keyed by module ID.
   * @param qualifiedTargets Unique declaration lookup for label-only generator output.
   * @returns Resolved target model and optional element identity.
   */
  private toResolvedTarget(
    sourceModel: AtlasModuleModel,
    relationship: AtlasModuleModel['relationships'][number],
    models: ReadonlyMap<string, AtlasModuleModel>,
    qualifiedTargets: ReadonlyMap<string, AtlasQualifiedTarget | undefined>
  ): AtlasResolvedTarget {
    const explicitModule =
      relationship.target.moduleId === undefined
        ? sourceModel
        : models.get(relationship.target.moduleId);
    const explicitElementId = relationship.target.elementId;
    if (
      explicitElementId !== undefined &&
      explicitModule?.elements.some((element) => element.id === explicitElementId)
    ) {
      return new AtlasResolvedTarget(explicitModule, explicitElementId);
    }
    if (relationship.target.moduleId !== undefined || relationship.target.label === undefined) {
      return new AtlasResolvedTarget(explicitModule, undefined);
    }
    const qualifiedTarget = qualifiedTargets.get(relationship.target.label);
    return qualifiedTarget === undefined
      ? new AtlasResolvedTarget(explicitModule, undefined)
      : new AtlasResolvedTarget(qualifiedTarget.module, qualifiedTarget.elementId);
  }

  /** Narrows an unknown JSON value to a record. */
  private toRecord(value: unknown, filePath: string): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`Atlas model document '${filePath}' must be a JSON object.`);
    }
    return value as Record<string, unknown>;
  }

  /** Identifies a non-empty string. */
  private isText(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
  }

  /** Validates an artifact identity's required portable fields. */
  private isArtifact(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) return false;
    const artifact = value as Record<string, unknown>;
    return (
      this.isText(artifact.id) &&
      this.isText(artifact.displayName) &&
      this.isText(artifact.version) &&
      this.isText(artifact.category)
    );
  }

  /** Validates a relationship target without interpreting source-language metadata. */
  private isTarget(value: unknown): value is AtlasRelationshipTarget {
    if (typeof value !== 'object' || value === null) return false;
    const target = value as Record<string, unknown>;
    const hasIdentity =
      target.moduleId !== undefined || target.elementId !== undefined || target.label !== undefined;
    return (
      hasIdentity &&
      (target.moduleId === undefined || this.isText(target.moduleId)) &&
      (target.elementId === undefined || this.isText(target.elementId)) &&
      (target.label === undefined || this.isText(target.label))
    );
  }

  /** Identifies one shared portable declaration category. */
  private isDeclarationKind(value: unknown): boolean {
    return (
      typeof value === 'string' &&
      [
        'namespace',
        'source-unit',
        'class',
        'interface',
        'struct',
        'record',
        'enum',
        'annotation',
        'delegate',
        'type-alias',
        'function',
        'constructor',
        'method',
        'property',
        'field',
        'constant'
      ].includes(value)
    );
  }

  /** Identifies one shared portable relationship category. */
  private isRelationshipKind(value: unknown): boolean {
    return (
      typeof value === 'string' &&
      ['imports', 'references', 'inherits', 'implements', 'calls', 'contains'].includes(value)
    );
  }
}

/**
 * Identifies one uniquely qualified declaration target across loaded module models.
 */
class AtlasQualifiedTarget {
  /**
   * Creates a uniquely resolvable target declaration.
   *
   * @param module Model that owns the declaration.
   * @param elementId Stable declaration identity.
   */
  public constructor(
    public readonly module: AtlasModuleModel,
    public readonly elementId: string
  ) {}
}

/**
 * Represents a relationship target after explicit and qualified-name resolution.
 */
class AtlasResolvedTarget {
  /**
   * Creates a resolved target with an optional known target declaration.
   *
   * @param module Resolved target module when available.
   * @param elementId Resolved target declaration identity when available.
   */
  public constructor(
    public readonly module: AtlasModuleModel | undefined,
    public readonly elementId: string | undefined
  ) {}
}
