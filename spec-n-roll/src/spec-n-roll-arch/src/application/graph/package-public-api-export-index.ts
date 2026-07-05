import { posix } from 'node:path';
import ts from 'typescript';
import type { WorkspacePackage } from '#arch/application/packages/workspace-package.js';

/**
 * Source text for the public entrypoint of one workspace package.
 */
interface PackageIndexSource {
  /**
   * Workspace package whose public entrypoint is being indexed.
   */
  package: WorkspacePackage;

  /**
   * TypeScript source text from the package `src/index.ts` file.
   */
  sourceText: string;
}

/**
 * Maps public package export names to the source files that define them.
 */
export class PackagePublicApiExportIndex {
  private readonly exportedFilesByPackage = new Map<
    string,
    ReadonlyMap<string, string>
  >();

  /**
   * Creates an index from package entrypoint source text.
   *
   * @param indexSources - Source text keyed by the package that owns each public entrypoint.
   */
  constructor(indexSources: PackageIndexSource[]) {
    for (const indexSource of indexSources) {
      this.exportedFilesByPackage.set(
        indexSource.package.name,
        this.indexPackageExports(indexSource),
      );
    }
  }

  /**
   * Resolves a public export name to its backing source file.
   *
   * @param packageName - Workspace package name that owns the public export.
   * @param exportName - Named export requested by another package.
   * @returns Package-root-relative source path when the export can be resolved.
   */
  resolve(packageName: string, exportName: string): string | undefined {
    return this.exportedFilesByPackage.get(packageName)?.get(exportName);
  }

  private indexPackageExports(
    indexSource: PackageIndexSource,
  ): ReadonlyMap<string, string> {
    const sourceFile = ts.createSourceFile(
      this.packageEntryPoint(indexSource.package),
      indexSource.sourceText,
      ts.ScriptTarget.ES2022,
      true,
      ts.ScriptKind.TS,
    );
    const exportedFiles = new Map<string, string>();

    for (const statement of sourceFile.statements) {
      if (!ts.isExportDeclaration(statement)) {
        continue;
      }

      const moduleSpecifier = this.stringModuleSpecifier(statement);
      if (!moduleSpecifier || !statement.exportClause) {
        continue;
      }

      if (!ts.isNamedExports(statement.exportClause)) {
        continue;
      }

      const exportedFile = this.resolveExportFile(
        indexSource.package,
        moduleSpecifier,
      );
      if (!exportedFile) {
        continue;
      }

      for (const exportSpecifier of statement.exportClause.elements) {
        exportedFiles.set(exportSpecifier.name.text, exportedFile);
      }
    }

    return exportedFiles;
  }

  private stringModuleSpecifier(
    statement: ts.ExportDeclaration,
  ): string | undefined {
    if (!statement.moduleSpecifier) {
      return undefined;
    }

    return ts.isStringLiteral(statement.moduleSpecifier)
      ? statement.moduleSpecifier.text
      : undefined;
  }

  private resolveExportFile(
    workspacePackage: WorkspacePackage,
    moduleSpecifier: string,
  ): string | undefined {
    const sourceRelativePath = this.sourceRelativePath(moduleSpecifier);

    if (!sourceRelativePath) {
      return undefined;
    }

    return posix.join(
      this.packageRelativeRoot(workspacePackage),
      'src',
      sourceRelativePath,
    );
  }

  private sourceRelativePath(moduleSpecifier: string): string | undefined {
    if (moduleSpecifier.startsWith('#')) {
      return this.toTypeScriptPath(
        moduleSpecifier.split('/').slice(1).join('/'),
      );
    }

    if (moduleSpecifier.startsWith('./')) {
      return this.toTypeScriptPath(moduleSpecifier.slice('./'.length));
    }

    return undefined;
  }

  private toTypeScriptPath(filePath: string): string {
    return filePath.replace(/\.js$/u, '.ts');
  }

  private packageEntryPoint(workspacePackage: WorkspacePackage): string {
    return posix.join(
      this.packageRelativeRoot(workspacePackage),
      'src/index.ts',
    );
  }

  private packageRelativeRoot(workspacePackage: WorkspacePackage): string {
    const normalizedPackageRoot = workspacePackage.root.replaceAll('\\', '/');
    const packageDirectory =
      normalizedPackageRoot.split('/').at(-1) ?? workspacePackage.name;

    return posix.join('src', packageDirectory);
  }
}
