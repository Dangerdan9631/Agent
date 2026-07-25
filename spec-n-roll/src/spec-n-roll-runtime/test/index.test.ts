import { describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  RuntimeApplication,
  RuntimeInvocationParser,
  TerminalLayoutAllocator,
  NodeExtensionDiscoverer,
  NodeProjectInitializer,
  type RuntimeInvocationReader,
  type RuntimeUiMode,
  type RuntimeUiRenderer,
} from '#runtime/index.js';
import type { RuntimeInvocation } from 'spec-n-roll-api';
import type { ProjectInitializer } from '#runtime/application/init/project-initializer.js';
import type { GlobalFrameworkUpdater } from '#runtime/application/update/global-framework-updater.js';
import type { RuntimeReloader } from '#runtime/application/update/runtime-reloader.js';
import type { RuntimeUiSession } from '#runtime/application/ui/runtime-ui-session.js';
import { CodexAgentExtensionSource } from '#runtime/application/extensions/agents/codex-agent-extension-source.js';
import { CursorAgentExtensionSource } from '#runtime/application/extensions/agents/cursor-agent-extension-source.js';

/**
 * Runtime invocation reader fixture backed by a string.
 */
class StringRuntimeInvocationReader implements RuntimeInvocationReader {
  /**
   * Creates a string-backed invocation reader.
   *
   * @param input - UTF-8 text returned by the reader.
   */
  constructor(private readonly input: string) {}

  /**
   * Reads fixture input text.
   *
   * @returns Fixture input text.
   */
  read(): string {
    return this.input;
  }
}

/**
 * Runtime UI renderer fixture that records selected modes.
 */
class RecordingRuntimeUiRenderer implements RuntimeUiRenderer {
  /**
   * Modes presented by the runtime application.
   */
  readonly modes: RuntimeUiMode[] = [];

  /**
   * UI sessions received by the renderer.
   */
  readonly sessions: RuntimeUiSession[] = [];

  /**
   * Records one requested interactive mode.
   *
   * @param mode - Global or local mode selected by the application.
   */
  async render(session: RuntimeUiSession): Promise<void> {
    this.modes.push(session.mode);
    this.sessions.push(session);
  }
}

/**
 * Project initializer fixture that records initialization roots.
 */
class RecordingProjectInitializer implements ProjectInitializer {
  /**
   * Creates a fixture with a fixed project detection result.
   *
   * @param projectExistsResult - Result returned for every project detection request.
   */
  constructor(private readonly projectExistsResult = false) {}

  /**
   * Recorded project initialization requests.
   */
  readonly requests: string[] = [];

  /**
   * Built-in agents selected by recorded initialization requests.
   */
  readonly agentRequests: string[][] = [];

  /**
   * Reports the configured fixture project detection result.
   *
   * @returns Configured project detection result for fixture roots.
   */
  projectExists(projectRoot: string): boolean {
    void projectRoot;
    return this.projectExistsResult;
  }

  /**
   * Records one initialization request.
   */
  initialize(projectRoot: string, agents: readonly string[] = []): void {
    this.requests.push(projectRoot);
    this.agentRequests.push([...agents]);
  }

  /**
   * Records one built-in agent configuration request.
   */
  configureBuiltInAgents(projectRoot: string, agents: readonly string[]): void {
    this.requests.push(projectRoot);
    this.agentRequests.push([...agents]);
  }

  /**
   * Records a framework update request for the configured project root.
   *
   * @param projectRoot - Absolute project root selected for the update.
   */
  upgrade(projectRoot: string): void {
    this.requests.push(projectRoot);
  }
}

