import type { RuntimeUiMode } from '#runtime/application/ui/runtime-ui-mode-resolver.js';

/**
 * Describes the project context and commands available to one interactive session.
 */
export interface RuntimeUiSession {
  /**
   * Invocation mode that selects the initial home route.
   */
  readonly mode: RuntimeUiMode;
  /**
   * Absolute root configured for project operations.
   */
  readonly projectRoot: string;
  /**
   * Whether the configured root already contains a project.
   */
  readonly projectFound: boolean;
  /**
   * Creates the project at the configured root.
   */
  readonly initializeProject: () => void;
}
