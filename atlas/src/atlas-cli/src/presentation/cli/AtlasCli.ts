import type { AtlasLogger } from '#application/shared/logging/AtlasLogger.js';
import type {
  AtlasLogLevel,
  AtlasLogLevelController
} from '#application/shared/logging/AtlasLogLevelController.js';
import type { RuntimeOutputWriter } from '#application/shared/output/RuntimeOutputWriter.js';
import type { ArchitectureValidationWorkflow } from '#application/validation/ports/ArchitectureValidationWorkflow.js';
import type { ArchitectureValidationResult } from '#application/validation/model/ArchitectureValidationResult.js';
import type { ArchitectureGenerationWorkflow } from '#application/diagram/ports/ArchitectureGenerationWorkflow.js';
import type { ArchitectureDiagramWorkflow } from '#application/diagram/ports/ArchitectureDiagramWorkflow.js';
import { LayoutOverrides } from '#application/layout/model/LayoutDocument.js';
import type { ArchitectureLayoutWorkflow } from '#application/layout/ports/ArchitectureLayoutWorkflow.js';
import type { CleanArtifactsWorkflow } from '#application/clean/ports/CleanArtifactsWorkflow.js';
import type { ViewArtifactsWorkflow } from '#application/view/ports/ViewArtifactsWorkflow.js';
import { Command, CommanderError } from 'commander';

/**
 * Parses Atlas command-line input and dispatches supported commands to application workflows.
 */
export class AtlasCli {
  /**
   * Creates a command-line adapter with dedicated diagnostic and user-output boundaries.
   *
   * @param logger - Diagnostic logger used to explain command dispatch decisions.
   * @param outputWriter - User-facing command output boundary.
   */
  public constructor(
    private readonly logger: AtlasLogger,
    private readonly outputWriter: RuntimeOutputWriter,
    private readonly validationWorkflow: ArchitectureValidationWorkflow,
    private readonly generationWorkflow: ArchitectureGenerationWorkflow,
    private readonly diagramWorkflow: ArchitectureDiagramWorkflow,
    private readonly layoutWorkflow: ArchitectureLayoutWorkflow,
    private readonly cleanWorkflow: CleanArtifactsWorkflow,
    private readonly viewWorkflow?: ViewArtifactsWorkflow
  ) {}

  /**
   * Parses arguments supplied after the executable name.
   *
   * @param argumentsToParse - Command-line arguments excluding the executable path.
   * @returns Process exit code for the completed command invocation.
   */
  public async run(argumentsToParse: readonly string[]): Promise<number> {
    const program = this.createProgram();

    try {
      await program.parseAsync(argumentsToParse, { from: 'user' });
      return 0;
    } catch (error: unknown) {
      if (error instanceof CommanderError && error.code === 'commander.helpDisplayed') {
        return 0;
      }

      if (error instanceof ValidationCommandFailure) {
        return 1;
      }

      const message =
        error instanceof Error ? error.message : 'Atlas received an unknown command error.';
      this.logger.error('Atlas command parsing failed.', { values: { message } });
      this.outputWriter.writeErrorLine(message);
      return 2;
    }
  }

  /**
   * Creates the command parser used for a single invocation.
   *
   * @returns Configured parser for Atlas command names and global options.
   */
  private createProgram(): Command {
    const program = new Command();
    program
      .name('atlas-cli')
      .description('Validate portable Atlas models and generate diagram data.')
      .showHelpAfterError()
      .option(
        '--workspace <path>',
        'Workspace root, absolute or relative to the invocation directory.'
      )
      .option('--config <path>', 'Atlas configuration file path.')
      .option('--output <path>', 'Artifact output root.')
      .option('--log-level <level>', 'Diagnostic log level.')
      .exitOverride();

    program
      .command('validate')
      .description('Validate declared architecture rules.')
      .action(this.loadWorkspaceForValidation.bind(this, program));
    program
      .command('generate')
      .description('Generate all configured architecture artifacts.')
      .option('--fail-on-violations')
      .action(this.generateArchitecture.bind(this, program));
    program
      .command('diagram <scope>')
      .description('Generate one diagram scope.')
      .option('--fail-on-violations')
      .action(this.generateDiagram.bind(this, program));
    program
      .command('layout <scope>')
      .description('Persist deterministic layout for one diagram scope.')
      .option('--rows <count>')
      .option('--horizontal-gap <gap>')
      .option('--vertical-gap <gap>')
      .option('--orientation <orientation>')
      .option('--force')
      .option('--generate')
      .option('--fail-on-violations')
      .action(this.layoutArchitecture.bind(this, program));
    program
      .command('clean')
      .description('Remove regenerable artifacts.')
      .option('--confirm')
      .action(this.cleanArtifacts.bind(this, program));
    program
      .command('view')
      .description('Serve generated diagrams and persist viewer changes.')
      .option('--host <host>', 'Host interface for the local viewer.', '127.0.0.1')
      .option('--port <port>', 'Port for the local viewer. Use 0 for an available port.', '4173')
      .option('--open', 'Open the viewer in the default browser.')
      .option('--fail-on-violations')
      .action(this.viewArtifacts.bind(this, program));

    return program;
  }

