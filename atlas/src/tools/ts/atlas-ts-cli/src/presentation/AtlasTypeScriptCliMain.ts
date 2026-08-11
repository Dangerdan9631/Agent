#!/usr/bin/env node

import { SdkTypeScriptModelGenerationWorkflow } from "#application/SdkTypeScriptModelGenerationWorkflow.js";
import { AtlasTypeScriptCli } from "#presentation/AtlasTypeScriptCli.js";

/**
 * Runs the dedicated TypeScript model-generation executable.
 */
class AtlasTypeScriptCliHost {
  /**
   * Executes the command using the current Node.js process arguments.
   *
   * @returns Process-compatible command completion status.
   */
  public async run(): Promise<number> {
    return new AtlasTypeScriptCli(
      new SdkTypeScriptModelGenerationWorkflow(),
    ).run(process.argv.slice(2));
  }
}

process.exitCode = await new AtlasTypeScriptCliHost().run();
