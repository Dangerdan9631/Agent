import type { Command } from 'commander';
import chalk from 'chalk';
import { runGenerate } from 'agentconfig';
import { die, info, printDiff } from '../helpers';

export function registerGenerate(program: Command): void {
  program
    .command('generate')
    .alias('gen')
    .description('Parse .agentconfig/ and write agent-native directive files.')
    .option('--config <path>', 'Path to .agentconfig/ directory (default: auto-detect)')
    .option('--out <path>', 'Override output_dir from config')
    .option('--target <name>', 'Generate for specific target(s)', (val, prev: string[]) => [...prev, val], [] as string[])
    .option('-v, --verbose', 'Verbose output', false)
    .option('--format <text|json>', 'Output format', 'text')
    .option('--dry-run', 'Preview changes without writing to disk', false)
    .option('--no-overwrite', 'Skip files that already exist on disk')
    .option('--watch', 'Watch .agentconfig/ for changes and re-generate', false)
    .action(async (cmdOpts, cmd) => {
      const opts = cmd.opts() as {
        config?: string;
        out?: string;
        target: string[];
        verbose: boolean;
        format: 'text' | 'json';
        dryRun: boolean;
        overwrite: boolean;
        watch: boolean;
      };

      async function doGenerate(): Promise<string> {
        const result = await runGenerate({
          configPath: opts.config,
          outputDirOverride: opts.out,
          targets: opts.target.length > 0 ? opts.target : undefined,
          overwrite: opts.overwrite,
          dryRun: opts.dryRun,
        });

        if (result.validationErrors.length > 0) {
          for (const e of result.validationErrors) console.error(chalk.red(`[error] ${e.message}`));
          throw new Error('Validation errors found. Fix them before generating.');
        }

        info(opts.verbose, `Using config dir: ${result.configDir}`);
        info(opts.verbose, `Targets: ${result.targets.join(', ')}`);

        if (opts.dryRun) {
          printDiff(result.diff, opts.format);
          console.log(chalk.cyan('\n(dry run — no files written)'));
        } else {
          console.log(chalk.green(`Generated ${result.fileCount} file(s) → ${result.outputDir}`));
        }

        return result.configDir;
      }

      const configDir = await doGenerate().catch((err) =>
        die(err instanceof Error ? err.message : String(err)),
      );

      if (opts.watch) {
        const { default: chokidar } = await import('chokidar');
        console.log(chalk.cyan(`\nWatching ${configDir} for changes...`));
        const watcher = chokidar.watch(configDir, { ignoreInitial: true });
        let busy = false;
        const onChange = async (p: string) => {
          if (busy) return;
          busy = true;
          info(opts.verbose, `Change detected: ${p}`);
          try {
            await doGenerate();
          } catch (err) {
            console.error(chalk.red('Generate error:'), err);
          } finally {
            busy = false;
          }
        };
        watcher.on('add', onChange).on('change', onChange).on('unlink', onChange);
      }
    });
}
