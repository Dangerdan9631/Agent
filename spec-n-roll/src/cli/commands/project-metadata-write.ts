import { Command } from 'commander';
import { inject, injectable } from 'tsyringe';

import { LOGGER_FACTORY } from '../../di/tokens.js';
import { writeProjectMetadata } from '../../sdk/core/project-metadata.js';
import { resolveTaskSpecSlug } from '../../sdk/core/task-lifecycle.js';
import type { Logger, LoggerFactory } from '../../sdk/logging/index.js';
import type { CliCommand } from './cli-command.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Registers and handles the `project metadata write` CLI subcommand.
 */
@injectable()
export class ProjectMetadataWriteCommand implements CliCommand {
  private readonly output: Logger;

  constructor(@inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
    this.output = loggerFactory.create('ProjectMetadataWriteCommand', { plain: true });
  }

  register(command: Command): void {
    command
      .command('write')
      .description('Update project-metadata.json fields')
      .option('--next-task-spec-id <n>', 'Next task spec id counter', (value) => Number(value))
      .option('--current-task-spec-id <id>', 'Current implementation task spec id')
      .option('--implementation-started-at <iso>', 'Implementation start timestamp')
      .action(
        async (options: {
          nextTaskSpecId?: number;
          currentTaskSpecId?: string;
          implementationStartedAt?: string;
        }) => {
          try {
            const currentTaskSlug =
              options.currentTaskSpecId != null
                ? await resolveTaskSpecSlug(process.cwd(), options.currentTaskSpecId)
                : undefined;
            const result = await writeProjectMetadata(process.cwd(), {
              nextTaskSpecId: options.nextTaskSpecId,
              currentTaskSpecId: options.currentTaskSpecId ?? undefined,
              currentTaskSlug,
              implementationStartedAt: options.implementationStartedAt ?? undefined,
            });
            this.output.info(JSON.stringify(result, null, 2));
          } catch (error) {
            exitOnCoreError(error, this.output);
          }
        },
      );
  }
}
