/**
 * Creates the project-local Spec-N-Roll configuration and runtime installation.
 */
export interface ProjectInitializer {
  /**
   * Determines whether a root already contains a Spec-N-Roll project.
   *
   * @param projectRoot - Absolute project root to inspect.
   * @returns true when the project configuration directory exists.
   */
  projectExists(projectRoot: string): boolean;

  /**
   * Initializes a project from the globally installed runtime binary.
   *
   * @param projectRoot - Absolute project root that receives the configuration.
   */
  initialize(projectRoot: string): void;
}
