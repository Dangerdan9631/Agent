import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import ts from 'typescript';
import type { ArchitectureTypeGraphReader } from '#arch/application/graph/architecture-type-graph-reader.js';
import type { ArchitectureTypeGraph, ArchitectureTypeNode, ArchitectureTypeRelationship, ArchitectureTypeRelationshipKind } from '#arch/application/graph/architecture-type-graph.js';
import type { WorkspacePackage } from '#arch/application/packages/workspace-package.js';

/**
 * Uses the TypeScript syntax tree to create a workspace declaration relationship graph.
 */
export class TypeScriptArchitectureTypeGraphReader implements ArchitectureTypeGraphReader {
  /**
   * Reads declarations and references from all supplied package source files.
   *
   * @param workspaceRoot - Absolute workspace root that contains source packages.
   * @param packages - Runtime packages whose source declarations are included.
   * @returns Declaration nodes and relationships with external dependencies represented by ids.
   */
  read(workspaceRoot: string, packages: WorkspacePackage[]): ArchitectureTypeGraph {
    const files = packages.flatMap((workspacePackage) => this.sourceFiles(join(workspacePackage.root, 'src')));
    const sourceFiles = new Map(files.map((filePath) => [this.normalizeAbsolute(filePath), ts.createSourceFile(filePath, readFileSync(filePath, 'utf8'), ts.ScriptTarget.ES2022, true)]));
    const packageByFile = new Map<string, WorkspacePackage>();
    for (const [filePath] of sourceFiles) {
      const owner = packages.find((workspacePackage) => filePath.startsWith(`${this.normalizeAbsolute(workspacePackage.root)}/`));
      if (owner) packageByFile.set(filePath, owner);
    }
    const nodes: ArchitectureTypeNode[] = [];
    const nodeByFileAndName = new Map<string, Map<string, string>>();
    const moduleNodeByFile = new Map<string, string>();
    for (const [filePath, sourceFile] of sourceFiles) {
      const workspacePackage = packageByFile.get(filePath);
      if (!workspacePackage) continue;
      const names = new Map<string, string>();
      for (const statement of sourceFile.statements) {
        const declaration = this.namedTypeDeclaration(statement);
        if (!declaration) continue;
        const id = `type:${this.workspacePath(workspaceRoot, filePath)}:${declaration.name.text}`;
        const node = this.node(id, declaration.name.text, this.nodeKind(declaration), workspacePackage, workspaceRoot, filePath, false);
        nodes.push(node);
        names.set(declaration.name.text, id);
      }
      if (this.hasTopLevelModuleMembers(sourceFile)) {
        const id = `module:${this.workspacePath(workspaceRoot, filePath)}`;
        nodes.push(this.node(id, `${sourceFile.fileName.split(/[\\/]/u).at(-1)?.replace(/\.tsx?$/u, '') ?? 'module'} module`, 'other', workspacePackage, workspaceRoot, filePath, true));
        moduleNodeByFile.set(filePath, id);
        for (const name of this.topLevelModuleMemberNames(sourceFile)) names.set(name, id);
      }
      nodeByFileAndName.set(filePath, names);
    }
    const relationships = new Map<string, ArchitectureTypeRelationship>();
    for (const [filePath, sourceFile] of sourceFiles) {
      const localNames = nodeByFileAndName.get(filePath) ?? new Map<string, string>();
      const imports = this.importTargets(filePath, sourceFile, sourceFiles, nodeByFileAndName, packages);
      const targetFor = (name: string): string | undefined => localNames.get(name) ?? imports.get(name);
      const add = (sourceId: string, targetId: string | undefined, relationshipType: ArchitectureTypeRelationshipKind): void => {
        if (!targetId || sourceId === targetId) return;
        relationships.set(`${sourceId}->${targetId}:${relationshipType}`, { sourceId, targetId, relationshipType });
      };
      for (const statement of sourceFile.statements) {
        const declaration = this.namedTypeDeclaration(statement);
        const sourceId = declaration ? localNames.get(declaration.name.text) : this.isModuleMember(statement) ? moduleNodeByFile.get(filePath) : undefined;
        if (!sourceId) continue;
        if (declaration && ts.isClassDeclaration(declaration) || declaration && ts.isInterfaceDeclaration(declaration)) {
          for (const clause of declaration.heritageClauses ?? []) {
            for (const type of clause.types) {
              const targetId = targetFor(this.leftmostName(type.expression));
              add(sourceId, targetId, 'inheritance');
            }
          }
        }
        this.walkReferences(statement, targetFor, (targetId) => add(sourceId, targetId, 'reference'));
      }
    }
    return { nodes, relationships: [...relationships.values()] };
  }

