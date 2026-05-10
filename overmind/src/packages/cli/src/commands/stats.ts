import chalk from 'chalk';
import type { Command } from 'commander';
import { OvermindCliCommand } from './overmind-cli-command.js';
import { inject, injectable } from 'tsyringe';
import { OvermindIpcClientFactory } from '../core';
import { LoggerFactoryToken, type Logger, type LoggerFactory } from '../logging/index.js';
import { GetServiceStatsError } from 'overmind-api';

@injectable()
export class StatsCommand implements OvermindCliCommand {
  private readonly logger: Logger;

  constructor(
    private readonly clientFactory: OvermindIpcClientFactory,
    @inject(LoggerFactoryToken) loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('StatsCommand');
  }

  register(program: Command): void {
    program
      .command('stats')
      .description('Request service runtime statistics.')
      .option('--config-dir <path>', 'Path to Overmind configuration directory.', process.env['OVERMIND_CONFIG_DIR'])
      .action(async (options) => {
        const client = this.clientFactory.getOvermindClient(options.configDir);
        const response = await client.getServiceStats({});
        if (!response.success) {
          throw new Error(response.error.errorMessage);
        }

        const statsStr = [
          `${chalk.blue('Uptime:')} ${response.result.uptime.toFixed(2)}s`,
          `${chalk.blue('Running cerebrates:')} ${response.result.runningCerebrateCount}`,
          ...response.result.cerebrates.flatMap(cerebrate =>
            [
              chalk.cyan(`- ${chalk.green(cerebrate.name)}:`),
              `    ${chalk.cyan('runtime:')} ${cerebrate.runtime.toFixed(2)}s`,
              `    ${chalk.cyan('idle loops:')} ${cerebrate.idleLoopCount}`,
          ])
        ].join('\n');

        this.logger.info(statsStr);
      });
  }
}
