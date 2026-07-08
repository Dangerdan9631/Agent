import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import 'reflect-metadata';
import { Logger } from 'tslog';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DispatcherApplication } from '#dispatcher/application/dispatch/dispatcher-application.js';
import { DispatcherCli } from '#dispatcher/presentation/cli/dispatcher-cli.js';
import { DispatcherContainerFactory } from '#dispatcher/composition/dispatcher/dispatcher-container-factory.js';
import type { DispatcherEnvironment } from '#dispatcher/infrastructure/environment/dispatcher-environment.js';
import { DispatcherMetadataReader } from '#dispatcher/infrastructure/metadata/dispatcher-metadata-reader.js';
import { NodeRuntimeProcessExecutor } from '#dispatcher/infrastructure/runtime/node-runtime-process-executor.js';
import { ProjectRootResolver } from '#dispatcher/application/project/project-root-resolver.js';
import type { RuntimeProcessExecutor } from '#dispatcher/application/runtime/runtime-process-executor.js';
import { RuntimeTargetResolver } from '#dispatcher/application/runtime/runtime-target-resolver.js';
import type { RuntimeInvocation, RuntimeTarget } from 'spec-n-roll-api';

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(() => ({
    status: 0,
    signal: null,
    output: [],
    pid: 1,
    stdout: null,
    stderr: null,
  })),
}));

/**
 * Temporary fixture directories created during dispatcher tests.
 */
const tempDirs: string[] = [];

/**
 * Mocked child process spawn function used to verify process execution.
 */
const mockedSpawnSync = vi.mocked(spawnSync);

/**
 * Creates dispatcher filesystem fixtures for tests.
 */
class DispatcherFixtureFactory {
  /**
   * Creates a unique temporary fixture directory.
   *
   * @param prefix - Human-readable fixture name segment.
   * @returns Absolute path to the created fixture directory.
   */
  createTempDir(prefix: string): string {
    const directory = join(
      tmpdir(),
      `spec-n-roll-dispatcher-${prefix}-${Date.now()}-${Math.random()}`,
    );
    mkdirSync(directory, { recursive: true });
    tempDirs.push(directory);
    return directory;
  }

  /**
   * Writes a JavaScript launcher fixture that can be executed by Node.
   *
   * @param filePath - Absolute launcher path to create.
   */
  writeNodeLauncher(filePath: string): void {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, '#!/usr/bin/env node\nprocess.exit(0);\n', 'utf8');

    if (process.platform !== 'win32') {
      chmodSync(filePath, 0o755);
    }
  }

  /**
   * Creates a dispatcher package fixture with optional local-source marker.
   *
   * @param installSource - Install source shape represented by the fixture.
   * @returns Absolute path to the fixture dispatcher install directory.
   */
  createDispatcherInstallFixture(installSource: 'remote' | 'local'): string {
    const packageRoot = this.createTempDir(`install-${installSource}`);
    const installDirectory = join(packageRoot, 'dist');
    mkdirSync(installDirectory, { recursive: true });
    writeFileSync(
      join(packageRoot, 'package.json'),
      JSON.stringify({ name: 'spec-n-roll', version: '9.8.7' }),
      'utf8',
    );
    this.writeRuntimePackageFixture(packageRoot);

    if (installSource === 'local') {
      writeFileSync(
        join(installDirectory, '.source-package-root'),
        `${packageRoot}\n`,
        'utf8',
      );
    }

    return installDirectory;
  }

  /**
   * Writes a minimal runtime dependency fixture under a dispatcher package root.
   *
   * @param packageRoot - Dispatcher package root receiving the dependency fixture.
   */
  private writeRuntimePackageFixture(packageRoot: string): void {
    const runtimeRoot = join(
      packageRoot,
      'node_modules',
      'spec-n-roll-runtime',
    );
    const runtimeExecutable = join(runtimeRoot, 'dist', 'index.js');
    mkdirSync(dirname(runtimeExecutable), { recursive: true });
    writeFileSync(
      join(runtimeRoot, 'package.json'),
      JSON.stringify({
        name: 'spec-n-roll-runtime',
        version: '9.8.7',
        bin: { 'spec-n-roll-runtime': './dist/index.js' },
      }),
      'utf8',
    );
    this.writeNodeLauncher(runtimeExecutable);
  }
}

/**
 * Process environment fixture used by dispatcher application tests.
 */
