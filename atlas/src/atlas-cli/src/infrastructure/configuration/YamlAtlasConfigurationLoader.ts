import type {
  AtlasConfiguration,
  AtlasDiagramConfiguration,
  AtlasExternalDependencyDefaults,
  AtlasExternalDiagramDefaults,
  AtlasModuleConfiguration,
  AtlasModuleValidationConfiguration,
  AtlasRootValidationConfiguration
} from '#application/configuration/model/AtlasConfiguration.js';
import type { AtlasConfigurationLoader } from '#application/configuration/ports/AtlasConfigurationLoader.js';
import { Ajv2020 } from 'ajv/dist/2020.js';
import type { AnySchema, ErrorObject, ValidateFunction } from 'ajv';
import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { AtlasConfigurationError } from '#infrastructure/configuration/AtlasConfigurationError.js';
import type { YamlDocumentCodec } from '#infrastructure/configuration/YamlDocumentCodec.js';

/**
 * Loads, validates, and composes the canonical version-two Atlas configuration document family.
 */
export class YamlAtlasConfigurationLoader implements AtlasConfigurationLoader {
  readonly #schemaPath: string;
  #validators: AtlasConfigurationValidators | undefined;

  /**
   * Creates a configuration loader from the YAML document boundary.
   *
   * @param documentCodec - Parses user-owned YAML without leaking parser details into composition.
   */
  public constructor(private readonly documentCodec: YamlDocumentCodec) {
    this.#schemaPath = fileURLToPath(new URL('../../config/atlas.schema.json', import.meta.url));
  }

  /**
   * Loads the single project root and composes every explicitly referenced fragment.
   *
   * @param configurationPath - Absolute atlas.config.yml path naming a readable regular file.
   * @returns Fully validated configuration with every path normalized relative to the project root.
   */
  public async load(configurationPath: string): Promise<AtlasConfiguration> {
    const absoluteConfigurationPath = resolve(configurationPath);
    if (absoluteConfigurationPath.replaceAll('\\', '/').split('/').at(-1) !== 'atlas.config.yml') {
      throw new AtlasConfigurationError(
        absoluteConfigurationPath,
        "The project root configuration must be named 'atlas.config.yml'."
      );
    }

    const projectRootPath = await this.toCanonicalProjectRoot(absoluteConfigurationPath);
    const validators = await this.getValidators(absoluteConfigurationPath);
    const rootDocument = await this.readValidatedDocument(
      absoluteConfigurationPath,
      validators.root
    );
    const root = rootDocument as RawRootDocument;
    const extendedDefaults = await this.loadBaseDefaults(
      root.extends ?? [],
      projectRootPath,
      absoluteConfigurationPath,
      validators.base
    );
    const diagramDefaults = this.mergeDiagramDefaults(
      extendedDefaults,
      root.project.diagramDefaults
    );
    const modules = await this.loadModules(
      root.modules,
      projectRootPath,
      absoluteConfigurationPath,
      validators.module
    );
    const configuration: AtlasConfiguration = {
      schemaVersion: 2,
      documentType: 'root',
      ...(root.extends === undefined
        ? {}
        : {
            extends: await Promise.all(
              root.extends.map((entry) =>
                this.toProjectRelativePath(
                  projectRootPath,
                  dirname(absoluteConfigurationPath),
                  entry,
                  true,
                  absoluteConfigurationPath
                )
              )
            )
          }),
      project: {
        name: root.project.name,
        artifacts: {
          root: await this.toProjectRelativePath(
            projectRootPath,
            dirname(absoluteConfigurationPath),
            root.project.artifacts.root,
            false,
            absoluteConfigurationPath
          )
        },
        ...(diagramDefaults === undefined ? {} : { diagramDefaults }),
        ...(root.project.diagrams === undefined ? {} : { diagrams: root.project.diagrams })
      },
      modules,
      ...(root.validation === undefined ? {} : { validation: root.validation })
    };

    this.validateComposedConfiguration(configuration, absoluteConfigurationPath);
    return configuration;
  }

