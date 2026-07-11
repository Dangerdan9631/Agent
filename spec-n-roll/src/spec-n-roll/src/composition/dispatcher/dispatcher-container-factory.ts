import 'reflect-metadata';
import { container, type DependencyContainer } from 'tsyringe';
import { Logger } from 'tslog';
import { DispatcherApplication } from '#dispatcher/application/dispatch/dispatcher-application.js';
import type { DispatcherEnvironment } from '#dispatcher/application/environment/dispatcher-environment.js';
import type { DispatcherFileSystem } from '#dispatcher/application/filesystem/dispatcher-file-system.js';
import { DispatcherMetadataResolver } from '#dispatcher/application/metadata/dispatcher-metadata-resolver.js';
import { ProjectRootResolver } from '#dispatcher/application/project/project-root-resolver.js';
import type { RuntimePackageManifestPathResolver } from '#dispatcher/application/runtime/runtime-package-manifest-path-resolver.js';
import { DispatcherCli } from '#dispatcher/presentation/cli/dispatcher-cli.js';
import {
  dispatcherEnvironmentToken,
  dispatcherFileSystemToken,
  dispatcherLoggerToken,
  runtimePackageManifestPathResolverToken,
  runtimeProcessExecutorToken,
} from '#dispatcher/composition/dispatcher/dispatcher-injection-tokens.js';
import { NodeRuntimeProcessExecutor } from '#dispatcher/infrastructure/runtime/node-runtime-process-executor.js';
import { ProcessDispatcherEnvironment } from '#dispatcher/infrastructure/environment/process-dispatcher-environment.js';
import { NodeDispatcherFileSystem } from '#dispatcher/infrastructure/filesystem/node-dispatcher-file-system.js';
import { NodeRuntimePackageManifestPathResolver } from '#dispatcher/infrastructure/module/node-runtime-package-manifest-path-resolver.js';
import type { RuntimeProcessExecutor } from '#dispatcher/application/runtime/runtime-process-executor.js';
import { RuntimeTargetResolver } from '#dispatcher/application/runtime/runtime-target-resolver.js';

/**
 * Creates dependency containers for dispatcher command invocations.
 */
export class DispatcherContainerFactory {
  /**
   * Creates a dependency container for one dispatcher command invocation.
   *
   * @returns A child dependency container with dispatcher services registered.
   */
  create(): DependencyContainer {
    const commandContainer = container.createChildContainer();

    commandContainer.registerInstance(
      dispatcherLoggerToken,
      new Logger({ name: 'spec-n-roll', minLevel: 6 }),
    );
    commandContainer.register<DispatcherEnvironment>(
      dispatcherEnvironmentToken,
      { useClass: ProcessDispatcherEnvironment },
    );
    commandContainer.register<DispatcherFileSystem>(dispatcherFileSystemToken, {
      useClass: NodeDispatcherFileSystem,
    });
    commandContainer.register<RuntimePackageManifestPathResolver>(
      runtimePackageManifestPathResolverToken,
      { useClass: NodeRuntimePackageManifestPathResolver },
    );
    commandContainer.register<RuntimeProcessExecutor>(
      runtimeProcessExecutorToken,
      {
        useFactory: (dependencyContainer) =>
          new NodeRuntimeProcessExecutor(
            dependencyContainer.resolve<DispatcherEnvironment>(
              dispatcherEnvironmentToken,
            ),
          ),
      },
    );
    commandContainer.register(DispatcherApplication, {
      useFactory: (dependencyContainer) =>
        new DispatcherApplication(
          dependencyContainer.resolve<DispatcherEnvironment>(
            dispatcherEnvironmentToken,
          ),
          new ProjectRootResolver(
            dependencyContainer.resolve<DispatcherFileSystem>(
              dispatcherFileSystemToken,
            ),
          ),
          new DispatcherMetadataResolver(
            dependencyContainer.resolve<DispatcherFileSystem>(
              dispatcherFileSystemToken,
            ),
          ),
          new RuntimeTargetResolver(
            dependencyContainer.resolve<DispatcherFileSystem>(
              dispatcherFileSystemToken,
            ),
            dependencyContainer.resolve<RuntimePackageManifestPathResolver>(
              runtimePackageManifestPathResolverToken,
            ),
          ),
          dependencyContainer.resolve<RuntimeProcessExecutor>(
            runtimeProcessExecutorToken,
          ),
          dependencyContainer.resolve<Logger<unknown>>(dispatcherLoggerToken),
        ),
    });
    commandContainer.register(DispatcherCli, {
      useFactory: (dependencyContainer) =>
        new DispatcherCli(dependencyContainer.resolve(DispatcherApplication)),
    });

    return commandContainer;
  }
}
