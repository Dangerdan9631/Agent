import type { DeclarationGraphBuilder } from '#application/graph/ports/DeclarationGraphBuilder.js';
import {
  DeclarationGraph,
  DeclarationNode,
  DeclarationRelationship
} from '#application/graph/model/DeclarationGraph.js';
import type {
  DeclarationNodeKind,
  DeclarationRelationshipType
} from '#application/graph/model/DeclarationGraph.js';
import type { WorkspacePackage } from '#application/workspace/model/WorkspacePackage.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';
import fastGlob from 'fast-glob';
import { dirname, isAbsolute, relative, sep } from 'node:path';
import ts from 'typescript';

/**
 * Builds stable declaration-level semantic graphs through the TypeScript compiler API.
 */
export class TypeScriptDeclarationGraphBuilder implements DeclarationGraphBuilder {
  /**
   * Builds a semantic declaration graph for all selected package source roots.
   *
   * @param workspace - Loaded workspace with explicit package source roots.
   * @returns Stable graph containing local declaration and unresolved external dependency nodes.
   */
  public async build(workspace: WorkspaceSnapshot): Promise<DeclarationGraph> {
    const rootFilePaths = await this.findRootFilePaths(workspace);
    const compilerOptions = this.createCompilerOptions(workspace);
    const program = ts.createProgram(rootFilePaths, compilerOptions);
    const checker = program.getTypeChecker();
    const graphState = new TypeScriptGraphState(workspace, checker, compilerOptions);
    const sourceFiles = program
      .getSourceFiles()
      .filter((sourceFile) => graphState.toWorkspaceRelativePath(sourceFile.fileName) !== undefined)
      .sort((left, right) => left.fileName.localeCompare(right.fileName));

    for (const sourceFile of sourceFiles) {
      graphState.registerSourceFile(sourceFile);
    }

    for (const sourceFile of sourceFiles) {
      graphState.collectSourceFileRelationships(sourceFile);
    }

    return graphState.toGraph();
  }

  /**
   * Finds all TypeScript implementation source files under configured package source roots.
   *
   * @param workspace - Loaded workspace containing existing source-root paths.
   * @returns Unique sorted absolute TypeScript source file paths.
   */
  private async findRootFilePaths(workspace: WorkspaceSnapshot): Promise<readonly string[]> {
    const sourceRoots = workspace.packages.flatMap(
      (workspacePackage) => workspacePackage.sourceRootPaths
    );
    const matches = await Promise.all(
      sourceRoots.map((sourceRootPath) =>
        fastGlob(['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'], {
          cwd: sourceRootPath,
          absolute: true,
          onlyFiles: true,
          ignore: ['**/*.d.ts', '**/node_modules/**']
        })
      )
    );

    return [...new Set(matches.flat())].sort((left, right) => left.localeCompare(right));
  }

  /**
   * Defines compiler options that preserve source semantics without emitting JavaScript.
   *
   * @returns TypeScript compiler options for architecture analysis.
   */
  private createCompilerOptions(workspace: WorkspaceSnapshot): ts.CompilerOptions {
    const tsconfigPath = workspace.packages
      .map((workspacePackage) => workspacePackage.tsconfigPath)
      .filter((candidate): candidate is string => candidate !== undefined)
      .sort((left, right) => left.localeCompare(right))[0];
    if (tsconfigPath === undefined) {
      return this.createFallbackCompilerOptions();
    }
    const readResult = ts.readConfigFile(tsconfigPath, (filePath) => ts.sys.readFile(filePath));
    if (readResult.error !== undefined) {
      throw new Error(
        `Atlas could not read configured TypeScript options from '${tsconfigPath}': ${ts.flattenDiagnosticMessageText(readResult.error.messageText, ' ')}`
      );
    }
    const parsedResult = ts.parseJsonConfigFileContent(
      readResult.config,
      ts.sys,
      dirname(tsconfigPath),
      this.createFallbackCompilerOptions(),
      tsconfigPath
    );
    if (parsedResult.errors.length > 0) {
      throw new Error(
        `Atlas could not parse configured TypeScript options from '${tsconfigPath}': ${ts.flattenDiagnosticMessageText(parsedResult.errors[0]!.messageText, ' ')}`
      );
    }
    return { ...parsedResult.options, noEmit: true, skipLibCheck: true };
  }

