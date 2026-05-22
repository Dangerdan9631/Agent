#!/usr/bin/env node
import 'reflect-metadata';
import { exit } from 'node:process';
import { runOvermindService } from './bootstrap.js';

const exitCode = await runOvermindService(process.argv);

if (exitCode !== 0) {
	exit(exitCode);
}
