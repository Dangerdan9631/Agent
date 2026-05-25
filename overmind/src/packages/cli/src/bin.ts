#!/usr/bin/env node
import 'reflect-metadata';

import { exit } from 'node:process';

import { buildCliContainer } from './bootstrap/cli-bootstrap.js';
import { OvermindCli } from './overmind-cli';

exit(
  await (buildCliContainer().resolve(OvermindCli))
    .run(process.argv)
);