  /**
   * Defines portable fallback compiler options when a package does not declare a TypeScript configuration file.
   *
   * @returns Compiler options that preserve source semantics without emitting JavaScript.
   */
  private createFallbackCompilerOptions(): ts.CompilerOptions {
    return {
      allowJs: false,
      noEmit: true,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      module: ts.ModuleKind.NodeNext,
      target: ts.ScriptTarget.ES2022,
      skipLibCheck: true
    };
  }
}

/**
 * Accumulates compiler symbols, stable graph nodes, and semantic relationships for one workspace graph build.
 */
class TypeScriptGraphState {
  readonly #nodesById = new Map<string, DeclarationNode>();

  readonly #relationshipsByKey = new Map<string, DeclarationRelationship>();

  readonly #symbolNodeIds = new Map<ts.Symbol, string>();

  readonly #sourceFileNodeIds = new Map<string, string[]>();

  /**
   * Creates graph accumulation state for one compiler program and loaded workspace.
   *
   * @param workspace - Loaded workspace used for ownership and portable path resolution.
   * @param checker - TypeScript type checker for declaration and alias resolution.
   * @param compilerOptions - Effective compiler options used for module resolution.
   */
  public constructor(
    private readonly workspace: WorkspaceSnapshot,
    private readonly checker: ts.TypeChecker,
    private readonly compilerOptions: ts.CompilerOptions
  ) {}

