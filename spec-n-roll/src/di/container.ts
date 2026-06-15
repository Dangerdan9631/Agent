import { container, type DependencyContainer } from 'tsyringe';

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
