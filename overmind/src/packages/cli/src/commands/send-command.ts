import type { Command } from 'commander';
import chalk from 'chalk';
import type { OvermindIpcClient } from '../client.js';

export function registerSendCommand(program: Command, client: OvermindIpcClient): void {
  program
    .command('send-command')
    .description('Send a named command to a running cerebrate (prints the command value).')
    .argument('<name>', 'Cerebrate name.')
    .argument('<command>', 'Command name from cerebrate-config.yaml.')
    .action(async (name: string, command: string) => {
      const result = await client.sendCerebrateCommand({ name, command });
      console.log(chalk.green(result.output));
    });
}
