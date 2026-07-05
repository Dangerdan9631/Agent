import { describe, expect, it } from 'vitest';
import { filesOfProject } from 'tsarch';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';

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

/**
 * Checks package entrypoints for direct type declarations.
 */
class WorkspaceIndexEntrypointPolicy {
  /**
   * Finds direct type declarations in workspace package entrypoints.
   *
   * @param sourceRoot - Repository-relative source root that contains workspace packages.
   * @returns Violation descriptions for package `src/index.ts` files that declare types directly.
   */
  directTypeDeclarationViolations(sourceRoot: string): string[] {
    const resolvedSourceRoot = resolve(sourceRoot);
    const violations: string[] = [];

    for (const packageDirectory of readdirSync(resolvedSourceRoot, {
      withFileTypes: true,
    })) {
      if (!packageDirectory.isDirectory()) {
        continue;
      }

      const indexPath = join(
        resolvedSourceRoot,
        packageDirectory.name,
        'src',
        'index.ts',
      );
      if (!existsSync(indexPath)) {
        continue;
      }

      violations.push(...this.directTypeDeclarations(indexPath));
    }

    return violations;
  }

  private directTypeDeclarations(indexPath: string): string[] {
    const sourceFile = ts.createSourceFile(
      indexPath,
      readFileSync(indexPath, 'utf8'),
      ts.ScriptTarget.ES2022,
      true,
      ts.ScriptKind.TS,
    );
    const violations: string[] = [];

    for (const statement of sourceFile.statements) {
      if (this.isDirectTypeDeclaration(statement)) {
        violations.push(
          `${relative(resolve(), indexPath)} declares ${ts.SyntaxKind[statement.kind]}`,
        );
      }
    }

    return violations;
  }

  private isDirectTypeDeclaration(statement: ts.Statement): boolean {
    return (
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isEnumDeclaration(statement)
    );
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

  it('keeps package index files free of direct type definitions', () => {
    expect(
      new WorkspaceIndexEntrypointPolicy().directTypeDeclarationViolations(
        'src',
      ),
    ).toEqual([]);
  });
});
