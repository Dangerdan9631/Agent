import type {
  AtlasModuleModel,
  AtlasRelationshipKind,
  AtlasRelationshipTarget
} from '#application/federation/model/AtlasModuleModel.js';
import type { AtlasModuleConfiguration } from '#application/configuration/model/AtlasConfiguration.js';
import { ConfiguredAtlasWorkspace } from '#application/federation/model/ConfiguredAtlasWorkspace.js';
import type { AtlasWorkspaceManifest } from '#application/federation/model/AtlasWorkspaceManifest.js';
import {
  ResolvedAtlasRelationship,
  ResolvedAtlasWorkspace
} from '#application/federation/model/ResolvedAtlasWorkspace.js';
import type { AtlasWorkspaceLoader } from '#application/federation/ports/AtlasWorkspaceLoader.js';
import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

import type { YamlDocumentCodec } from '#infrastructure/configuration/YamlDocumentCodec.js';
import { Ajv2020 } from 'ajv/dist/2020.js';
import type { AnySchema, ValidateFunction } from 'ajv';
import { fileURLToPath } from 'node:url';

/**
 * Loads YAML module models from a manifest and links only matching stable identities.
 */
export class NodeAtlasWorkspaceLoader implements AtlasWorkspaceLoader {
  readonly #modelSchemaPath = fileURLToPath(
    new URL('../../config/atlas-module.schema.json', import.meta.url)
  );
  #modelValidator: ValidateFunction<unknown> | undefined;
  /**
   * Creates a portable workspace loader from the shared YAML document boundary.
   *
   * @param documentCodec - Parses manifest and module model documents.
   */
  public constructor(private readonly documentCodec: YamlDocumentCodec) {}

  /**
   * Loads only the generated model paths selected by the composed project configuration.
   *
   * @param projectRootPath - Absolute canonical project root.
   * @param modules - Ordered complete module entries with normalized project-relative model paths.
   * @returns Resolved loaded subset and missing model paths retained in declaration order.
   */
  public async loadConfigured(
    projectRootPath: string,
    modules: readonly AtlasModuleConfiguration[]
  ): Promise<ConfiguredAtlasWorkspace> {
    const models = new Map<string, AtlasModuleModel>();
    const modulesById = new Map<string, AtlasModuleConfiguration>();
    const missingModelPaths: string[] = [];
    for (const configuredModule of modules) {
      const modelPath = this.toConfiguredModelPath(projectRootPath, configuredModule.model);
      const document = await this.readOptionalYaml(modelPath);
      if (document === undefined) {
        missingModelPaths.push(configuredModule.model);
        continue;
      }
      await this.validateConfiguredModel(document, modelPath);
      const model = this.toModel(document, modelPath);
      if (models.has(model.module.id)) {
        throw new Error(`Atlas workspace contains duplicate module ID '${model.module.id}'.`);
      }
      models.set(model.module.id, model);
      modulesById.set(model.module.id, configuredModule);
    }
    if (models.size === 0) {
      throw new Error('Atlas could not load any configured generated module models.');
    }
    return new ConfiguredAtlasWorkspace(
      new ResolvedAtlasWorkspace(models, this.resolveRelationships(models)),
      missingModelPaths,
      modulesById
    );
  }

  /** Validates one present configured model against the packaged version-two schema and semantics. */
  private async validateConfiguredModel(document: unknown, modelPath: string): Promise<void> {
    const validator = await this.getModelValidator();
    if (!validator(document)) {
      const errors = (validator.errors ?? [])
        .map((error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`)
        .sort((left, right) => this.compareText(left, right))
        .join('; ');
      throw new Error(`Atlas module model '${modelPath}' is invalid: ${errors}.`);
    }
    this.validateVersionTwoSemantics(this.toRecord(document, modelPath), modelPath);
  }

  /** Compiles the immutable packaged module schema once. */
  private async getModelValidator(): Promise<ValidateFunction<unknown>> {
    if (this.#modelValidator !== undefined) return this.#modelValidator;
    const schema = JSON.parse(await readFile(this.#modelSchemaPath, 'utf8')) as AnySchema;
    this.#modelValidator = new Ajv2020({ allErrors: true, strict: false }).compile(schema);
    return this.#modelValidator;
  }

  /** Enforces ordered IDs, local references, spans, and acyclic ownership in a valid v2 model. */
  private validateVersionTwoSemantics(model: Record<string, unknown>, modelPath: string): void {
    const elements = (model.elements as unknown[]).map((value) => this.toRecord(value, modelPath));
    const relationships = (model.relationships as unknown[]).map((value) =>
      this.toRecord(value, modelPath)
    );
    this.requireSortedUniqueIds(elements, 'element', modelPath);
    this.requireSortedUniqueIds(relationships, 'relationship', modelPath);
    const elementsById = new Map(elements.map((element) => [element.id as string, element]));
    this.requireUniqueFacts(elements, 'element', modelPath);
    this.requireUniqueFacts(relationships, 'relationship', modelPath);
    for (const element of elements) {
      const parentId = element.parentId as string | undefined;
      if (parentId !== undefined && !elementsById.has(parentId)) {
        throw new Error(
          `Atlas module model '${modelPath}' references unknown parent '${parentId}'.`
        );
      }
      this.requireAcyclicParent(element.id as string, elementsById, modelPath);
      this.validateSourceSpan(element.source, modelPath);
      if (Array.isArray(element.traits))
        this.requireSortedStrings(element.traits, 'traits', modelPath);
      this.validateCallableReferences(element, elementsById, modelPath);
      this.validateElementTypes(element, elementsById, modelPath);
    }
    for (const relationship of relationships) {
      if (!elementsById.has(relationship.sourceElementId as string)) {
        throw new Error(`Atlas module model '${modelPath}' has an unknown relationship source.`);
      }
      const target = this.toRecord(relationship.target, modelPath);
      if (
        target.type === 'element' &&
        target.moduleId === undefined &&
        !elementsById.has(target.elementId as string)
      ) {
        throw new Error(`Atlas module model '${modelPath}' has an unknown local target.`);
      }
      this.validateSourceSpan(relationship.source, modelPath);
    }
  }

  /** Rejects duplicate semantic facts that differ only in their assigned stable ID. */
  private requireUniqueFacts(
    values: readonly Record<string, unknown>[],
    subject: string,
    modelPath: string
  ): void {
    const facts = new Set<string>();
    for (const value of values) {
      const fact = this.canonicalValue(
        Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'id'))
      );
      if (facts.has(fact)) {
        throw new Error(`Atlas module model '${modelPath}' contains a duplicate ${subject} fact.`);
      }
      facts.add(fact);
    }
  }

  /** Serializes an arbitrary YAML value with recursively sorted mapping keys. */
  private canonicalValue(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((entry) => this.canonicalValue(entry)).join(',')}]`;
    }
    if (typeof value === 'object' && value !== null) {
      return `{${Object.entries(value)
        .sort(([left], [right]) => this.compareText(left, right))
        .map(([key, entry]) => `${JSON.stringify(key)}:${this.canonicalValue(entry)}`)
        .join(',')}}`;
    }
    return JSON.stringify(value) ?? 'undefined';
  }

  /** Requires lexicographically sorted unique stable IDs. */
  private requireSortedUniqueIds(
    values: readonly Record<string, unknown>[],
    subject: string,
    modelPath: string
  ): void {
    const ids = values.map((value) => value.id as string);
    if (new Set(ids).size !== ids.length) {
      throw new Error(`Atlas module model '${modelPath}' contains duplicate ${subject} IDs.`);
    }
    if (ids.some((id, index) => index > 0 && this.compareText(id, ids[index - 1]!) < 0)) {
      throw new Error(`Atlas module model '${modelPath}' ${subject}s must be sorted by ID.`);
    }
  }

  /** Requires an exact string collection to use deterministic lexicographic order. */
  private requireSortedStrings(
    values: readonly unknown[],
    subject: string,
    modelPath: string
  ): void {
    const strings = values as readonly string[];
    if (
      strings.some((value, index) => index > 0 && this.compareText(value, strings[index - 1]!) < 0)
    ) {
      throw new Error(`Atlas module model '${modelPath}' ${subject} must be sorted.`);
    }
  }

  /** Rejects parent cycles by walking each element's ownership chain. */
  private requireAcyclicParent(
    elementId: string,
    elementsById: ReadonlyMap<string, Record<string, unknown>>,
    modelPath: string
  ): void {
    const visited = new Set<string>([elementId]);
    let parentId = elementsById.get(elementId)?.parentId;
    while (typeof parentId === 'string') {
      if (visited.has(parentId)) {
        throw new Error(`Atlas module model '${modelPath}' contains a parent cycle.`);
      }
      visited.add(parentId);
      parentId = elementsById.get(parentId)?.parentId;
    }
  }

  /** Validates callable child references and constructor return constraints. */
  private validateCallableReferences(
    element: Record<string, unknown>,
    elementsById: ReadonlyMap<string, Record<string, unknown>>,
    modelPath: string
  ): void {
    if (element.signature === undefined) return;
    const signature = this.toRecord(element.signature, modelPath);
    if (element.kind === 'constructor' && signature.returns !== undefined) {
      throw new Error(
        `Atlas module model '${modelPath}' constructor signatures cannot return a type.`
      );
    }
    if (element.kind !== 'constructor' && signature.returns === undefined) {
      throw new Error(
        `Atlas module model '${modelPath}' function and method signatures require returns.`
      );
    }
    for (const parameterId of signature.parameters as string[]) {
      const parameter = elementsById.get(parameterId);
      if (parameter?.kind !== 'parameter' || parameter.parentId !== element.id) {
        throw new Error(
          `Atlas module model '${modelPath}' has an invalid callable parameter reference.`
        );
      }
    }
    for (const parameterId of signature.typeParameters as string[]) {
      const parameter = elementsById.get(parameterId);
      if (parameter?.kind !== 'type-parameter' || parameter.parentId !== element.id) {
        throw new Error(
          `Atlas module model '${modelPath}' has an invalid type-parameter reference.`
        );
      }
    }
  }

  /** Validates every type expression owned by an element and its callable metadata. */
  private validateElementTypes(
    element: Record<string, unknown>,
    elementsById: ReadonlyMap<string, Record<string, unknown>>,
    modelPath: string
  ): void {
    this.validateTypeExpression(element.type, elementsById, modelPath);
    if (element.signature !== undefined) {
      const signature = this.toRecord(element.signature, modelPath);
      this.validateTypeExpression(signature.returns, elementsById, modelPath);
    }
    if (element.typeParameter !== undefined) {
      const metadata = this.toRecord(element.typeParameter, modelPath);
      for (const constraint of (metadata.constraints as readonly unknown[] | undefined) ?? []) {
        this.validateTypeExpression(constraint, elementsById, modelPath);
      }
    }
  }

  /** Recursively validates local targets and deterministic ordering in one finite type expression. */
  private validateTypeExpression(
    value: unknown,
    elementsById: ReadonlyMap<string, Record<string, unknown>>,
    modelPath: string
  ): void {
    if (value === undefined) return;
    const expression = this.toRecord(value, modelPath);
    if (expression.kind === 'type-parameter') {
      if (elementsById.get(expression.elementId as string)?.kind !== 'type-parameter') {
        throw new Error(`Atlas module model '${modelPath}' references an unknown type parameter.`);
      }
      return;
    }
    if (expression.kind === 'named') {
      if (expression.target !== undefined) {
        const target = this.toRecord(expression.target, modelPath);
        if (target.moduleId === undefined && !elementsById.has(target.elementId as string)) {
          throw new Error(`Atlas module model '${modelPath}' references an unknown local type.`);
        }
      }
      this.validateTypeExpressions(expression.arguments, elementsById, modelPath);
      return;
    }
    if (expression.kind === 'union' || expression.kind === 'intersection') {
      const types = expression.types as readonly unknown[];
      const canonicalTypes = types.map((entry) => this.canonicalValue(entry));
      if (
        canonicalTypes.some(
          (entry, index) => index > 0 && this.compareText(entry, canonicalTypes[index - 1]!) < 0
        )
      ) {
        throw new Error(
          `Atlas module model '${modelPath}' ${expression.kind} types must use canonical order.`
        );
      }
      this.validateTypeExpressions(types, elementsById, modelPath);
      return;
    }
    if (expression.kind === 'tuple' || expression.kind === 'callable') {
      for (const entry of expression[
        expression.kind === 'tuple' ? 'elements' : 'parameters'
      ] as readonly unknown[]) {
        this.validateTypeExpression(this.toRecord(entry, modelPath).type, elementsById, modelPath);
      }
      if (expression.kind === 'callable') {
        this.validateTypeExpression(expression.returns, elementsById, modelPath);
      }
      return;
    }
    if (expression.kind === 'collection') {
      this.validateTypeExpression(expression.element, elementsById, modelPath);
      this.validateTypeExpression(expression.key, elementsById, modelPath);
      this.validateTypeExpression(expression.value, elementsById, modelPath);
      return;
    }
    if (expression.kind === 'nullable') {
      const wrapped = this.toRecord(expression.type, modelPath);
      if (wrapped.kind === 'nullable') {
        throw new Error(`Atlas module model '${modelPath}' contains nested nullable types.`);
      }
      this.validateTypeExpression(wrapped, elementsById, modelPath);
    }
  }

  /** Validates an optional ordered collection of type expressions. */
  private validateTypeExpressions(
    values: unknown,
    elementsById: ReadonlyMap<string, Record<string, unknown>>,
    modelPath: string
  ): void {
    for (const value of (values as readonly unknown[] | undefined) ?? []) {
      this.validateTypeExpression(value, elementsById, modelPath);
    }
  }

  /** Validates that an optional source span ends at or after its start. */
  private validateSourceSpan(value: unknown, modelPath: string): void {
    if (value === undefined) return;
    const span = this.toRecord(value, modelPath);
    const start = this.toRecord(span.start, modelPath);
    const end = this.toRecord(span.end, modelPath);
    const startsAfterEnd =
      (start.line as number) > (end.line as number) ||
      ((start.line as number) === (end.line as number) &&
        (start.column as number) > (end.column as number));
    if (startsAfterEnd) {
      throw new Error(`Atlas module model '${modelPath}' contains a reversed source span.`);
    }
  }

  /**
   * Loads a workspace manifest, validates each selected model, and resolves loaded targets.
   *
   * @param manifestPath - Absolute or current-directory-relative manifest path.
   * @returns Fully validated workspace with ordinary unresolved external dependencies.
   */
  public async load(manifestPath: string): Promise<ResolvedAtlasWorkspace> {
    const absoluteManifestPath = resolve(manifestPath);
    const manifest = this.toManifest(
      await this.readYaml(absoluteManifestPath),
      absoluteManifestPath
    );
    const entries = [...manifest.modules].sort((left, right) =>
      this.compareText(left.moduleId, right.moduleId)
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
    const relationshipIds = new Set<string>();
    for (const entry of entries) {
      const modelPath = this.toContainedModelPath(absoluteManifestPath, entry.modelPath);
      const model = this.toModel(await this.readYaml(modelPath), modelPath);
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
      for (const relationship of model.relationships) {
        if (relationshipIds.has(relationship.id)) {
          throw new Error(
            `Atlas workspace contains duplicate relationship ID '${relationship.id}'.`
          );
        }
        relationshipIds.add(relationship.id);
      }
      models.set(model.module.id, model);
    }
    return new ResolvedAtlasWorkspace(models, this.resolveRelationships(models));
  }

  /** Reads and parses one UTF-8 YAML document. */
  private async readYaml(filePath: string): Promise<unknown> {
    try {
      return this.documentCodec.parse(await readFile(filePath, 'utf8'));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown YAML error';
      throw new Error(`Atlas could not load '${filePath}': ${message}`);
    }
  }

  /** Reads a configured generated model while treating only a missing file as skippable. */
  private async readOptionalYaml(filePath: string): Promise<unknown> {
    try {
      return this.documentCodec.parse(await readFile(filePath, 'utf8'));
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { readonly code?: unknown }).code === 'ENOENT'
      ) {
        return undefined;
      }
      const message = error instanceof Error ? error.message : 'unknown YAML error';
      throw new Error(`Atlas could not load '${filePath}': ${message}`);
    }
  }

  /** Resolves one normalized configured model path and verifies lexical project containment. */
  private toConfiguredModelPath(projectRootPath: string, configuredPath: string): string {
    const absolutePath = resolve(projectRootPath, configuredPath);
    const pathFromRoot = relative(projectRootPath, absolutePath);
    if (pathFromRoot === '..' || pathFromRoot.startsWith(`..${sep}`) || isAbsolute(pathFromRoot)) {
      throw new Error(`Atlas configured model path '${configuredPath}' escapes the project root.`);
    }
    return absolutePath;
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
    const model = this.toCompatibilityModel(this.toRecord(value, filePath), filePath);
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

  /** Converts a version-two module document into the temporary graph compatibility representation. */
  private toCompatibilityModel(
    model: Record<string, unknown>,
    filePath: string
  ): Record<string, unknown> {
    if (model.schemaVersion !== 2) return model;
    const generator = this.toRecord(model.generator, filePath);
    const source = this.toRecord(model.source, filePath);
    const module = this.toRecord(model.module, filePath);
    if (
      !this.isText(generator.name) ||
      !this.isText(generator.version) ||
      !this.isText(source.language) ||
      !this.isText(module.id) ||
      !this.isText(module.name) ||
      !this.isText(module.version) ||
      !this.isText(module.category) ||
      !Array.isArray(model.elements) ||
      !Array.isArray(model.relationships)
    ) {
      throw new Error(`Atlas module model '${filePath}' does not satisfy schema version 2.`);
    }
    const elements = model.elements as readonly unknown[];
    return {
      schemaVersion: 1,
      generatorVersion: generator.version,
      sourceLanguage: source.language,
      module: {
        id: module.id,
        displayName: module.name,
        version: module.version,
        ...(module.variant === undefined ? {} : { variant: module.variant }),
        category: module.category
      },
      elements: elements.map((value) =>
        this.toCompatibilityElement(value, elements, filePath)
      ),
      relationships: model.relationships.map((value) => {
        const relationship = this.toRecord(value, filePath);
        return {
          id: relationship.id,
          sourceElementId: relationship.sourceElementId,
          kind: this.toCompatibilityRelationshipKind(relationship.kind),
          target: this.toCompatibilityTarget(relationship.target, filePath)
        };
      })
    };
  }

  /**
   * Converts one version-two element while preserving or deriving its package-relative source path.
   *
   * @param value - Serialized version-two element to normalize.
   * @param elements - All module-owned elements used to follow parentage to a source unit.
   * @param filePath - Absolute source document path used in validation messages.
   * @returns Compatible element shape accepted by the legacy graph builder.
   */
  private toCompatibilityElement(
    value: unknown,
    elements: readonly unknown[],
    filePath: string
  ): Record<string, unknown> {
    const element = this.toRecord(value, filePath);
    const sourceSpan =
      element.source === undefined ? undefined : this.toRecord(element.source, filePath);
    const sourcePath =
      sourceSpan?.path === undefined
        ? this.inferSourcePath(element, elements, filePath, new Set<string>())
        : sourceSpan.path;
    return {
      id: element.id,
      name: element.name,
      kind: element.kind,
      qualifiedName: element.qualifiedName,
      ...(element.parentId === undefined ? {} : { parentId: element.parentId }),
      ...(sourcePath === undefined ? {} : { sourcePath }),
      ...(element.visibility === undefined ? {} : { visibility: element.visibility }),
      ...(element.traits === undefined ? {} : { traits: element.traits })
    };
  }

  /**
   * Finds an element's source-unit path through its explicit parent chain when no source span exists.
   *
   * @param element - Current version-two element being resolved.
   * @param elements - All owned elements available for parent resolution.
   * @param filePath - Absolute source document path used in validation messages.
   * @param visitedElementIds - Cycle guard for malformed parent relationships.
   * @returns Package-relative source path, or undefined when the model provides no source-unit ancestry.
   */
  private inferSourcePath(
    element: Record<string, unknown>,
    elements: readonly unknown[],
    filePath: string,
    visitedElementIds: Set<string>
  ): string | undefined {
    if (element.kind === 'source-unit' && this.isText(element.qualifiedName)) {
      return element.qualifiedName;
    }
    if (!this.isText(element.id) || !this.isText(element.parentId) || visitedElementIds.has(element.id)) {
      return undefined;
    }
    visitedElementIds.add(element.id);
    const parent = elements
      .map((candidate) => this.toRecord(candidate, filePath))
      .find((candidate) => candidate.id === element.parentId);
    return parent === undefined
      ? undefined
      : this.inferSourcePath(parent, elements, filePath, visitedElementIds);
  }

  /** Preserves the validated version-two relationship category in the shared graph model. */
  private toCompatibilityRelationshipKind(value: unknown): AtlasRelationshipKind {
    return value as AtlasRelationshipKind;
  }

  /** Maps one discriminated version-two relationship target to the current linker shape. */
  private toCompatibilityTarget(value: unknown, filePath: string): Record<string, unknown> {
    const target = this.toRecord(value, filePath);
    if (target.type === 'element') {
      return {
        ...(target.moduleId === undefined ? {} : { moduleId: target.moduleId }),
        elementId: target.elementId
      };
    }
    if (target.type === 'module') return { moduleId: target.moduleId };
    if (target.type === 'external') return { label: target.id };
    throw new Error(`Atlas module model '${filePath}' has an invalid relationship target.`);
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
      .sort((left, right) => this.compareText(left.relationship.id, right.relationship.id));
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
    if (explicitElementId !== undefined && explicitModule !== undefined) {
      throw new Error(
        `Atlas relationship '${relationship.id}' targets unknown element '${explicitElementId}' in selected module '${explicitModule.module.id}'.`
      );
    }
    if (relationship.target.moduleId !== undefined || relationship.target.label === undefined) {
      return new AtlasResolvedTarget(explicitModule, undefined);
    }
    const qualifiedTarget = qualifiedTargets.get(relationship.target.label);
    return qualifiedTarget === undefined
      ? new AtlasResolvedTarget(explicitModule, undefined)
      : new AtlasResolvedTarget(qualifiedTarget.module, qualifiedTarget.elementId);
  }

  /** Narrows an unknown YAML value to a record. */
  private toRecord(value: unknown, filePath: string): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`Atlas model document '${filePath}' must be a YAML mapping.`);
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
        'local-function',
        'constructor',
        'method',
        'property',
        'field',
        'constant',
        'event',
        'enum-member',
        'parameter',
        'local-variable',
        'type-parameter'
      ].includes(value)
    );
  }

  /** Compares persisted IDs by Unicode code-unit order without locale-dependent collation. */
  private compareText(left: string, right: string): number {
    if (left === right) return 0;
    return left < right ? -1 : 1;
  }

  /** Identifies one shared portable relationship category. */
  private isRelationshipKind(value: unknown): boolean {
    return (
      typeof value === 'string' &&
      [
        'imports',
        'exports',
        'references',
        'inherits',
        'implements',
        'calls',
        'instantiates',
        'reads',
        'writes',
        'overrides',
        'decorates',
        'contains'
      ].includes(value)
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
