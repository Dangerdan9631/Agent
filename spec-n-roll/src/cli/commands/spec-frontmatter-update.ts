import { Command } from 'commander';

import { updateSpecFrontmatter } from '../../core/frontmatter.js';
import { resolveTaskSpecSlug } from '../../core/task-lifecycle.js';
import { exitOnCoreError, parseKeyValuePairs } from './core-cli-utils.js';

/**
 * Registers the `spec frontmatter update` subcommand on the spec frontmatter command group.
 *
 * @param frontmatter - Commander `spec frontmatter` command to attach the subcommand to.
 */
export function registerSpecFrontmatterUpdateCommand(frontmatter: Command): void {
  frontmatter
    .command('update')
    .description('Merge non-status fields into spec.md frontmatter')
    .requiredOption('--task-spec-id <id>', 'Numeric task spec id')
    .option('--field <pair...>', 'Frontmatter key=value pairs')
    .action(async (options: { taskSpecId: string; field?: string[] }) => {
      try {
        const slug = await resolveTaskSpecSlug(process.cwd(), options.taskSpecId);
        const fields = parseKeyValuePairs(options.field);
        const result = await updateSpecFrontmatter(process.cwd(), options.taskSpecId, slug, fields);
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        exitOnCoreError(error);
      }
    });
}
