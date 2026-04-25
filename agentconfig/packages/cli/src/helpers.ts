import chalk from 'chalk';
import type { ValidationResult, DiffEntry } from 'agentconfig';

export function die(msg: string, code = 1): never {
  console.error(chalk.red('error:'), msg);
  process.exit(code);
}

export function info(verbose: boolean, msg: string): void {
  if (verbose) console.log(chalk.gray(msg));
}

export function printValidation(
  results: ValidationResult[],
  format: 'text' | 'json',
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

export function printDiff(diff: DiffEntry[], format: 'text' | 'json'): void {
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