  /**
   * Registers every supported top-level declaration and synthetic module node in a source file.
   *
   * @param sourceFile - Compiler source file known to be contained by the workspace.
   */
  public registerSourceFile(sourceFile: ts.SourceFile): void {
    const sourcePath = this.toWorkspaceRelativePath(sourceFile.fileName);
    if (sourcePath === undefined) {
      return;
    }

    const workspacePackage = this.resolvePackage(sourcePath);
    if (workspacePackage === undefined) {
      return;
    }

    const sourceNodeIds: string[] = [];
    const moduleDeclarations = sourceFile.statements.filter((statement) =>
      this.isModuleStatement(statement)
    );
    if (moduleDeclarations.length > 0) {
      const moduleNode = this.createLocalNode(
        sourcePath,
        workspacePackage.name,
        'module',
        this.moduleLabel(sourcePath),
        true
      );
      sourceNodeIds.push(moduleNode.id);
      for (const statement of moduleDeclarations) {
        this.registerModuleSymbols(statement, moduleNode.id);
      }
    }

    for (const statement of sourceFile.statements) {
      if (ts.isVariableStatement(statement)) {
        this.registerVariableDeclarations(
          statement,
          sourcePath,
          workspacePackage.name,
          sourceNodeIds
        );
        continue;
      }
      const declarationKind = this.toDeclarationKind(statement);
      const declarationName = this.toDeclarationName(statement);
      if (declarationKind === undefined || declarationName === undefined) {
        continue;
      }

      const declarationNode = this.createLocalNode(
        sourcePath,
        workspacePackage.name,
        declarationKind,
        declarationName,
        false
      );
      sourceNodeIds.push(declarationNode.id);
      this.registerSymbol(statement, declarationNode.id);
    }

    this.#sourceFileNodeIds.set(
      sourceFile.fileName,
      sourceNodeIds.sort((left, right) => left.localeCompare(right))
    );
  }

  /** Registers top-level variable declarations as shared constant or field elements. */
  private registerVariableDeclarations(
    statement: ts.VariableStatement,
    sourcePath: string,
    packageName: string,
    sourceNodeIds: string[]
  ): void {
    const kind: DeclarationNodeKind =
      statement.declarationList.flags & ts.NodeFlags.Const ? 'constant' : 'field';
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;
      const node = this.createLocalNode(
        sourcePath,
        packageName,
        kind,
        declaration.name.text,
        false
      );
      sourceNodeIds.push(node.id);
      this.registerSymbolForName(declaration.name, node.id);
    }
  }

  /**
   * Collects declaration references, inheritance, and unresolved external imports from one source file.
   *
   * @param sourceFile - Compiler source file whose supported nodes have already been registered.
   */
  public collectSourceFileRelationships(sourceFile: ts.SourceFile): void {
    const sourceNodeIds = this.#sourceFileNodeIds.get(sourceFile.fileName) ?? [];
    for (const statement of sourceFile.statements) {
      const ownerNodeId = this.resolveStatementOwner(statement, sourceFile.fileName);
      if (ownerNodeId !== undefined) {
        this.collectDeclarationRelationships(statement, ownerNodeId);
      }
    }

    this.collectExternalImports(sourceFile, sourceNodeIds[0]);
  }

  /**
   * Converts accumulated compiler data into sorted immutable graph models.
   *
   * @returns Stable declaration graph.
   */
  public toGraph(): DeclarationGraph {
    return new DeclarationGraph(
      [...this.#nodesById.values()].sort((left, right) => left.id.localeCompare(right.id)),
      [...this.#relationshipsByKey.values()].sort((left, right) => {
        const sourceOrder = left.sourceId.localeCompare(right.sourceId);
        if (sourceOrder !== 0) {
          return sourceOrder;
        }
        const targetOrder = left.targetId.localeCompare(right.targetId);
        return targetOrder === 0 ? left.type.localeCompare(right.type) : targetOrder;
      })
    );
  }

  /**
   * Converts an absolute compiler filename into a slash-normalized workspace-relative path.
   *
   * @param filePath - Compiler-reported absolute or relative file path.
   * @returns Workspace-relative path, or undefined when the file is external.
   */
  public toWorkspaceRelativePath(filePath: string): string | undefined {
    const relativePath = isAbsolute(filePath)
      ? relative(this.workspace.paths.workspaceRootPath, filePath)
      : filePath;
    if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
      return undefined;
    }
    return relativePath.replaceAll('\\', '/');
  }

  /**
   * Identifies top-level functions and values that belong to a synthetic module node.
   *
   * @param statement - Source-file statement to classify.
   * @returns True when the statement contributes to a module node.
   */
  private isModuleStatement(statement: ts.Statement): boolean {
    return ts.isVariableStatement(statement);
  }

  /**
   * Maps supported top-level declaration syntax to an Atlas node category.
   *
   * @param statement - Source-file statement to classify.
   * @returns Atlas declaration kind, or undefined when the statement is not represented as a node.
   */
  private toDeclarationKind(statement: ts.Statement): DeclarationNodeKind | undefined {
    if (ts.isClassDeclaration(statement)) {
      return 'class';
    }
    if (ts.isInterfaceDeclaration(statement)) {
      return 'interface';
    }
    if (ts.isTypeAliasDeclaration(statement)) {
      return 'type-alias';
    }
    if (ts.isEnumDeclaration(statement)) {
      return 'enum';
    }
    if (ts.isFunctionDeclaration(statement)) {
      return 'function';
    }
    return undefined;
  }

  /**
   * Extracts the stable name of a supported top-level declaration.
   *
   * @param statement - Source-file statement with a supported declaration category.
   * @returns Declaration name, or undefined for anonymous declarations.
   */
  private toDeclarationName(statement: ts.Statement): string | undefined {
    if (
      (ts.isClassDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement) ||
        ts.isEnumDeclaration(statement) ||
        ts.isFunctionDeclaration(statement)) &&
      statement.name !== undefined
    ) {
      return statement.name.text;
    }
    return undefined;
  }

  /**
   * Creates and registers one stable local declaration graph node.
   *
   * @param sourcePath - Workspace-relative declaration path.
   * @param packageName - Owning package manifest name.
   * @param kind - Semantic node category.
   * @param label - Display label.
   * @param moduleNode - Indicates synthetic top-level function/value aggregation.
   * @returns Registered graph node.
   */
  private createLocalNode(
    sourcePath: string,
    packageName: string,
    kind: DeclarationNodeKind,
    label: string,
    moduleNode: boolean
  ): DeclarationNode {
    const id = `declaration:${encodeURIComponent(sourcePath)}#${kind}:${encodeURIComponent(label)}`;
    const existingNode = this.#nodesById.get(id);
    if (existingNode !== undefined) {
      return existingNode;
    }

    const node = new DeclarationNode(id, label, kind, packageName, sourcePath, moduleNode);
    this.#nodesById.set(id, node);
    return node;
  }

  /**
   * Registers declaration symbols so later semantic references resolve to stable graph nodes.
   *
   * @param declaration - Supported named declaration statement.
   * @param nodeId - Stable graph node identifier for the declaration.
   */
  private registerSymbol(declaration: ts.Statement, nodeId: string): void {
    const declarationName = this.toDeclarationName(declaration);
    if (declarationName === undefined) {
      return;
    }

    const nameNode = (
      declaration as
        | ts.ClassDeclaration
        | ts.InterfaceDeclaration
        | ts.TypeAliasDeclaration
        | ts.EnumDeclaration
        | ts.FunctionDeclaration
    ).name;
    if (nameNode === undefined) {
      return;
    }
    const symbol = this.checker.getSymbolAtLocation(nameNode);
    if (symbol !== undefined) {
      this.#symbolNodeIds.set(symbol, nodeId);
    }
  }

  /**
   * Registers top-level function and variable symbols against their synthetic module node.
   *
   * @param statement - Top-level function or variable statement.
   * @param moduleNodeId - Synthetic module graph node identifier.
   */
  private registerModuleSymbols(statement: ts.Statement, moduleNodeId: string): void {
    if (ts.isFunctionDeclaration(statement) && statement.name !== undefined) {
      this.registerSymbolForName(statement.name, moduleNodeId);
      return;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          this.registerSymbolForName(declaration.name, moduleNodeId);
        }
      }
    }
  }

  /**
   * Registers the semantic symbol for one identifier against a graph node.
   *
   * @param nameNode - Identifier declaration name.
   * @param nodeId - Stable graph node identifier.
   */
  private registerSymbolForName(nameNode: ts.Identifier, nodeId: string): void {
    const symbol = this.checker.getSymbolAtLocation(nameNode);
    if (symbol !== undefined) {
      this.#symbolNodeIds.set(symbol, nodeId);
    }
  }

  /**
   * Resolves the graph node responsible for a top-level source statement.
   *
   * @param statement - Source-file statement currently traversed.
   * @param sourceFileName - Compiler source-file path.
   * @returns Owning graph node ID, or undefined for unsupported statements.
   */
  private resolveStatementOwner(
    statement: ts.Statement,
    sourceFileName: string
  ): string | undefined {
    const sourceNodeIds = this.#sourceFileNodeIds.get(sourceFileName) ?? [];
    if (this.isModuleStatement(statement)) {
      return sourceNodeIds.find((nodeId) => this.#nodesById.get(nodeId)?.moduleNode);
    }

    const declarationName = this.toDeclarationName(statement);
    if (declarationName === undefined) {
      return undefined;
    }
    const sourcePath = this.toWorkspaceRelativePath(sourceFileName);
    const declarationKind = this.toDeclarationKind(statement);
    if (sourcePath === undefined || declarationKind === undefined) {
      return undefined;
    }
    const nodeId = `declaration:${encodeURIComponent(sourcePath)}#${declarationKind}:${encodeURIComponent(declarationName)}`;
    return this.#nodesById.has(nodeId) ? nodeId : undefined;
  }

  /**
   * Collects normal references and heritage relationships for one graph-owning declaration statement.
   *
   * @param declaration - Source declaration statement to traverse.
   * @param ownerNodeId - Graph node responsible for references found in the declaration.
   */
  private collectDeclarationRelationships(declaration: ts.Node, ownerNodeId: string): void {
    this.collectHeritageRelationships(declaration, ownerNodeId);
    this.visitReferenceNodes(declaration, ownerNodeId);
  }

  /**
   * Collects extends and implements edges for a class or interface declaration.
   *
   * @param declaration - Top-level declaration node potentially containing heritage clauses.
   * @param ownerNodeId - Graph node that inherits or implements the target.
   */
  private collectHeritageRelationships(declaration: ts.Node, ownerNodeId: string): void {
    if (!ts.isClassDeclaration(declaration) && !ts.isInterfaceDeclaration(declaration)) {
      return;
    }

    for (const heritageClause of declaration.heritageClauses ?? []) {
      for (const heritageType of heritageClause.types) {
        const symbol = this.resolveAliasedSymbol(
          this.checker.getSymbolAtLocation(heritageType.expression)
        );
        const targetNodeId = symbol === undefined ? undefined : this.#symbolNodeIds.get(symbol);
        if (targetNodeId !== undefined && targetNodeId !== ownerNodeId) {
          this.addRelationship(ownerNodeId, targetNodeId, 'inheritance');
        }
      }
    }
  }

  /**
   * Traverses identifier references while excluding heritage clauses handled as inheritance edges.
   *
   * @param node - Compiler node to visit.
   * @param ownerNodeId - Graph node responsible for references discovered beneath the node.
   */
  private visitReferenceNodes(node: ts.Node, ownerNodeId: string): void {
    if (ts.isHeritageClause(node)) {
      return;
    }

    if (ts.isIdentifier(node) && !this.isDeclarationIdentifier(node)) {
      const symbol = this.resolveAliasedSymbol(this.checker.getSymbolAtLocation(node));
      const targetNodeId = symbol === undefined ? undefined : this.#symbolNodeIds.get(symbol);
      if (targetNodeId !== undefined && targetNodeId !== ownerNodeId) {
        this.addRelationship(ownerNodeId, targetNodeId, 'reference');
      }
    }

    ts.forEachChild(node, (childNode) => this.visitReferenceNodes(childNode, ownerNodeId));
  }

  /**
   * Determines whether an identifier declares a symbol rather than using one.
   *
   * @param identifier - Identifier encountered during traversal.
   * @returns True when the identifier is a declaration name that should not create a reference edge.
   */
  private isDeclarationIdentifier(identifier: ts.Identifier): boolean {
    const parent = identifier.parent;
    return (
      (ts.isClassDeclaration(parent) ||
        ts.isInterfaceDeclaration(parent) ||
        ts.isTypeAliasDeclaration(parent) ||
        ts.isEnumDeclaration(parent) ||
        ts.isFunctionDeclaration(parent) ||
        ts.isVariableDeclaration(parent)) &&
      parent.name === identifier
    );
  }

  /**
   * Adds external dependency nodes for import specifiers that do not resolve to workspace source.
   *
   * @param sourceFile - Source file containing import declarations.
   * @param fallbackOwnerNodeId - First local node in the source file used when a direct declaration owner is unavailable.
   */
  private collectExternalImports(
    sourceFile: ts.SourceFile,
    fallbackOwnerNodeId: string | undefined
  ): void {
    if (fallbackOwnerNodeId === undefined) {
      return;
    }

    for (const statement of sourceFile.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
        continue;
      }
      const moduleSpecifier = statement.moduleSpecifier.text;
      const resolvedModule = ts.resolveModuleName(
        moduleSpecifier,
        sourceFile.fileName,
        this.compilerOptions,
        ts.sys
      ).resolvedModule;
      const resolvedWorkspacePath =
        resolvedModule === undefined
          ? undefined
          : this.toWorkspaceRelativePath(resolvedModule.resolvedFileName);

      if (resolvedWorkspacePath !== undefined) {
        continue;
      }

      const externalNode = this.createExternalNode(this.toExternalKey(moduleSpecifier));
      this.addRelationship(fallbackOwnerNodeId, externalNode.id, 'reference');
    }
  }

  /**
   * Resolves an alias symbol to its backing declaration symbol when safe.
   *
   * @param symbol - Symbol reported by the TypeScript checker.
   * @returns Backing symbol for aliases or the supplied symbol for direct declarations.
   */
  private resolveAliasedSymbol(symbol: ts.Symbol | undefined): ts.Symbol | undefined {
    if (symbol === undefined) {
      return undefined;
    }
    return symbol.flags & ts.SymbolFlags.Alias ? this.checker.getAliasedSymbol(symbol) : symbol;
  }

  /**
   * Creates or retrieves a stable external graph node.
   *
   * @param externalKey - Stable normalized external dependency key.
   * @returns Registered external graph node.
   */
  private createExternalNode(externalKey: string): DeclarationNode {
    const id = `external:${externalKey}`;
    const existingNode = this.#nodesById.get(id);
    if (existingNode !== undefined) {
      return existingNode;
    }
    const node = new DeclarationNode(id, externalKey, 'external', undefined, undefined, false);
    this.#nodesById.set(id, node);
    return node;
  }

  /**
   * Normalizes import text into a package or Node built-in external graph key.
   *
   * @param moduleSpecifier - Import text as it appears in TypeScript source.
   * @returns Stable external graph key.
   */
  private toExternalKey(moduleSpecifier: string): string {
    if (moduleSpecifier.startsWith('node:')) {
      return `node:${moduleSpecifier.slice('node:'.length).split('/')[0]}`;
    }
    const segments = moduleSpecifier.split('/');
    if (moduleSpecifier.startsWith('@') && segments.length >= 2) {
      return `${segments[0]}/${segments[1]}`;
    }
    return segments[0] ?? moduleSpecifier;
  }

  /**
   * Adds one unique semantic relationship to the graph accumulator.
   *
   * @param sourceId - Stable source node ID.
   * @param targetId - Stable target node ID.
   * @param type - Semantic relationship category.
   */
  private addRelationship(
    sourceId: string,
    targetId: string,
    type: DeclarationRelationshipType
  ): void {
    const relationshipKey = `${sourceId}\u0000${targetId}\u0000${type}`;
    if (this.#relationshipsByKey.has(relationshipKey)) {
      return;
    }
    const id = `relationship:${encodeURIComponent(sourceId)}>${encodeURIComponent(targetId)}:${type}`;
    this.#relationshipsByKey.set(
      relationshipKey,
      new DeclarationRelationship(id, sourceId, targetId, type)
    );
  }

  /**
   * Resolves a workspace-relative source path to its explicit package ownership.
   *
   * @param sourcePath - Slash-normalized workspace-relative source path.
   * @returns Most-specific owning package, or undefined when outside selected packages.
   */
  private resolvePackage(sourcePath: string): WorkspacePackage | undefined {
    return [...this.workspace.packages]
      .filter(
        (workspacePackage) =>
          workspacePackage.relativeRootPath === '.' ||
          sourcePath === workspacePackage.relativeRootPath ||
          sourcePath.startsWith(`${workspacePackage.relativeRootPath}/`)
      )
      .sort((left, right) => right.relativeRootPath.length - left.relativeRootPath.length)[0];
  }

  /**
   * Derives a readable synthetic module label from a workspace-relative source path.
   *
   * @param sourcePath - Workspace-relative source path.
   * @returns File-oriented module label.
   */
  private moduleLabel(sourcePath: string): string {
    return sourcePath;
  }
}
