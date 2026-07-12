/**
 * Migrates one project's persisted configuration to the current runtime schema.
 */
export interface ProjectConfigurationMigrator {
  /**
   * Loads and saves every configuration file owned by the current runtime.
   *
   * @param projectRoot - Absolute project root containing `.spec-n-roll`.
   */
  migrate(projectRoot: string): void;
}
