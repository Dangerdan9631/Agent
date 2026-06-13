import { Command } from 'commander';

import { registerSpecFrontmatterUpdateCommand } from './spec-frontmatter-update.js';

/**
 * Registers the `spec frontmatter` command group and its subcommands.
 *
 * @param spec - Commander `spec` command to attach the group to.
 */
export function registerSpecFrontmatterCommand(spec: Command): void {
  const frontmatter = spec.command('frontmatter').description('Non-status frontmatter updates');

  registerSpecFrontmatterUpdateCommand(frontmatter);
}
