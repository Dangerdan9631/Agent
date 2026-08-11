import type { TypeScriptModelGenerationRequest } from "#sdk/TypeScriptModelGenerationRequest.js";
import type { TypeScriptModelGenerationResult } from "#sdk/TypeScriptModelGenerationResult.js";

/**
 * Defines process-independent TypeScript workspace analysis and portable model generation.
 */
export interface TypeScriptModelGenerationSdk {
  /**
   * Analyzes selected workspace packages without writing files or invoking another Atlas tool.
   *
   * @param request - Resolved TypeScript workspace and selected package roots.
   * @returns Portable module models in stable module identity order.
   */
  generate(
    request: TypeScriptModelGenerationRequest,
  ): Promise<TypeScriptModelGenerationResult>;
}
