#!/usr/bin/env node
import path from 'node:path';
import { runOvermindService } from './run-service.js';

function parseConfigDir(argv: string[]): string {
  const idx = argv.indexOf('--config-dir');
  if (idx === -1 || idx + 1 >= argv.length) {
    throw new Error('Missing required argument: --config-dir <path>');
  }

  return path.resolve(argv[idx + 1] as string);
}

async function main(): Promise<void> {
  const configDir = parseConfigDir(process.argv.slice(2));
  await runOvermindService({ configDir });
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Failed to start service.';
  console.error(message);
  process.exitCode = 1;
});
