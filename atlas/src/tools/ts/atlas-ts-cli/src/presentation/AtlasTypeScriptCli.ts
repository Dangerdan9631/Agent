import type {
  TypeScriptModelGenerationOptions,
  TypeScriptModelGenerationWorkflow,
} from "#application/TypeScriptModelGenerationWorkflow.js";
import { Command, CommanderError } from "commander";

/**
 * Exposes only TypeScript source-model generation from the Atlas toolchain.
 */
export class AtlasTypeScriptCli {
  /**
   * Creates the dedicated command boundary from one model-generation workflow.
   *
   * @param workflow Generates portable models for selected TypeScript packages.
   */
  public constructor(
    private readonly workflow: TypeScriptModelGenerationWorkflow,
  ) {}

  /**
   * Parses the supplied command-line arguments and returns a process exit code.
   *
   * @param argumentsToParse Arguments after the executable path.
   * @returns Zero for success, one for generation failure, or two for invalid input.
   */
  public async run(argumentsToParse: readonly string[]): Promise<number> {
    const command = new Command()
      .name("atlas-ts")
      .description("Generate portable Atlas models from TypeScript source.")
      .showHelpAfterError()
      .exitOverride();
    command
      .command("generate")
      .option("--workspace <path>")
      .option("--config <path>")
      .option("--output <path>")
      .action(async (options: AtlasTypeScriptOptions) => {
        await this.workflow.execute(this.toWorkflowOptions(options));
      });
    try {
      await command.parseAsync(argumentsToParse, { from: "user" });
      return 0;
    } catch (error: unknown) {
      if (error instanceof CommanderError) {
        return error.code === "commander.helpDisplayed" ? 0 : 2;
      }
      return 1;
    }
  }

  /**
   * Converts parsed options into the shared Atlas command-line option sequence.
   *
   * @param options Parsed dedicated-generator options.
   * @returns Supported options forwarded to the source generation workflow.
   */
  private toWorkflowOptions(
    options: AtlasTypeScriptOptions,
  ): TypeScriptModelGenerationOptions {
    return {
      ...(options.workspace === undefined
        ? {}
        : { workspacePath: options.workspace }),
      ...(options.config === undefined
        ? {}
        : { configurationPath: options.config }),
      ...(options.output === undefined ? {} : { outputPath: options.output }),
    };
  }
}

/**
 * Represents the permitted command-line options for TypeScript model generation.
 */
interface AtlasTypeScriptOptions {
  /** Optional root directory containing the TypeScript workspace. */
  readonly workspace?: string;
  /** Optional Atlas configuration document path. */
  readonly config?: string;
  /** Optional generated-artifact root override. */
  readonly output?: string;
}
