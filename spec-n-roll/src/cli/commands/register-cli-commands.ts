import { rootContainer } from '../../di/container.js';
import {
  CONFIG_AGENT_SUBCOMMAND,
  CONFIG_SUBCOMMAND,
  LIST_SUBCOMMAND,
  MANIFESTO_SUBCOMMAND,
  PROJECT_METADATA_SUBCOMMAND,
  PROJECT_SUBCOMMAND,
  REPOSITORY_WORKFLOW_DRIFT_SUBCOMMAND,
  REPOSITORY_WORKFLOW_REPORT_SUBCOMMAND,
  REPOSITORY_WORKFLOW_SUBCOMMAND,
  REPOSITORY_WORKFLOW_TYPES_SUBCOMMAND,
  SET_LIST_SUBCOMMAND,
  SPEC_FRONTMATTER_SUBCOMMAND,
  SPEC_SUBCOMMAND,
  STEP_SUBCOMMAND,
  TASK_CHECKBOX_SUBCOMMAND,
  TASK_STATUS_SUBCOMMAND,
  TASK_SUBCOMMAND,
  TOP_LEVEL_CLI_COMMAND,
  WORKFLOW_STATE_SUBCOMMAND,
  WORKFLOW_SUBCOMMAND,
} from '../../di/tokens.js';
import { ConfigAgentAddCommand } from './config-agent-add.js';
import { ConfigAgentCommand } from './config-agent.js';
import { ConfigAgentRemoveCommand } from './config-agent-remove.js';
import { ConfigCommand } from './config.js';
import { InitCommand } from './init.js';
import { ListAgentsCommand } from './list-agents.js';
import { ListCommand } from './list.js';
import { ManifestoCommand } from './manifesto.js';
import { ManifestoShowCommand } from './manifesto-show.js';
import { ProjectCommand } from './project.js';
import { ProjectMetadataCommand } from './project-metadata.js';
import { ProjectMetadataReadCommand } from './project-metadata-read.js';
import { ProjectMetadataWriteCommand } from './project-metadata-write.js';
import { RemoveCommand } from './remove.js';
import { RepositoryWorkflowCommand } from './repository-workflow.js';
import { RepositoryWorkflowDriftCommand } from './repository-workflow-drift.js';
import { RepositoryWorkflowDriftRunCommand } from './repository-workflow-drift-run.js';
import { RepositoryWorkflowPlanCommand } from './repository-workflow-plan.js';
import { RepositoryWorkflowReportCommand } from './repository-workflow-report.js';
import { RepositoryWorkflowReportReadCommand } from './repository-workflow-report-read.js';
import { RepositoryWorkflowStartCommand } from './repository-workflow-start.js';
import { RepositoryWorkflowTypesCommand } from './repository-workflow-types.js';
import { RepositoryWorkflowTypesListCommand } from './repository-workflow-types-list.js';
import { SetListCommand } from './set-list.js';
import { SetListCreateCommand } from './set-list-create.js';
import { SetListDisableCommand } from './set-list-disable.js';
import { SetListEnableCommand } from './set-list-enable.js';
import { SetListListCommand } from './set-list-list.js';
import { SetListRemoveCommand } from './set-list-remove.js';
import { SetListShowCommand } from './set-list-show.js';
import { SetListTriageCommand } from './set-list-triage.js';
import { SetListUpdateCommand } from './set-list-update.js';
import { SetListValidateCommand } from './set-list-validate.js';
import { SpecCommand } from './spec.js';
import { SpecFrontmatterCommand } from './spec-frontmatter.js';
import { SpecFrontmatterUpdateCommand } from './spec-frontmatter-update.js';
import { StepCommand } from './step.js';
import { StepFinalizeCommand } from './step-finalize.js';
import { StepInitCommand } from './step-init.js';
import { StepInstantiateCommand } from './step-instantiate.js';
import { TaskCheckboxCommand } from './task-checkbox.js';
import { TaskCheckboxSetCommand } from './task-checkbox-set.js';
import { TaskCommand } from './task.js';
import { TaskStatusCommand } from './task-status.js';
import { TaskStatusSetCommand } from './task-status-set.js';
import { UpdateCommand } from './update.js';
import { VersionCommand } from './version.js';
import { WorkflowCommand } from './workflow.js';
import { WorkflowStateCommand } from './workflow-state.js';
import { WorkflowStateReadCommand } from './workflow-state-read.js';
import { WorkflowStateWriteCommand } from './workflow-state-write.js';

/**
 * Registers all CLI command classes on the root container for `@injectAll` composition.
 */
