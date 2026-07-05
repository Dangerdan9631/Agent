import ts from 'typescript';

/**
 * Reads named package imports and re-exports from TypeScript source text.
 */
export class PackageImportSymbolReader {
  /**
   * Reads public symbols requested from a package dependency.
   *
   * @param sourcePath - Path used to identify the source file in parser diagnostics.
   * @param sourceText - TypeScript source text to inspect.
   * @param packageName - Bare workspace package specifier to match.
   * @returns Export names requested from the package, or undefined when the import cannot be mapped safely.
   */
  read(
    sourcePath: string,
    sourceText: string,
    packageName: string,
  ): string[] | undefined {
    const sourceFile = ts.createSourceFile(
      sourcePath,
      sourceText,
      ts.ScriptTarget.ES2022,
      true,
      ts.ScriptKind.TS,
    );
    const symbols = new Set<string>();
    let matchedPackage = false;

    for (const statement of sourceFile.statements) {
      if (ts.isImportDeclaration(statement)) {
        const importSymbols = this.readImportSymbols(statement, packageName);
        if (importSymbols === undefined) {
          return undefined;
        }

        matchedPackage = matchedPackage || importSymbols.length > 0;
        for (const symbol of importSymbols) {
          symbols.add(symbol);
        }
      }

      if (ts.isExportDeclaration(statement)) {
        const exportSymbols = this.readExportSymbols(statement, packageName);
        if (exportSymbols === undefined) {
          return undefined;
        }

        matchedPackage = matchedPackage || exportSymbols.length > 0;
        for (const symbol of exportSymbols) {
          symbols.add(symbol);
        }
      }
    }

    return matchedPackage && symbols.size > 0 ? [...symbols] : undefined;
  }

  private readImportSymbols(
    statement: ts.ImportDeclaration,
    packageName: string,
  ): string[] | undefined {
    if (!this.referencesPackage(statement.moduleSpecifier, packageName)) {
      return [];
    }

    const namedBindings = statement.importClause?.namedBindings;
    if (statement.importClause?.name) {
      return undefined;
    }

    if (!namedBindings || !ts.isNamedImports(namedBindings)) {
      return undefined;
    }

    return namedBindings.elements.map(
      (importSpecifier) =>
        importSpecifier.propertyName?.text ?? importSpecifier.name.text,
    );
  }

  private readExportSymbols(
    statement: ts.ExportDeclaration,
    packageName: string,
  ): string[] | undefined {
    if (
      !statement.moduleSpecifier ||
      !this.referencesPackage(statement.moduleSpecifier, packageName)
    ) {
      return [];
    }

    if (!statement.exportClause || !ts.isNamedExports(statement.exportClause)) {
      return undefined;
    }

    return statement.exportClause.elements.map(
      (exportSpecifier) =>
        exportSpecifier.propertyName?.text ?? exportSpecifier.name.text,
    );
  }

  private referencesPackage(
    moduleSpecifier: ts.Expression,
    packageName: string,
  ): boolean {
    return (
      ts.isStringLiteral(moduleSpecifier) &&
      moduleSpecifier.text === packageName
    );
  }
}
