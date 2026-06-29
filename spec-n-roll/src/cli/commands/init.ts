import path from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import { inject, injectable } from 'tsyringe';

import { LOGGER_FACTORY } from '../../di/tokens.js';
import { listBundledAgentIds } from '../../sdk/agents/extension-loader.js';
import { MCP_BINARY_RELATIVE_PATH } from '../../sdk/agents/mcp-config.js';
import { runInit } from '../../sdk/init.js';
import type { Logger, LoggerFactory } from '../../sdk/logging/index.js';
import { promptForAgentSelection } from '../../ink/init-prompts.js';
import type { CliCommand } from './cli-command.js';
import { parseCommaSeparatedAgentList } from './core-cli-utils.js';

/**
 * Registers and handles the `init` top-level CLI command.
 */
@injectable()
export class InitCommand implements CliCommand {
  private readonly logger: Logger;

  constructor(@inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
    this.logger = loggerFactory.create('InitCommand');
  }

  register(command: Command): void {
    command
      .command('init')
      .argument('[path]', 'Project directory to initialize', '.')
      .description('Initialize Spec-N-Roll in a project')
      .option('--agents <agents>', 'Comma-separated agent ids (e.g. cursor,claude-code)')
      .action(async (targetPath: string, commandOptions: { agents?: string }) => {
        const projectRoot = path.resolve(process.cwd(), targetPath);
        let agents = parseCommaSeparatedAgentList(commandOptions.agents);

        if (agents.length === 0) {
          agents = await promptForAgentSelection(listBundledAgentIds());
        }

        try {
          const result = await runInit({
            projectRoot,
            agents,
          });

          this.logger.info(
            `Initialized Spec-N-Roll in ${chalk.cyan(result.projectRoot)} for agents: ${chalk.green(result.selectedAgents.join(', '))}`,
          );
          this.logger.info(`MCP server: ${chalk.dim(MCP_BINARY_RELATIVE_PATH)}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error(`init failed: ${message}`);
          process.exitCode = 1;
        }
      });
  }
}
