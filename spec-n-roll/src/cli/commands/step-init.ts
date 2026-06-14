import { Command } from 'commander';

import { runStepInit } from '../../core/step-lifecycle.js';
import { resolveTaskSpecSlug } from '../../core/task-lifecycle.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Registers the `step init` subcommand on the step command group.
 *
 * @param step - Commander `step` command to attach the subcommand to.
 */
export function registerStepInitCommand(step: Command): void {
  step
    .command('init')
    .description('Initialize a workflow step with manifestos and before-hook instructions')
    .requiredOption('--task-spec-id <id>', 'Numeric task spec id')
    .option('--slug <slug>', 'Task spec slug; resolved from id when omitted')
    .requiredOption('--step-id <id>', 'Workflow step id to initialize')
    .action(async (options: { taskSpecId: string; slug?: string; stepId: string }) => {
      try {
        const slug =
          options.slug ?? (await resolveTaskSpecSlug(process.cwd(), options.taskSpecId));
        const result = await runStepInit(process.cwd(), {
          taskSpecId: options.taskSpecId,
          slug,
          stepId: options.stepId,
        });
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        exitOnCoreError(error);
      }
    });
}
