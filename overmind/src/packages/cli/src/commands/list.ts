import chalk from 'chalk';
import { IpcClient } from 'overmind';
import type { AgentInfo } from 'overmind';

const STATE_COLORS: Record<string, (s: string) => string> = {
  init:        chalk.yellow,
  idle:        chalk.green,
  processing:  chalk.cyan,
  terminating: chalk.magenta,
  terminated:  chalk.gray,
};

export function registerList(program: import('commander').Command): void {
  program
    .command('list')
    .description('List all running agents')
    .action(async () => {
      const client = new IpcClient();
      try {
        await client.connect();
        const agents = await client.request<AgentInfo[]>('agent.list');
        if (agents.length === 0) {
          console.log(chalk.gray('No agents running.'));
          return;
        }
        console.log(chalk.bold(`${'ID'.padEnd(38)}  ${'TYPE'.padEnd(14)}  STATE`));
        console.log('─'.repeat(70));
        for (const a of agents) {
          const colorize = STATE_COLORS[a.state] ?? chalk.white;
          console.log(`${a.id.padEnd(38)}  ${a.type.padEnd(14)}  ${colorize(a.state)}`);
        }
      } catch (err) {
        console.error(chalk.red('Failed to list agents:'), err instanceof Error ? err.message : err);
        process.exit(1);
      } finally {
        client.disconnect();
      }
    });
}
