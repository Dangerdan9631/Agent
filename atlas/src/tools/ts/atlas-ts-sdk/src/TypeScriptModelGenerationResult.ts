import type { TypeScriptModuleModel } from "#sdk/TypeScriptModuleModel.js";

/**
 * Contains portable module models returned by one SDK analysis operation.
 */
export interface TypeScriptModelGenerationResult {
  /** Models ordered by stable npm package identity. */
  readonly modules: readonly TypeScriptModuleModel[];
}
