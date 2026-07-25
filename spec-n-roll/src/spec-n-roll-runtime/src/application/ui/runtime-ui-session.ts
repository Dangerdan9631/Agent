import type { FrameworkUpdateOutput } from '#runtime/application/update/global-framework-updater.js';
import type { RuntimeUiMode } from '#runtime/application/ui/runtime-ui-mode-resolver.js';
import type {
  AgentExtensionRegistration,
  ProjectFrameworkUpdateAvailability,
} from 'spec-n-roll-sdk';
import type { DispatcherMetadata, RuntimeTarget } from 'spec-n-roll-api';

/**
 * Describes the project context and commands available to one interactive session.
 */
export interface RuntimeUiSession {
  /** Invocation mode that selects the initial home route. */ readonly mode: RuntimeUiMode;
  /** Package metadata for the dispatcher that launched this session. */ readonly dispatcher: DispatcherMetadata;
  /** Executable and package metadata for the selected runtime. */ readonly runtime: RuntimeTarget;
  /** Absolute working directory selected for the runtime process. */ readonly cwd: string;
  /** Absolute discovered project root, when one exists. */ readonly projectRoot?: string;
  /** Whether the configured root already contains a project. */ readonly projectFound: boolean;
  /** Checks whether the project operation root now contains Spec-N-Roll configuration. */ readonly projectExists: () => boolean;
  /** Creates the project at the configured root with selected built-in agents. */ readonly initializeProject: (
    agents: readonly string[],
  ) => void;
  /** Updates built-in agent extensions at the configured initialized project root. */ readonly configureBuiltInAgents: (
    agents: readonly string[],
  ) => void;
  /** Updates the project-local framework at the configured root. */ readonly updateProjectFramework: () => void;
  /** Availability for a project framework update. */ readonly projectUpdate: ProjectFrameworkUpdateAvailability;
  /** Updates the dispatcher framework installation without ending the current UI session. */ readonly updateGlobalFramework: (
    output: FrameworkUpdateOutput,
  ) => Promise<void>;
  /** Restarts the runtime through its dispatcher after a completed global update. */ readonly reloadRuntime: () => void;
  /** Availability for a global framework update. */ readonly globalUpdate: ProjectFrameworkUpdateAvailability;
  /** Lists configured agent extensions for the active project. */ readonly listAgents: () => Promise<
    readonly AgentExtensionRegistration[]
  >;
}
