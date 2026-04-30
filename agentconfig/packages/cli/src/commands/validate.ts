import { Option, type Command } from 'commander';
import { runValidate } from 'agentconfig';
import { printValidation } from '../helpers';
import { OutputFormat } from '../output-format';

export function registerValidate(program: Command): void {
  program
    .command('validate')
    .description('Validate .agentconfig/ without generating files.')
    .option('--config <path>', 'Path to .agentconfig/ directory (default: auto-detect)')
    .addOption(new Option('--format <format>', 'Output format').choices(['text', 'json']).default('text'))
    .option('--strict', 'Treat warnings as errors', false)
    .action(async (_cmdOpts, cmd) => {
      const opts = cmd.opts() as {
        config?: string;
        format: OutputFormat;
        strict: boolean;
      };

      const results = await runValidate({ configPath: opts.config });

      printValidation(results, opts.format, opts.strict);

      const errors = results.filter((r) => r.level === 'error');
      const warnings = results.filter((r) => r.level === 'warning');
      if (errors.length > 0 || (opts.strict && warnings.length > 0)) {
        process.exit(1);
      }
    });
}
