#!/usr/bin/env node
import { runOvermindService } from './run-service.js';

async function main(): Promise<void> {
  await runOvermindService();
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Failed to start service.';
  console.error(message);
  process.exitCode = 1;
});