class FakeDispatcherEnvironment implements DispatcherEnvironment {
  /**
   * Creates a process environment fixture.
   *
   * @param currentWorkingDirectory - Directory returned as process cwd.
   * @param installDirectory - Directory returned as dispatcher install.
   * @param nodePath - Node.js executable path returned to the executor.
   */
  constructor(
    private readonly currentWorkingDirectory: string,
    private readonly installDirectory: string,
    private readonly nodePath = process.execPath,
  ) {}

  /**
   * Returns the fixture current working directory.
   *
   * @returns Fixture current working directory.
   */
  cwd(): string {
    return this.currentWorkingDirectory;
  }

  /**
   * Returns the fixture Node.js executable path.
   *
   * @returns Fixture Node.js executable path.
   */
  nodeExecutablePath(): string {
    return this.nodePath;
  }

  /**
   * Returns the fixture dispatcher install directory.
   *
   * @returns Fixture dispatcher install directory.
   */
  dispatcherInstallDirectory(): string {
    return this.installDirectory;
  }
}

/**
 * Runtime process executor fixture that records the selected target and payload.
 */
class RecordingRuntimeProcessExecutor implements RuntimeProcessExecutor {
  /**
   * Last runtime target received by the executor.
   */
  target?: RuntimeTarget;

  /**
   * Last runtime invocation received by the executor.
   */
  invocation?: RuntimeInvocation;

  /**
   * Records a runtime execution request.
   *
   * @param target - Runtime target selected by the dispatcher.
   * @param invocation - Runtime invocation payload serialized for the child process.
   * @returns Fixture runtime process exit code.
   */
  execute(target: RuntimeTarget, invocation: RuntimeInvocation): number {
    this.target = target;
    this.invocation = invocation;
    return 17;
  }
}

afterEach(() => {
  vi.clearAllMocks();

  while (tempDirs.length > 0) {
    const directory = tempDirs.pop();

    if (directory != null) {
      rmSync(directory, { recursive: true, force: true });
    }
  }
});

describe('spec-n-roll dispatcher executable', () => {
  it('publishes the workspace root command shim to the dispatcher package', () => {
    const packageJson = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, '../../../package.json'),
        'utf8',
      ),
    ) as { bin?: Record<string, string> };

    expect(packageJson.bin).toEqual({
      'spec-n-roll': './src/spec-n-roll/dist/index.js',
      snr: './src/spec-n-roll/dist/index.js',
    });
  });

  it('parses dispatcher-only flags while preserving the full argv list', () => {
    const run = vi.fn(() => 0);
    const application = { run } as unknown as DispatcherApplication;
    const argv = ['--global', '--root', 'project', 'version', '--json'];

    const commandContainer = new DispatcherContainerFactory().create();
    commandContainer.registerInstance(DispatcherApplication, application);

    commandContainer
      .resolve(DispatcherCli)
      .run(['node', 'spec-n-roll', ...argv]);

    expect(run).toHaveBeenCalledWith({
      argv,
      options: {
        global: true,
        root: 'project',
      },
    });
  });

  it('resolves concrete services through tsyringe auto construction', () => {
    const commandContainer = new DispatcherContainerFactory().create();

    expect(commandContainer.resolve(ProjectRootResolver)).toBeInstanceOf(
      ProjectRootResolver,
    );
    expect(commandContainer.resolve(DispatcherMetadataReader)).toBeInstanceOf(
      DispatcherMetadataReader,
    );
  });
});

describe('ProjectRootResolver', () => {
  it('uses a caller-provided project root without requiring it to exist', () => {
    const cwd = new DispatcherFixtureFactory().createTempDir('explicit-root');
    const projectRoot = join(cwd, 'missing-project');

    expect(
      new ProjectRootResolver().resolve({
        cwd,
        requestedProjectRoot: 'missing-project',
      }).projectRoot,
    ).toBe(projectRoot);
  });

  it('walks upward from cwd until it finds a config directory', () => {
    const projectRoot = new DispatcherFixtureFactory().createTempDir(
      'discovered-root',
    );
    const nestedDirectory = join(projectRoot, 'a', 'b', 'c');
    mkdirSync(join(projectRoot, '.spec-n-roll'), { recursive: true });
    mkdirSync(nestedDirectory, { recursive: true });

    expect(
      new ProjectRootResolver().resolve({
        cwd: nestedDirectory,
      }).projectRoot,
    ).toBe(projectRoot);
  });

  it('returns an undefined project root when no config directory exists', () => {
    const cwd = new DispatcherFixtureFactory().createTempDir('missing-root');

    expect(
      new ProjectRootResolver().resolve({
        cwd,
      }).projectRoot,
    ).toBeUndefined();
  });
});

