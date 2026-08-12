import type { AtlasConfiguration } from '#application/configuration/model/AtlasConfiguration.js';

/**
 * Loads and validates a user-owned Atlas configuration document.
 */
export interface AtlasConfigurationLoader {
  /**
   * Validates an in-memory root document before an adapter persists it at the canonical path.
   *
   * @param configurationPath - Absolute canonical atlas.config.yml path that defines relative references.
   * @param document - Candidate root document value.
   * @returns A promise that resolves when the closed root schema accepts the document.
   */
  validateRootDocument(configurationPath: string, document: unknown): Promise<void>;

  /**
   * Loads one configuration document from an absolute file path.
   *
   * @param configurationPath - Absolute YAML configuration file path. Must point to a regular readable file.
   * @returns Validated Atlas configuration model.
   */
  load(configurationPath: string): Promise<AtlasConfiguration>;
}
