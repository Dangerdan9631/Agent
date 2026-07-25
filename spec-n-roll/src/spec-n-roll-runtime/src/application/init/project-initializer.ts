/**
 * Creates the project-local Spec-N-Roll configuration and runtime installation.
 */
export interface ProjectInitializer {
  /**
   * Determines whether the project configuration directory exists.
   *
   * @param projectRoot - Absolute project root to inspect.
   * @returns true when `.spec-n-roll` exists.
   */
  projectExists(projectRoot: string): boolean;

  /**
   * Creates a new project-local framework installation.
   *
   * @param projectRoot - Absolute project root that receives the configuration.
   * @param agents - Supported built-in agent names selected for the new project.
   */
  initialize(projectRoot: string, agents?: readonly string[]): void;

  /**
   * Reconciles built-in agent extensions with the selected project configuration.
   *
   * @param projectRoot - Absolute initialized project root to update.
   * @param agents - Supported built-in agent names that should remain enabled.
   */
  configureBuiltInAgents(projectRoot: string, agents: readonly string[]): void;

  /**
   * Replaces framework-owned files and migrates project configuration.
   *
   * @param projectRoot - Absolute existing project root to update.
   */
  upgrade(projectRoot: string): void;
}