describe('DispatcherMetadataReader', () => {
  it('reports remote installs when the local marker is absent', () => {
    const installDirectory =
      new DispatcherFixtureFactory().createDispatcherInstallFixture('remote');

    expect(new DispatcherMetadataReader().read(installDirectory)).toEqual({
      installSource: 'remote',
      installDirectory: dirname(installDirectory),
      packageVersion: '9.8.7',
    });
  });

  it('reports local installs when the source marker points at the dispatcher package', () => {
    const installDirectory =
      new DispatcherFixtureFactory().createDispatcherInstallFixture('local');

    expect(new DispatcherMetadataReader().read(installDirectory)).toEqual({
      installSource: 'local',
      installDirectory: dirname(installDirectory),
      packageVersion: '9.8.7',
    });
  });
});

describe('RuntimeTargetResolver', () => {
  it('selects a project-local executable when one is present and global is not forced', () => {
    const projectRoot = new DispatcherFixtureFactory().createTempDir(
      'local-target',
    );
    const localExecutable = join(
      projectRoot,
      '.spec-n-roll',
      'cli',
      'bin',
      'spec-n-roll',
    );
    new DispatcherFixtureFactory().writeNodeLauncher(localExecutable);

    expect(
      new RuntimeTargetResolver(import.meta.dirname).resolve(
        projectRoot,
        false,
      ),
    ).toEqual({
      executablePath: localExecutable,
      projectLocal: true,
    });
  });

  it('falls back to the global runtime when a local executable is missing', () => {
    const projectRoot = new DispatcherFixtureFactory().createTempDir(
      'global-target',
    );
    const target = new RuntimeTargetResolver(import.meta.dirname).resolve(
      projectRoot,
      false,
    );

    expect(target.projectLocal).toBe(false);
    expect(target.executablePath).toMatch(
      /spec-n-roll-runtime[\\/]dist[\\/]index\.js/u,
    );
  });
});

describe('DispatcherApplication', () => {
  it('uses project root as cwd even when global dispatch is forced', () => {
    const fixtureFactory = new DispatcherFixtureFactory();
    const projectRoot = fixtureFactory.createTempDir('forced-global-cwd');
    const installDirectory =
      fixtureFactory.createDispatcherInstallFixture('local');
    const executor = new RecordingRuntimeProcessExecutor();
    const application = new DispatcherApplication(
      new FakeDispatcherEnvironment(
        join(projectRoot, 'nested'),
        installDirectory,
      ),
      new ProjectRootResolver(),
      new DispatcherMetadataReader(),
      executor,
      new Logger({ name: 'spec-n-roll', minLevel: 6 }),
    );

    const exitCode = application.run({
      argv: ['--global', '--root', projectRoot, 'version'],
      options: { global: true, root: projectRoot },
    });

    expect(exitCode).toBe(17);
    expect(executor.invocation).toEqual({
      argv: ['--global', '--root', projectRoot, 'version'],
      dispatcher: {
        installSource: 'local',
        installDirectory: dirname(installDirectory),
        packageVersion: '9.8.7',
      },
      projectRoot,
      cwd: projectRoot,
    });
    expect(executor.target?.projectLocal).toBe(false);
  });
});

describe('NodeRuntimeProcessExecutor', () => {
  it('spawns Node without shell interpolation and sends the invocation on stdin', () => {
    const fixtureFactory = new DispatcherFixtureFactory();
    const executablePath = join(
      fixtureFactory.createTempDir('spawn'),
      'runtime.js',
    );
    fixtureFactory.writeNodeLauncher(executablePath);
    const executor = new NodeRuntimeProcessExecutor(
      new FakeDispatcherEnvironment(
        'C:\\workspace',
        import.meta.dirname,
        'C:\\Program Files\\nodejs\\node.exe',
      ),
    );
    const invocation: RuntimeInvocation = {
      argv: ['--root', 'my project', 'version'],
      dispatcher: {
        installSource: 'remote',
        installDirectory: import.meta.dirname,
        packageVersion: '1.2.3',
      },
      projectRoot: 'C:\\workspace\\my project',
      cwd: 'C:\\workspace\\my project',
    };

    expect(
      executor.execute({ executablePath, projectLocal: false }, invocation),
    ).toBe(0);

    expect(mockedSpawnSync).toHaveBeenCalledWith(
      'C:\\Program Files\\nodejs\\node.exe',
      [executablePath, '--root', 'my project', 'version'],
      {
        cwd: 'C:\\workspace\\my project',
        encoding: 'utf8',
        input: `${JSON.stringify(invocation)}\n`,
        stdio: ['pipe', 'inherit', 'inherit'],
      },
    );
  });
});
