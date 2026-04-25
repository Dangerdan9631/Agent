import type { Command } from 'commander';
import { runValidate } from 'agentconfig';
import { printValidation } from '../helpers';

export function registerValidate(program: Command): void {
  program
    .command('validate')
    .description('Validate .agentconfig/ without generating files.')
    .option('--config <path>', 'Path to .agentconfig/ directory (default: auto-detect)')
    .option('--format <text|json>', 'Output format', 'text')
    .option('--strict', 'Treat warnings as errors', false)
    .action(async (cmdOpts, cmd) => {
      const opts = cmd.opts() as {
        config?: string;
        format: string;
        strict: boolean;
      };

      const results = await runValidate({ configPath: opts.config });

      printValidation(results, opts.format as 'text' | 'json', opts.strict);

      const errors = results.filter((r) => r.level === 'error');
      const warnings = results.filter((r) => r.level === 'warning');
      if (errors.length > 0 || (opts.strict && warnings.length > 0)) {
        process.exit(1);
      }
    });
}
