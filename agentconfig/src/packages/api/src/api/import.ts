/**
 * Options for the {@link IAgentConfigApi.import} operation.
 *
 * The import operation merges the contents of a source `.agentconfig/`
 * directory into the current project's `.agentconfig/` directory.
 * Existing files are not overwritten; new files are added and the
 * target list in `agentconfig.yaml` is expanded with any new entries.
 *
 * @example
 * // Merge shared instructions from a team standards repo
 * await api.import({ sourceDir: '../shared-agentconfig' });
 */
export interface ImportOptions {
  /**
   * Path to the source project directory that contains (or is adjacent to)
   * the `.agentconfig/` directory whose contents should be imported.
   *
   * The implementation resolves the actual `.agentconfig/` subdirectory
   * automatically — pass the project root, not the `.agentconfig/` path itself.
   */
  sourceDir: string;

  /**
   * Path to the destination `.agentconfig/` directory to merge into.
   *
   * When omitted the implementation auto-detects the `.agentconfig/` directory
   * by walking up from the current working directory, or creates a new one at
   * `<cwd>/.agentconfig/` if none is found.
   */
  configPath?: string;
}

/**
 * The result of a {@link IAgentConfigApi.import} operation.
 *
 * Reports the resolved source and destination paths and the number of items
 * that were merged. Counts reflect files added to the destination; files
 * that already existed and were skipped are not counted.
 */
export interface ImportResult {
  /**
   * Absolute path to the `.agentconfig/` directory that was read from.
   */
  sourceConfigDir: string;

  /**
   * Absolute path to the `.agentconfig/` directory that was written to.
   */
  destConfigDir: string;

  /**
   * Number of instruction files added to `destConfigDir/instructions/`.
   */
  instructionCount: number;

  /**
   * Number of agent definition files added to `destConfigDir/agents/`.
   */
  agentCount: number;
}
