import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import 'reflect-metadata';
import { Logger } from 'tslog';
import { RUNTIME_INVOCATION_ENVIRONMENT_VARIABLE } from 'spec-n-roll-api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DispatcherApplication } from '#dispatcher/application/dispatch/dispatcher-application.js';
import { DispatcherCli } from '#dispatcher/presentation/cli/dispatcher-cli.js';
import { DispatcherContainerFactory } from '#dispatcher/composition/dispatcher/dispatcher-container-factory.js';
import type { DispatcherEnvironment } from '#dispatcher/application/environment/dispatcher-environment.js';
import { DispatcherMetadataResolver } from '#dispatcher/application/dispatcher/dispatcher-metadata-resolver.js';
import { NodeDispatcherFileSystem } from '#dispatcher/infrastructure/filesystem/node-dispatcher-file-system.js';
import { NodeRuntimePackageManifestPathResolver } from '#dispatcher/infrastructure/module/node-runtime-package-manifest-path-resolver.js';
import { NodeRuntimeProcessExecutor } from '#dispatcher/infrastructure/runtime/node-runtime-process-executor.js';
import { ProjectRootResolver } from '#dispatcher/application/project/project-root-resolver.js';
import type { RuntimeProcessExecutor } from '#dispatcher/application/runtime/runtime-process-executor.js';
import { RuntimeTargetResolver } from '#dispatcher/application/runtime/runtime-target-resolver.js';
import type { RuntimeProcessRequest } from '#dispatcher/application/runtime/runtime-process-request.js';

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
  request?: RuntimeProcessRequest;

  /**
   * Records a runtime execution request.
   *
   * @param request - Raw runtime process request prepared by the dispatcher.
   * @returns Fixture runtime process exit code.
   */
  execute(request: RuntimeProcessRequest): number {
    this.request = request;
    return 17;
  }
}

/**
 * Checks dispatcher production sources for layer-boundary import violations.
 */
class DispatcherSourceArchitecturePolicy {
  /**
   * Finds imports that place filesystem access or shared API contracts in the wrong layer.
   *
   * @param sourceRoot - Absolute or relative dispatcher source root.
   * @returns Descriptions of source files with forbidden layer imports.
   */
  boundaryViolations(sourceRoot: string): string[] {
    return this.sourceFiles(resolve(sourceRoot)).flatMap((sourcePath) => {
      const source = readFileSync(sourcePath, 'utf8');
      const relativePath = relative(resolve(sourceRoot), sourcePath).replaceAll(
        '\\',
        '/',
      );
      const isInfrastructure = relativePath.startsWith('infrastructure/');
      const violations: string[] = [];

      if (!isInfrastructure && /from ['"]node:fs['"]/u.test(source)) {
        violations.push(
          `${relativePath} imports node:fs outside infrastructure`,
        );
      }

      if (isInfrastructure && /from ['"]spec-n-roll-api['"]/u.test(source)) {
        violations.push(
          `${relativePath} imports spec-n-roll-api in infrastructure`,
        );
      }

      return violations;
    });
  }

  /**
   * Recursively collects TypeScript production source files.
   *
   * @param directory - Absolute directory to inspect.
   * @returns Absolute paths to TypeScript source files below the directory.
   */
  private sourceFiles(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) {
        return this.sourceFiles(path);
      }

      return entry.isFile() && entry.name.endsWith('.ts') ? [path] : [];
    });
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

    expect(commandContainer.resolve(DispatcherApplication)).toBeInstanceOf(
      DispatcherApplication,
    );
  });
});

describe('dispatcher architecture', () => {
  it('keeps filesystem imports in infrastructure and API contracts above it', () => {
    expect(
      new DispatcherSourceArchitecturePolicy().boundaryViolations(
        'src',
      ),
    ).toEqual([]);
  });
});

