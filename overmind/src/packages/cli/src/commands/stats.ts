import chalk from 'chalk';
import type { Command } from 'commander';
import { OvermindCliCommand } from './overmind-cli-command.js';
import { inject, injectable } from 'tsyringe';
import { OvermindIpcClientFactory } from '../adapters';
import { LoggerFactoryToken, type Logger, type LoggerFactory } from 'overmind-core';

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
