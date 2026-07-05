#!/usr/bin/env node
import 'reflect-metadata';
import { McpCli } from '#mcp/presentation/cli/mcp-cli.js';

export type { CommandRunner } from '#mcp/application/commands/command-runner.js';
export { McpCli } from '#mcp/presentation/cli/mcp-cli.js';
export { McpCommandRunner } from '#mcp/infrastructure/commands/mcp-command-runner.js';
export { McpContainerFactory } from '#mcp/composition/mcp/mcp-container-factory.js';
export { McpProgramFactory } from '#mcp/composition/mcp/mcp-program-factory.js';

new McpCli().run(process.argv);
