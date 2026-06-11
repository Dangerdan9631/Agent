import { chmodSync, copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fse from 'fs-extra';

import {
  getBundledAgentGenerator,
  installBundledExtensions,
  listBundledAgentIds,
  validateSelectedAgentIds,
} from '../../agents/extension-loader.js';
import { writeCanonicalAgentsMd } from '../../agents/generators/agents-md.js';
import { generateWorkflowSkills } from '../../agents/generators/workflow-skills.js';
import { MCP_BINARY_RELATIVE_PATH } from '../../agents/mcp-config.js';
import type { AgentConfig, WorkflowConfig } from '../../config/schema.js';
import { atomicWriteJson } from '../../core/atomic-write.js';
import { writeProjectMetadata } from '../../core/project-metadata.js';
import { installBundledPlatformScripts } from '../../workflow/platform-scripts.js';
import { BUILT_IN_STEP_OUTPUTS } from '../../workflow/step-manifest.js';
import { promptForAgentSelection } from '../ink/init-prompts.js';

/**
 * Schema version written for new workflow configuration files.
 */
export const WORKFLOW_CONFIG_SCHEMA_VERSION = '1';

/**
 * Relative path to the workflow configuration file from the project root.
 */
export const WORKFLOW_CONFIG_RELATIVE_PATH = '.spec-n-roll/config/workflow.config.json';

/**
 * Relative path to the project-local CLI binary from the project root.
 */
export const LOCAL_CLI_BINARY_RELATIVE_PATH = path.posix.join(
  '.spec-n-roll',
  'cli',
  'bin',
  'spec-n-roll',
);

/**
 * Options controlling project initialization orchestration.
 */
export interface InitOptions {
  /**
   * Absolute path to the project directory to initialize.
   */
  projectRoot: string;
  /**
   * Selected bundled agent ids; required when `yes` is true.
   */
  agents?: string[];
  /**
   * When true, skip Ink prompts and require explicit `agents`.
   */
  yes?: boolean;
  /**
   * Absolute path to the toolkit package root containing `dist/` build outputs.
   */
  toolkitRoot?: string;
}

/**
 * Summary returned after a successful initialization run.
 */
export interface InitResult {
  /**
   * Absolute path to the initialized project root.
   */
  projectRoot: string;
  /**
   * Bundled agent ids configured during initialization.
   */
  selectedAgents: string[];
}

/**
 * Input for building the default workflow configuration document.
 */
export interface DefaultWorkflowConfigInput {
  /**
   * Toolkit semver written into workflow.config.json.
   */
  toolkitVersion: string;
  /**
   * Bundled agent ids selected during initialization.
   */
  selectedAgentIds: readonly string[];
}

/**
 * Resolves the toolkit package root from the running module location.
 *
 * @returns Absolute path to the toolkit repository/package root.
 */
export function resolveToolkitRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
}

/**
 * Builds the default workflow configuration for a newly initialized project.
 *
 * @param input - Toolkit version and selected bundled agent ids.
 * @returns Workflow configuration object ready for schema validation.
 */
