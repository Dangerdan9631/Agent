#!/usr/bin/env node
import { RuntimeCli } from '#runtime/runtime-cli.js';

export { ConsoleRuntimeOutputWriter } from '#runtime/console-runtime-output-writer.js';
export { RuntimeApplication } from '#runtime/runtime-application.js';
export { RuntimeCli } from '#runtime/runtime-cli.js';
export { RuntimeCompositionRoot } from '#runtime/runtime-composition-root.js';
export type { RuntimeInvocationReader } from '#runtime/runtime-invocation-reader.js';
export { RuntimeInvocationParser } from '#runtime/runtime-invocation-parser.js';
export type { RuntimeOutputWriter } from '#runtime/runtime-output-writer.js';
export { RuntimeProgramFactory } from '#runtime/runtime-program-factory.js';
export { StdinRuntimeInvocationReader } from '#runtime/stdin-runtime-invocation-reader.js';

new RuntimeCli().runIfMain(import.meta.url);
