import chalk from 'chalk';
import { IpcClient } from 'overmind';

export function registerSend(program: import('commander').Command): void {
  program
    .command('send <agentId> <message>')
    .description('Send a message to an agent')
    .action(async (agentId: string, message: string) => {
      const client = new IpcClient();
      try {
        await client.connect();
        await client.request('agent.sendMessage', { id: agentId, content: message });
        console.log(chalk.green('Message sent.'));
      } catch (err) {
        console.error(chalk.red('Failed to send message:'), err instanceof Error ? err.message : err);
        process.exit(1);
      } finally {
        client.disconnect();
      }
    });
}
