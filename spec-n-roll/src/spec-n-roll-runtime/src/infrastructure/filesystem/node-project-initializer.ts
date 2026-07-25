import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type {
  ProjectConfigurationMigrator,
  ProjectFrameworkUpgrader,
} from 'spec-n-roll-sdk';
import {
  LOCAL_CLI_RELATIVE_PATH_SEGMENTS,
  LOCAL_FRAMEWORK_METADATA_RELATIVE_PATH_SEGMENTS,
  LOCAL_MCP_RELATIVE_PATH_SEGMENTS,
  SPEC_N_ROLL_CONFIG_DIRECTORY_NAME,
} from 'spec-n-roll-api';
import type { ProjectInitializer } from '#runtime/application/init/project-initializer.js';
import { CodexAgentExtensionSource } from '#runtime/application/extensions/agents/codex-agent-extension-source.js';
import { CursorAgentExtensionSource } from '#runtime/application/extensions/agents/cursor-agent-extension-source.js';
import { BuiltInAgentInstructionSource } from '#runtime/application/extensions/agents/built-in-agent-instruction-source.js';
import { FrameworkExtensionOwnership } from '#runtime/infrastructure/update/framework-extension-ownership.js';
import { NodeProjectConfigurationMigrator } from '#runtime/infrastructure/update/node-project-configuration-migrator.js';

/**
 * Installs and upgrades a project-local runtime using Node.js filesystem operations.
 */
