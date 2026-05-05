import type { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'node:path';
import * as fs from 'node:fs';
import type { IAgentConfigApi } from 'agentconfig-api';

export function registerImport(program: Command, api: IAgentConfigApi): void {
  program
    .command('import <source-dir>')
    .description('Import instructions from another .agentconfig/ directory into this project.')
    .option('--config <path>', 'Destination .agentconfig/ directory (default: auto-detect from CWD)')
    .option('-v, --verbose', 'Verbose output', false)
    .action(async (sourceArg: string, _cmdOpts: Record<string, unknown>, cmd) => {
      const opts = cmd.opts() as {
        config?: string;
        verbose: boolean;
      };

      const sourceDir = path.resolve(sourceArg);
      if (!fs.existsSync(sourceDir)) {
        console.error(chalk.red('error:'), `Source directory not found: ${sourceDir}`);
        process.exit(1);
      }

      const result = await api.import({
        sourceDir,
        configPath: opts.config,
      }).catch((err: unknown) => {
        console.error(chalk.red('error:'), err instanceof Error ? err.message : String(err));
        process.exit(1);
      });

      if (opts.verbose) console.log(chalk.gray(`Source config dir: ${result.sourceConfigDir}`));
      if (opts.verbose) console.log(chalk.gray(`Destination config dir: ${result.destConfigDir}`));
      const summary = `Imported ${result.instructionCount} instruction(s), ${result.agentCount} agent(s)`;
      console.log(chalk.green(`${summary} → ${result.destConfigDir}`));
    });
}
