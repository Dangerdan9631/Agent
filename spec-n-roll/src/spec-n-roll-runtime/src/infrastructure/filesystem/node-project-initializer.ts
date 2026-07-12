import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import {
  LOCAL_CLI_RELATIVE_PATH_SEGMENTS,
  LOCAL_MCP_RELATIVE_PATH_SEGMENTS,
  SPEC_N_ROLL_CONFIG_DIRECTORY_NAME,
} from 'spec-n-roll-api';
import type { ProjectInitializer } from '#runtime/application/init/project-initializer.js';
import { CodexAgentExtensionSource } from '#runtime/application/extensions/agents/codex-agent-extension-source.js';
import { CursorAgentExtensionSource } from '#runtime/application/extensions/agents/cursor-agent-extension-source.js';

/**
 * Installs a project-local runtime using Node.js filesystem operations.
 */
export class NodeProjectInitializer implements ProjectInitializer {
  /**
   * Creates a Node-backed project initializer.
   *
   * @param runtimeBinaryPath - Absolute path to the running runtime binary to copy.
   * @param mcpBinaryPath - Absolute path to the bundled MCP server binary to copy.
   * @param codexAgentExtensionSource - Source provider for the bundled Codex extension module.
   * @param cursorAgentExtensionSource - Source provider for the bundled Cursor extension module.
   */
  constructor(
    private readonly runtimeBinaryPath = process.argv[1],
    private readonly mcpBinaryPath = createRequire(import.meta.url).resolve(
      'spec-n-roll-mcp/dist/index.js',
    ),
    private readonly codexAgentExtensionSource = new CodexAgentExtensionSource(),
    private readonly cursorAgentExtensionSource = new CursorAgentExtensionSource(),
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
   * Creates configuration storage and copies the runtime binary.
   *
   * @param projectRoot - Absolute project root receiving the installation.
   */
  initialize(projectRoot: string): void {
    const runtimeBinaryPath = join(
      projectRoot,
      ...LOCAL_CLI_RELATIVE_PATH_SEGMENTS,
    );
    mkdirSync(dirname(runtimeBinaryPath), { recursive: true });
    cpSync(this.runtimeBinaryPath, runtimeBinaryPath);
    if (process.platform !== 'win32') chmodSync(runtimeBinaryPath, 0o755);
    this.copyMcpServer(projectRoot);
    this.writeExtensions(projectRoot);
  }

  /**
   * Copies the bundled MCP server into the project's local CLI directory.
   *
   * @param projectRoot - Absolute project root receiving the MCP server binary.
   */
  private copyMcpServer(projectRoot: string): void {
    const mcpBinaryPath = join(
      projectRoot,
      ...LOCAL_MCP_RELATIVE_PATH_SEGMENTS,
    );
    mkdirSync(dirname(mcpBinaryPath), { recursive: true });
    cpSync(this.mcpBinaryPath, mcpBinaryPath);
    if (process.platform !== 'win32') chmodSync(mcpBinaryPath, 0o755);
  }

  /**
   * Creates bundled agent extension folders and their enabled-state configuration.
   *
   * @param projectRoot - Absolute project root receiving the extension files.
   */
  private writeExtensions(projectRoot: string): void {
    const extensionsRoot = join(
      projectRoot,
      SPEC_N_ROLL_CONFIG_DIRECTORY_NAME,
      'extensions',
    );
    const agentsRoot = join(extensionsRoot, 'agents');
    mkdirSync(join(agentsRoot, 'codex'), { recursive: true });
    mkdirSync(join(agentsRoot, 'cursor'), { recursive: true });
    writeFileSync(
      join(agentsRoot, 'codex', 'extension.mjs'),
      this.codexAgentExtensionSource.source(),
      'utf8',
    );
    writeFileSync(
      join(agentsRoot, 'cursor', 'extension.mjs'),
      this.cursorAgentExtensionSource.source(),
      'utf8',
    );
    writeFileSync(
      join(extensionsRoot, 'extensions.json'),
      `${JSON.stringify({ agents: { codex: { enabled: true }, cursor: { enabled: true } } }, null, 2)}\n`,
      'utf8',
    );
  }
}