  /**
   * Loads the selected workspace before architecture-rule evaluation is connected in the next phase.
   *
   * @param rootCommand - Root Commander program carrying global options.
   * @returns A promise that resolves after the workspace selection summary is reported.
   */
  private async loadWorkspaceForValidation(rootCommand: Command): Promise<void> {
    this.applyLogLevel(rootCommand);
    const globalOptions = rootCommand.opts<AtlasGlobalOptions>();
    const commandResult = await this.validationWorkflow.execute({
      invocationDirectoryPath: process.cwd(),
      workspaceOption: globalOptions?.workspace,
      configurationOption: globalOptions?.config,
      outputOption: globalOptions?.output
    });

    this.presentValidation(commandResult.validation);

    if (commandResult.validation.hasErrors()) {
      throw new ValidationCommandFailure();
    }
  }

  /**
   * Generates semantic graph artifacts after validation unless the command explicitly bypasses enforcement.
   *
   * @param rootCommand - Root Commander program carrying global options.
   * @param options - Generate command options parsed by Commander.
   * @returns A promise that resolves after generation output has been reported.
   */
  private async generateArchitecture(
    rootCommand: Command,
    options: AtlasGenerateOptions
  ): Promise<void> {
    this.applyLogLevel(rootCommand);
    const globalOptions = rootCommand.opts<AtlasGlobalOptions>();
    const generationResult = await this.generationWorkflow.execute(
      {
        invocationDirectoryPath: process.cwd(),
        workspaceOption: globalOptions.workspace,
        configurationOption: globalOptions.config,
        outputOption: globalOptions.output
      },
      options.failOnViolations ?? false
    );
    this.presentValidation(generationResult.validationResult.validation);
    if (!generationResult.generated()) {
      throw new ValidationCommandFailure();
    }

    this.outputWriter.writeLine(
      `Generated ${generationResult.diagrams.length} diagram scope(s) under ${generationResult.validationResult.workspace.paths.artifactRootPath}.`
    );
    this.failAfterArtifactsIfRequired(
      generationResult.validationResult.validation,
      options.failOnViolations ?? false
    );
  }

  /**
   * Rebuilds one selected scope and persists its deterministic layout document.
   *
   * @param rootCommand - Root Commander program carrying global options.
   * @param scope - Selected landscape or package scope identifier.
   * @param options - Layout command options parsed by Commander.
   * @returns A promise that resolves after layout output has been reported.
   */
  private async layoutArchitecture(
    rootCommand: Command,
    scope: string,
    options: AtlasLayoutOptions
  ): Promise<void> {
    this.applyLogLevel(rootCommand);
    const globalOptions = rootCommand.opts<AtlasGlobalOptions>();
    const layoutResult = await this.layoutWorkflow.execute(
      {
        invocationDirectoryPath: process.cwd(),
        workspaceOption: globalOptions.workspace,
        configurationOption: globalOptions.config,
        outputOption: globalOptions.output
      },
      scope,
      this.toLayoutOverrides(options),
      options.generate ?? false,
      options.failOnViolations ?? false
    );
    this.presentValidation(layoutResult.validationResult.validation);
    const layout = layoutResult.layout;
    if (!layoutResult.completed() || layout === undefined) {
      throw new ValidationCommandFailure();
    }
    const settings = layoutResult.settings;
    if (settings === undefined) {
      throw new Error('Atlas completed layout persistence without resolved layout settings.');
    }
    this.outputWriter.writeLine(
      `Persisted layout for '${scope}': ${layoutResult.retainedNodeCount} retained, ${layoutResult.movedNodeCount} placed; ${settings.orientation}, rows ${settings.rows}, gaps ${settings.horizontalGap}/${settings.verticalGap}.`
    );
    this.failAfterArtifactsIfRequired(
      layoutResult.validationResult.validation,
      options.failOnViolations ?? false
    );
  }