export function registerCliCommands(): void {
  const register = rootContainer.register.bind(rootContainer);

  register(TOP_LEVEL_CLI_COMMAND, { useClass: InitCommand });
  register(TOP_LEVEL_CLI_COMMAND, { useClass: VersionCommand });
  register(TOP_LEVEL_CLI_COMMAND, { useClass: ListCommand });
  register(TOP_LEVEL_CLI_COMMAND, { useClass: ManifestoCommand });
  register(TOP_LEVEL_CLI_COMMAND, { useClass: SetListCommand });
  register(TOP_LEVEL_CLI_COMMAND, { useClass: RepositoryWorkflowCommand });
  register(TOP_LEVEL_CLI_COMMAND, { useClass: UpdateCommand });
  register(TOP_LEVEL_CLI_COMMAND, { useClass: RemoveCommand });
  register(TOP_LEVEL_CLI_COMMAND, { useClass: ConfigCommand });
  register(TOP_LEVEL_CLI_COMMAND, { useClass: WorkflowCommand });
  register(TOP_LEVEL_CLI_COMMAND, { useClass: TaskCommand });
  register(TOP_LEVEL_CLI_COMMAND, { useClass: ProjectCommand });
  register(TOP_LEVEL_CLI_COMMAND, { useClass: StepCommand });
  register(TOP_LEVEL_CLI_COMMAND, { useClass: SpecCommand });

  register(LIST_SUBCOMMAND, { useClass: ListAgentsCommand });

  register(MANIFESTO_SUBCOMMAND, { useClass: ManifestoShowCommand });

  register(SET_LIST_SUBCOMMAND, { useClass: SetListListCommand });
  register(SET_LIST_SUBCOMMAND, { useClass: SetListShowCommand });
  register(SET_LIST_SUBCOMMAND, { useClass: SetListCreateCommand });
  register(SET_LIST_SUBCOMMAND, { useClass: SetListUpdateCommand });
  register(SET_LIST_SUBCOMMAND, { useClass: SetListEnableCommand });
  register(SET_LIST_SUBCOMMAND, { useClass: SetListDisableCommand });
  register(SET_LIST_SUBCOMMAND, { useClass: SetListRemoveCommand });
  register(SET_LIST_SUBCOMMAND, { useClass: SetListValidateCommand });
  register(SET_LIST_SUBCOMMAND, { useClass: SetListTriageCommand });

  register(REPOSITORY_WORKFLOW_SUBCOMMAND, { useClass: RepositoryWorkflowTypesCommand });
  register(REPOSITORY_WORKFLOW_SUBCOMMAND, { useClass: RepositoryWorkflowPlanCommand });
  register(REPOSITORY_WORKFLOW_SUBCOMMAND, { useClass: RepositoryWorkflowStartCommand });
  register(REPOSITORY_WORKFLOW_SUBCOMMAND, { useClass: RepositoryWorkflowDriftCommand });
  register(REPOSITORY_WORKFLOW_SUBCOMMAND, { useClass: RepositoryWorkflowReportCommand });

  register(REPOSITORY_WORKFLOW_TYPES_SUBCOMMAND, { useClass: RepositoryWorkflowTypesListCommand });

  register(REPOSITORY_WORKFLOW_DRIFT_SUBCOMMAND, { useClass: RepositoryWorkflowDriftRunCommand });

  register(REPOSITORY_WORKFLOW_REPORT_SUBCOMMAND, {
    useClass: RepositoryWorkflowReportReadCommand,
  });

  register(CONFIG_SUBCOMMAND, { useClass: ConfigAgentCommand });

  register(CONFIG_AGENT_SUBCOMMAND, { useClass: ConfigAgentAddCommand });
  register(CONFIG_AGENT_SUBCOMMAND, { useClass: ConfigAgentRemoveCommand });

  register(WORKFLOW_SUBCOMMAND, { useClass: WorkflowStateCommand });

  register(WORKFLOW_STATE_SUBCOMMAND, { useClass: WorkflowStateReadCommand });
  register(WORKFLOW_STATE_SUBCOMMAND, { useClass: WorkflowStateWriteCommand });

  register(TASK_SUBCOMMAND, { useClass: TaskStatusCommand });
  register(TASK_SUBCOMMAND, { useClass: TaskCheckboxCommand });

  register(TASK_STATUS_SUBCOMMAND, { useClass: TaskStatusSetCommand });

  register(TASK_CHECKBOX_SUBCOMMAND, { useClass: TaskCheckboxSetCommand });

  register(PROJECT_SUBCOMMAND, { useClass: ProjectMetadataCommand });

  register(PROJECT_METADATA_SUBCOMMAND, { useClass: ProjectMetadataReadCommand });
  register(PROJECT_METADATA_SUBCOMMAND, { useClass: ProjectMetadataWriteCommand });

  register(STEP_SUBCOMMAND, { useClass: StepInitCommand });
  register(STEP_SUBCOMMAND, { useClass: StepFinalizeCommand });
  register(STEP_SUBCOMMAND, { useClass: StepInstantiateCommand });

  register(SPEC_SUBCOMMAND, { useClass: SpecFrontmatterCommand });

  register(SPEC_FRONTMATTER_SUBCOMMAND, { useClass: SpecFrontmatterUpdateCommand });
}
