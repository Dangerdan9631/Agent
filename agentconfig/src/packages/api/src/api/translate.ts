/**
 * Options for the {@link IAgentConfigApi.translate} operation.
 *
 * The translate operation converts agent-native files from one target format
 * to another **in-place** within the same project directory, without going
 * through the `.agentconfig/` intermediate format. This is useful for
 * one-shot migrations between agent tools.
 *
 * @throws If `projectRoot` does not exist or is not a directory.
 * @throws If `sourceTarget` is not a registered target with an importer.
 * @throws If `destTarget` is not a registered generator target.
 *
 * @example
 * // Convert Cursor rules to GitHub Copilot instructions in the current project
 * const result = await api.translate({
 *   sourceTarget: 'cursor',
 *   destTarget: 'copilot',
 * });
 * console.log(`Translated ${result.fileCount} file(s)`);
 */
export interface TranslateOptions {
  /**
   * The registered target identifier whose native files will be read and
   * parsed as the translation source.
   *
   * Must correspond to a target that has an importer registered in the
   * plugin registry (i.e. it must support both generation and import).
   *
   * @example 'cursor'
   */
  sourceTarget: string;

  /**
   * The registered target identifier whose native file format will be
   * written as the translation output.
   *
   * Must correspond to a registered generator target.
   *
   * @example 'copilot'
   */
  destTarget: string;

  /**
   * The project root directory to read source files from and write
   * destination files to.
   *
   * Defaults to the current working directory. Both the source native
   * files and the generated output files are resolved relative to this path.
   */
  projectRoot?: string;
}

/**
 * The result of a {@link IAgentConfigApi.translate} operation.
 */
export interface TranslateResult {
  /**
   * The resolved absolute path of the project root used for the operation.
   */
  projectRoot: string;

  /**
   * The source target identifier that was read.
   */
  sourceTarget: string;

  /**
   * The destination target identifier that was written.
   */
  destTarget: string;

  /**
   * Number of instruction files that were translated.
   */
  instructionCount: number;

  /**
   * Number of agent definition files that were translated.
   */
  agentCount: number;

  /**
   * Total number of output files written to the project directory.
   *
   * This may be higher than `instructionCount + agentCount` if the
   * destination target emits additional supporting files
   * (e.g. index manifests or shared skill directories).
   */
  fileCount: number;
}