  /**
   * Validates one in-memory root candidate against the packaged closed root schema.
   *
   * @param configurationPath - Canonical root path used for diagnostics.
   * @param document - Candidate parsed root document.
   * @returns A promise that resolves when the document is structurally valid.
   */
  public async validateRootDocument(configurationPath: string, document: unknown): Promise<void> {
    const validators = await this.getValidators(configurationPath);
    if (!validators.root(document)) {
      throw new AtlasConfigurationError(
        configurationPath,
        this.describeValidationErrors(validators.root.errors)
      );
    }
  }

  /** Loads and merges base fragments in declaration order. */
  private async loadBaseDefaults(
    entries: readonly string[],
    projectRootPath: string,
    rootPath: string,
    validator: ValidateFunction<unknown>
  ): Promise<AtlasExternalDiagramDefaults | undefined> {
    let defaults: AtlasExternalDiagramDefaults | undefined;
    const canonicalPaths = new Set<string>();
    for (const entry of entries) {
      const fragmentPath = await this.toAbsoluteContainedPath(
        projectRootPath,
        dirname(rootPath),
        entry,
        true,
        rootPath
      );
      const fragmentIdentity = this.pathIdentity(fragmentPath);
      if (canonicalPaths.has(fragmentIdentity)) {
        throw new AtlasConfigurationError(
          rootPath,
          `Base fragment '${entry}' is referenced twice.`
        );
      }
      canonicalPaths.add(fragmentIdentity);
      const document = (await this.readValidatedDocument(
        fragmentPath,
        validator
      )) as RawBaseDocument;
      defaults = this.mergeDiagramDefaults(defaults, document.diagramDefaults);
    }
    return defaults;
  }

  /** Loads inline and referenced module entries while retaining their declared order. */
  private async loadModules(
    entries: readonly RawModuleEntry[],
    projectRootPath: string,
    rootPath: string,
    validator: ValidateFunction<unknown>
  ): Promise<readonly AtlasModuleConfiguration[]> {
    const fragmentPaths = new Set<string>();
    const modelPaths = new Set<string>();
    const modules: AtlasModuleConfiguration[] = [];
    for (const entry of entries) {
      let module: RawModuleConfiguration;
      let definingDirectoryPath = dirname(rootPath);
      if (typeof entry === 'string') {
        const fragmentPath = await this.toAbsoluteContainedPath(
          projectRootPath,
          dirname(rootPath),
          entry,
          true,
          rootPath
        );
        const fragmentIdentity = this.pathIdentity(fragmentPath);
        if (fragmentPaths.has(fragmentIdentity)) {
          throw new AtlasConfigurationError(
            rootPath,
            `Module fragment '${entry}' is referenced twice.`
          );
        }
        fragmentPaths.add(fragmentIdentity);
        const document = (await this.readValidatedDocument(
          fragmentPath,
          validator
        )) as RawModuleDocument;
        module = document;
        definingDirectoryPath = dirname(fragmentPath);
      } else {
        module = entry;
      }

      const modelPath = await this.toProjectRelativePath(
        projectRootPath,
        definingDirectoryPath,
        module.model,
        false,
        rootPath
      );
      const modelIdentity = this.pathIdentity(modelPath);
      if (modelPaths.has(modelIdentity)) {
        throw new AtlasConfigurationError(
          rootPath,
          `Generated model path '${modelPath}' is configured more than once.`
        );
      }
      modelPaths.add(modelIdentity);
      modules.push({
        model: modelPath,
        ...(module.tags === undefined ? {} : { tags: module.tags }),
        ...(module.diagrams === undefined ? {} : { diagrams: module.diagrams }),
        ...(module.validation === undefined ? {} : { validation: module.validation })
      });
    }
    return modules;
  }

  /** Recursively merges the narrow external defaults contract. */
  private mergeDiagramDefaults(
    earlier: AtlasExternalDiagramDefaults | undefined,
    later: AtlasExternalDiagramDefaults | undefined
  ): AtlasExternalDiagramDefaults | undefined {
    if (earlier === undefined) return later;
    if (later === undefined) return earlier;
    const earlierExternal = earlier.externalDependencies;
    const laterExternal = later.externalDependencies;
    const excludeIds = this.appendUnique(earlierExternal.excludeIds, laterExternal.excludeIds);
    const collapse = this.mergeCollapse(earlierExternal, laterExternal);
    return {
      externalDependencies: {
        ...(excludeIds.length === 0 ? {} : { excludeIds }),
        ...(collapse === undefined ? {} : { collapse })
      }
    };
  }

