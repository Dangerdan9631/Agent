import type { AtlasModuleConfiguration } from '#application/configuration/model/AtlasConfiguration.js';
import type { ConfiguredAtlasWorkspace } from '#application/federation/model/ConfiguredAtlasWorkspace.js';

/**
 * Loads and resolves module models explicitly selected by the composed project configuration.
 */
export interface AtlasWorkspaceLoader {
  /**
   * Loads models from the composed configuration without scanning or consulting a manifest.
   *
   * @param modelRootPath - Absolute model directory beneath the configured artifact root.
   * @param modules - Ordered complete module configurations with model-root-relative paths.
   * @returns Loaded subset and the ordered paths of missing generated models.
   */
  loadConfigured(
    modelRootPath: string,
    modules: readonly AtlasModuleConfiguration[]
  ): Promise<ConfiguredAtlasWorkspace>;
}