describe('ProjectRootResolver', () => {
  it('uses a caller-provided project root without requiring it to exist', () => {
    const cwd = new DispatcherFixtureFactory().createTempDir('explicit-root');
    const projectRoot = join(cwd, 'missing-project');

    expect(
      new ProjectRootResolver(new NodeDispatcherFileSystem()).resolve({
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
      new ProjectRootResolver(new NodeDispatcherFileSystem()).resolve({
        cwd: nestedDirectory,
      }).projectRoot,
    ).toBe(projectRoot);
  });

  it('returns an undefined project root when no config directory exists', () => {
    const cwd = new DispatcherFixtureFactory().createTempDir('missing-root');

    expect(
      new ProjectRootResolver(new NodeDispatcherFileSystem()).resolve({
        cwd,
      }).projectRoot,
    ).toBeUndefined();
  });
});

describe('DispatcherMetadataResolver', () => {
  it('reports remote installs when the local marker is absent', () => {
    const installDirectory =
      new DispatcherFixtureFactory().createDispatcherInstallFixture('remote');

    expect(
      new DispatcherMetadataResolver(new NodeDispatcherFileSystem()).resolve(
        installDirectory,
      ),
    ).toEqual({
      installSource: 'remote',
      installDirectory: dirname(installDirectory),
      packageVersion: '9.8.7',
    });
  });

  it('reports local installs when the source marker points at the dispatcher package', () => {
    const installDirectory =
      new DispatcherFixtureFactory().createDispatcherInstallFixture('local');

    expect(
      new DispatcherMetadataResolver(new NodeDispatcherFileSystem()).resolve(
        installDirectory,
      ),
    ).toEqual({
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
      'spec-n-roll-runtime.js',
    );
    new DispatcherFixtureFactory().writeNodeLauncher(localExecutable);

    expect(
      new RuntimeTargetResolver(
        new NodeDispatcherFileSystem(),
        new NodeRuntimePackageManifestPathResolver(),
      ).resolve(projectRoot, false, import.meta.dirname),
    ).toEqual({
      executablePath: localExecutable,
      projectLocal: true,
    });
  });

  it('falls back to the global runtime when a local executable is missing', () => {
    const projectRoot = new DispatcherFixtureFactory().createTempDir(
      'global-target',
    );
    const target = new RuntimeTargetResolver(
      new NodeDispatcherFileSystem(),
      new NodeRuntimePackageManifestPathResolver(),
    ).resolve(projectRoot, false, import.meta.dirname);

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
      new ProjectRootResolver(new NodeDispatcherFileSystem()),
      new DispatcherMetadataResolver(new NodeDispatcherFileSystem()),
      new RuntimeTargetResolver(
        new NodeDispatcherFileSystem(),
        new NodeRuntimePackageManifestPathResolver(),
      ),
      executor,
      new Logger({ name: 'spec-n-roll', minLevel: 6 }),
    );

    const exitCode = application.run({
      argv: ['--global', '--root', projectRoot, 'version'],
      options: { global: true, root: projectRoot },
    });

    expect(exitCode).toBe(17);
    expect(JSON.parse(executor.request?.invocation ?? '')).toEqual({
      argv: ['--global', '--root', projectRoot, 'version'],
      dispatcher: {
        installSource: 'local',
        installDirectory: dirname(installDirectory),
        packageVersion: '9.8.7',
      },
      projectRoot,
      cwd: projectRoot,
    });
    expect(executor.request?.executablePath).toMatch(
      /spec-n-roll-runtime[\\/]dist[\\/]index\.js/u,
    );
  });
});

describe('NodeRuntimeProcessExecutor', () => {
  it('spawns Node natively in the terminal and sends invocation metadata through the environment', () => {
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
    const request: RuntimeProcessRequest = {
      executablePath,
      argv: ['--root', 'my project', 'version'],
      cwd: 'C:\\workspace\\my project',
      invocation: '{"example":true}',
      invocationEnvironmentVariable: RUNTIME_INVOCATION_ENVIRONMENT_VARIABLE,
    };

    expect(executor.execute(request)).toBe(0);

    expect(mockedSpawnSync).toHaveBeenCalledWith(
      'C:\\Program Files\\nodejs\\node.exe',
      [executablePath, '--root', 'my project', 'version'],
      {
        cwd: 'C:\\workspace\\my project',
        env: expect.objectContaining({
          [RUNTIME_INVOCATION_ENVIRONMENT_VARIABLE]: '{"example":true}',
        }),
        stdio: 'inherit',
      },
    );
  });
});