  /** Normalizes canonical path identity only on the case-insensitive Windows filesystem family. */
  private pathIdentity(canonicalPath: string): string {
    return process.platform === 'win32' ? canonicalPath.toLocaleLowerCase('en-US') : canonicalPath;
  }

  /** Merges external collapse scalar and ID collection values. */
  private mergeCollapse(
    earlier: AtlasExternalDependencyDefaults,
    later: AtlasExternalDependencyDefaults
  ): AtlasExternalDependencyDefaults['collapse'] {
    if (earlier.collapse === undefined) return later.collapse;
    if (later.collapse === undefined) return earlier.collapse;
    const ids = this.appendUnique(earlier.collapse.ids, later.collapse.ids);
    return {
      mode: later.collapse.mode,
      ...(ids.length === 0 ? {} : { ids })
    };
  }

  /** Appends exact string values while retaining the first occurrence. */
  private appendUnique(
    earlier: readonly string[] | undefined,
    later: readonly string[] | undefined
  ): readonly string[] {
    return [...new Set([...(earlier ?? []), ...(later ?? [])])];
  }

  /** Enforces uniqueness and effective-value constraints that JSON Schema cannot express locally. */
  private validateComposedConfiguration(
    configuration: AtlasConfiguration,
    configurationPath: string
  ): void {
    this.requireUniqueIds(configuration.project.diagrams, configurationPath, 'Project diagram');
    this.requireUniqueRuleIds(configuration.validation, configurationPath, 'Root');
    for (const diagram of configuration.project.diagrams ?? []) {
      this.requireUniqueIds(diagram.groups, configurationPath, `Group in diagram '${diagram.id}'`);
      this.validateEffectiveCollapse(
        configuration.project.diagramDefaults,
        diagram,
        configurationPath
      );
    }
    for (const module of configuration.modules) {
      this.requireUniqueIds(module.diagrams, configurationPath, `Diagram for '${module.model}'`);
      this.requireUniqueRuleIds(module.validation, configurationPath, `Module '${module.model}'`);
      for (const diagram of module.diagrams ?? []) {
        this.validateEffectiveCollapse(
          configuration.project.diagramDefaults,
          diagram,
          configurationPath
        );
      }
    }
    const collapse = configuration.project.diagramDefaults?.externalDependencies.collapse;
    if (collapse?.mode === 'matching' && (collapse.ids?.length ?? 0) === 0) {
      throw new AtlasConfigurationError(
        configurationPath,
        'The composed matching collapse mode requires at least one external ID pattern.'
      );
    }
  }

  /** Requires matching collapse mode to resolve at least one effective ID pattern. */
  private validateEffectiveCollapse(
    defaults: AtlasExternalDiagramDefaults | undefined,
    diagram: AtlasDiagramConfiguration,
    configurationPath: string
  ): void {
    const inherited =
      diagram.inheritDefaults === false ? undefined : defaults?.externalDependencies;
    const local = diagram.externalDependencies;
    const mode = local?.collapse?.mode ?? inherited?.collapse?.mode ?? 'all';
    const ids = this.appendUnique(inherited?.collapse?.ids, local?.collapse?.ids);
    if (mode === 'matching' && ids.length === 0) {
      throw new AtlasConfigurationError(
        configurationPath,
        `Diagram '${diagram.id}' uses matching collapse mode without an external ID pattern.`
      );
    }
  }

  /** Rejects duplicate stable IDs in one owning collection. */
  private requireUniqueIds(
    values: readonly { readonly id: string }[] | undefined,
    configurationPath: string,
    description: string
  ): void {
    const ids = values?.map((value) => value.id) ?? [];
    const duplicateId = ids.find((id, index) => ids.indexOf(id) !== index);
    if (duplicateId !== undefined) {
      throw new AtlasConfigurationError(
        configurationPath,
        `${description} ID '${duplicateId}' must be unique.`
      );
    }
  }

