import type { InjectionToken } from 'tsyringe';

import type { CliCommand } from '../cli/commands/cli-command.js';
import type { LoggerFactory } from '../sdk/logging/index.js';

/**
 * Injection token for the root logger factory used by CLI command adapters.
 */
export const LOGGER_FACTORY: InjectionToken<LoggerFactory> = Symbol('LOGGER_FACTORY');

/**
 * Injection token for top-level CLI commands registered on the root program.
 */
export const TOP_LEVEL_CLI_COMMAND: InjectionToken<CliCommand> = Symbol('TOP_LEVEL_CLI_COMMAND');

/**
 * Injection token for subcommands registered on the `list` command group.
 */
export const LIST_SUBCOMMAND: InjectionToken<CliCommand> = Symbol('LIST_SUBCOMMAND');

/**
 * Injection token for subcommands registered on the `manifesto` command group.
 */
export const MANIFESTO_SUBCOMMAND: InjectionToken<CliCommand> = Symbol('MANIFESTO_SUBCOMMAND');

/**
 * Injection token for subcommands registered on the `set-list` command group.
 */
export const SET_LIST_SUBCOMMAND: InjectionToken<CliCommand> = Symbol('SET_LIST_SUBCOMMAND');

/**
 * Injection token for subcommands registered on the `repository-workflow` command group.
 */
export const REPOSITORY_WORKFLOW_SUBCOMMAND: InjectionToken<CliCommand> = Symbol(
  'REPOSITORY_WORKFLOW_SUBCOMMAND',
);

/**
 * Injection token for subcommands registered on the `repository-workflow types` group.
 */
export const REPOSITORY_WORKFLOW_TYPES_SUBCOMMAND: InjectionToken<CliCommand> = Symbol(
  'REPOSITORY_WORKFLOW_TYPES_SUBCOMMAND',
);

/**
 * Injection token for subcommands registered on the `repository-workflow drift` group.
 */
export const REPOSITORY_WORKFLOW_DRIFT_SUBCOMMAND: InjectionToken<CliCommand> = Symbol(
  'REPOSITORY_WORKFLOW_DRIFT_SUBCOMMAND',
);

/**
 * Injection token for subcommands registered on the `repository-workflow report` group.
 */
export const REPOSITORY_WORKFLOW_REPORT_SUBCOMMAND: InjectionToken<CliCommand> = Symbol(
  'REPOSITORY_WORKFLOW_REPORT_SUBCOMMAND',
);

/**
 * Injection token for subcommands registered on the `config` command group.
 */
export const CONFIG_SUBCOMMAND: InjectionToken<CliCommand> = Symbol('CONFIG_SUBCOMMAND');

/**
 * Injection token for subcommands registered on the `config agent` command group.
 */
export const CONFIG_AGENT_SUBCOMMAND: InjectionToken<CliCommand> =
  Symbol('CONFIG_AGENT_SUBCOMMAND');

/**
 * Injection token for subcommands registered on the `workflow` command group.
 */
export const WORKFLOW_SUBCOMMAND: InjectionToken<CliCommand> = Symbol('WORKFLOW_SUBCOMMAND');

/**
 * Injection token for subcommands registered on the `workflow state` command group.
 */
export const WORKFLOW_STATE_SUBCOMMAND: InjectionToken<CliCommand> = Symbol(
  'WORKFLOW_STATE_SUBCOMMAND',
);

/**
 * Injection token for subcommands registered on the `task` command group.
 */
export const TASK_SUBCOMMAND: InjectionToken<CliCommand> = Symbol('TASK_SUBCOMMAND');

/**
 * Injection token for subcommands registered on the `task status` command group.
 */
export const TASK_STATUS_SUBCOMMAND: InjectionToken<CliCommand> = Symbol('TASK_STATUS_SUBCOMMAND');

/**
 * Injection token for subcommands registered on the `task checkbox` command group.
 */
export const TASK_CHECKBOX_SUBCOMMAND: InjectionToken<CliCommand> = Symbol(
  'TASK_CHECKBOX_SUBCOMMAND',
);

/**
 * Injection token for subcommands registered on the `project` command group.
 */
export const PROJECT_SUBCOMMAND: InjectionToken<CliCommand> = Symbol('PROJECT_SUBCOMMAND');

/**
 * Injection token for subcommands registered on the `project metadata` command group.
 */
export const PROJECT_METADATA_SUBCOMMAND: InjectionToken<CliCommand> = Symbol(
  'PROJECT_METADATA_SUBCOMMAND',
);

/**
 * Injection token for subcommands registered on the `step` command group.
 */
export const STEP_SUBCOMMAND: InjectionToken<CliCommand> = Symbol('STEP_SUBCOMMAND');

/**
 * Injection token for subcommands registered on the `spec` command group.
 */
export const SPEC_SUBCOMMAND: InjectionToken<CliCommand> = Symbol('SPEC_SUBCOMMAND');

/**
 * Injection token for subcommands registered on the `spec frontmatter` command group.
 */
export const SPEC_FRONTMATTER_SUBCOMMAND: InjectionToken<CliCommand> = Symbol(
  'SPEC_FRONTMATTER_SUBCOMMAND',
);
