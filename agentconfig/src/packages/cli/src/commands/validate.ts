import chalk from 'chalk';
import { Option, type Command } from 'commander';
import { runValidate, type ValidationResult } from 'agentconfig';
import { OutputFormat } from '../output-format';

export function printValidation(
  results: ValidationResult[],
  format: OutputFormat,
  strict: boolean,
): void {
  if (format === 'json') {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  const errors = results.filter((r) => r.level === 'error');
  const warnings = results.filter((r) => r.level === 'warning');
  const infos = results.filter((r) => r.level === 'info');

  for (const r of errors) {
    console.error(chalk.red(`[error] ${r.message}`) + (r.file ? chalk.gray(` (${r.file})`) : ''));
  }
  for (const r of warnings) {
    console.warn(chalk.yellow(`[warn]  ${r.message}`) + (r.file ? chalk.gray(` (${r.file})`) : ''));
  }
  for (const r of infos) {
    console.info(chalk.cyan(`[info]  ${r.message}`) + (r.file ? chalk.gray(` (${r.file})`) : ''));
  }

  if (errors.length > 0) {
    console.error(chalk.red(`\n${errors.length} error(s) found.`));
  } else if (strict && warnings.length > 0) {
    console.error(chalk.yellow(`\n${warnings.length} warning(s) found (--strict).`));
  } else if (results.length === 0) {
    console.log(chalk.green('No issues found.'));
  }
}

export function registerValidate(program: Command): void {
  program
    .command('validate')
    .description('Validate .agentconfig/ without generating files.')
    .option('--config <path>', 'Path to .agentconfig/ directory (default: auto-detect)')
    .addOption(new Option('--format <format>', 'Output format').choices(['text', 'json']).default('text'))
    .option('-v, --verbose', 'Verbose output', false)
    .option('--strict', 'Treat warnings as errors', false)
    .action(async (_cmdOpts, cmd) => {
      const opts = cmd.opts() as {
        config?: string;
        format: OutputFormat;
        verbose: boolean;
        strict: boolean;
      };

      const results = await runValidate({ configPath: opts.config });

      if (opts.verbose && opts.format !== 'json') console.log(chalk.gray(`Validated ${results.length} issue(s).`));
      printValidation(results, opts.format, opts.strict);

      const errors = results.filter((r) => r.level === 'error');
      const warnings = results.filter((r) => r.level === 'warning');
      if (errors.length > 0 || (opts.strict && warnings.length > 0)) {
        process.exit(1);
      }
    });
}
