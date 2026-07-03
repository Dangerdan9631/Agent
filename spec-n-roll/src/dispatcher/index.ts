#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  type DispatchOptions,
  findLocalCliOrThrow,
  parseDispatcherArgs,
  runGlobal,
  runLocal,
} from './runtime.js';

export * from './runtime.js';

/**
 * Global dispatcher entry point.
 *
 * @param argv - Full process argv including node and dispatcher script entries.
 * @param options - Optional process execution configuration.
 * @returns Exit code from local or global runtime execution.
 */
export function runDispatcher(
  argv: string[] = process.argv,
  options: DispatchOptions = {},
): number {
  const parsed = parseDispatcherArgs(argv.slice(2));
  const localCli = parsed.forceGlobal ? null : findLocalCliOrThrow(options.cwd ?? process.cwd());
  const isInteractive = parsed.args.length === 0;

  if (localCli != null) {
    return runLocal(localCli, isInteractive, parsed.args, options);
  }

  return runGlobal(isInteractive, parsed.args, options);
}

if (
  isCurrentModuleEntrypoint(process.argv[1], import.meta.url, ['dispatcher.js', 'dispatcher.ts'])
) {
  process.exit(runDispatcher());
}

/**
 * Checks whether this module is the process entrypoint.
 *
 * @param argvEntry - `process.argv[1]` value for the current process.
 * @param moduleUrl - `import.meta.url` for the current module.
 * @param expectedFilenames - Allowed process entrypoint filenames.
 * @returns True when this module should execute as the main script.
 */
function isCurrentModuleEntrypoint(
  argvEntry: string | undefined,
  moduleUrl: string,
  expectedFilenames: readonly string[],
): boolean {
  if (argvEntry == null || !expectedFilenames.includes(path.basename(argvEntry))) {
    return false;
  }

  const modulePath = fileURLToPath(moduleUrl);
  return (
    path.resolve(argvEntry) === path.resolve(modulePath) ||
    path.dirname(path.resolve(argvEntry)) === path.dirname(path.resolve(modulePath))
  );
}
