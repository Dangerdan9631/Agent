import type { Command } from 'commander';
import chalk from 'chalk';
import { listTargets } from 'agentconfig';

export function registerListTargets(program: Command): void {
  program
    .command('list-targets')
    .description('List all registered generator targets.')
    .option('--format <text|json>', 'Output format', 'text')
    .action(async (cmdOpts, cmd) => {
      const opts = cmd.opts() as { format: string };

      const targets = await listTargets();

      if (opts.format === 'json') {
        console.log(JSON.stringify(targets, null, 2));
        return;
      }

      for (const t of targets) {
        console.log(`  ${chalk.cyan(t.target.padEnd(20))} ${t.displayName}`);
      }
    });
}
