import { describe, expect, it } from 'vitest';
import { filesOfProject } from 'tsarch';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Reads workspace architecture fixture data for dependency boundary tests.
 */
class WorkspaceArchitectureFixtureReader {
  /**
   * Runtime package dependency names that must not be imported by the API package.
   */
  readonly runtimePackageNames = [
    'spec-n-roll',
    'spec-n-roll-sdk',
    'spec-n-roll-runtime',
    'spec-n-roll-mcp',
  ] as const;

  /**
   * Reads a workspace package descriptor from the repository root.
   *
   * @param relativePath - Repository-relative path to a package.json file.
   * @returns Parsed package descriptor with dependency maps.
   */
  readPackageJson(relativePath: string): {
    dependencies?: Record<string, string>;
  } {
    return JSON.parse(readFileSync(resolve(relativePath), 'utf8')) as {
      dependencies?: Record<string, string>;
    };
  }
}

describe('workspace architecture tests', () => {
  it('keeps the SDK stub cycle free', async () => {
    const violations = await filesOfProject('src/spec-n-roll-sdk/tsconfig.json')
      .inFolder('src')
      .should()
      .beFreeOfCycles()
      .check();

    expect(violations).toEqual([]);
  });

  it('keeps dispatcher and runtime dependencies pointed at the API boundary', () => {
    const fixtureReader = new WorkspaceArchitectureFixtureReader();
    const apiPackage = fixtureReader.readPackageJson(
      'src/spec-n-roll-api/package.json',
    );
    const dispatcherPackage = fixtureReader.readPackageJson(
      'src/spec-n-roll/package.json',
    );
    const runtimePackage = fixtureReader.readPackageJson(
      'src/spec-n-roll-runtime/package.json',
    );

    expect(
      Object.keys(apiPackage.dependencies ?? {}).filter((dependencyName) =>
        fixtureReader.runtimePackageNames.includes(
          dependencyName as (typeof fixtureReader.runtimePackageNames)[number],
        ),
      ),
    ).toEqual([]);
    expect(dispatcherPackage.dependencies).toMatchObject({
      'spec-n-roll-api': '0.1.0',
      'spec-n-roll-runtime': '0.1.0',
    });
    expect(runtimePackage.dependencies).toMatchObject({
      'spec-n-roll-api': '0.1.0',
    });
  });
});
