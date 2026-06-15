import { Command } from 'commander';
import { injectable } from 'tsyringe';

import { runStepFinalize } from '../../sdk/core/step-lifecycle.js';
import { resolveTaskSpecSlug } from '../../sdk/core/task-lifecycle.js';
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
            console.log(JSON.stringify(result, null, 2));
          } catch (error) {
            exitOnCoreError(error);
          }
        },
      );
  }
}