export function createDefaultWorkflowConfig(input: DefaultWorkflowConfigInput): WorkflowConfig {
  const agents: AgentConfig[] = input.selectedAgentIds.map((agentId) => {
    const generator = getBundledAgentGenerator(agentId);
    return {
      id: agentId,
      displayName: generator?.manifest.name,
      enabled: true,
      commandPrefix: 'spec-n-' as const,
      ruleTargets: generator?.manifest.agentSetup?.ruleTargets,
      skillTargets: generator?.manifest.agentSetup?.skillTargets,
    };
  });

  return {
    schemaVersion: WORKFLOW_CONFIG_SCHEMA_VERSION,
    toolkitVersion: input.toolkitVersion,
    agents,
    steps: [
      {
        id: 'specify',
        kind: 'built-in',
        command: 'spec-n-specify',
        enabled: true,
        outputs: [...BUILT_IN_STEP_OUTPUTS.specify],
      },
      {
        id: 'plan',
        kind: 'built-in',
        command: 'spec-n-plan',
        enabled: true,
        outputs: [...BUILT_IN_STEP_OUTPUTS.plan],
      },
      {
        id: 'tasks',
        kind: 'built-in',
        command: 'spec-n-tasks',
        enabled: true,
        outputs: [...BUILT_IN_STEP_OUTPUTS.tasks],
      },
      {
        id: 'implement',
        kind: 'built-in',
        command: 'spec-n-implement',
        enabled: true,
      },
    ],
    workflows: [
      {
        id: 'papercut',
        name: 'Papercut',
        description: 'Single-file or trivial changes',
        steps: ['specify', 'implement'],
      },
      {
        id: 'quick',
        name: 'Quick',
        description: 'New behavior without architecture changes',
        steps: ['specify', 'tasks', 'implement'],
        default: true,
      },
      {
        id: 'full',
        name: 'Full',
        description: 'Cross-cutting or architectural work',
        steps: ['specify', 'plan', 'tasks', 'implement'],
      },
    ],
    defaultWorkflowId: 'quick',
    extensions: input.selectedAgentIds.map((agentId) => ({
      id: agentId,
      manifestPath: path.posix.join('.spec-n-roll/bundled-extensions', agentId, 'manifest.json'),
      enabled: true,
    })),
  };
}

/**
 * Reads the toolkit version from package.json at the toolkit root.
 *
 * @param toolkitRoot - Absolute path to the toolkit package root.
 * @returns Semver string for the toolkit package.
 */
function readToolkitVersion(toolkitRoot: string): string {
  const packageJsonPath = path.join(toolkitRoot, 'package.json');
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version: string };
  return pkg.version;
}

/**
 * Installs version-matched full CLI and MCP binaries into the project.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param toolkitRoot - Absolute path to the toolkit package root containing `dist/`.
 */
export async function installProjectBinaries(
  projectRoot: string,
  toolkitRoot: string,
): Promise<void> {
  const binDir = path.join(projectRoot, '.spec-n-roll', 'cli', 'bin');
  await fse.ensureDir(binDir);

  const cliSource = path.join(toolkitRoot, 'dist', 'cli', 'index.js');
  const mcpSource = path.join(toolkitRoot, 'dist', 'mcp', 'server.js');
  const cliTarget = path.join(binDir, 'spec-n-roll');
  const mcpTarget = path.join(binDir, 'spec-n-roll-mcp');

  if (!existsSync(cliSource) || !existsSync(mcpSource)) {
    throw new Error(
      'Toolkit build outputs are missing. Run `npm run build` in the spec-n-roll package before init.',
    );
  }

  copyFileSync(cliSource, cliTarget);
  copyFileSync(mcpSource, mcpTarget);

  if (process.platform !== 'win32') {
    chmodSync(cliTarget, 0o755);
    chmodSync(mcpTarget, 0o755);
  }

  if (process.platform === 'win32') {
    writeFileSync(
      path.join(binDir, 'spec-n-roll.cmd'),
      `@ECHO off\r\nSETLOCAL ENABLEEXTENSIONS\r\nSET DP0=%~dp0\r\nnode "%DP0%spec-n-roll" %*\r\n`,
      'utf8',
    );
    writeFileSync(
      path.join(binDir, 'spec-n-roll-mcp.cmd'),
      `@ECHO off\r\nSETLOCAL ENABLEEXTENSIONS\r\nSET DP0=%~dp0\r\nnode "%DP0%spec-n-roll-mcp" %*\r\n`,
      'utf8',
    );
  }
}

/**
 * Writes initial user-owned configuration files for a new project.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param workflowConfig - Validated workflow configuration to persist.
 */
async function writeInitialConfigFiles(
  projectRoot: string,
  workflowConfig: WorkflowConfig,
): Promise<void> {
  await atomicWriteJson(path.join(projectRoot, WORKFLOW_CONFIG_RELATIVE_PATH), workflowConfig);
  await writeProjectMetadata(projectRoot, { nextTaskSpecId: 1 });
}

/**
 * Writes an empty compatibility matrix placeholder for extension warnings on update.
 *
 * @param projectRoot - Absolute path to the project root.
 */
