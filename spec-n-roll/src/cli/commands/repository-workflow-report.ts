import { Command } from 'commander';
import { injectable, injectAll } from 'tsyringe';

import { REPOSITORY_WORKFLOW_REPORT_SUBCOMMAND } from '../../di/tokens.js';
import type { CliCommand } from './cli-command.js';

/**
 * Registers the `repository-workflow report` command group and its subcommands.
 */
@injectable()
export class RepositoryWorkflowReportCommand implements CliCommand {
  constructor(
    @injectAll(REPOSITORY_WORKFLOW_REPORT_SUBCOMMAND) private readonly subcommands: CliCommand[],
  ) {}

  register(command: Command): void {
    const report = command.command('report').description('Repository workflow report commands');
    for (const subcommand of this.subcommands) {
      subcommand.register(report);
    }
  }
}
