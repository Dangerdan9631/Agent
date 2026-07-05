import { Command } from 'commander';
import { inject, injectable } from 'tsyringe';

import { LOGGER_FACTORY } from '../../di/tokens.js';
import type { Logger, LoggerFactory } from '../../sdk/logging/index.js';
import { printVersionReport } from '../version-invocation.js';
import type { CliCommand } from './cli-command.js';

export {
  buildVersionReport,
  formatVersionReport,
  readToolkitPackageVersion,
} from '../../sdk/version.js';
export type {
  VersionInvocationTarget,
  VersionReport,
  VersionReportOptions,
} from '../../sdk/version.js';
export { argvRequestsVersion } from '../version-invocation.js';

/**
 * Registers and handles the `version` top-level CLI command.
 */
@injectable()
export class VersionCommand implements CliCommand {
  private readonly output: Logger;

  constructor(@inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
    this.output = loggerFactory.create('VersionCommand', { plain: true });
  }

  register(command: Command): void {
    command
      .command('version')
      .description('Show installed Spec-N-Roll versions')
      .action(() => {
        printVersionReport(this.output);
      });
  }
}
