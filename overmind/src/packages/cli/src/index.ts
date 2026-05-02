import { Command } from 'commander';
import chalk from 'chalk';
import { registerStart } from './commands/start.js';
import { registerStop } from './commands/stop.js';
import { registerAgent } from './commands/agent.js';
import { registerSend } from './commands/send.js';
import { registerList } from './commands/list.js';
import { registerAttach } from './commands/attach.js';

const program = new Command();

program
  .name('overmind')
  .description('Manage AI agent processes via the overmind service')
  .version('0.1.0');

registerStart(program);
registerStop(program);
registerAgent(program);
registerSend(program);
registerList(program);
registerAttach(program);

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(chalk.red('Error:'), err instanceof Error ? err.message : err);
  process.exit(1);
});
