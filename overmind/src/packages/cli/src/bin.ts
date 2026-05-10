#!/usr/bin/env node
import 'reflect-metadata';
import { exit } from 'node:process';
import { OvermindCli } from './overmind-cli';
import { container } from 'tsyringe';

exit(
  await (container.resolve(OvermindCli))
    .run(process.argv)
);
