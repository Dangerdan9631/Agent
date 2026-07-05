import { container, type DependencyContainer } from 'tsyringe';

import { DefaultInteractiveAppServices } from '../ink/app/services.js';
import { CoreMcpTools } from '../mcp/tools.js';
import { RepositoryWorkflowReportViewService } from '../sdk/interactive/repository-workflows.js';
import { ConsoleLoggerFactory } from '../sdk/logging/index.js';
import { INTERACTIVE_APP_SERVICES, LOGGER_FACTORY, MCP_TOOL } from './tokens.js';

/**
 * Application-wide tsyringe container used for service registration and resolution.
 */
export const rootContainer: DependencyContainer = container;

/**
 * Tracks whether the composition root has already registered application services.
 */
let applicationServicesRegistered = false;

import { registerCliCommands } from '../cli/commands/register-cli-commands.js';

/**
 * Registers application services on the root container.
 * Safe to call multiple times; subsequent calls are no-ops.
 */
export function registerApplicationServices(): void {
  if (applicationServicesRegistered) {
    return;
  }

  rootContainer.register(LOGGER_FACTORY, { useClass: ConsoleLoggerFactory });
  rootContainer.register(RepositoryWorkflowReportViewService, {
    useClass: RepositoryWorkflowReportViewService,
  });
  rootContainer.register(INTERACTIVE_APP_SERVICES, { useClass: DefaultInteractiveAppServices });
  rootContainer.register(MCP_TOOL, { useClass: CoreMcpTools });
  registerCliCommands();
  applicationServicesRegistered = true;
}

/**
 * Clears all registrations from the root container for test isolation.
 */
export function resetApplicationContainer(): void {
  rootContainer.reset();
  applicationServicesRegistered = false;
}
