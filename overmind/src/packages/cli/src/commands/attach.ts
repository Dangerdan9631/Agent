import chalk from 'chalk';
import { IpcClient } from 'overmind';
import type { StreamChunk } from 'overmind';

export function registerAttach(program: import('commander').Command): void {
  program
    .command('attach <agentId>')
    .description('Attach to an agent output stream (read-only, Ctrl+C to detach)')
    .action(async (agentId: string) => {
      const client = new IpcClient();
      try {
        await client.connect();

        client.subscribe('stream.chunk', (data) => {
          const chunk = data as StreamChunk;
          if (chunk.agentId !== agentId) return;
          process.stdout.write(chunk.chunk);
          if (chunk.done) {
            console.log(chalk.gray('\n[stream ended]'));
            client.disconnect();
            process.exit(0);
          }
        });

        await client.request('agent.attachStream', { id: agentId });
        console.log(chalk.gray(`Attached to agent ${agentId}. Press Ctrl+C to detach.\n`));

        // Keep process alive until stream ends or user interrupts
        process.on('SIGINT', () => {
          client.disconnect();
          process.exit(0);
        });
      } catch (err) {
        console.error(chalk.red('Failed to attach:'), err instanceof Error ? err.message : err);
        client.disconnect();
        process.exit(1);
      }
    });
}
