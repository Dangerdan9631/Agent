#!/usr/bin/env node
import 'reflect-metadata';
import { TestSupportCli } from '#test-support/presentation/cli/test-support-cli.js';

new TestSupportCli().run(process.argv);
