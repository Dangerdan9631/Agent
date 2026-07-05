import { Command } from 'commander';
import { inject, injectable } from 'tsyringe';

import { LOGGER_FACTORY } from '../../di/tokens.js';
import { updateSpecFrontmatter } from '../../sdk/core/frontmatter.js';
import { resolveTaskSpecSlug } from '../../sdk/core/task-lifecycle.js';
import type { Logger, LoggerFactory } from '../../sdk/logging/index.js';
import type { CliCommand } from './cli-command.js';
import { exitOnCoreError, parseKeyValuePairs } from './core-cli-utils.js';

/**
 * Registers and handles the `spec frontmatter update` CLI subcommand.
 */
@injectable()
export class SpecFrontmatterUpdateCommand implements CliCommand {
  private readonly output: Logger;

  constructor(@inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
    this.output = loggerFactory.create('SpecFrontmatterUpdateCommand', { plain: true });
  }

  register(command: Command): void {
    command
      .command('update')
      .description('Merge non-status fields into spec.md frontmatter')
      .requiredOption('--task-spec-id <id>', 'Numeric task spec id')
      .option('--field <pair...>', 'Frontmatter key=value pairs')
      .action(async (options: { taskSpecId: string; field?: string[] }) => {
        try {
          const slug = await resolveTaskSpecSlug(process.cwd(), options.taskSpecId);
          const fields = parseKeyValuePairs(options.field);
          const result = await updateSpecFrontmatter(
            process.cwd(),
            options.taskSpecId,
            slug,
            fields,
          );
          this.output.info(JSON.stringify(result, null, 2));
        } catch (error) {
          exitOnCoreError(error, this.output);
        }
      });
  }
}
