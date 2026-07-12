/**
 * Upgrades a project-local Spec-N-Roll framework installation.
 */
export interface ProjectFrameworkUpgrader {
  /**
   * Replaces framework-owned project files and migrates supported configuration.
   *
   * @param projectRoot - Absolute project root containing `.spec-n-roll`.
   */
  upgrade(projectRoot: string): void;
}
