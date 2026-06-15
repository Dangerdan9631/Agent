import { Command } from 'commander';
import { inject, injectable } from 'tsyringe';

import { LOGGER_FACTORY } from '../../di/tokens.js';
import { runStepFinalize } from '../../sdk/core/step-lifecycle.js';
import { resolveTaskSpecSlug } from '../../sdk/core/task-lifecycle.js';
import type { Logger, LoggerFactory } from '../../sdk/logging/index.js';
import type { CliCommand } from './cli-command.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Parses a CLI boolean flag value into a strict boolean.
 *
 * @param value - Raw flag value from Commander.
 * @returns Parsed boolean.
 */
function parseValidationPassed(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }
  throw new Error(`Invalid --validation-passed value "${value}"; expected true or false`);
}

/**
 * Registers and handles the `step finalize` CLI subcommand.
 */
@injectable()
export class StepFinalizeCommand implements CliCommand {
  private readonly output: Logger;

  constructor(@inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
    this.output = loggerFactory.create('StepFinalizeCommand', { plain: true });
  }

  register(command: Command): void {
    command
      .command('finalize')
      .description('Finalize a workflow step after validation and return after-hook instructions')
      .requiredOption('--task-spec-id <id>', 'Numeric task spec id')
      .option('--slug <slug>', 'Task spec slug; resolved from id when omitted')
      .requiredOption('--step-id <id>', 'Workflow step id being finalized')
      .requiredOption('--validation-passed <value>', 'Whether step output validation succeeded')
      .action(
        async (options: {
          taskSpecId: string;
          slug?: string;
          stepId: string;
          validationPassed: string;
        }) => {
          try {
            const slug =
              options.slug ?? (await resolveTaskSpecSlug(process.cwd(), options.taskSpecId));
            const result = await runStepFinalize(process.cwd(), {
              taskSpecId: options.taskSpecId,
              slug,
              stepId: options.stepId,
              validationPassed: parseValidationPassed(options.validationPassed),
            });
            this.output.info(JSON.stringify(result, null, 2));
          } catch (error) {
            exitOnCoreError(error, this.output);
          }
        },
      );
  }
}
