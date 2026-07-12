import type { ExtensionConfiguration } from 'spec-n-roll-api';

/**
 * Reads the enabled-state configuration for extensions installed in a project.
 */
export interface ExtensionDiscoverer {
  /**
   * Reads configured extension types and their enabled state without loading extension modules.
   *
   * @param projectRoot - Absolute project root containing the Spec-N-Roll configuration directory.
   * @returns Persisted extension configuration for the project.
   */
  discover(projectRoot: string): Promise<ExtensionConfiguration>;
}