  private sourceFiles(root: string): string[] {
    if (!existsSync(root)) return [];
    return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
      const path = join(root, entry.name);
      if (entry.isDirectory()) return this.sourceFiles(path);
      return /\.tsx?$/u.test(entry.name) && !/\.d\.ts$/u.test(entry.name) ? [path] : [];
    });
  }

  private namedTypeDeclaration(statement: ts.Statement): (ts.ClassDeclaration | ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration) & { name: ts.Identifier } | undefined {
    if (!(ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement) || ts.isEnumDeclaration(statement)) || !statement.name) return undefined;
    return statement as (ts.ClassDeclaration | ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration) & { name: ts.Identifier };
  }

  private nodeKind(declaration: ts.ClassDeclaration | ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration): ArchitectureTypeNode['nodeKind'] {
    return ts.isClassDeclaration(declaration) ? 'class' : ts.isInterfaceDeclaration(declaration) ? 'interface' : 'other';
  }

  private node(id: string, label: string, nodeKind: ArchitectureTypeNode['nodeKind'], workspacePackage: WorkspacePackage, workspaceRoot: string, filePath: string, moduleNode: boolean): ArchitectureTypeNode {
    return { id, label, nodeKind, packageName: workspacePackage.name, sourceFile: this.workspacePath(workspaceRoot, filePath), moduleNode };
  }

  private hasTopLevelModuleMembers(sourceFile: ts.SourceFile): boolean { return sourceFile.statements.some((statement) => this.isModuleMember(statement)); }
  private isModuleMember(statement: ts.Statement): boolean { return ts.isFunctionDeclaration(statement) || ts.isVariableStatement(statement); }
  private topLevelModuleMemberNames(sourceFile: ts.SourceFile): string[] { return sourceFile.statements.flatMap((statement) => ts.isFunctionDeclaration(statement) && statement.name ? [statement.name.text] : ts.isVariableStatement(statement) ? statement.declarationList.declarations.flatMap((declaration) => ts.isIdentifier(declaration.name) ? [declaration.name.text] : []) : []); }

  private importTargets(filePath: string, sourceFile: ts.SourceFile, sourceFiles: ReadonlyMap<string, ts.SourceFile>, nodeByFileAndName: ReadonlyMap<string, ReadonlyMap<string, string>>, packages: WorkspacePackage[]): Map<string, string> {
    const targets = new Map<string, string>();
    for (const statement of sourceFile.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || !statement.importClause) continue;
      const targetFile = this.resolveImport(filePath, statement.moduleSpecifier.text, sourceFiles, packages);
      const externalId = targetFile ? undefined : this.externalId(statement.moduleSpecifier.text);
      const bindings = statement.importClause.namedBindings;
      if (statement.importClause.name) targets.set(statement.importClause.name.text, externalId ?? this.exportedTarget(targetFile, 'default', sourceFiles, nodeByFileAndName, packages) ?? '');
      if (bindings && ts.isNamedImports(bindings)) for (const element of bindings.elements) targets.set(element.name.text, externalId ?? this.exportedTarget(targetFile, element.propertyName?.text ?? element.name.text, sourceFiles, nodeByFileAndName, packages) ?? '');
      if (bindings && ts.isNamespaceImport(bindings)) targets.set(bindings.name.text, externalId ?? '');
    }
    return new Map([...targets].filter(([, target]) => Boolean(target)));
  }

  private exportedTarget(filePath: string | undefined, name: string, sourceFiles: ReadonlyMap<string, ts.SourceFile>, nodeByFileAndName: ReadonlyMap<string, ReadonlyMap<string, string>>, packages: WorkspacePackage[]): string | undefined {
    if (!filePath) return undefined;
    const local = nodeByFileAndName.get(filePath)?.get(name);
    if (local) return local;
    const sourceFile = sourceFiles.get(filePath);
    if (!sourceFile) return undefined;
    for (const statement of sourceFile.statements) {
      if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier) || !statement.exportClause || !ts.isNamedExports(statement.exportClause)) continue;
      for (const element of statement.exportClause.elements) if (element.name.text === name) return this.exportedTarget(this.resolveImport(filePath, statement.moduleSpecifier.text, sourceFiles, packages), element.propertyName?.text ?? name, sourceFiles, nodeByFileAndName, packages);
    }
    return undefined;
  }

  private resolveImport(fromFile: string, specifier: string, sourceFiles: ReadonlyMap<string, ts.SourceFile>, packages: WorkspacePackage[]): string | undefined {
    if (specifier.startsWith('.')) return this.existingSource(resolve(dirname(fromFile), specifier), sourceFiles);
    const workspacePackage = packages.find((candidate) => candidate.name === specifier);
    if (workspacePackage) return this.existingSource(join(workspacePackage.root, 'src', 'index'), sourceFiles);
    if (specifier.startsWith('#')) {
      for (const candidate of packages) {
        const manifestPath = join(candidate.root, 'package.json');
        if (!existsSync(manifestPath)) continue;
        const imports = (JSON.parse(readFileSync(manifestPath, 'utf8')) as { imports?: Record<string, string> }).imports ?? {};
        for (const [pattern, replacement] of Object.entries(imports)) {
          const matcher = new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&').replace('\\*', '(.+)')}$`, 'u');
          const match = matcher.exec(specifier);
          if (match) return this.existingSource(resolve(candidate.root, replacement.replace('*', match[1] ?? '')), sourceFiles);
        }
      }
    }
    return undefined;
  }

  private existingSource(path: string, sourceFiles: ReadonlyMap<string, ts.SourceFile>): string | undefined {
    const normalized = this.normalizeAbsolute(path).replace(/\.js$/u, '');
    return [normalized, `${normalized}.ts`, `${normalized}.tsx`, `${normalized}/index.ts`].find((candidate) => sourceFiles.has(candidate));
  }

  private walkReferences(root: ts.Node, targetFor: (name: string) => string | undefined, onReference: (targetId: string) => void): void {
    const visit = (node: ts.Node): void => {
      if (ts.isHeritageClause(node) || ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
      if (ts.isIdentifier(node) && !this.isDeclarationName(node) && !(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node)) onReference(targetFor(node.text) ?? '');
      ts.forEachChild(node, visit);
    };
    visit(root);
  }

  private isDeclarationName(node: ts.Identifier): boolean { return 'name' in node.parent && (node.parent as { name?: ts.Node }).name === node; }
  private leftmostName(expression: ts.Expression): string { return ts.isIdentifier(expression) ? expression.text : ts.isPropertyAccessExpression(expression) ? this.leftmostName(expression.expression) : ''; }
  private externalId(specifier: string): string { return `external:${specifier.startsWith('node:') ? specifier : specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0]}`; }
  private workspacePath(workspaceRoot: string, filePath: string): string { return relative(workspaceRoot, filePath).replaceAll('\\', '/'); }
  private normalizeAbsolute(path: string): string { return resolve(path).replaceAll('\\', '/'); }
}