  /** Rejects duplicate rule IDs within one validation block. */
  private requireUniqueRuleIds(
    validation: AtlasRootValidationConfiguration | AtlasModuleValidationConfiguration | undefined,
    configurationPath: string,
    description: string
  ): void {
    this.requireUniqueIds(validation?.rules, configurationPath, `${description} rule`);
  }

  /** Resolves and validates the canonical project root directory. */
  private async toCanonicalProjectRoot(configurationPath: string): Promise<string> {
    try {
      const metadata = await stat(configurationPath);
      if (!metadata.isFile()) {
        throw new Error('The path is not a regular file.');
      }
      return realpath(dirname(configurationPath));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'The path is not readable.';
      throw new AtlasConfigurationError(configurationPath, message);
    }
  }

  /** Converts a configured path into canonical project-relative slash form. */
  private async toProjectRelativePath(
    projectRootPath: string,
    definingDirectoryPath: string,
    configuredPath: string,
    mustExist: boolean,
    documentPath: string
  ): Promise<string> {
    const absolutePath = await this.toAbsoluteContainedPath(
      projectRootPath,
      definingDirectoryPath,
      configuredPath,
      mustExist,
      documentPath
    );
    return relative(projectRootPath, absolutePath).replaceAll(sep, '/');
  }

  /** Resolves a relative path and rejects escape through lexical or canonical traversal. */
  private async toAbsoluteContainedPath(
    projectRootPath: string,
    definingDirectoryPath: string,
    configuredPath: string,
    mustExist: boolean,
    documentPath: string
  ): Promise<string> {
    if (isAbsolute(configuredPath)) {
      throw new AtlasConfigurationError(documentPath, `Path '${configuredPath}' must be relative.`);
    }
    const absolutePath = resolve(definingDirectoryPath, configuredPath);
    this.requireContainedPath(projectRootPath, absolutePath, configuredPath, documentPath);
    try {
      const metadata = await stat(absolutePath);
      if (mustExist && !metadata.isFile()) {
        throw new Error('The referenced fragment is not a regular file.');
      }
      const canonicalPath = await realpath(absolutePath);
      this.requireContainedPath(projectRootPath, canonicalPath, configuredPath, documentPath);
      return canonicalPath;
    } catch (error: unknown) {
      if (!mustExist && this.isMissingPathError(error)) {
        return this.toCanonicalMissingPath(
          projectRootPath,
          absolutePath,
          configuredPath,
          documentPath
        );
      }
      const message = error instanceof Error ? error.message : 'The referenced path is invalid.';
      throw new AtlasConfigurationError(
        documentPath,
        `Path '${configuredPath}' is invalid: ${message}`
      );
    }
  }

  /** Canonicalizes the nearest existing ancestor so missing models cannot escape through a symlink. */
  private async toCanonicalMissingPath(
    projectRootPath: string,
    absolutePath: string,
    configuredPath: string,
    documentPath: string
  ): Promise<string> {
    const missingSegments: string[] = [];
    let candidatePath = absolutePath;
    while (candidatePath !== dirname(candidatePath)) {
      try {
        await stat(candidatePath);
        const canonicalAncestor = await realpath(candidatePath);
        const canonicalPath = resolve(canonicalAncestor, ...missingSegments.reverse());
        this.requireContainedPath(projectRootPath, canonicalPath, configuredPath, documentPath);
        return canonicalPath;
      } catch (error: unknown) {
        if (!this.isMissingPathError(error)) throw error;
        missingSegments.push(candidatePath.slice(dirname(candidatePath).length + 1));
        candidatePath = dirname(candidatePath);
      }
    }
    throw new AtlasConfigurationError(
      documentPath,
      `Path '${configuredPath}' has no valid ancestor.`
    );
  }

  /** Rejects paths outside the canonical project root. */
  private requireContainedPath(
    projectRootPath: string,
    absolutePath: string,
    configuredPath: string,
    documentPath: string
  ): void {
    const pathFromRoot = relative(projectRootPath, absolutePath);
    if (pathFromRoot === '..' || pathFromRoot.startsWith(`..${sep}`) || isAbsolute(pathFromRoot)) {
      throw new AtlasConfigurationError(
        documentPath,
        `Path '${configuredPath}' resolves outside the project root.`
      );
    }
  }

