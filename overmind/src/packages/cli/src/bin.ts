#!/usr/bin/env node
import 'reflect-metadata';
import { exit } from 'node:process';
import { OvermindCli } from './overmind-cli';
import { buildCliContainer } from './bootstrap/cli-bootstrap.js';

exit(
  await (buildCliContainer().resolve(OvermindCli))
    .run(process.argv)
);
