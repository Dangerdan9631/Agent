import type {
  TypeScriptDeclarationKind,
  TypeScriptModuleElement,
  TypeScriptModuleModel,
  TypeScriptModuleRelationship,
} from "#sdk/TypeScriptModuleModel.js";
import type { TypeScriptModelGenerationRequest } from "#sdk/TypeScriptModelGenerationRequest.js";
import type { TypeScriptModelGenerationResult } from "#sdk/TypeScriptModelGenerationResult.js";
import type { TypeScriptModelGenerationSdk } from "#sdk/TypeScriptModelGenerationSdk.js";
import fastGlob from "fast-glob";
import { readFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import ts from "typescript";

/**
 * Generates portable npm package models through the TypeScript compiler syntax API.
 */
export class CompilerTypeScriptModelGenerationSdk implements TypeScriptModelGenerationSdk {
  /**
   * Analyzes every selected package and returns deterministic portable models.
   *
   * @param request - Absolute workspace path and relative selected package roots.
   * @returns Generated module models ordered by package name.
   */
  public async generate(
    request: TypeScriptModelGenerationRequest,
  ): Promise<TypeScriptModelGenerationResult> {
    const packages = await Promise.all(
      request.packagePaths.map((packagePath) =>
        this.readPackage(
          request.workspacePath,
          packagePath,
          request.tsconfigFile,
        ),
      ),
    );
    const packageNames = new Set(
      packages.map((workspacePackage) => workspacePackage.name),
    );
    const modules = await Promise.all(
      packages.map((workspacePackage) =>
        this.generateModule(workspacePackage, packageNames),
      ),
    );
    return {
      modules: modules.sort((left, right) =>
        this.compareText(left.module.id, right.module.id),
      ),
    };
  }

  /** Reads stable npm package identity and source paths from one selected root. */
  private async readPackage(
    workspacePath: string,
    packagePath: string,
    tsconfigFile: string | undefined,
  ): Promise<WorkspacePackage> {
    const rootPath = resolve(workspacePath, packagePath);
    const manifest = JSON.parse(
      await readFile(resolve(rootPath, "package.json"), "utf8"),
    ) as {
      readonly name?: unknown;
      readonly version?: unknown;
    };
    if (typeof manifest.name !== "string" || manifest.name.length === 0) {
      throw new Error(
        `TypeScript package '${packagePath}' must declare a non-empty name.`,
      );
    }
    if (typeof manifest.version !== "string" || manifest.version.length === 0) {
      throw new Error(
        `TypeScript package '${packagePath}' must declare a non-empty version.`,
      );
    }
    const sourcePaths =
      tsconfigFile === undefined
        ? await fastGlob(
            ["**/*.ts", "!**/*.d.ts", "!**/node_modules/**", "!**/dist/**"],
            { absolute: true, cwd: rootPath, onlyFiles: true },
          )
        : this.readConfiguredSourcePaths(rootPath, tsconfigFile);
    return {
      name: manifest.name,
      version: manifest.version,
      rootPath,
      sourcePaths: [...sourcePaths].sort((left, right) =>
        this.compareText(left, right),
      ),
    };
  }

  /** Resolves the exact compiler file set from one package-relative tsconfig. */
  private readConfiguredSourcePaths(
    rootPath: string,
    tsconfigFile: string,
  ): readonly string[] {
    const configurationPath = resolve(rootPath, tsconfigFile);
    const loaded = ts.readConfigFile(configurationPath, ts.sys.readFile);
    if (loaded.error !== undefined) {
      throw new Error(
        ts.flattenDiagnosticMessageText(loaded.error.messageText, "\n"),
      );
    }
    const parsed = ts.parseJsonConfigFileContent(
      loaded.config,
      ts.sys,
      dirname(configurationPath),
    );
    if (parsed.errors.length > 0) {
      throw new Error(
        parsed.errors
          .map((error) =>
            ts.flattenDiagnosticMessageText(error.messageText, "\n"),
          )
          .join("; "),
      );
    }
    return parsed.fileNames
      .map((filePath) => resolve(filePath))
      .sort((left, right) => this.compareText(left, right));
  }

  /** Converts one package's compiler syntax into a portable module model. */
  private async generateModule(
    workspacePackage: WorkspacePackage,
    packageNames: ReadonlySet<string>,
  ): Promise<TypeScriptModuleModel> {
    const elements: TypeScriptModuleElement[] = [];
    const relationships: TypeScriptModuleRelationship[] = [];
    for (const sourceFilePath of workspacePackage.sourcePaths) {
      const sourcePath = relative(
        workspacePackage.rootPath,
        sourceFilePath,
      ).replaceAll("\\", "/");
      const sourceText = await readFile(sourceFilePath, "utf8");
      const sourceFile = ts.createSourceFile(
        sourceFilePath,
        sourceText,
        ts.ScriptTarget.Latest,
        true,
      );
      const sourceElement = this.sourceElement(
        workspacePackage.name,
        sourcePath,
      );
      elements.push(sourceElement);
      for (const statement of sourceFile.statements) {
        const declaration = this.declarationElement(
          workspacePackage.name,
          sourcePath,
          sourceElement.id,
          statement,
        );
        if (declaration !== undefined) elements.push(declaration);
        const relationship = this.importRelationship(
          sourceElement.id,
          statement,
          packageNames,
        );
        if (relationship !== undefined) relationships.push(relationship);
      }
    }
    return {
      schemaVersion: 1,
      generatorVersion: "typescript-sdk-1",
      module: {
        id: workspacePackage.name,
        displayName: workspacePackage.name,
        version: workspacePackage.version,
        category: "npm-package",
      },
      sourceLanguage: "typescript",
      elements: elements.sort((left, right) =>
        this.compareText(left.id, right.id),
      ),
      relationships: [
        ...new Map(relationships.map((value) => [value.id, value])).values(),
      ].sort((left, right) => this.compareText(left.id, right.id)),
    };
  }

  /** Creates the parent source-unit element for one module-local path. */
  private sourceElement(
    moduleId: string,
    sourcePath: string,
  ): TypeScriptModuleElement {
    return {
      id: this.elementId(moduleId, sourcePath, "source-unit", sourcePath),
      name: sourcePath,
      kind: "source-unit",
      qualifiedName: sourcePath,
      sourcePath,
    };
  }

  /** Maps a supported top-level statement to one portable declaration element. */
  private declarationElement(
    moduleId: string,
    sourcePath: string,
    parentId: string,
    statement: ts.Statement,
  ): TypeScriptModuleElement | undefined {
    const declaration = this.declarationIdentity(statement);
    if (declaration === undefined) return undefined;
    const qualifiedName = `${sourcePath}:${declaration.name}`;
    return {
      id: this.elementId(
        moduleId,
        sourcePath,
        declaration.kind,
        declaration.name,
      ),
      name: declaration.name,
      kind: declaration.kind,
      qualifiedName,
      parentId,
      sourcePath,
    };
  }

  /** Extracts one supported declaration name and portable kind from compiler syntax. */
  private declarationIdentity(
    statement: ts.Statement,
  ): DeclarationIdentity | undefined {
    if (ts.isClassDeclaration(statement) && statement.name !== undefined)
      return { name: statement.name.text, kind: "class" };
    if (ts.isInterfaceDeclaration(statement))
      return { name: statement.name.text, kind: "interface" };
    if (ts.isEnumDeclaration(statement))
      return { name: statement.name.text, kind: "enum" };
    if (ts.isTypeAliasDeclaration(statement))
      return { name: statement.name.text, kind: "type-alias" };
    if (ts.isFunctionDeclaration(statement) && statement.name !== undefined)
      return { name: statement.name.text, kind: "function" };
    if (!ts.isVariableStatement(statement)) return undefined;
    const declaration = statement.declarationList.declarations[0];
    if (declaration === undefined || !ts.isIdentifier(declaration.name))
      return undefined;
    const kind: TypeScriptDeclarationKind =
      statement.declarationList.flags & ts.NodeFlags.Const
        ? "constant"
        : "field";
    return { name: declaration.name.text, kind };
  }

  /** Maps one import statement to a stable workspace or external package relationship. */
  private importRelationship(
    sourceElementId: string,
    statement: ts.Statement,
    packageNames: ReadonlySet<string>,
  ): TypeScriptModuleRelationship | undefined {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    )
      return undefined;
    const label = this.packageSpecifier(statement.moduleSpecifier.text);
    const target =
      packageNames.has(label) || !label.startsWith(".")
        ? { moduleId: label, label }
        : { label };
    return {
      id: `relationship:${encodeURIComponent(sourceElementId)}>${encodeURIComponent(label)}:imports`,
      sourceElementId,
      kind: "imports",
      target,
    };
  }

  /** Normalizes an import specifier to its npm package identity when applicable. */
  private packageSpecifier(value: string): string {
    if (!value.startsWith("@")) return value.split("/")[0] ?? value;
    return value.split("/").slice(0, 2).join("/");
  }

  /** Creates a stable encoded element identity. */
  private elementId(
    moduleId: string,
    sourcePath: string,
    kind: TypeScriptDeclarationKind,
    name: string,
  ): string {
    return `element:${encodeURIComponent(moduleId)}:${encodeURIComponent(sourcePath)}:${kind}:${encodeURIComponent(name)}`;
  }

  /** Compares persisted identities by Unicode code-unit order without locale-dependent collation. */
  private compareText(left: string, right: string): number {
    if (left === right) return 0;
    return left < right ? -1 : 1;
  }
}

/**
 * Holds resolved identity and sources for one selected npm package.
 */
interface WorkspacePackage {
  /** Stable package manifest name. */
  readonly name: string;
  /** Published package version. */
  readonly version: string;
  /** Absolute package root. */
  readonly rootPath: string;
  /** Absolute TypeScript implementation source paths. */
  readonly sourcePaths: readonly string[];
}

/**
 * Identifies one supported compiler declaration.
 */
interface DeclarationIdentity {
  /** Declaration display name. */
  readonly name: string;
  /** Portable declaration kind. */
  readonly kind: TypeScriptDeclarationKind;
}
