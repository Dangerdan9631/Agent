import type { ResolvedAtlasWorkspace } from '#application/federation/model/ResolvedAtlasWorkspace.js';
import type { AtlasModuleConfiguration } from '#application/configuration/model/AtlasConfiguration.js';
import type { ConfiguredAtlasWorkspace } from '#application/federation/model/ConfiguredAtlasWorkspace.js';

/**
 * Loads and resolves the module models selected by one workspace manifest.
 */
export interface AtlasWorkspaceLoader {
  /**
   * Loads models from the composed configuration without scanning or consulting a manifest.
   *
   * @param projectRootPath - Absolute canonical directory containing atlas.config.yml.
   * @param modules - Ordered complete module configurations with project-relative model paths.
   * @returns Loaded subset and the ordered paths of missing generated models.
   */
  loadConfigured(
    projectRootPath: string,
    modules: readonly AtlasModuleConfiguration[]
  ): Promise<ConfiguredAtlasWorkspace>;

  /**
   * Loads a manifest and independently validates every selected module model.
   *
   * @param manifestPath - Absolute or process-relative workspace manifest path.
   * @returns Resolved federated workspace with unresolved dependencies retained as external targets.
   */
  load(manifestPath: string): Promise<ResolvedAtlasWorkspace>;
}
