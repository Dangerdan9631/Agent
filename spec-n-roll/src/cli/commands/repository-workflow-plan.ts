import { Command } from 'commander';
import { inject, injectable } from 'tsyringe';

import { LOGGER_FACTORY } from '../../di/tokens.js';
import type { DiscoveryPlanBounds, RepositoryWorkflowScope } from '../../sdk/config/schema.js';
import type { Logger, LoggerFactory } from '../../sdk/logging/index.js';
import { planRepositoryWorkflow } from '../../sdk/repository/workflow-run.js';
import type { CliCommand } from './cli-command.js';
import { exitOnCoreError } from './core-cli-utils.js';

/**
 * Collects repeated string CLI option values into an array.
 *
 * @param value - Option value from the current invocation.
 * @param previous - Values collected from prior invocations.
 * @returns Combined option values in invocation order.
 */
function collectStringOption(value: string, previous: string[]): string[] {
  return [...previous, value];
}

/**
 * Parses a positive integer CLI option value.
 *
 * @param value - Raw option value from Commander.
 * @returns Parsed positive integer.
 */
function parsePositiveIntegerOption(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer but received: ${value}`);
  }

  return parsed;
}

/**
 * Builds maintainer scope input from repeated CLI path options.
 *
 * @param includedPaths - Project-relative paths to include in discovery scope.
 * @param omittedPaths - Project-relative paths to defer from the pass.
 * @returns Scope object when at least one path list is non-empty.
 */
function buildRepositoryWorkflowScopeFromCliOptions(
  includedPaths: string[],
  omittedPaths: string[],
): RepositoryWorkflowScope | undefined {
  if (includedPaths.length === 0 && omittedPaths.length === 0) {
    return undefined;
  }

  return {
    ...(includedPaths.length > 0 ? { includedPaths } : {}),
    ...(omittedPaths.length > 0 ? { omittedPaths } : {}),
  };
}

/**
 * Builds discovery bounds from optional CLI numeric limits.
 *
 * @param options - Parsed CLI bound option values.
 * @returns Bounds object when at least one limit is provided.
 */
function buildDiscoveryPlanBoundsFromCliOptions(options: {
  maxDirectories?: number;
  maxFiles?: number;
  maxProductAreas?: number;
}): DiscoveryPlanBounds | undefined {
  const bounds: DiscoveryPlanBounds = {};

  if (options.maxDirectories != null) {
    bounds.maxDirectories = options.maxDirectories;
  }
  if (options.maxFiles != null) {
    bounds.maxFiles = options.maxFiles;
  }
  if (options.maxProductAreas != null) {
    bounds.maxProductAreas = options.maxProductAreas;
  }

  return Object.keys(bounds).length > 0 ? bounds : undefined;
}

/**
 * Registers and handles the `repository-workflow plan` CLI subcommand.
 */
@injectable()
export class RepositoryWorkflowPlanCommand implements CliCommand {
  private readonly output: Logger;

  constructor(@inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
    this.output = loggerFactory.create('RepositoryWorkflowPlanCommand', { plain: true });
  }

  register(command: Command): void {
    command
      .command('plan')
      .description('Recommend a repository workflow discovery plan as JSON')
      .requiredOption(
        '--workflow-type-id <workflowTypeId>',
        'repository-onboarding or repository-drift',
      )
      .option(
        '--included-path <path>',
        'Project-relative path to include in discovery scope',
        collectStringOption,
        [],
      )
      .option(
        '--omitted-path <path>',
        'Project-relative path to defer from discovery scope',
        collectStringOption,
        [],
      )
      .option(
        '--max-directories <count>',
        'Maximum directories to inspect in one pass',
        parsePositiveIntegerOption,
      )
      .option(
        '--max-files <count>',
        'Maximum files to inspect in one pass',
        parsePositiveIntegerOption,
      )
      .option(
        '--max-product-areas <count>',
        'Maximum product areas to include in one pass',
        parsePositiveIntegerOption,
      )
      .action(
        async (options: {
          workflowTypeId: string;
          includedPath: string[];
          omittedPath: string[];
          maxDirectories?: number;
          maxFiles?: number;
          maxProductAreas?: number;
        }) => {
          try {
            const result = await planRepositoryWorkflow({
              projectRoot: process.cwd(),
              workflowTypeId: options.workflowTypeId as
                | 'repository-onboarding'
                | 'repository-drift',
              scope: buildRepositoryWorkflowScopeFromCliOptions(
                options.includedPath,
                options.omittedPath,
              ),
              bounds: buildDiscoveryPlanBoundsFromCliOptions({
                maxDirectories: options.maxDirectories,
                maxFiles: options.maxFiles,
                maxProductAreas: options.maxProductAreas,
              }),
            });
            this.output.info(JSON.stringify(result, null, 2));
          } catch (error) {
            exitOnCoreError(error, this.output);
          }
        },
      );
  }
}
