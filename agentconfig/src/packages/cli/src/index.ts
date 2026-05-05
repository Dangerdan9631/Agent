#!/usr/bin/env node
import { program } from 'commander';
import chalk from 'chalk';
import { registerGenerate } from './commands/generate';
import { registerValidate } from './commands/validate';
import { registerDiff } from './commands/diff';
import { registerInitialize } from './commands/initialize';
import { registerImport } from './commands/import';
import { registerListTargets } from './commands/list-targets';

program
  .name('agentconfig')
  .description('Manage AI coding agent directive files from a single .agentconfig/ source of truth.')
  .version('0.1.0');

registerGenerate(program);
registerValidate(program);
registerDiff(program);
registerInitialize(program);
registerImport(program);
registerListTargets(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(chalk.red('fatal:'), err instanceof Error ? err.message : err);
  process.exit(1);
});
