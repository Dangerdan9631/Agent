import chalk from 'chalk';
import { Option, type Command } from 'commander';
import { runDiff, type DiffEntry } from 'agentconfig';
import { OutputFormat } from '../output-format';

export function printDiff(diff: DiffEntry[], format: OutputFormat): void {
  if (format === 'json') {
    console.log(JSON.stringify(diff, null, 2));
    return;
  }
  for (const entry of diff) {
    const label =
      entry.action === 'create'
        ? chalk.green('+ ' + entry.path)
        : entry.action === 'update'
          ? chalk.yellow('~ ' + entry.path)
          : chalk.gray('  ' + entry.path);
    console.log(label);
    if (entry.diff) {
      const lines = entry.diff.split('\n');
      for (const line of lines) {
        if (line.startsWith('+')) console.log(chalk.green(line));
        else if (line.startsWith('-')) console.log(chalk.red(line));
        else console.log(chalk.gray(line));
      }
    }
  }
  if (diff.length === 0) {
    console.log(chalk.green('No changes.'));
  }
}

export function registerDiff(program: Command): void {
  program
    .command('diff')
    .description('Show diff between .agentconfig/ source and current on-disk generated files.')
    .option('--config <path>', 'Path to .agentconfig/ directory (default: auto-detect)')
    .option('--project-root <path>', 'The path to the project root where the generated files are output. Defaults to current directory (\'.\')')
    .option('--target <name>', 'Generate for specific target(s)', (val, prev: string[] | undefined) => [...(prev || []), val])
    .addOption(new Option('--format <format>', 'Output format').choices(['text', 'json']).default('text'))
    .option('-v, --verbose', 'Verbose output', false)
    .action(async (_cmdOpts, cmd) => {
      const opts = cmd.opts() as {
        config?: string;
        projectRoot?: string;
        target?: string[];
        format: OutputFormat;
        verbose: boolean;
      };

      const { diff, outputDir } = await runDiff({
        configPath: opts.config,
        projectRootOverride: opts.projectRoot,
        targets: opts.target,
      });

      if (opts.verbose && opts.format !== 'json') console.log(chalk.gray(`Output dir: ${outputDir}`));
      if (opts.verbose && opts.format !== 'json') console.log(chalk.gray(`Diff entries: ${diff.length}`));
      printDiff(diff, opts.format);
      if (diff.length > 0) process.exit(1);
    });
}
