import { Option, type Command } from 'commander';
import chalk from 'chalk';
import type { IAgentConfigApi } from 'agentconfig-api';
import { OutputFormat } from '../output-format';

export function registerListTargets(program: Command, api: IAgentConfigApi): void {
  program
    .command('list-targets')
    .description('List all registered generator targets.')
    .addOption(new Option('--format <format>', 'Output format').choices(['text', 'json']).default('text'))
    .action(async (_cmdOpts, cmd) => {
      const opts = cmd.opts() as { format: OutputFormat };

      const { targets } = await api.listTargets();

      if (opts.format === 'json') {
        console.log(JSON.stringify(targets, null, 2));
        return;
      }

      for (const t of targets) {
        console.log(`  ${chalk.cyan(t.target.padEnd(20))} ${t.displayName}`);
      }
    });
}