export class NodeProjectInitializer
  implements ProjectInitializer, ProjectFrameworkUpgrader
{
  /**
   * Creates a Node-backed project framework installer.
   *
   * @param runtimeBinaryPath - Absolute path to the running runtime binary to copy.
   * @param mcpBinaryPath - Absolute path to the bundled MCP server binary to copy.
   * @param codexAgentExtensionSource - Source provider for the bundled Codex extension module.
   * @param cursorAgentExtensionSource - Source provider for the bundled Cursor extension module.
   * @param skillDefinitionSource - Source provider for the neutral built-in capability.
   * @param instructionSource - Renderer for built-in native skill artifacts.
   * @param ownership - Ownership reader for files in the extension directory.
   * @param migrator - Configuration migration boundary run after framework replacement.
   */
  constructor(
    private readonly runtimeBinaryPath = process.argv[1],
    private readonly mcpBinaryPath = createRequire(import.meta.url).resolve(
      'spec-n-roll-mcp/dist/index.js',
    ),
    private readonly codexAgentExtensionSource = new CodexAgentExtensionSource(),
    private readonly cursorAgentExtensionSource = new CursorAgentExtensionSource(),
    private readonly instructionSource = new BuiltInAgentInstructionSource(),
    private readonly ownership = new FrameworkExtensionOwnership(),
    private readonly migrator: ProjectConfigurationMigrator = new NodeProjectConfigurationMigrator(),
  ) {}

  /**
   * Determines whether the project configuration directory exists.
   *
   * @param projectRoot - Absolute project root to inspect.
   * @returns true when `.spec-n-roll` exists.
   */
  projectExists(projectRoot: string): boolean {
    return existsSync(join(projectRoot, SPEC_N_ROLL_CONFIG_DIRECTORY_NAME));
  }

  /**
   * Creates configuration storage and copies the current global framework files.
   *
   * @param projectRoot - Absolute project root receiving the installation.
   */
  initialize(
    projectRoot: string,
    agents: readonly string[] = ['codex', 'cursor'],
  ): void {
    this.copyFrameworkFiles(projectRoot);
    this.writeDefaultExtensions(projectRoot, true, agents);
  }

  /**
   * Reconciles framework-owned built-in extensions with the selected agent names.
   *
   * @param projectRoot - Absolute initialized project root receiving the update.
   * @param agents - Built-in agent names that should be enabled.
   */
  configureBuiltInAgents(projectRoot: string, agents: readonly string[]): void {
    if (!this.projectExists(projectRoot))
      throw new Error(
        `Cannot configure built-in agents because ${projectRoot} is not initialized.`,
      );
    this.writeDefaultExtensions(projectRoot, true, agents);
  }

  /**
   * Replaces framework-owned files, preserves user extensions, and migrates configuration.
   *
   * @param projectRoot - Absolute existing project root receiving the update.
   */
  upgrade(projectRoot: string): void {
    if (!this.projectExists(projectRoot))
      throw new Error(
        `Cannot update Spec-N-Roll framework because ${projectRoot} is not initialized.`,
      );
    this.copyFrameworkFiles(projectRoot);
    this.writeDefaultExtensions(projectRoot, false);
    this.migrator.migrate(projectRoot);
  }

  /**
   * Copies every framework-owned executable file into the local installation.
   *
   * @param projectRoot - Absolute project root receiving the framework files.
   */
  private copyFrameworkFiles(projectRoot: string): void {
    this.copyExecutable(
      this.runtimeBinaryPath,
      join(projectRoot, ...LOCAL_CLI_RELATIVE_PATH_SEGMENTS),
    );
    this.copyExecutable(
      this.mcpBinaryPath,
      join(projectRoot, ...LOCAL_MCP_RELATIVE_PATH_SEGMENTS),
    );
    writeFileSync(
      join(projectRoot, ...LOCAL_FRAMEWORK_METADATA_RELATIVE_PATH_SEGMENTS),
      JSON.stringify({ runtimeVersion: this.runtimeVersion() }, null, 2) + '\n',
      'utf8',
    );
  }

  /**
   * Reads the package version associated with the current global runtime binary.
   *
   * @returns Non-empty runtime semantic version or `0.0.0` when unavailable.
   */
  private runtimeVersion(): string {
    try {
      const packagePath = join(
        dirname(this.runtimeBinaryPath),
        '..',
        'package.json',
      );
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as {
        version?: unknown;
      };
      return typeof packageJson.version === 'string' &&
        packageJson.version !== ''
        ? packageJson.version
        : '0.0.0';
    } catch {
      return '0.0.0';
    }
  }

  /**
   * Copies one executable while preserving executable permissions on POSIX hosts.
   *
   * @param sourcePath - Absolute framework source file path.
   * @param targetPath - Absolute project target file path.
   */
  private copyExecutable(sourcePath: string, targetPath: string): void {
    mkdirSync(dirname(targetPath), { recursive: true });
    cpSync(sourcePath, targetPath);
    if (process.platform !== 'win32') chmodSync(targetPath, 0o755);
  }

  /**
   * Writes default extensions without replacing extension files owned by users.
   *
   * @param projectRoot - Absolute project root receiving extension files.
   * @param initializing - True when the project is newly initialized.
   */
  private writeDefaultExtensions(
    projectRoot: string,
    initializing: boolean,
    selectedAgents: readonly string[] = ['codex', 'cursor'],
  ): void {
    const extensionsRoot = join(
      projectRoot,
      SPEC_N_ROLL_CONFIG_DIRECTORY_NAME,
      'extensions',
    );
    const defaults = [
      ['codex', this.codexAgentExtensionSource.source()],
      ['cursor', this.cursorAgentExtensionSource.source()],
    ] as const;
    for (const [name, source] of defaults) {
      const instructionPath = join(
        projectRoot,
        `.${name}`,
        'skills',
        'spec-n-roll',
        'SKILL.md',
      );
      if (initializing && !selectedAgents.includes(name)) {
        if (this.ownership.isFrameworkOwnedInstruction(instructionPath))
          rmSync(instructionPath, { force: true });
        continue;
      }
      const extensionPath = join(
        extensionsRoot,
        'agents',
        name,
        'extension.mjs',
      );
      mkdirSync(dirname(extensionPath), { recursive: true });
      if (
        initializing ||
        !existsSync(extensionPath) ||
        this.ownership.isFrameworkOwned(extensionPath)
      )
        writeFileSync(extensionPath, source, 'utf8');
      mkdirSync(dirname(instructionPath), { recursive: true });
      if (
        !existsSync(instructionPath) ||
        this.ownership.isFrameworkOwnedInstruction(instructionPath)
      )
        writeFileSync(instructionPath, this.instructionSource.source(name), 'utf8');
    }
    const configurationPath = join(extensionsRoot, 'extensions.json');
    const selectedDefaults = defaults.filter(
      ([name]) => !initializing || selectedAgents.includes(name),
    );
    if (initializing || !existsSync(configurationPath))
      writeFileSync(
        configurationPath,
        JSON.stringify(
          {
            agents: Object.fromEntries(
              selectedDefaults.map(([name]) => [name, { enabled: true }]),
            ),
          },
          null,
          2,
        ) + '\n',
        'utf8',
      );
    this.removeOwnedExtensionsAbsentFromDefaults(
      extensionsRoot,
      new Set(selectedDefaults.map(([name]) => name)),
    );
  }

  /**
   * Removes only framework-owned default extension folders that the new framework no longer supplies.
   *
   * @param extensionsRoot - Absolute extension storage root.
   * @param defaultNames - Current framework-supplied agent extension names.
   */
  private removeOwnedExtensionsAbsentFromDefaults(
    extensionsRoot: string,
    defaultNames: ReadonlySet<string>,
  ): void {
    const agentsRoot = join(extensionsRoot, 'agents');
    if (!existsSync(agentsRoot)) return;
    for (const name of readdirSync(agentsRoot)) {
      if (defaultNames.has(name)) continue;
      const extensionPath = join(agentsRoot, name, 'extension.mjs');
      if (this.ownership.isFrameworkOwned(extensionPath))
        rmSync(join(agentsRoot, name), { recursive: true, force: true });
    }
  }
}
