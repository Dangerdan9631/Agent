import type { Command } from 'commander';
import chalk from 'chalk';
import type { IAgentConfigApi } from 'agentconfig-api';

export function registerTranslate(program: Command, api: IAgentConfigApi): void {
  program
    .command('translate')
    .description('Translate agent-native directive files from one target format to another.')
    .requiredOption('--source-target <name>', 'Source target to import from')
    .requiredOption('--dest-target <name>', 'Destination target to generate')
    .option('--project-root <path>', 'Project root to read and write (default: .)', '.')
    .option('-v, --verbose', 'Verbose output', false)
    .action(async (_cmdOpts: Record<string, unknown>, cmd) => {
      const opts = cmd.opts() as {
        sourceTarget: string;
        destTarget: string;
        projectRoot: string;
        verbose: boolean;
      };

      const result = await api.translate({
        sourceTarget: opts.sourceTarget,
        destTarget: opts.destTarget,
        projectRoot: opts.projectRoot,
      }).catch((err: unknown) => {
        console.error(chalk.red('error:'), err instanceof Error ? err.message : String(err));
        process.exit(1);
      });

      if (opts.verbose) console.log(chalk.gray(`Project root: ${result.projectRoot}`));
      if (opts.verbose) console.log(chalk.gray(`Source target: ${result.sourceTarget}`));
      if (opts.verbose) console.log(chalk.gray(`Destination target: ${result.destTarget}`));
      const summary = `Translated ${result.instructionCount} instruction(s), ${result.agentCount} agent(s)`;
      console.log(chalk.green(`${summary} → ${result.fileCount} file(s)`));
    });
}
