import type { Command } from 'commander';
import chalk from 'chalk';
import type { IAgentConfigApi } from 'agentconfig-api';
import type { GenerateEvent } from 'agentconfig-api';

export function registerGenerate(program: Command, api: IAgentConfigApi): void {
  program
    .command('generate')
    .alias('gen')
    .description('Parse .agentconfig/ and write agent-native directive files.')
    .option('--config <path>', 'Path to .agentconfig/ directory (default: auto-detect)')
    .option('--project-root <path>', 'Override project root directory')
    .option('--target <name>', 'Generate for specific target(s)', (val, prev: string[] | undefined) => [...(prev || []), val])
    .option('-v, --verbose', 'Verbose output', false)
    .option('--watch', 'Watch .agentconfig/ for changes and re-generate', false)
    .action(async (cmdOpts, cmd) => {
      const opts = cmd.opts() as {
        config?: string;
        projectRoot?: string;
        target?: string[];
        verbose: boolean;
        watch: boolean;
      };

      function onEvent(event: GenerateEvent): void {
        switch (event.type) {
          case 'generated':
            if (opts.verbose) console.log(chalk.gray(`Using config dir: ${event.result.configDir}`));
            if (opts.verbose) console.log(chalk.gray(`Targets: ${event.result.targets.join(', ')}`));
            console.log(chalk.green(`Generated ${event.result.fileCount} file(s) → ${event.result.outputDir}`));
            break;
          case 'validation-error':
            console.error(chalk.red(`[error] ${event.error.message}`));
            break;
          case 'watching':
            console.log(chalk.cyan(`\nWatching ${event.configDir} for changes...`));
            break;
          case 'change':
            if (opts.verbose) console.log(chalk.gray(`Change detected: ${event.path}`));
            break;
          case 'error':
            console.error(chalk.red('Generate error:'), event.error);
            break;
        }
      }

      await api.generate({
        configPath: opts.config,
        projectRootOverride: opts.projectRoot,
        targets: opts.target,
        watch: opts.watch,
        onEvent,
      }).catch((err) => {
        console.error(chalk.red('error:'), err instanceof Error ? err.message : String(err));
        process.exit(1);
      });
    });
}
