import { Logger } from 'tslog';
import { DispatcherMetadataReader } from '#dispatcher/infrastructure/metadata/dispatcher-metadata-reader.js';
import type { DispatcherEnvironment } from '#dispatcher/infrastructure/environment/dispatcher-environment.js';
import type { DispatcherRunRequest } from '#dispatcher/application/dispatch/dispatcher-run-request.js';
import { ProjectRootResolver } from '#dispatcher/application/project/project-root-resolver.js';
import { RuntimeTargetResolver } from '#dispatcher/application/runtime/runtime-target-resolver.js';
import type { RuntimeProcessExecutor } from '#dispatcher/application/runtime/runtime-process-executor.js';

/**
 * Coordinates project resolution, target selection, and runtime execution.
 */
export class DispatcherApplication {
  /**
   * Creates a dispatcher application.
   *
   * @param environment - Process environment abstraction for runtime values.
   * @param projectRootResolver - Resolver for project-root discovery.
   * @param metadataReader - Reader for dispatcher install metadata.
   * @param processExecutor - Executor for selected runtime targets.
   * @param logger - Logger used to report resolved configuration and routing decisions.
   */
  constructor(
    private readonly environment: DispatcherEnvironment,
    private readonly projectRootResolver: ProjectRootResolver,
    private readonly metadataReader: DispatcherMetadataReader,
    private readonly processExecutor: RuntimeProcessExecutor,
    private readonly logger: Logger,
  ) {}

  /**
   * Runs one dispatcher invocation.
   *
   * @param request - Parsed command options and full dispatcher argument list.
   * @returns Runtime process exit code.
   */
  run(request: DispatcherRunRequest): number {
    const installDirectory = this.environment.dispatcherInstallDirectory();
    const metadata = this.metadataReader.read(installDirectory);
    this.logger.debug('Resolved dispatcher install metadata.', metadata);

    const projectRoot = this.projectRootResolver.resolve({
      cwd: this.environment.cwd(),
      requestedProjectRoot: request.options.root,
    }).projectRoot;
    const cwd = projectRoot ?? this.environment.cwd();
    this.logger.debug('Resolved project root and working directory.', {
      projectRoot,
      cwd,
    });

    const forceGlobal = request.options.global === true;
    const target = new RuntimeTargetResolver(installDirectory).resolve(
      projectRoot,
      forceGlobal,
    );
    this.logger.info('Selected runtime target.', {
      executablePath: target.executablePath,
      projectLocal: target.projectLocal,
      forceGlobal,
    });

    return this.processExecutor.execute(target, {
      argv: request.argv,
      dispatcher: metadata,
      ...(projectRoot == null ? {} : { projectRoot }),
      cwd,
    });
  }
}
