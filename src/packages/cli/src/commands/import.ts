import type { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { runImport } from 'agentconfig';
import { die } from '../helpers';

export function registerImport(program: Command): void {
  program
    .command('import <source-dir>')
    .description('Import instructions from another .agentconfig/ directory into this project.')
    .option('--dest <path>', 'Destination directory (default: auto-detect from CWD)')
    .option('--overwrite', 'Overwrite existing instruction files', false)
    .option('--dry-run', 'Preview what would be written', false)
    .action(async (sourceArg: string, cmdOpts: Record<string, unknown>, cmd) => {
      const opts = cmd.opts() as {
        dest?: string;
        overwrite: boolean;
        dryRun: boolean;
      };

      const sourceDir = path.resolve(sourceArg);
      if (!fs.existsSync(sourceDir)) die(`Source directory not found: ${sourceDir}`);

      const result = await runImport({
        sourceDir,
        destDir: opts.dest,
        overwrite: opts.overwrite,
        dryRun: opts.dryRun,
      }).catch((err: unknown) => die(err instanceof Error ? err.message : String(err)));

      const summary = `Imported ${result.instructionCount} instruction(s), ${result.agentCount} agent(s)`;
      if (opts.dryRun) {
        console.log(chalk.cyan(`(dry run) ${summary} → ${result.destConfigDir}`));
      } else {
        console.log(chalk.green(`${summary} → ${result.destConfigDir}`));
      }
    });
}
