import type { ResolvedAtlasWorkspace } from '#application/federation/model/ResolvedAtlasWorkspace.js';
import type { AtlasModuleConfiguration } from '#application/configuration/model/AtlasConfiguration.js';

/**
 * Captures the successfully loaded configured models and any generated model paths that were absent.
 */
export class ConfiguredAtlasWorkspace {
  /**
   * Creates one partial-project loading result.
   *
   * @param workspace - Resolved facts from every successfully loaded configured model.
   * @param missingModelPaths - Project-relative model paths that did not exist, in module declaration order.
   * @param modulesById - Complete configured module policy keyed by derived loaded model ID.
   */
  public constructor(
    public readonly workspace: ResolvedAtlasWorkspace,
    public readonly missingModelPaths: readonly string[],
    public readonly modulesById: ReadonlyMap<string, AtlasModuleConfiguration>
  ) {}
}
