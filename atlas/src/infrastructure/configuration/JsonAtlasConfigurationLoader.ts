import type { AtlasConfiguration } from '#application/configuration/model/AtlasConfiguration.js';
import type { AtlasConfigurationLoader } from '#application/configuration/ports/AtlasConfigurationLoader.js';
import { Ajv2020 } from 'ajv/dist/2020.js';
import type { AnySchema, ErrorObject, ValidateFunction } from 'ajv';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { AtlasConfigurationError } from '#infrastructure/configuration/AtlasConfigurationError.js';

/**
 * Loads the canonical JSON configuration file and validates it against Atlas's packaged schema.
 */
export class JsonAtlasConfigurationLoader implements AtlasConfigurationLoader {
  readonly #schemaPath: string;

  #validator: ValidateFunction<unknown> | undefined;

  /**
   * Creates a configuration loader using the schema installed with the Atlas runtime.
   */
  public constructor() {
    this.#schemaPath = fileURLToPath(new URL('../../config/atlas.schema.json', import.meta.url));
  }

  /**
   * Loads and validates one user-owned JSON policy file.
   *
   * @param configurationPath - Absolute JSON configuration file path. Must name a readable regular file.
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

    return document as AtlasConfiguration;
  }

  /**
   * Reads the immutable packaged schema while constructing the adapter.
   *
   * @param schemaPath - Absolute packaged schema file path.
   * @returns UTF-8 schema document text.
   */
  private async getValidator(configurationPath: string): Promise<ValidateFunction<unknown>> {
    if (this.#validator !== undefined) {
      return this.#validator;
    }

    let schemaText: string;

    try {
      schemaText = await readFile(this.#schemaPath, 'utf8');
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'The packaged schema could not be read.';
      throw new AtlasConfigurationError(configurationPath, message);
    }

    try {
      const ajv = new Ajv2020({ allErrors: true, strict: true });
      const validator = ajv.compile(JSON.parse(schemaText) as AnySchema);
      this.#validator = validator;
      return validator;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'The packaged schema is invalid.';
      throw new AtlasConfigurationError(configurationPath, message);
    }
  }

  /**
   * Reads and parses one user-owned JSON document.
   *
   * @param configurationPath - Path to a JSON configuration document.
   * @returns Parsed JSON value.
   */
  private async readDocument(configurationPath: string): Promise<unknown> {
    let documentText: string;

    try {
      documentText = await readFile(configurationPath, 'utf8');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'The file could not be read.';
      throw new AtlasConfigurationError(configurationPath, message);
    }

    try {
      return JSON.parse(documentText) as unknown;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'The file is not valid JSON.';
      throw new AtlasConfigurationError(configurationPath, message);
    }
  }

  /**
   * Formats Ajv validation errors into a deterministic user-facing description.
   *
   * @param errors - Validation errors reported by the compiled schema, if any.
   * @returns Stable concise validation description.
   */
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
