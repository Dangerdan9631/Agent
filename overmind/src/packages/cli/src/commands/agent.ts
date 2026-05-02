import chalk from 'chalk';
import { IpcClient, AgentTypeSchema } from 'overmind';
import type { AgentInfo } from 'overmind';

export function registerAgent(program: import('commander').Command): void {
  const agent = program.command('agent').description('Manage agents');

  agent
    .command('start <type>')
    .description(`Start a new agent. Types: ${AgentTypeSchema.options.join(', ')}`)
    .action(async (type: string) => {
      const typeResult = AgentTypeSchema.safeParse(type);
      if (!typeResult.success) {
        console.error(chalk.red(`Unknown agent type: ${type}`));
        console.error(`Valid types: ${AgentTypeSchema.options.join(', ')}`);
        process.exit(1);
      }

      const client = new IpcClient();
      try {
        await client.connect();
        const info = await client.request<AgentInfo>('agent.create', { type: typeResult.data });
        console.log(chalk.green(`Agent created: ${info.id} (${info.type})`));
      } catch (err) {
        console.error(chalk.red('Failed to create agent:'), err instanceof Error ? err.message : err);
        process.exit(1);
      } finally {
        client.disconnect();
      }
    });

  agent
    .command('stop <id>')
    .description('Terminate a running agent')
    .action(async (id: string) => {
      const client = new IpcClient();
      try {
        await client.connect();
        await client.request('agent.terminate', { id });
        console.log(chalk.green(`Agent ${id} terminated.`));
      } catch (err) {
        console.error(chalk.red('Failed to terminate agent:'), err instanceof Error ? err.message : err);
        process.exit(1);
      } finally {
        client.disconnect();
      }
    });
}