  /**
   * Generates one selected diagram scope after validation unless the command bypasses enforcement.
   *
   * @param rootCommand - Root Commander program carrying global options.
   * @param scope - Selected landscape or package scope identifier.
   * @param options - Diagram command options parsed by Commander.
   * @returns A promise that resolves after scoped generation output has been reported.
   */
  private async generateDiagram(
    rootCommand: Command,
    scope: string,
    options: AtlasGenerateOptions
  ): Promise<void> {
    this.applyLogLevel(rootCommand);
    const globalOptions = rootCommand.opts<AtlasGlobalOptions>();
    const generationResult = await this.diagramWorkflow.execute(
      {
        invocationDirectoryPath: process.cwd(),
        workspaceOption: globalOptions.workspace,
        configurationOption: globalOptions.config,
        outputOption: globalOptions.output
      },
      scope,
      options.failOnViolations ?? false
    );
    this.presentValidation(generationResult.validationResult.validation);
    if (!generationResult.generated()) {
      throw new ValidationCommandFailure();
    }
    this.outputWriter.writeLine(`Generated diagram scope '${scope}'.`);
    this.failAfterArtifactsIfRequired(
      generationResult.validationResult.validation,
      options.failOnViolations ?? false
    );
  }

  /**
   * Converts command option strings into typed optional layout overrides.
   *
   * @param options - Commander-parsed layout options.
   * @returns Typed overrides ready for application workflow processing.
   */
  private toLayoutOverrides(options: AtlasLayoutOptions): LayoutOverrides {
    return new LayoutOverrides(
      this.toOrientation(options.orientation),
      this.toPositiveInteger(options.rows, '--rows'),
      this.toNonNegativeNumber(options.horizontalGap, '--horizontal-gap'),
      this.toNonNegativeNumber(options.verticalGap, '--vertical-gap'),
      options.force ?? false
    );
  }

  /**
   * Validates one optional layout orientation argument.
   *
   * @param orientation - Raw orientation value parsed by Commander.
   * @returns Valid orientation or undefined when no override was provided.
   */
  private toOrientation(orientation: string | undefined): 'horizontal' | 'vertical' | undefined {
    if (orientation === undefined) {
      return undefined;
    }
    if (orientation === 'horizontal' || orientation === 'vertical') {
      return orientation;
    }
    throw new Error("Atlas --orientation must be either 'horizontal' or 'vertical'.");
  }

