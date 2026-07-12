import { Logger } from 'tslog';
import type { AgentLister } from 'spec-n-roll-sdk';
import type { RuntimeOutputWriter } from '#runtime/application/output/runtime-output-writer.js';
import { RuntimeInvocationParser } from '#runtime/application/invocation/runtime-invocation-parser.js';
import type { RuntimeInvocationReader } from '#runtime/application/invocation/runtime-invocation-reader.js';
import type { RuntimeUiRenderer } from '#runtime/application/ui/runtime-ui-renderer.js';
import { RuntimeUiModeResolver } from '#runtime/application/ui/runtime-ui-mode-resolver.js';
import { InitCommandResolver } from '#runtime/application/init/init-command-resolver.js';
import type { GlobalFrameworkUpdater } from '#runtime/application/update/global-framework-updater.js';
import type { RuntimeReloader } from '#runtime/application/update/runtime-reloader.js';
import { FrameworkUpdateAvailabilityResolver } from '#runtime/application/update/framework-update-availability-resolver.js';
import type { ProjectInitializer } from '#runtime/application/init/project-initializer.js';

/**
 * Runs the runtime stub implementation.
 */
export class RuntimeApplication {
  /**
   * Creates a runtime application.
   *
   * @param reader - Input reader for dispatcher invocation JSON.
   * @param parser - Parser and validator for invocation payloads.
   * @param renderer - Interactive terminal UI presentation boundary.
   * @param projectInitializer - Project detection and local CLI installation boundary.
   * @param modeResolver - Resolver for global and local home selection.
   * @param initCommandResolver - Resolver for direct init command arguments.
   * @param logger - Logger used to report the invocation configuration received.
   */
  constructor(
    private readonly reader: RuntimeInvocationReader,
    private readonly parser: RuntimeInvocationParser,
    private readonly renderer: RuntimeUiRenderer,
    private readonly projectInitializer: ProjectInitializer,
    private readonly modeResolver = new RuntimeUiModeResolver(),
    private readonly initCommandResolver = new InitCommandResolver(),
    private readonly agentLister?: AgentLister,
    private readonly outputWriter?: RuntimeOutputWriter,
    private readonly globalFrameworkUpdater?: GlobalFrameworkUpdater,
    private readonly updateAvailabilityResolver = new FrameworkUpdateAvailabilityResolver(),
    private readonly runtimeReloader?: RuntimeReloader,
    private readonly logger = new Logger({
      name: 'spec-n-roll-runtime',
      minLevel: 6,
    }),
  ) {}

