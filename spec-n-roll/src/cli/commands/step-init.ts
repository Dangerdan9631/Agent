import { Command } from 'commander';
import { inject, injectable } from 'tsyringe';

import { LOGGER_FACTORY } from '../../di/tokens.js';
import { runStepInit } from '../../sdk/core/step-lifecycle.js';
import { resolveTaskSpecSlug } from '../../sdk/core/task-lifecycle.js';
import type { Logger, LoggerFactory } from '../../sdk/logging/index.js';
import type { CliCommand } from './cli-command.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Registers and handles the `step init` CLI subcommand.
 */
@injectable()
export class StepInitCommand implements CliCommand {
  private readonly output: Logger;

  constructor(@inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
    this.output = loggerFactory.create('StepInitCommand', { plain: true });
  }

  register(command: Command): void {
    command
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
          this.output.info(JSON.stringify(result, null, 2));
        } catch (error) {
          exitOnCoreError(error, this.output);
        }
      });
  }
}
