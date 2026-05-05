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
    .action(async (sourceArg: string, cmdOpts: Record<string, unknown>, cmd) => {
      const opts = cmd.opts() as {
        dest?: string;
      };

      const sourceDir = path.resolve(sourceArg);
      if (!fs.existsSync(sourceDir)) die(`Source directory not found: ${sourceDir}`);

      const result = await runImport({
        sourceDir,
        destDir: opts.dest,
      }).catch((err: unknown) => die(err instanceof Error ? err.message : String(err)));

      const summary = `Imported ${result.instructionCount} instruction(s), ${result.agentCount} agent(s)`;
      console.log(chalk.green(`${summary} → ${result.destConfigDir}`));
    });
}