  /**
   * Executes the runtime stub by printing the dispatcher invocation.
   */
  async run(): Promise<void> {
    const invocation = this.parser.parse(this.reader.read());
    this.logger.debug('Received dispatcher invocation.', {
      argv: invocation.argv,
      cwd: invocation.cwd,
      projectRoot: invocation.projectRoot,
      dispatcherInstallSource: invocation.dispatcher.installSource,
    });
    const initRequest = this.initCommandResolver.resolve(
      invocation.argv,
      invocation.cwd,
      invocation.projectRoot,
    );
    if (initRequest != null) {
      this.logger.info('Initializing Spec-N-Roll project.', {
        projectRoot: initRequest.projectRoot,
      });
      this.projectInitializer.initialize(initRequest.projectRoot);
      return;
    }

    if (invocation.argv[0] === 'update') {
      await this.updateGlobalFramework(invocation, {
        write: (text) => this.outputWriter?.writeLine(text),
      });
      return;
    }

    if (invocation.argv[0] === 'agents' && invocation.argv[1] === 'list') {
      if (
        invocation.projectRoot == null ||
        this.agentLister == null ||
        this.outputWriter == null
      ) {
        throw new Error(
          'Agent listing requires a configured Spec-N-Roll project.',
        );
      }
      const agents = await this.agentLister.list(invocation.projectRoot);
      this.logger.info('Writing agent extension list.', {
        agentCount: agents.length,
      });
      this.outputWriter.writeLine('NAME\tSTATUS');
      for (const agent of agents)
        this.outputWriter.writeLine(
          agent.name + '\t' + (agent.enabled ? 'enabled' : 'disabled'),
        );
      return;
    }
    const projectOperationRoot = invocation.projectRoot ?? invocation.cwd;
    const projectFound =
      invocation.projectRoot != null &&
      this.projectInitializer.projectExists(invocation.projectRoot);
    const mode = projectFound
      ? this.modeResolver.resolve(invocation)
      : 'global';
    this.logger.debug('Launching interactive runtime UI.', {
      mode,
      projectRoot: invocation.projectRoot,
      projectFound,
    });
    const projectUpdate = this.updateAvailabilityResolver.project(
      invocation.dispatcher.installSource,
      invocation.runtime.packageVersion,
      invocation.dispatcher.packageVersion,
    );
    const globalUpdate = this.resolveGlobalUpdate(invocation);
    await this.renderer.render({
      mode,
      dispatcher: invocation.dispatcher,
      runtime: invocation.runtime,
      cwd: invocation.cwd,
      ...(invocation.projectRoot == null
        ? {}
        : { projectRoot: invocation.projectRoot }),
      projectFound,
      projectExists: () =>
        this.projectInitializer.projectExists(projectOperationRoot),
      initializeProject: () =>
        this.projectInitializer.initialize(projectOperationRoot),
      updateProjectFramework: () =>
        this.projectInitializer.upgrade(projectOperationRoot),
      projectUpdate,
      updateGlobalFramework: async (output) =>
        this.updateGlobalFramework(invocation, output),
      reloadRuntime: () => this.runtimeReloader?.reload(),
      globalUpdate,
      listAgents: async () => {
        if (invocation.projectRoot == null || this.agentLister == null)
          throw new Error(
            'Agent listing requires a configured Spec-N-Roll project.',
          );
        return this.agentLister.list(invocation.projectRoot);
      },
    });
  }

  /**
   * Updates the global framework while leaving interactive reload timing to the UI.
   *
   * @param invocation - Dispatcher invocation that selected this runtime.
   */
  private async updateGlobalFramework(
    invocation: import('spec-n-roll-api').RuntimeInvocation,
    output: import('#runtime/application/update/global-framework-updater.js').FrameworkUpdateOutput,
  ): Promise<void> {
    if (this.globalFrameworkUpdater == null)
      throw new Error('Global framework updates are unavailable.');
    this.logger.info('Updating global Spec-N-Roll framework.', {
      installSource: invocation.dispatcher.installSource,
      installDirectory: invocation.dispatcher.installDirectory,
    });
    await this.globalFrameworkUpdater.update(
      invocation.dispatcher.installSource,
      invocation.dispatcher.installDirectory,
      output,
    );
  }

  /**
   * Resolves whether the current global dispatcher source can be updated.
   *
   * @param invocation - Dispatcher invocation metadata for this runtime process.
   * @returns Global framework update availability.
   */
  private resolveGlobalUpdate(
    invocation: import('spec-n-roll-api').RuntimeInvocation,
  ): import('spec-n-roll-sdk').ProjectFrameworkUpdateAvailability {
    if (this.globalFrameworkUpdater == null)
      return {
        enabled: false,
        disabledReason: 'Global updates are unavailable.',
      };
    try {
      return this.globalFrameworkUpdater.isUpdateAvailable(
        invocation.dispatcher.installSource,
        invocation.dispatcher.packageVersion,
      )
        ? { enabled: true }
        : { enabled: false, disabledReason: 'Global framework is current.' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        'Unable to determine global framework update availability.',
        { message },
      );
      return {
        enabled: false,
        disabledReason: 'Unable to check npm for updates.',
      };
    }
  }
}
