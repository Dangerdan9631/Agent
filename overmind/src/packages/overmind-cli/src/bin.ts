#!/usr/bin/env node
import 'reflect-metadata';

import { exit } from 'node:process';

import { buildCliContainer } from '@overmind-cli/di';

import { OvermindCli } from './commands';

exit(  
  await (buildCliContainer().resolve(OvermindCli))
    .run(process.argv)
);