describe('spec-n-roll-runtime executable', () => {
  it('discovers enabled agent extensions from extensions.json without loading them', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'spec-n-roll-runtime-'));
    const extensionRoot = join(projectRoot, '.spec-n-roll', 'extensions');
    const configurationPath = join(extensionRoot, 'extensions.json');

    try {
      await mkdir(extensionRoot, { recursive: true });
      await writeFile(
        configurationPath,
        JSON.stringify({ agents: { codex: { enabled: true } } }),
        'utf8',
      );

      await expect(
        new NodeExtensionDiscoverer().discover(projectRoot),
      ).resolves.toEqual({
        agents: { codex: { enabled: true } },
      });
    } finally {
      await rm(projectRoot, { force: true, recursive: true });
    }
  });

  it('creates default agent extension registrations during initialization', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'spec-n-roll-runtime-'));
    const runtimeRoot = await mkdtemp(join(tmpdir(), 'spec-n-roll-runtime-'));
    const runtimeBinaryPath = join(runtimeRoot, 'spec-n-roll-runtime.js');
    const mcpBinaryPath = join(runtimeRoot, 'spec-n-roll-mcp.js');

    try {
      await writeFile(runtimeBinaryPath, 'runtime binary', 'utf8');
      await writeFile(mcpBinaryPath, 'mcp binary', 'utf8');

      new NodeProjectInitializer(runtimeBinaryPath, mcpBinaryPath).initialize(
        projectRoot,
      );

      await expect(
        readFile(
          join(
            projectRoot,
            '.spec-n-roll',
            'cli',
            'bin',
            'spec-n-roll-runtime.js',
          ),
          'utf8',
        ),
      ).resolves.toBe('runtime binary');
      await expect(
        readFile(
          join(projectRoot, '.spec-n-roll', 'cli', 'bin', 'spec-n-roll-mcp.js'),
          'utf8',
        ),
      ).resolves.toBe('mcp binary');
      await expect(
        readFile(
          join(projectRoot, '.spec-n-roll', 'cli', 'package.json'),
          'utf8',
        ),
      ).rejects.toThrow();
      await expect(
        readFile(
          join(projectRoot, '.codex', 'skills', 'spec-n-roll', 'SKILL.md'),
          'utf8',
        ),
      ).resolves.toContain('Spec-N-Roll scaffold');

      await expect(
        readFile(
          join(projectRoot, '.spec-n-roll', 'extensions', 'extensions.json'),
          'utf8',
        ),
      ).resolves.toBe(
        `${JSON.stringify(
          { agents: { codex: { enabled: true }, cursor: { enabled: true } } },
          null,
          2,
        )}\n`,
      );
      await expect(
        readFile(
          join(
            projectRoot,
            '.spec-n-roll',
            'extensions',
            'agents',
            'codex',
            'extension.mjs',
          ),
          'utf8',
        ),
      ).resolves.toContain('class CodexAgentExtension');
      await expect(
        readFile(
          join(
            projectRoot,
            '.spec-n-roll',
            'extensions',
            'agents',
            'codex',
            'extension.mjs',
          ),
          'utf8',
        ),
      ).resolves.toContain("author: 'spec-n-roll'");
      await expect(
        readFile(
          join(
            projectRoot,
            '.spec-n-roll',
            'extensions',
            'agents',
            'codex',
            'extension.mjs',
          ),
          'utf8',
        ),
      ).resolves.toContain("version: '0.1.0'");
      await expect(
        readFile(
          join(
            projectRoot,
            '.spec-n-roll',
            'extensions',
            'agents',
            'cursor',
            'extension.mjs',
          ),
          'utf8',
        ),
      ).resolves.toContain('class CursorAgentExtension');
    } finally {
      await rm(projectRoot, { force: true, recursive: true });
      await rm(runtimeRoot, { force: true, recursive: true });
    }
  });

  it('creates only selected built-in agent extensions during initialization', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'spec-n-roll-runtime-'));
    const runtimeRoot = await mkdtemp(join(tmpdir(), 'spec-n-roll-runtime-'));
    const runtimeBinaryPath = join(runtimeRoot, 'spec-n-roll-runtime.js');
    const mcpBinaryPath = join(runtimeRoot, 'spec-n-roll-mcp.js');

    try {
      await writeFile(runtimeBinaryPath, 'runtime binary', 'utf8');
      await writeFile(mcpBinaryPath, 'mcp binary', 'utf8');

      new NodeProjectInitializer(runtimeBinaryPath, mcpBinaryPath).initialize(
        projectRoot,
        ['codex'],
      );

      await expect(
        readFile(
          join(projectRoot, '.spec-n-roll', 'extensions', 'extensions.json'),
          'utf8',
        ),
      ).resolves.toBe(
        `${JSON.stringify({ agents: { codex: { enabled: true } } }, null, 2)}\n`,
      );
      await expect(
        readFile(
          join(
            projectRoot,
            '.spec-n-roll',
            'extensions',
            'agents',
            'cursor',
            'extension.mjs',
          ),
          'utf8',
        ),
      ).rejects.toThrow();
    } finally {
      await rm(projectRoot, { force: true, recursive: true });
      await rm(runtimeRoot, { force: true, recursive: true });
    }
  });

  it('preserves user extension files while replacing framework-owned files during update', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'spec-n-roll-runtime-'));
    const runtimeRoot = await mkdtemp(join(tmpdir(), 'spec-n-roll-runtime-'));
    const runtimeBinaryPath = join(runtimeRoot, 'spec-n-roll-runtime.js');
    const mcpBinaryPath = join(runtimeRoot, 'spec-n-roll-mcp.js');
    const userExtensionPath = join(
      projectRoot,
      '.spec-n-roll',
      'extensions',
      'agents',
      'codex',
      'extension.mjs',
    );

    try {
      await writeFile(runtimeBinaryPath, 'new runtime binary', 'utf8');
      await writeFile(mcpBinaryPath, 'new mcp binary', 'utf8');
      const initializer = new NodeProjectInitializer(
        runtimeBinaryPath,
        mcpBinaryPath,
      );
      initializer.initialize(projectRoot);
      await writeFile(
        userExtensionPath,
        'export default class UserExtension {}\n',
        'utf8',
      );
      await writeFile(
        join(projectRoot, '.spec-n-roll', 'extensions', 'extensions.json'),
        JSON.stringify({
          agents: { codex: { enabled: false, retained: true } },
        }),
        'utf8',
      );

      initializer.upgrade(projectRoot);

      await expect(readFile(userExtensionPath, 'utf8')).resolves.toBe(
        'export default class UserExtension {}\n',
      );
      await expect(
        readFile(
          join(projectRoot, '.spec-n-roll', 'extensions', 'extensions.json'),
          'utf8',
        ),
      ).resolves.toContain('"retained": true');
      await expect(
        readFile(
          join(
            projectRoot,
            '.spec-n-roll',
            'cli',
            'bin',
            'spec-n-roll-runtime.js',
          ),
          'utf8',
        ),
      ).resolves.toBe('new runtime binary');
    } finally {
      await rm(projectRoot, { force: true, recursive: true });
      await rm(runtimeRoot, { force: true, recursive: true });
    }
  });
  it.each([
    ['codex', 'CodexAgentExtension'],
    ['cursor', 'CursorAgentExtension'],
  ])(
    'creates native skills and MCP configuration for %s',
    async (agentName, extensionClassName) => {
      const projectRoot = await mkdtemp(join(tmpdir(), 'spec-n-roll-runtime-'));
      const extensionPath = join(projectRoot, 'extension.mjs');
      const originalWorkingDirectory = process.cwd();
      const source =
        agentName === 'codex'
          ? new CodexAgentExtensionSource().source()
          : new CursorAgentExtensionSource().source();

      try {
        await writeFile(extensionPath, source, 'utf8');
        process.chdir(projectRoot);
        const extensionModule = await import(pathToFileURL(extensionPath).href);
        const extension = new extensionModule.default();

        await extension.createSkills([
          {
            identifier: 'spec-n-example',
            purpose: 'Creates an example artifact.',
            version: '1.2.3',
            input: { properties: {}, required: [] },
            output: { properties: {}, required: [] },
            source: 'First instruction.\nSecond instruction.',
            requirements: { tools: [], mcpServers: ['spec-n-roll'] },
          },
        ]);
        await writeFile(
          join(projectRoot, `.${agentName}`, 'mcp.json'),
          JSON.stringify({ mcpServers: { other: { command: 'other' } } }),
          'utf8',
        );
        await extension.configureMcp();

        await expect(
          readFile(
            join(
              projectRoot,
              `.${agentName}`,
              'skills',
              'spec-n-example',
              'SKILL.md',
            ),
            'utf8',
          ),
        ).resolves.toContain('First instruction.\nSecond instruction.');
        await expect(
          readFile(join(projectRoot, `.${agentName}`, 'mcp.json'), 'utf8'),
        ).resolves.toContain('"spec-n-roll"');
        await expect(
          readFile(join(projectRoot, `.${agentName}`, 'mcp.json'), 'utf8'),
        ).resolves.toContain('"other"');
        await expect(
          readFile(join(projectRoot, `.${agentName}`, 'mcp.json'), 'utf8'),
        ).resolves.toContain('.spec-n-roll/cli/bin/spec-n-roll-mcp.js');
        expect(extension.constructor.name).toBe(extensionClassName);
      } finally {
        process.chdir(originalWorkingDirectory);
        await rm(projectRoot, { force: true, recursive: true });
      }
    },
  );

  it('gives extra terminal rows to route content while chrome stays fixed', () => {
    const allocator = new TerminalLayoutAllocator();
    const compact = allocator.allocate(20);
    const tall = allocator.allocate(30);

    expect(tall.statusRows).toBe(compact.statusRows);
    expect(tall.hintRows).toBe(compact.hintRows);
    expect(tall.contentRows - compact.contentRows).toBe(10);
  });

  it('requests a resize below the supported minimum', () => {
    const layout = new TerminalLayoutAllocator().allocate(5);

    expect(layout.requiresResize).toBe(true);
    expect(layout.contentRows).toBe(0);
  });

  it('launches the local home for a project invocation', async () => {
    const invocation: RuntimeInvocation = {
      argv: ['--root', 'project', 'version'],
      dispatcher: {
        installSource: 'remote',
        installDirectory: '/dispatcher/dist',
        packageVersion: '0.1.0',
      },
      runtime: {
        executablePath: '/runtime/spec-n-roll-runtime.js',
        packageVersion: '0.1.0',
        projectLocal: false,
      },
      projectRoot: '/workspace/project',
      cwd: '/workspace/project',
    };
    const renderer = new RecordingRuntimeUiRenderer();

    const result = new RuntimeApplication(
      new StringRuntimeInvocationReader(JSON.stringify(invocation)),
      new RuntimeInvocationParser(),
      renderer,
      new RecordingProjectInitializer(true),
    ).run();

    await expect(result).resolves.toBeUndefined();
    expect(renderer.modes).toEqual(['local']);
    expect(renderer.sessions).toMatchObject([
      {
        dispatcher: invocation.dispatcher,
        runtime: invocation.runtime,
        cwd: '/workspace/project',
        projectRoot: '/workspace/project',
      },
    ]);
  });

  it('defers global runtime reload until the completed update session requests it', async () => {
    const invocation: RuntimeInvocation = {
      argv: ['version'],
      dispatcher: {
        installSource: 'remote',
        installDirectory: '/global/spec-n-roll',
        packageVersion: '0.1.0',
      },
      runtime: {
        executablePath: '/runtime/spec-n-roll-runtime.js',
        packageVersion: '0.1.0',
        projectLocal: false,
      },
      cwd: '/workspace/project',
    };
    const renderer = new RecordingRuntimeUiRenderer();
    const reload = vi.fn();
    const updater: GlobalFrameworkUpdater = {
      isUpdateAvailable: () => true,
      update: async (_source, _directory, output) => {
        output.write('Updated framework.');
      },
    };
    const reloader: RuntimeReloader = { reload };

    await new RuntimeApplication(
      new StringRuntimeInvocationReader(JSON.stringify(invocation)),
      new RuntimeInvocationParser(),
      renderer,
      new RecordingProjectInitializer(),
      undefined,
      undefined,
      undefined,
      undefined,
      updater,
      undefined,
      reloader,
    ).run();

    const session = renderer.sessions[0];
    if (session == null)
      throw new Error('Expected an interactive runtime session.');
    await session.updateGlobalFramework({ write: () => undefined });

    expect(reload).not.toHaveBeenCalled();
    session.reloadRuntime();
    expect(reload).toHaveBeenCalledTimes(1);
  });
  it('keeps global initialization enabled when a specified root has no project configuration', async () => {
    const invocation: RuntimeInvocation = {
      argv: ['--root', '/workspace/new-project', 'version'],
      dispatcher: {
        installSource: 'remote',
        installDirectory: '/global/spec-n-roll',
        packageVersion: '0.1.0',
      },
      runtime: {
        executablePath: '/runtime/spec-n-roll-runtime.js',
        packageVersion: '0.1.0',
        projectLocal: false,
      },
      projectRoot: '/workspace/new-project',
      cwd: '/workspace/new-project',
    };
    const renderer = new RecordingRuntimeUiRenderer();

    await new RuntimeApplication(
      new StringRuntimeInvocationReader(JSON.stringify(invocation)),
      new RuntimeInvocationParser(),
      renderer,
      new RecordingProjectInitializer(false),
    ).run();

    expect(renderer.sessions).toMatchObject([
      { mode: 'global', projectFound: false },
    ]);
    expect(renderer.sessions[0]?.projectRoot).toBe('/workspace/new-project');
  });

  it('keeps global initialization enabled when only the working directory contains a project', async () => {
    const invocation: RuntimeInvocation = {
      argv: ['version'],
      dispatcher: {
        installSource: 'remote',
        installDirectory: '/global/spec-n-roll',
        packageVersion: '0.1.0',
      },
      runtime: {
        executablePath: '/runtime/spec-n-roll-runtime.js',
        packageVersion: '0.1.0',
        projectLocal: false,
      },
      cwd: '/workspace/project',
    };
    const renderer = new RecordingRuntimeUiRenderer();

    await new RuntimeApplication(
      new StringRuntimeInvocationReader(JSON.stringify(invocation)),
      new RuntimeInvocationParser(),
      renderer,
      new RecordingProjectInitializer(true),
    ).run();

    expect(renderer.sessions[0]?.projectFound).toBe(false);
  });

  it('initializes the current working directory when init has no root', async () => {
    const initializer = new RecordingProjectInitializer();
    const invocation: RuntimeInvocation = {
      argv: ['init'],
      dispatcher: {
        installSource: 'remote',
        installDirectory: '/global/spec-n-roll',
        packageVersion: '0.1.0',
      },
      runtime: {
        executablePath: '/runtime/spec-n-roll-runtime.js',
        packageVersion: '0.1.0',
        projectLocal: false,
      },
      cwd: '/workspace/project',
    };

    await new RuntimeApplication(
      new StringRuntimeInvocationReader(JSON.stringify(invocation)),
      new RuntimeInvocationParser(),
      new RecordingRuntimeUiRenderer(),
      initializer,
    ).run();

    expect(initializer.requests).toEqual([resolve('/workspace/project')]);
  });

  it('uses the dispatcher-resolved project root for flagged init', async () => {
    const initializer = new RecordingProjectInitializer();
    const invocation: RuntimeInvocation = {
      argv: ['--root', 'project', 'init'],
      dispatcher: {
        installSource: 'remote',
        installDirectory: '/global/spec-n-roll',
        packageVersion: '0.1.0',
      },
      runtime: {
        executablePath: '/runtime/spec-n-roll-runtime.js',
        packageVersion: '0.1.0',
        projectLocal: false,
      },
      projectRoot: '/workspace/project',
      cwd: '/workspace/project',
    };

    await new RuntimeApplication(
      new StringRuntimeInvocationReader(JSON.stringify(invocation)),
      new RuntimeInvocationParser(),
      new RecordingRuntimeUiRenderer(),
      initializer,
    ).run();

    expect(initializer.requests[0]).toBe('/workspace/project');
  });

  it('initializes only the built-in agents selected by repeatable init flags', async () => {
    const initializer = new RecordingProjectInitializer();
    const invocation: RuntimeInvocation = {
      argv: ['init', '--agent', 'codex'],
      dispatcher: {
        installSource: 'remote',
        installDirectory: '/global/spec-n-roll',
        packageVersion: '0.1.0',
      },
      runtime: {
        executablePath: '/runtime/spec-n-roll-runtime.js',
        packageVersion: '0.1.0',
        projectLocal: false,
      },
      cwd: '/workspace/project',
    };

    await new RuntimeApplication(
      new StringRuntimeInvocationReader(JSON.stringify(invocation)),
      new RuntimeInvocationParser(),
      new RecordingRuntimeUiRenderer(),
      initializer,
    ).run();

    expect(initializer.agentRequests).toEqual([['codex']]);
  });

  it('rejects unknown built-in agents selected by init flags', async () => {
    const invocation: RuntimeInvocation = {
      argv: ['init', '--agent', 'unknown'],
      dispatcher: {
        installSource: 'remote',
        installDirectory: '/global/spec-n-roll',
        packageVersion: '0.1.0',
      },
      runtime: {
        executablePath: '/runtime/spec-n-roll-runtime.js',
        packageVersion: '0.1.0',
        projectLocal: false,
      },
      cwd: '/workspace/project',
    };

    await expect(
      new RuntimeApplication(
        new StringRuntimeInvocationReader(JSON.stringify(invocation)),
        new RuntimeInvocationParser(),
        new RecordingRuntimeUiRenderer(),
        new RecordingProjectInitializer(),
      ).run(),
    ).rejects.toThrow(
      'Unknown built-in agent "unknown". Choose codex or cursor.',
    );
  });

  it('rejects an init agent flag without a name', async () => {
    const invocation: RuntimeInvocation = {
      argv: ['init', '--agent'],
      dispatcher: {
        installSource: 'remote',
        installDirectory: '/global/spec-n-roll',
        packageVersion: '0.1.0',
      },
      runtime: {
        executablePath: '/runtime/spec-n-roll-runtime.js',
        packageVersion: '0.1.0',
        projectLocal: false,
      },
      cwd: '/workspace/project',
    };

    await expect(
      new RuntimeApplication(
        new StringRuntimeInvocationReader(JSON.stringify(invocation)),
        new RuntimeInvocationParser(),
        new RecordingRuntimeUiRenderer(),
        new RecordingProjectInitializer(),
      ).run(),
    ).rejects.toThrow('The --agent option requires a built-in agent name.');
  });

  it('rejects empty stdin instead of launching the UI', async () => {
    const renderer = new RecordingRuntimeUiRenderer();

    await expect(
      new RuntimeApplication(
        new StringRuntimeInvocationReader(''),
        new RuntimeInvocationParser(),
        renderer,
        new RecordingProjectInitializer(),
      ).run(),
    ).rejects.toThrow('Runtime invocation payload was empty.');
    expect(renderer.modes).toEqual([]);
  });

  it('rejects malformed invocation objects', async () => {
    const renderer = new RecordingRuntimeUiRenderer();
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    try {
      await expect(
        new RuntimeApplication(
          new StringRuntimeInvocationReader(
            JSON.stringify({ argv: ['version'] }),
          ),
          new RuntimeInvocationParser(),
          renderer,
          new RecordingProjectInitializer(),
        ).run(),
      ).rejects.toThrow(
        'Runtime invocation payload did not match the dispatcher schema.',
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
});
