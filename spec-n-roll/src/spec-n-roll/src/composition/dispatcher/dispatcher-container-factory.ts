import 'reflect-metadata';
import { container, type DependencyContainer } from 'tsyringe';
import { Logger } from 'tslog';
import { DispatcherApplication } from '#dispatcher/application/dispatch/dispatcher-application.js';
import { DispatcherCli } from '#dispatcher/presentation/cli/dispatcher-cli.js';
import type { DispatcherEnvironment } from '#dispatcher/infrastructure/environment/dispatcher-environment.js';
import {
  dispatcherEnvironmentToken,
  dispatcherLoggerToken,
  runtimeProcessExecutorToken,
} from '#dispatcher/composition/dispatcher/dispatcher-injection-tokens.js';
import { NodeRuntimeProcessExecutor } from '#dispatcher/infrastructure/runtime/node-runtime-process-executor.js';
import { ProcessDispatcherEnvironment } from '#dispatcher/infrastructure/environment/process-dispatcher-environment.js';
import { ProjectRootResolver } from '#dispatcher/application/project/project-root-resolver.js';
import type { RuntimeProcessExecutor } from '#dispatcher/application/runtime/runtime-process-executor.js';

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
          dependencyContainer.resolve(ProjectRootResolver),
          dependencyContainer.resolve<RuntimeProcessExecutor>(
            runtimeProcessExecutorToken,
          ),
          dependencyContainer.resolve<Logger>(dispatcherLoggerToken),
        ),
    });
    commandContainer.register(DispatcherCli, {
      useFactory: (dependencyContainer) =>
        new DispatcherCli(dependencyContainer.resolve(DispatcherApplication)),
    });

    return commandContainer;
  }
}
