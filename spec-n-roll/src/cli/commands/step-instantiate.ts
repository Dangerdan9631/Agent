import { Command } from 'commander';

import { resolveTaskSpecSlug } from '../../core/task-lifecycle.js';
import { instantiateStepOutput } from '../../core/templates.js';
import { exitOnCoreError, parseKeyValuePairs } from './core-cli-utils.js';

/**
 * Registers the `step instantiate` subcommand on the step command group.
 *
 * @param step - Commander `step` command to attach the subcommand to.
 */
export function registerStepInstantiateCommand(step: Command): void {
  step
    .command('instantiate')
    .description('Instantiate a step output template into a task spec directory')
    .requiredOption('--task-spec-id <id>', 'Numeric task spec id')
    .requiredOption('--step-id <id>', 'Step id: specify|plan|tasks')
    .option('--frontmatter <pair...>', 'Frontmatter key=value pairs for spec.md')
    .action(
      async (options: {
        taskSpecId: string;
        stepId: string;
        frontmatter?: string[];
      }) => {
        try {
          const slug = await resolveTaskSpecSlug(process.cwd(), options.taskSpecId);
          const relativePath = await instantiateStepOutput(
            process.cwd(),
            options.taskSpecId,
            slug,
            options.stepId,
            { frontmatter: parseKeyValuePairs(options.frontmatter) },
          );
          console.log(JSON.stringify({ path: relativePath }, null, 2));
        } catch (error) {
          exitOnCoreError(error);
        }
      },
    );
}
