#!/usr/bin/env node
import 'reflect-metadata';
import { DispatcherCli } from '#dispatcher/presentation/cli/dispatcher-cli.js';
import { DispatcherContainerFactory } from '#dispatcher/composition/dispatcher/dispatcher-container-factory.js';

new DispatcherContainerFactory()
  .create()
  .resolve(DispatcherCli)
  .run(process.argv);