async function writeCompatibilityJson(projectRoot: string): Promise<void> {
  await atomicWriteJson(path.join(projectRoot, '.spec-n-roll', 'compatibility.json'), {
    incompatibleCombinations: [],
  });
}

/**
 * Ensures standard user-owned directories exist without overwriting contents.
 *
 * @param projectRoot - Absolute path to the project root.
 */
async function ensureUserOwnedDirectories(projectRoot: string): Promise<void> {
  await fse.ensureDir(path.join(projectRoot, 'specs'));
  await fse.ensureDir(path.join(projectRoot, 'living-specs'));
  await fse.ensureDir(path.join(projectRoot, '.spec-n-roll', 'config'));
}

/**
 * Parses a comma-separated agent list from CLI flags.
 *
 * @param agentsFlag - Comma-separated bundled agent ids.
 * @returns Trimmed non-empty agent id list.
 */
export function parseAgentsFlag(agentsFlag: string | undefined): string[] {
  if (agentsFlag == null || agentsFlag.trim().length === 0) {
    return [];
  }

  return agentsFlag
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

/**
 * Resolves selected agent ids from options and optional interactive prompts.
 *
 * @param options - Initialization options including `yes` and `agents`.
 * @returns Validated bundled agent ids to configure.
 */
async function resolveSelectedAgents(options: InitOptions): Promise<string[]> {
  if (options.yes === true) {
    const fromFlag = options.agents ?? [];
    if (fromFlag.length === 0) {
      throw new Error('Non-interactive init requires --agents with at least one bundled agent id.');
    }
    return validateSelectedAgentIds(fromFlag);
  }

  if (options.agents != null && options.agents.length > 0) {
    return validateSelectedAgentIds(options.agents);
  }

  return promptForAgentSelection(listBundledAgentIds());
}

/**
 * Initializes spec-n-roll in a project with selected bundled agents.
 *
 * @param options - Initialization path, agent selection, and toolkit root options.
 * @returns Summary of the initialized project and selected agents.
 */
export async function runInit(options: InitOptions): Promise<InitResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const toolkitRoot = options.toolkitRoot ?? resolveToolkitRoot();
  const selectedAgents = await resolveSelectedAgents(options);

  await ensureUserOwnedDirectories(projectRoot);
  await installProjectBinaries(projectRoot, toolkitRoot);
  await installBundledPlatformScripts(projectRoot, toolkitRoot);
  await writeCanonicalAgentsMd(projectRoot);
  await generateWorkflowSkills(projectRoot);
  await installBundledExtensions(projectRoot, selectedAgents);

  for (const agentId of selectedAgents) {
    const generator = getBundledAgentGenerator(agentId);
    if (generator == null) {
      throw new Error(`Unknown bundled agent id: ${agentId}`);
    }
    await generator.generate(projectRoot);
  }

  const workflowConfig = createDefaultWorkflowConfig({
    toolkitVersion: readToolkitVersion(toolkitRoot),
    selectedAgentIds: selectedAgents,
  });
  await writeInitialConfigFiles(projectRoot, workflowConfig);
  await writeCompatibilityJson(projectRoot);

  return {
    projectRoot,
    selectedAgents,
  };
}

/**
 * Commander action handler for `spec-n-roll init`.
 *
 * @param targetPath - Optional project path relative to cwd.
 * @param commandOptions - Parsed Commander options including `yes` and `agents`.
 */
export async function handleInitCommand(
  targetPath: string,
  commandOptions: { yes?: boolean; agents?: string },
): Promise<void> {
  const projectRoot = path.resolve(process.cwd(), targetPath);
  const agents = parseAgentsFlag(commandOptions.agents);

  try {
    const result = await runInit({
      projectRoot,
      yes: commandOptions.yes === true,
      agents: agents.length > 0 ? agents : undefined,
    });

    console.log(
      `Initialized spec-n-roll in ${result.projectRoot} for agents: ${result.selectedAgents.join(', ')}`,
    );
    console.log(`MCP server: ${MCP_BINARY_RELATIVE_PATH}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`init failed: ${message}`);
    process.exitCode = 1;
  }
}
