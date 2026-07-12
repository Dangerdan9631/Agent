import { Logger } from 'tslog';
import { RuntimeInvocationParser } from '#runtime/application/invocation/runtime-invocation-parser.js';
import type { RuntimeInvocationReader } from '#runtime/application/invocation/runtime-invocation-reader.js';
import type { RuntimeUiRenderer } from '#runtime/application/ui/runtime-ui-renderer.js';
import { RuntimeUiModeResolver } from '#runtime/application/ui/runtime-ui-mode-resolver.js';
import { InitCommandResolver } from '#runtime/application/init/init-command-resolver.js';
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
    });
  }
}
