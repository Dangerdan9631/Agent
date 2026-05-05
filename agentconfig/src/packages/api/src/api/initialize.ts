import type { DetectedAgent } from '../types/generator';

/**
 * Options for the {@link IAgentConfigApi.initialize} operation.
 *
 * The initialize operation bootstraps a new `.agentconfig/` directory by
 * scanning an existing project for agent-native files (e.g. `.cursor/rules/`,
 * `.github/copilot-instructions.md`) and importing them into the canonical
 * agentconfig format.
 *
 * @throws If `projectRoot` does not exist or is not a directory.
 * @throws If an `.agentconfig/` directory already exists at the resolved path.
 *
 * @example
 * const result = await api.initialize({ projectRoot: '/path/to/my-project' });
 * console.log(`Imported ${result.instructionCount} instruction(s) from`, result.detectedAgents);
 */
export interface InitializeOptions {
  /**
   * Absolute or relative path to the project root directory to scan.
   *
   * The operation searches this directory for agent-native configuration
   * files belonging to supported targets and converts them into the
   * `.agentconfig/` source format.
   */
  projectRoot: string;

  /**
   * Override for the destination `.agentconfig/` directory path.
   *
   * Defaults to `<projectRoot>/.agentconfig/`. The directory must not
   * already exist — initialization will throw if it does.
   */
  configPath?: string;

  /**
   * Restricts import to agent-native files belonging to specific targets.
   *
   * When omitted, all detected agents are imported. Use this to selectively
   * import from only one agent when migrating incrementally.
   *
   * @example ['cursor']
   */
  target?: string[];
}

/**
 * The result of a {@link IAgentConfigApi.initialize} operation.
 *
 * When no agent-native files are found, `detectedAgents` is empty and
 * the counts are zero — no `.agentconfig/` directory is created.
 */
export interface InitializeResult {
  /**
   * The resolved absolute path of the project root directory that was scanned.
   */
  sourceDir: string;

  /**
   * The absolute path of the `.agentconfig/` directory that was created.
   *
   * If no agents were detected this path reflects where the directory
   * *would* have been created, but the directory itself is not written.
   */
  configDir: string;

  /**
   * Agents whose native configuration files were found in `sourceDir`.
   *
   * Each entry includes a confidence level: `'high'` when a sentinel
   * directory was found (e.g. `.cursor/`), `'low'` when only a shared
   * root file was detected.
   */
  detectedAgents: DetectedAgent[];

  /**
   * Number of instruction files written to `.agentconfig/instructions/`.
   */
  instructionCount: number;

  /**
   * Number of agent definition files written to `.agentconfig/agents/`.
   */
  agentCount: number;
}
