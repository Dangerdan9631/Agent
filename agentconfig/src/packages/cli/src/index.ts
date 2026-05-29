#!/usr/bin/env node
import { program } from 'commander';
import chalk from 'chalk';
import { createAgentConfigApi } from 'agentconfig';
import { registerAll } from 'agentconfig-plugins';
import type { IAgentConfigApi } from 'agentconfig-api';
import { registerGenerate } from './commands/generate';
import { registerValidate } from './commands/validate';
import { registerDiff } from './commands/diff';
import { registerInitialize } from './commands/initialize';
import { registerImport } from './commands/import';
import { registerListTargets } from './commands/list-targets';
import { registerTranslate } from './commands/translate';

const api: IAgentConfigApi = createAgentConfigApi(registerAll);

program
  .name('agentconfig')
  .description('Manage AI coding agent directive files from a single .agentconfig/ source of truth.')
  .version('0.1.0');

registerGenerate(program, api);
registerValidate(program, api);
registerDiff(program, api);
registerInitialize(program, api);
registerImport(program, api);
registerTranslate(program, api);
registerListTargets(program, api);

program.parseAsync(process.argv).catch((err) => {
  console.error(chalk.red('fatal:'), err instanceof Error ? err.message : err);
  process.exit(1);
});
