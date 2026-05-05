import type { GenerateOptions } from './generate';
import type { ValidateOptions, ValidateResult } from './validate';
import type { DiffOptions, DiffResult } from './diff';
import type { InitializeOptions, InitializeResult } from './initialize';
import type { ImportOptions, ImportResult } from './import';
import type { TranslateOptions, TranslateResult } from './translate';
import type { ListTargetsOptions, ListTargetsResult } from './list-targets';

/**
 * The publicly available API surface of the agentconfig core library.
 *
 * `IAgentConfigApi` is the primary contract between consumers and the
 * agentconfig runtime. Each method maps 1-to-1 with a top-level CLI command
 * exposed by the `agentconfig` CLI package.
 *
 * Implementations are responsible for all orchestration: loading configuration,
 * parsing `.agentconfig/` source files into an intermediate representation,
 * running generators, and writing output files.
 *
 * @example
 * import type { IAgentConfigApi } from 'agentconfig-api';
 *
 * // Implement the interface to provide a custom agentconfig runtime:
 * class MyAgentConfigApi implements IAgentConfigApi {
 *   async generate(options) { ... }
 *   async validate(options) { ... }
 *   // ...
 * }
 */
export interface IAgentConfigApi {
  /**
   * Generate agent-native directive files from the `.agentconfig/` directory.
   *
   * Reads the source configuration, validates it, builds the intermediate
   * representation, runs all requested generators, and writes the resulting
   * files to the configured output directory.
   *
   * When {@link GenerateOptions.watch} is `true` the returned promise resolves
   * once the initial generation completes and the file watcher is established.
   * Subsequent regenerations are reported via {@link GenerateOptions.onEvent}.
   *
   * Corresponds to `agentconfig generate`.
   *
   * @param options - Controls which config directory and targets to use,
   *   whether to run in watch mode, and how to receive progress events.
   * @throws If the configuration contains validation errors that prevent
   *   generation from proceeding.
   *
   * @example
   * await api.generate({ targets: ['cursor', 'copilot'] });
   */
  generate(options: GenerateOptions): Promise<void>;

  /**
   * Validate the `.agentconfig/` directory and return all diagnostics.
   *
   * Reads and parses the configuration, then runs the full validator rule set.
   * Does **not** write any files. Useful for CI checks and editor integrations.
   *
   * Corresponds to `agentconfig validate`.
   *
   * @param options - Specifies the `.agentconfig/` directory to validate.
   * @returns A {@link ValidateResult} containing all diagnostics. An empty
   *   `results` array indicates a fully valid configuration.
   *
   * @example
   * const { results } = await api.validate({});
   * const hasErrors = results.some(r => r.level === 'error');
   */
  validate(options: ValidateOptions): Promise<ValidateResult>;

  /**
   * Compute the diff between what would be generated and the current on-disk state.
   *
   * Performs the same parse and generation pipeline as {@link generate} but
   * compares the output against existing files instead of writing them.
   * No files are modified. Exits with a non-empty `diff` array when changes
   * are pending — useful for CI enforcement of "generated files are up to date".
   *
   * Corresponds to `agentconfig diff`.
   *
   * @param options - Specifies the config directory, target filter, and
   *   optional output directory override to diff against.
   * @returns A {@link DiffResult} containing per-file comparison entries and
   *   the resolved output directory path.
   *
   * @example
   * const { diff } = await api.diff({});
   * if (diff.some(e => e.action !== 'unchanged')) {
   *   process.exit(1); // Generated files are stale
   * }
   */
  diff(options: DiffOptions): Promise<DiffResult>;

  /**
   * Bootstrap a new `.agentconfig/` directory from existing agent-native files.
   *
   * Scans the given project root for agent-native configuration files (e.g.
   * `.cursor/rules/`, `.github/copilot-instructions.md`), imports them into
   * the agentconfig intermediate representation, and writes the canonical
   * `.agentconfig/` source structure. Intended as a one-time migration step.
   *
   * When no agent-native files are detected the operation is a no-op and
   * the returned counts are zero.
   *
   * Corresponds to `agentconfig init`.
   *
   * @param options - Specifies the project root to scan, the optional
   *   destination path, and an optional target filter.
   * @returns An {@link InitializeResult} describing what was detected and created.
   * @throws If `projectRoot` does not exist or is not a directory.
   * @throws If an `.agentconfig/` directory already exists at the destination.
   *
   * @example
   * const result = await api.initialize({ projectRoot: process.cwd() });
   * console.log(`Created ${result.configDir} with ${result.instructionCount} instruction(s).`);
   */
  initialize(options: InitializeOptions): Promise<InitializeResult>;

  /**
   * Merge the contents of a source `.agentconfig/` directory into this project.
   *
   * Reads the source configuration and instruction/agent files, then writes
   * them into the destination `.agentconfig/` directory without overwriting
   * existing files. The destination's `agentconfig.yaml` target list is
   * expanded to include any targets present only in the source.
   *
   * Corresponds to `agentconfig import`.
   *
   * @param options - Specifies the source directory and optional destination path.
   * @returns An {@link ImportResult} with the resolved paths and item counts.
   *
   * @example
   * const result = await api.import({ sourceDir: '../shared-standards' });
   * console.log(`Merged ${result.instructionCount} instruction(s) into ${result.destConfigDir}`);
   */
  import(options: ImportOptions): Promise<ImportResult>;

  /**
   * Translate agent-native files from one target format to another in-place.
   *
   * Reads files belonging to `sourceTarget` from the project directory,
   * converts them through the agentconfig intermediate representation,
   * and writes the result as `destTarget` native files — all within the
   * same project directory. Useful for one-shot migrations between agent tools.
   *
   * Corresponds to `agentconfig translate`.
   *
   * @param options - Specifies the source and destination target identifiers
   *   and the project root directory to operate on.
   * @returns A {@link TranslateResult} with the resolved paths, target names,
   *   and the number of files written.
   * @throws If `projectRoot` does not exist or is not a directory.
   * @throws If `sourceTarget` has no registered importer.
   * @throws If `destTarget` is not a registered generator.
   *
   * @example
   * const result = await api.translate({ sourceTarget: 'cursor', destTarget: 'copilot' });
   * console.log(`Wrote ${result.fileCount} Copilot file(s) to ${result.projectRoot}`);
   */
  translate(options: TranslateOptions): Promise<TranslateResult>;

  /**
   * List all generator targets registered with the agentconfig runtime.
   *
   * Returns every built-in target plus any plugin-contributed targets loaded
   * from the global config or (when `options.configPath` is provided) from
   * the project's local plugin declarations.
   *
   * Corresponds to `agentconfig list-targets`.
   *
   * @param options - Optional. When provided, project-local plugins are loaded
   *   before the list is returned so that project-specific targets appear.
   * @returns A {@link ListTargetsResult} containing all registered targets in
   *   registration order.
   *
   * @example
   * const { targets } = await api.listTargets();
   * targets.forEach(t => console.log(`${t.target.padEnd(20)} ${t.displayName}`));
   */
  listTargets(options?: ListTargetsOptions): Promise<ListTargetsResult>;
}
