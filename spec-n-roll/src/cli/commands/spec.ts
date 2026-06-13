import { Command } from 'commander';

import { registerSpecFrontmatterCommand } from './spec-frontmatter.js';

/**
 * Registers the `spec` command group and its subcommands on the root Commander program.
 *
 * @param program - Root Commander program to attach commands to.
 */
export function registerSpecCommand(program: Command): void {
  const spec = program.command('spec').description('spec.md frontmatter operations');

  registerSpecFrontmatterCommand(spec);
}
