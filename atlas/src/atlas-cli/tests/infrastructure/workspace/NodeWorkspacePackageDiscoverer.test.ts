import type { AtlasConfiguration } from '#application/configuration/model/AtlasConfiguration.js';
import { PackagePolicySelector } from '#infrastructure/workspace/PackagePolicySelector.js';
import { NodeWorkspacePackageDiscoverer } from '#infrastructure/workspace/WorkspacePackageDiscoverer.js';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * Creates fixture package directories for workspace discovery tests.
 */
class TemporaryWorkspace {
  /**
   * Holds temporary workspace paths awaiting cleanup.
   */
  private static readonly directories: string[] = [];

  /**
   * Creates a workspace wrapper for an allocated directory.
   *
   * @param rootPath - Absolute temporary workspace root path.
   */
  private constructor(public readonly rootPath: string) {}

  /**
   * Allocates a new empty workspace directory.
   *
   * @returns Temporary workspace wrapper.
   */
  public static async create(): Promise<TemporaryWorkspace> {
    const rootPath = await mkdtemp(join(tmpdir(), 'atlas-workspace-'));
    this.directories.push(rootPath);
    return new TemporaryWorkspace(rootPath);
  }

  /**
   * Creates one package manifest and source root below this workspace.
   *
   * @param relativePath - Slash-separated package directory path relative to the workspace root.
   * @param packageName - Non-empty manifest name for the fixture package.
   * @returns A promise that resolves after the package fixture exists.
   */
  public async addPackage(relativePath: string, packageName: string): Promise<void> {
    const packageRootPath = join(this.rootPath, relativePath);
    await mkdir(join(packageRootPath, 'src'), { recursive: true });
    await writeFile(
      join(packageRootPath, 'package.json'),
      `${JSON.stringify({ name: packageName, version: '1.0.0' })}\n`,
      'utf8'
    );
  }

  /**
   * Removes every temporary workspace allocated by this suite.
   *
   * @returns A promise that resolves after cleanup completes.
   */
  public static async removeAll(): Promise<void> {
    await Promise.all(
      this.directories.map((directoryPath) => rm(directoryPath, { recursive: true, force: true }))
    );
    this.directories.length = 0;
  }
}

/**
 * Verifies explicit package policy selection and deterministic package ordering.
 */
describe('NodeWorkspacePackageDiscoverer', () => {
  afterEach(TemporaryWorkspace.removeAll.bind(TemporaryWorkspace));

  /**
   * Verifies that discovery applies explicit runtime/support classification and exclusions.
   */
  it('discovers and classifies matching packages', async () => {
    const workspace = await TemporaryWorkspace.create();
    await workspace.addPackage('packages/api', '@demo/api');
    await workspace.addPackage('packages/tools', '@demo/tools');
    await workspace.addPackage('packages/ignored', '@demo/ignored');
    const configuration: AtlasConfiguration = {
      schemaVersion: 1,
      discovery: {
        packageGlobs: ['packages/*'],
        excludePackageGlobs: ['packages/ignored'],
        packages: [
          { match: { name: '@demo/api' }, classification: 'runtime' },
          { match: { path: 'packages/tools' }, classification: 'support', classes: ['tooling'] }
        ]
      },
      artifacts: { root: 'architecture' },
      layout: { orientation: 'horizontal', rows: 6, horizontalGap: 80, verticalGap: 60 }
    };

    const packages = await new NodeWorkspacePackageDiscoverer(new PackagePolicySelector()).discover(
      workspace.rootPath,
      configuration
    );

    expect(packages.map((workspacePackage) => workspacePackage.name)).toEqual([
      '@demo/api',
      '@demo/tools'
    ]);
    expect(packages[0]?.classification).toBe('runtime');
    expect(packages[1]?.classes).toEqual(['tooling']);
  });

  /**
   * Verifies that package classification cannot be inferred when no policy matches.
   */
  it('rejects an unclassified discovered package', async () => {
    const workspace = await TemporaryWorkspace.create();
    await workspace.addPackage('packages/api', '@demo/api');
    const configuration: AtlasConfiguration = {
      schemaVersion: 1,
      discovery: {
        packageGlobs: ['packages/*'],
        packages: [{ match: { name: '@demo/other' }, classification: 'runtime' }]
      },
      artifacts: {},
      layout: {}
    };

    await expect(
      new NodeWorkspacePackageDiscoverer(new PackagePolicySelector()).discover(
        workspace.rootPath,
        configuration
      )
    ).rejects.toThrow('does not match an explicit discovery policy');
  });
});
