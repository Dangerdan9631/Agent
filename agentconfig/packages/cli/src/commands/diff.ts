import type { Command } from 'commander';
import { runDiff } from 'agentconfig';
import { printDiff } from '../helpers';

export function registerDiff(program: Command): void {
  program
    .command('diff')
    .description('Show diff between .agentconfig/ source and current on-disk generated files.')
    .option('--config <path>', 'Path to .agentconfig/ directory (default: auto-detect)')
    .option('--out <path>', 'Override output_dir from config')
    .option('--target <name>', 'Generate for specific target(s)', (val, prev: string[]) => [...prev, val], [] as string[])
    .option('--format <text|json>', 'Output format', 'text')
    .action(async (cmdOpts, cmd) => {
      const opts = cmd.opts() as {
        config?: string;
        out?: string;
        target: string[];
        format: string;
      };

      const { diff } = await runDiff({
        configPath: opts.config,
        outputDirOverride: opts.out,
        targets: opts.target.length > 0 ? opts.target : undefined,
      });

      printDiff(diff, opts.format as 'text' | 'json');
      if (diff.length > 0) process.exit(1);
    });
}