  /**
   * Parses one optional positive whole-number command option.
   *
   * @param value - Raw command option value.
   * @param optionName - Display name used in a validation error.
   * @returns Parsed positive integer or undefined when omitted.
   */
  private toPositiveInteger(value: string | undefined, optionName: string): number | undefined {
    if (value === undefined) {
      return undefined;
    }
    const parsedValue = Number(value);
    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
      throw new Error(`Atlas ${optionName} must be a positive integer.`);
    }
    return parsedValue;
  }

  /**
   * Parses one optional non-negative numeric command option.
   *
   * @param value - Raw command option value.
   * @param optionName - Display name used in a validation error.
   * @returns Parsed finite non-negative number or undefined when omitted.
   */
  private toNonNegativeNumber(value: string | undefined, optionName: string): number | undefined {
    if (value === undefined) {
      return undefined;
    }
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      throw new Error(`Atlas ${optionName} must be a non-negative number.`);
    }
    return parsedValue;
  }

  /**
   * Removes regenerable artifact-root children only after explicit command confirmation.
   *
   * @param rootCommand - Root Commander program carrying global options.
   * @param options - Clean command options parsed by Commander.
   * @returns A promise that resolves after cleanup output has been reported.
   */
  private async cleanArtifacts(rootCommand: Command, options: AtlasCleanOptions): Promise<void> {
    this.applyLogLevel(rootCommand);
    if (!options.confirm) {
      throw new Error('Atlas clean requires --confirm because it removes generated artifacts.');
    }
    const globalOptions = rootCommand.opts<AtlasGlobalOptions>();
    const removedCount = await this.cleanWorkflow.execute({
      invocationDirectoryPath: process.cwd(),
      workspaceOption: globalOptions.workspace,
      configurationOption: globalOptions.config,
      outputOption: globalOptions.output
    });
    this.outputWriter.writeLine(`Removed ${removedCount} artifact-root item(s).`);
  }

  /**
   * Starts the local artifact viewer through the application-owned hosting workflow.
   *
   * @param rootCommand - Root Commander program carrying global workspace options.
   * @param options - Viewer host, port, and browser options parsed by Commander.
   * @returns A promise that resolves once the server is listening.
   */
  private async viewArtifacts(rootCommand: Command, options: AtlasViewOptions): Promise<void> {
    this.applyLogLevel(rootCommand);
    if (this.viewWorkflow === undefined) {
      throw new Error('Atlas artifact viewing is not configured for this command host.');
    }
    const globalOptions = rootCommand.opts<AtlasGlobalOptions>();
    const location = await this.viewWorkflow.execute(
      {
        invocationDirectoryPath: process.cwd(),
        workspaceOption: globalOptions.workspace,
        configurationOption: globalOptions.config,
        outputOption: globalOptions.output
      },
      options.host,
      this.toPort(options.port),
      options.open ?? false,
      options.failOnViolations ?? false
    );
    this.outputWriter.writeLine(`Atlas viewer running at ${location.url}`);
    this.outputWriter.writeLine('Press Ctrl+C to stop the viewer.');
  }

  /**
   * Parses and validates a local TCP port argument.
   *
   * @param value - Commander-provided port string.
   * @returns Integer port from zero through 65535.
   */
  private toPort(value: string): number {
    const port = Number(value);
    if (!Number.isInteger(port) || port < 0 || port > 65_535) {
      throw new Error('Atlas --port must be an integer from 0 through 65535.');
    }
    return port;
  }

  /**
   * Prints validation diagnostics consistently for every validation-capable command.
   *
   * @param validation - Completed deterministic policy outcome.
   * @returns Nothing after user-facing findings have been written.
   */
  private presentValidation(validation: ArchitectureValidationResult): void {
    for (const violation of validation.violations) {
      this.outputWriter.writeErrorLine(
        `[${violation.severity}] ${violation.ruleId}: ${violation.sourcePath} -> ${violation.targetPath}. ${violation.message}`
      );
    }
    this.outputWriter.writeLine(this.validationSummary(validation, false));
  }

  /**
   * Creates accurate count text that separates policy state from command enforcement.
   *
   * @param validation - Completed deterministic policy outcome.
   * @param enforcing - Indicates whether this command always enforces errors.
   * @returns Concise diagnostic summary.
   */
  private validationSummary(validation: ArchitectureValidationResult, enforcing: boolean): string {
    const errors = validation.violations.filter(
      (violation) => violation.severity === 'error'
    ).length;
    const warnings = validation.violations.length - errors;
    const state = errors === 0 ? 'Policy passed' : 'Policy violations found';
    return `${state}: ${errors} error(s), ${warnings} warning(s).${enforcing && errors > 0 ? ' Enforcement is enabled.' : ''} Report: validation/report.json.`;
  }

  /**
   * Ends an artifact-producing command only after it has persisted requested outputs.
   *
   * @param validation - Completed policy outcome.
   * @param failOnViolations - Indicates whether error violations must produce exit status one.
   * @returns Nothing when no enforced error exists.
   */
  private failAfterArtifactsIfRequired(
    validation: ArchitectureValidationResult,
    failOnViolations: boolean
  ): void {
    if (failOnViolations && validation.hasErrors()) {
      throw new ValidationCommandFailure();
    }
  }

  /**
   * Applies one validated global log-level option when the injected logger exposes control capability.
   *
   * @param rootCommand - Root Commander program carrying global options.
   */
  private applyLogLevel(rootCommand: Command): void {
    const level = rootCommand.opts<AtlasGlobalOptions>().logLevel;
    if (level === undefined) {
      return;
    }
    const controller = this.toLogLevelController();
    if (controller === undefined) {
      return;
    }
    controller.setMinimumLevel(this.toLogLevel(level));
  }

  /**
   * Narrows the injected logger to optional verbosity-control capability.
   *
   * @returns Logger controller, or undefined when the supplied logger cannot change levels.
   */
  private toLogLevelController(): AtlasLogLevelController | undefined {
    const candidate = this.logger as unknown;
    if (
      typeof candidate === 'object' &&
      candidate !== null &&
      'setMinimumLevel' in candidate &&
      typeof (candidate as { readonly setMinimumLevel?: unknown }).setMinimumLevel === 'function'
    ) {
      return candidate as AtlasLogLevelController;
    }
    return undefined;
  }

  /**
   * Validates one command-line diagnostic level value.
   *
   * @param level - Raw diagnostic severity supplied through the global option.
   * @returns Valid lower-case Atlas diagnostic severity.
   */
  private toLogLevel(level: string): AtlasLogLevel {
    if (
      level === 'trace' ||
      level === 'debug' ||
      level === 'info' ||
      level === 'warn' ||
      level === 'error'
    ) {
      return level;
    }
    throw new Error('Atlas --log-level must be trace, debug, info, warn, or error.');
  }
}

