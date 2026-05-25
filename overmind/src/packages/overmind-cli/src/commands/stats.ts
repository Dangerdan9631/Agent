import chalk from 'chalk';
import type { Command } from 'commander';
import { inject, injectable } from 'tsyringe';
import { OvermindApiFactory } from 'overmind-sdk';
import type { LoggerFactory, Logger } from 'overmind-sdk/logging';
import { LoggerFactoryToken } from '@overmind-cli/di';
import { OvermindCliCommand } from './overmind-cli-command';

@injectable()
export class StatsCommand implements OvermindCliCommand {
  private readonly logger: Logger;

  constructor(
    private readonly overmindApi: OvermindApiFactory,
    @inject(LoggerFactoryToken) loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('StatsCommand');
  }

  register(program: Command): void {
    program
      .command('stats')
      .description('Request service runtime statistics.')
      .option('--config-dir <path>', 'Path to Overmind configuration directory.')
      .action(async (options) => {
        const response = await this.overmindApi.create(options.configDir).getStats({});

        const statsStr = [
          `${chalk.blue('Uptime:')} ${response.uptime.toFixed(2)}s`,
          `${chalk.blue('Running cerebrates:')} ${response.runningCerebrateCount}`,
          ...response.cerebrates.flatMap(cerebrate =>
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
