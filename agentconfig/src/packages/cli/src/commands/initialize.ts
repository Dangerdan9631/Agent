import type { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { runInitialize } from 'agentconfig';
import { die, info } from '../helpers';

export function registerInitialize(program: Command): void {
  program
    .command('initialize [source-dir]')
    .alias('init')
    .description('Create a .agentconfig/ directory by importing from existing agent-native files.')
    .option('-v, --verbose', 'Verbose output', false)
    .option('--from <agent>', 'Import only from a specific agent', (v, p: string[]) => [...p, v], [] as string[])
    .option('--overwrite', 'Overwrite existing .agentconfig/ files', false)
    .option('--dry-run', 'Preview what would be written', false)
    .action(async (sourceArg: string | undefined, cmdOpts: Record<string, unknown>, cmd) => {
      const opts = cmd.opts() as {
        verbose: boolean;
        from: string[];
        overwrite: boolean;
        dryRun: boolean;
      };

      const sourceDir = sourceArg ? path.resolve(sourceArg) : process.cwd();
      if (!fs.existsSync(sourceDir)) die(`Source directory not found: ${sourceDir}`);

      const result = await runInitialize({
        sourceDir,
        from: opts.from,
        overwrite: opts.overwrite,
        dryRun: opts.dryRun,
      }).catch((err: unknown) => die(err instanceof Error ? err.message : String(err)));

      if (result.detectedAgents.length === 0) {
        console.log(chalk.yellow('No agent-native files detected in ' + sourceDir));
        process.exit(0);
      }

      info(
        opts.verbose,
        'Detected agents: ' + result.detectedAgents.map((a) => `${a.name} (${a.confidence})`).join(', '),
      );

      const summary = `Initialized ${result.instructionCount} instruction(s), ${result.agentCount} agent(s)`;
      if (opts.dryRun) {
        console.log(chalk.cyan(`(dry run) ${summary} → ${result.configDir}`));
      } else {
        console.log(chalk.green(`${summary} → ${result.configDir}`));
      }
    });
}
