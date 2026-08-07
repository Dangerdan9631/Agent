import type { TypeScriptModelGenerationWorkflow } from "#application/TypeScriptModelGenerationWorkflow.js";
import { AtlasCompositionRoot } from "@starcruisestudios/atlas-cli/composition";

/**
 * Adapts the existing source-model generation workflow behind the dedicated TypeScript executable.
 */
export class AtlasCliModelGenerationWorkflow implements TypeScriptModelGenerationWorkflow {
  /**
   * Runs the source-generation command without exposing validator commands through this tool.
   *
   * @param argumentsToForward Shared workspace and output options.
   * @returns Process-compatible completion status.
   */
  public async execute(argumentsToForward: readonly string[]): Promise<number> {
    return new AtlasCompositionRoot()
      .createCli()
      .run([...argumentsToForward, "generate-models"]);
  }
}
