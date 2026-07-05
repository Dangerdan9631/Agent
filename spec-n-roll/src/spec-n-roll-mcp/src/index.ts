#!/usr/bin/env node
import 'reflect-metadata';
import { McpCli } from '#mcp/mcp-cli.js';

export type { CommandRunner } from '#mcp/command-runner.js';
export { McpCli } from '#mcp/mcp-cli.js';
export { McpCommandRunner } from '#mcp/mcp-command-runner.js';
export { McpContainerFactory } from '#mcp/mcp-container-factory.js';
export { McpProgramFactory } from '#mcp/mcp-program-factory.js';

new McpCli().run(process.argv);
