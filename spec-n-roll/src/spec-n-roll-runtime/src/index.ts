#!/usr/bin/env node
import { RuntimeCli } from '#runtime/presentation/cli/runtime-cli.js';

export { ConsoleRuntimeOutputWriter } from '#runtime/infrastructure/process/console-runtime-output-writer.js';
export { RuntimeApplication } from '#runtime/application/runtime/runtime-application.js';
export { RuntimeUiModeResolver } from '#runtime/application/ui/runtime-ui-mode-resolver.js';
export type { RuntimeUiMode } from '#runtime/application/ui/runtime-ui-mode-resolver.js';
export type { RuntimeUiRenderer } from '#runtime/application/ui/runtime-ui-renderer.js';
export type { RuntimeUiSession } from '#runtime/application/ui/runtime-ui-session.js';
export type { ProjectInitializer } from '#runtime/application/init/project-initializer.js';
export type { ExtensionDiscoverer } from '#runtime/application/extensions/extension-discoverer.js';
export { InitCommandResolver } from '#runtime/application/init/init-command-resolver.js';
export { NodeProjectInitializer } from '#runtime/infrastructure/filesystem/node-project-initializer.js';
export { NodeExtensionDiscoverer } from '#runtime/infrastructure/extensions/node-extension-discoverer.js';
export { TerminalLayoutAllocator } from '#runtime/application/ui/terminal-layout-allocator.js';
export { RuntimeCli } from '#runtime/presentation/cli/runtime-cli.js';
export { RuntimeCompositionRoot } from '#runtime/composition/runtime/runtime-composition-root.js';
export type { RuntimeInvocationReader } from '#runtime/application/invocation/runtime-invocation-reader.js';
export { RuntimeInvocationParser } from '#runtime/application/invocation/runtime-invocation-parser.js';
export type { RuntimeOutputWriter } from '#runtime/application/output/runtime-output-writer.js';
export { RuntimeProgramFactory } from '#runtime/composition/runtime/runtime-program-factory.js';
export { EnvironmentRuntimeInvocationReader } from '#runtime/infrastructure/process/environment-runtime-invocation-reader.js';

await new RuntimeCli().runIfMain(import.meta.url);
