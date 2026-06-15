import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fse from 'fs-extra';

import {
  getBundledAgentGenerator,
  installBundledExtensions,
  validateSelectedAgentIds,
} from './agents/extension-loader.js';
import { writeCanonicalAgentsMd } from './agents/generators/agents-md.js';
import { generateWorkflowSkills } from './agents/generators/workflow-skills.js';
import type { AgentConfig, WorkflowConfig } from './config/schema.js';
import { atomicWriteJson } from './core/atomic-write.js';
import { findToolkitPackageRoot } from './core/paths.js';
import {
  globalManifestoPath,
  MANIFESTO_TEMPLATE_FILES,
  manifestoConfigDir,
  resolveManifestoTemplatePath,
  stepManifestoDir,
} from './manifesto/paths.js';
import { createDefaultSetListsFile, SET_LISTS_RELATIVE_PATH } from './setlists/index.js';
import { WORKFLOW_CONFIG_SCHEMA_VERSION } from './updates/migration.js';
import { writeProjectMetadata } from './core/project-metadata.js';
import {
  installProjectBinaries,
  readStagedLocalBundleVersion,
} from './install/local-binaries.js';
import { installBundledPlatformScripts } from './workflow/platform-scripts.js';
import { BUILT_IN_STEP_OUTPUTS } from './workflow/step-manifest.js';

export { WORKFLOW_CONFIG_SCHEMA_VERSION, installProjectBinaries };

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
   * Selected agent ids; at least one is required.
   */
  agents: string[];
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
   * Agent ids configured during initialization.
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
   * Agent ids selected during initialization.
   */
  selectedAgentIds: readonly string[];
}

/**
 * Resolves the toolkit package root from the running module location.
 *
 * @returns Absolute path to the toolkit repository/package root.
 */
export function resolveToolkitRoot(): string {
  return findToolkitPackageRoot(path.dirname(fileURLToPath(import.meta.url)));
}

/**
 * Builds the default workflow configuration for a newly initialized project.
 *
 * @param input - Toolkit version and selected agent ids.
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
 * Seeds default set lists and manifesto layout without overwriting existing user files.
 *
 * @param projectRoot - Absolute path to the project root.
 */
async function seedSetListsAndManifestoLayout(projectRoot: string): Promise<void> {
  const setListsPath = path.join(projectRoot, SET_LISTS_RELATIVE_PATH);
  if (!(await fse.pathExists(setListsPath))) {
    await atomicWriteJson(setListsPath, createDefaultSetListsFile());
  }

  await fse.ensureDir(stepManifestoDir(projectRoot));

  const globalPath = globalManifestoPath(projectRoot);
  if (!(await fse.pathExists(globalPath))) {
    const templatePath = resolveManifestoTemplatePath(MANIFESTO_TEMPLATE_FILES.global);
    if (await fse.pathExists(templatePath)) {
      await fse.ensureDir(manifestoConfigDir(projectRoot));
      await fse.copy(templatePath, globalPath);
    }
  }
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
 * Initializes Spec-N-Roll in a project with selected agents.
 *
 * @param options - Initialization path, agent selection, and toolkit root options.
 * @returns Summary of the initialized project and selected agents.
 */
export async function runInit(options: InitOptions): Promise<InitResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const toolkitRoot = options.toolkitRoot ?? resolveToolkitRoot();

  if (options.agents.length === 0) {
    throw new Error('At least one agent id is required for initialization.');
  }

  const selectedAgents = validateSelectedAgentIds(options.agents);

  await ensureUserOwnedDirectories(projectRoot);
  await installProjectBinaries(projectRoot, toolkitRoot);
  await installBundledPlatformScripts(projectRoot, toolkitRoot);
  await writeCanonicalAgentsMd(projectRoot);
  await generateWorkflowSkills(projectRoot);
  await installBundledExtensions(projectRoot, selectedAgents);

  for (const agentId of selectedAgents) {
    const generator = getBundledAgentGenerator(agentId);
    if (generator == null) {
      throw new Error(`Unknown agent id: ${agentId}`);
    }
    await generator.generate(projectRoot);
  }

  const workflowConfig = createDefaultWorkflowConfig({
    toolkitVersion: readStagedLocalBundleVersion(toolkitRoot),
    selectedAgentIds: selectedAgents,
  });
  await writeInitialConfigFiles(projectRoot, workflowConfig);
  await seedSetListsAndManifestoLayout(projectRoot);
  await writeCompatibilityJson(projectRoot);

  return {
    projectRoot,
    selectedAgents,
  };
}