/**
 * Represents Atlas global command-line options after Commander parsing.
 */
interface AtlasGlobalOptions {
  /**
   * Optionally selects a workspace root path.
   */
  readonly workspace?: string;

  /**
   * Optionally selects a configuration file path.
   */
  readonly config?: string;

  /**
   * Optionally overrides the artifact output root.
   */
  readonly output?: string;

  /**
   * Optionally overrides the minimum emitted diagnostic severity.
   */
  readonly logLevel?: string;
}

/**
 * Represents generate-command options after Commander parsing.
 */
interface AtlasGenerateOptions {
  /**
   * Allows artifact regeneration despite error-severity architecture violations.
   */
  readonly failOnViolations?: boolean;
}

/**
 * Represents layout-command options after Commander parsing.
 */
interface AtlasLayoutOptions {
  /**
   * Optionally overrides the primary placement direction.
   */
  readonly orientation?: string;

  /**
   * Optionally overrides maximum generated nodes in each row.
   */
  readonly rows?: string;

  /**
   * Optionally overrides the horizontal visual gap.
   */
  readonly horizontalGap?: string;

  /**
   * Optionally overrides the vertical visual gap.
   */
  readonly verticalGap?: string;

  /**
   * Determines whether retained saved positions may be replaced.
   */
  readonly force?: boolean;

  /**
   * Determines whether graph and viewer artifacts are regenerated first.
   */
  readonly generate?: boolean;

  /**
   * Determines whether error violations fail after layout persistence.
   */
  readonly failOnViolations?: boolean;
}

/**
 * Represents clean-command options after Commander parsing.
 */
interface AtlasCleanOptions {
  /**
   * Explicitly authorizes removal of regenerable artifact-root children.
   */
  readonly confirm?: boolean;
}

/**
 * Represents viewer-command network and browser options after Commander parsing.
 */
interface AtlasViewOptions {
  /** Interface hostname or address for the constrained local server. */
  readonly host: string;

  /** TCP port string, where zero requests an operating-system-selected port. */
  readonly port: string;

  /** Determines whether the default browser opens after the server is ready. */
  readonly open?: boolean;

  /**
   * Determines whether error violations prevent server startup after generation.
   */
  readonly failOnViolations?: boolean;
}

/**
 * Signals that validation completed successfully but declared error-severity violations require a failing exit code.
 */
class ValidationCommandFailure extends Error {
  /**
   * Creates the sentinel error used to end a command with validation exit status one.
   */
  public constructor() {
    super('Atlas validation found error-severity rule violations.');
  }
}
