import type { RuntimeUiMode } from '#runtime/application/ui/runtime-ui-mode-resolver.js';
import type { DispatcherMetadata, RuntimeTarget } from 'spec-n-roll-api';

/**
 * Describes the project context and commands available to one interactive session.
 */
export interface RuntimeUiSession {
  /**
   * Invocation mode that selects the initial home route.
   */
  readonly mode: RuntimeUiMode;
  /**
   * Package metadata for the dispatcher that launched this session.
   */
  readonly dispatcher: DispatcherMetadata;
  /**
   * Executable and package metadata for the selected runtime.
   */
  readonly runtime: RuntimeTarget;
  /**
   * Absolute working directory selected for the runtime process.
   */
  readonly cwd: string;
  /**
   * Absolute discovered project root, when one exists.
   */
  readonly projectRoot?: string;
  /**
   * Whether the configured root already contains a project.
   */
  readonly projectFound: boolean;
  /**
   * Checks whether the project operation root now contains Spec-N-Roll configuration.
   */
  readonly projectExists: () => boolean;
  /**
   * Creates the project at the configured root.
   */
  readonly initializeProject: () => void;
}
