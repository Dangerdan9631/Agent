import type { AtlasConfiguration } from '#application/configuration/model/AtlasConfiguration.js';

/**
 * Loads and validates a user-owned Atlas configuration document.
 */
export interface AtlasConfigurationLoader {
  /**
   * Loads one configuration document from an absolute file path.
   *
   * @param configurationPath - Absolute YAML configuration file path. Must point to a regular readable file.
   * @returns Validated Atlas configuration model.
   */
  load(configurationPath: string): Promise<AtlasConfiguration>;
}
