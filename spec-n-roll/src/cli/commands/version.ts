import { Command } from 'commander';
import { injectable } from 'tsyringe';

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
  register(command: Command): void {
    command
      .command('version')
      .description('Show installed Spec-N-Roll versions')
      .action(() => {
        printVersionReport();
      });
  }
}