  /** Identifies a missing path without hiding permission and malformed-path failures. */
  private isMissingPathError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { readonly code?: unknown }).code === 'ENOENT'
    );
  }

  /** Loads the packaged schema and compiles validators for all three document families once. */
  private async getValidators(configurationPath: string): Promise<AtlasConfigurationValidators> {
    if (this.#validators !== undefined) return this.#validators;
    try {
      const schema = JSON.parse(await readFile(this.#schemaPath, 'utf8')) as AnySchema;
      const ajv = new Ajv2020({ allErrors: true, strict: true });
      ajv.addSchema(schema);
      const root = ajv.getSchema('https://atlas.dev/schema/atlas.schema.json');
      const base = ajv.getSchema('https://atlas.dev/schema/atlas.schema.json#/$defs/baseDocument');
      const module = ajv.getSchema(
        'https://atlas.dev/schema/atlas.schema.json#/$defs/moduleDocument'
      );
      if (root === undefined || base === undefined || module === undefined) {
        throw new Error('The packaged schema does not expose every configuration document family.');
      }
      this.#validators = new AtlasConfigurationValidators(root, base, module);
      return this.#validators;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'The packaged schema is invalid.';
      throw new AtlasConfigurationError(configurationPath, message);
    }
  }

  /** Reads one YAML mapping and validates it against its selected closed schema. */
  private async readValidatedDocument(
    documentPath: string,
    validator: ValidateFunction<unknown>
  ): Promise<unknown> {
    let document: unknown;
    try {
      document = this.documentCodec.parse(await readFile(documentPath, 'utf8'));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'The file is not valid YAML.';
      throw new AtlasConfigurationError(documentPath, message);
    }
    if (!validator(document)) {
      throw new AtlasConfigurationError(
        documentPath,
        this.describeValidationErrors(validator.errors)
      );
    }
    return document;
  }

  /** Formats schema validation errors into a deterministic user-facing description. */
  private describeValidationErrors(errors: readonly ErrorObject[] | null | undefined): string {
    if (errors === undefined || errors === null || errors.length === 0) {
      return 'The document does not match the Atlas schema.';
    }
    return errors
      .map((error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`)
      .sort((left, right) => left.localeCompare(right))
      .join('; ');
  }
}

/**
 * Holds compiled validators for each closed version-two configuration document family.
 */
class AtlasConfigurationValidators {
  /**
   * Creates an immutable validator set.
   *
   * @param root - Validates the single root document.
   * @param base - Validates reusable base fragments.
   * @param module - Validates complete module fragments.
   */
  public constructor(
    public readonly root: ValidateFunction<unknown>,
    public readonly base: ValidateFunction<unknown>,
    public readonly module: ValidateFunction<unknown>
  ) {}
}

/**
 * Describes the validated root shape before referenced entries are composed.
 */
interface RawRootDocument {
  /** Identifies version two. */
  readonly schemaVersion: 2;
  /** Identifies the root family. */
  readonly documentType: 'root';
  /** Lists base fragment paths. */
  readonly extends?: readonly string[];
  /** Defines project policy. */
  readonly project: AtlasConfiguration['project'];
  /** Lists inline or referenced modules. */
  readonly modules: readonly RawModuleEntry[];
  /** Defines root validation. */
  readonly validation?: AtlasRootValidationConfiguration;
}

/**
 * Describes a validated base fragment before defaults are merged.
 */
interface RawBaseDocument {
  /** Defines external diagram defaults. */
  readonly diagramDefaults: AtlasExternalDiagramDefaults;
}

/**
 * Represents either supported root module entry form.
 */
type RawModuleEntry = string | RawModuleConfiguration;

/**
 * Describes a validated module configuration before its model path is normalized.
 */
interface RawModuleConfiguration extends Omit<AtlasModuleConfiguration, 'model'> {
  /** Names a model relative to the defining document. */
  readonly model: string;
}

/**
 * Describes a validated module fragment including its required discriminator.
 */
interface RawModuleDocument extends RawModuleConfiguration {
  /** Identifies version two. */
  readonly schemaVersion: 2;
  /** Identifies the module fragment family. */
  readonly documentType: 'module';
}
