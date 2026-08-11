import type { AtlasConfiguration } from '#application/configuration/model/AtlasConfiguration.js';
import type { AtlasConfigurationLoader } from '#application/configuration/ports/AtlasConfigurationLoader.js';
import { Ajv2020 } from 'ajv/dist/2020.js';
import type { AnySchema, ErrorObject, ValidateFunction } from 'ajv';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { AtlasConfigurationError } from '#infrastructure/configuration/AtlasConfigurationError.js';
import type { YamlDocumentCodec } from '#infrastructure/configuration/YamlDocumentCodec.js';

/**
 * Loads the canonical YAML configuration file and validates it against Atlas's packaged schema.
 */
export class YamlAtlasConfigurationLoader implements AtlasConfigurationLoader {
  readonly #schemaPath: string;
  #validator: ValidateFunction<unknown> | undefined;

  /**
   * Creates a configuration loader from the YAML document boundary.
   *
   * @param documentCodec - Parses user-owned YAML without embedding parser details in validation behavior.
   */
  public constructor(private readonly documentCodec: YamlDocumentCodec) {
    this.#schemaPath = fileURLToPath(new URL('../../config/atlas.schema.json', import.meta.url));
  }

  /**
   * Loads and validates one user-owned YAML policy file.
   *
   * @param configurationPath - Absolute YAML configuration file path. Must name a readable regular file.
   * @returns Validated Atlas configuration model.
   */
  public async load(configurationPath: string): Promise<AtlasConfiguration> {
    const document = await this.readDocument(configurationPath);
    const validator = await this.getValidator(configurationPath);
    if (!validator(document)) {
      throw new AtlasConfigurationError(
        configurationPath,
        this.describeValidationErrors(validator.errors)
      );
    }
    const configuration = document as AtlasConfiguration;
    this.validateStableModuleGroupIds(configuration, configurationPath);
    return configuration;
  }

  /** Rejects duplicate presentation group identities that would otherwise share a diagram and layout scope. */
  private validateStableModuleGroupIds(
    configuration: AtlasConfiguration,
    configurationPath: string
  ): void {
    const groupIds = configuration.diagrams?.moduleGroups?.map((group) => group.id) ?? [];
    const duplicateId = groupIds.find((groupId, index) => groupIds.indexOf(groupId) !== index);
    if (duplicateId !== undefined) {
      throw new AtlasConfigurationError(
        configurationPath,
        `Module group ID '${duplicateId}' must be unique.`
      );
    }
  }

  /** Reads and compiles the immutable packaged JSON Schema document once. */
  private async getValidator(configurationPath: string): Promise<ValidateFunction<unknown>> {
    if (this.#validator !== undefined) return this.#validator;
    try {
      const schemaText = await readFile(this.#schemaPath, 'utf8');
      const ajv = new Ajv2020({ allErrors: true, strict: true });
      this.#validator = ajv.compile(JSON.parse(schemaText) as AnySchema);
      return this.#validator;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'The packaged schema is invalid.';
      throw new AtlasConfigurationError(configurationPath, message);
    }
  }

  /** Reads and parses one user-owned YAML document. */
  private async readDocument(configurationPath: string): Promise<unknown> {
    try {
      return this.documentCodec.parse(await readFile(configurationPath, 'utf8'));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'The file is not valid YAML.';
      throw new AtlasConfigurationError(configurationPath, message);
    }
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
