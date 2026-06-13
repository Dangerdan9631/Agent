import { Command } from 'commander';

import { writeProjectMetadata } from '../../core/project-metadata.js';
import { resolveTaskSpecSlug } from '../../core/task-lifecycle.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Registers the `project metadata write` subcommand on the project metadata command group.
 *
 * @param metadata - Commander `project metadata` command to attach the subcommand to.
 */
export function registerProjectMetadataWriteCommand(metadata: Command): void {
  metadata
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
          console.log(JSON.stringify(result, null, 2));
        } catch (error) {
          exitOnCoreError(error);
        }
      },
    );
}
