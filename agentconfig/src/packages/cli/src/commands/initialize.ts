import type { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'node:path';
import { runInitialize } from 'agentconfig';
import { die, info } from '../helpers';

export function registerInitialize(program: Command): void {
  program
    .command('initialize [source-dir]')
    .alias('init')
    .description('Create a .agentconfig/ directory by importing from existing agent-native files.')
    .option('-v, --verbose', 'Verbose output', false)
    .option('--from <agent>', 'Import only from a specific agent', (v, p: string[]) => [...p, v], [] as string[])
    .action(async (sourceArg: string | undefined, cmdOpts: Record<string, unknown>, cmd) => {
      const opts = cmd.opts() as {
        verbose: boolean;
        from: string[];
      };

      const sourceDir = sourceArg ? path.resolve(sourceArg) : process.cwd();

      const result = await runInitialize({
        sourceDir,
        from: opts.from,
      }).catch((err: unknown) => die(err instanceof Error ? err.message : String(err)));

      if (result.detectedAgents.length === 0) {
        console.log(chalk.yellow('No agent-native files detected in ' + result.sourceDir));
        return;
      }

      info(
        opts.verbose,
        'Detected agents: ' + result.detectedAgents.map((a) => `${a.name} (${a.confidence})`).join(', '),
      );

      const summary = `Initialized ${result.instructionCount} instruction(s), ${result.agentCount} agent(s)`;
      console.log(chalk.green(`${summary} → ${result.configDir}`));
    });
}
