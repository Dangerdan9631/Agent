import { Command } from 'commander';
import { inject, injectable } from 'tsyringe';

import { LOGGER_FACTORY } from '../../di/tokens.js';
import { resolveTaskSpecSlug } from '../../sdk/core/task-lifecycle.js';
import { writeWorkflowState } from '../../sdk/core/workflow-state.js';
import type { Logger, LoggerFactory } from '../../sdk/logging/index.js';
import type { CliCommand } from './cli-command.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Registers and handles the `workflow state write` CLI subcommand.
 */
@injectable()
export class WorkflowStateWriteCommand implements CliCommand {
  private readonly output: Logger;

  constructor(@inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
    this.output = loggerFactory.create('WorkflowStateWriteCommand', { plain: true });
  }

  register(command: Command): void {
    command
      .command('write')
      .description('Write workflow state for a task spec')
      .requiredOption('--task-spec-id <id>', 'Numeric task spec id')
      .requiredOption(
        '--workflow-variant-id <id>',
        'Set list id (stored as workflowVariantId in workflow-state.json)',
      )
      .option('--last-completed-step-id <id>', 'Last completed step id')
      .option('--current-step-id <id>', 'Current in-progress step id')
      .requiredOption('--status <status>', 'Operational status: active|paused|complete')
      .action(
        async (options: {
          taskSpecId: string;
          workflowVariantId: string;
          lastCompletedStepId?: string;
          currentStepId?: string;
          status: 'active' | 'paused' | 'complete';
        }) => {
          try {
            const slug = await resolveTaskSpecSlug(process.cwd(), options.taskSpecId);
            const result = await writeWorkflowState(process.cwd(), {
              taskSpecId: options.taskSpecId,
              slug,
              workflowVariantId: options.workflowVariantId,
              lastCompletedStepId: options.lastCompletedStepId ?? null,
              currentStepId: options.currentStepId ?? null,
              status: options.status,
            });
            this.output.info(JSON.stringify(result, null, 2));
          } catch (error) {
            exitOnCoreError(error, this.output);
          }
        },
      );
  }
}
