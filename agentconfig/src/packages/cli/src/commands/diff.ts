import { Option, type Command } from 'commander';
import { runDiff } from 'agentconfig';
import { printDiff } from '../helpers';
import { OutputFormat } from '../output-format';

export function registerDiff(program: Command): void {
  program
    .command('diff')
    .description('Show diff between .agentconfig/ source and current on-disk generated files.')
    .option('--config <path>', 'Path to .agentconfig/ directory (default: auto-detect)')
    .option('--project-root <path>', 'The path to the project root where the generated files are output. Defaults to current directory (\'.\')')
    .option('--target <name>', 'Generate for specific target(s)', (val, prev: string[] | undefined) => [...(prev || []), val])
    .addOption(new Option('--format <format>', 'Output format').choices(['text', 'json']).default('text'))
    .action(async (_cmdOpts, cmd) => {
      const opts = cmd.opts() as {
        config?: string;
        projectRoot?: string;
        target?: string[];
        format: OutputFormat;
      };

      const { diff } = await runDiff({
        configPath: opts.config,
        projectRootOverride: opts.projectRoot,
        targets: opts.target,
      });

      printDiff(diff, opts.format);
      if (diff.length > 0) process.exit(1);
    });
}
