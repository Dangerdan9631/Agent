import { LoggerFactoryToken } from '@overmind-cli/di/logger-factory-token';
import type { Command } from 'commander';
import { OvermindApiFactory } from 'overmind-sdk';
import type { Logger, LoggerFactory } from 'overmind-sdk/logging';
import { inject, injectable } from 'tsyringe';

import type { OvermindCliCommand } from './overmind-cli-command';

@injectable()
export class StartWorkflowCommand implements OvermindCliCommand {
  private readonly logger: Logger;

  constructor(
    private readonly overmindApi: OvermindApiFactory,
    @inject(LoggerFactoryToken) loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('StartWorkflowCommand');
  }

  register(program: Command): void {
    program
      .command('start-workflow')
      .description('Start a workflow for a running cerebrate.')
      .argument('<name>', 'Cerebrate name.')
      .argument('<workflow>', 'Workflow name.')
      .option('--config-dir <path>', 'Path to Overmind configuration directory.')
      .action(async (name: string, workflow: string, options) => {
        const response = await this.overmindApi.create(options.configDir).startCerebrateWorkflow({
          cerebrateName: name,
          workflowName: workflow,
        });
        this.logger.info(
          `Workflow started: ${response.cerebrateName}:${response.workflowName} -> ${response.initialState} (${response.status})`,
        );
      });
  }
}
