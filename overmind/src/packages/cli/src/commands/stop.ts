import chalk from 'chalk';
import { IpcClient } from 'overmind';

export function registerStop(program: import('commander').Command): void {
  program
    .command('stop')
    .description('Stop the overmind service')
    .action(async () => {
      const client = new IpcClient();
      try {
        await client.connect();
        await client.request('service.shutdown');
        console.log(chalk.green('Service shut down.'));
      } catch (err) {
        console.error(chalk.red('Failed to stop service:'), err instanceof Error ? err.message : err);
        process.exit(1);
      } finally {
        client.disconnect();
      }
    });
}
