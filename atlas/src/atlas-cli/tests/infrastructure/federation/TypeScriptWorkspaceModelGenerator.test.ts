import type { DeclarationGraphBuilder } from '#application/graph/ports/DeclarationGraphBuilder.js';
import {
  DeclarationGraph,
  DeclarationNode,
  DeclarationRelationship
} from '#application/graph/model/DeclarationGraph.js';
import { ResolvedWorkspacePaths } from '#application/workspace/model/ResolvedWorkspacePaths.js';
import { WorkspacePackage } from '#application/workspace/model/WorkspacePackage.js';
import { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';
import { TypeScriptWorkspaceModelGenerator } from '#infrastructure/federation/TypeScriptWorkspaceModelGenerator.js';
import { NodeAtlasWorkspaceLoader } from '#infrastructure/federation/NodeAtlasWorkspaceLoader.js';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * Verifies TypeScript package model generation preserves cross-artifact declaration identities.
 */
describe('TypeScriptWorkspaceModelGenerator', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((directory) => rm(directory, { recursive: true, force: true }))
    );
  });

  /**
   * Emits an external artifact target with the receiving artifact's stable element identity.
   */
  it('writes optional external element identities for known cross-package declarations', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'atlas-model-generator-'));
    temporaryDirectories.push(directory);
    const firstRoot = resolve(directory, 'first');
    const secondRoot = resolve(directory, 'second');
    await Promise.all([mkdir(firstRoot), mkdir(secondRoot)]);
    await Promise.all([
      writeFile(resolve(firstRoot, 'package.json'), '{"name":"first","version":"1.0.0"}', 'utf8'),
      writeFile(resolve(secondRoot, 'package.json'), '{"name":"second","version":"2.0.0"}', 'utf8')
    ]);
    const workspace = new WorkspaceSnapshot(
      new ResolvedWorkspacePaths(
        directory,
        resolve(directory, 'atlas.config.json'),
        resolve(directory, 'out')
      ),
      {
        schemaVersion: 1,
        discovery: { packages: [{ match: { name: 'first' }, classification: 'runtime' }] }
      },
      [
        new WorkspacePackage('first', firstRoot, 'first', [], 'runtime', [], undefined),
        new WorkspacePackage('second', secondRoot, 'second', [], 'runtime', [], undefined)
      ]
    );
    const graph = new DeclarationGraph(
      [
        new DeclarationNode('first-node', 'First', 'class', 'first', 'first/src/first.ts', false),
        new DeclarationNode(
          'second-node',
          'Second',
          'class',
          'second',
          'second/src/second.ts',
          false
        ),
        new DeclarationNode(
          'second-other-node',
          'SecondOther',
          'interface',
          'second',
          'second/src/other.ts',
          false
        )
      ],
      [
        new DeclarationRelationship('first-second', 'first-node', 'second-node', 'reference'),
        new DeclarationRelationship(
          'first-second-other',
          'first-node',
          'second-other-node',
          'reference'
        )
      ]
    );

    const manifestPath = await new TypeScriptWorkspaceModelGenerator(
      new FixedGraphBuilder(graph)
    ).generate(workspace, resolve(directory, 'models'));
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
      readonly modules: readonly { readonly moduleId: string; readonly modelPath: string }[];
    };
    const firstModelPath = manifest.modules.find((entry) => entry.moduleId === 'first')?.modelPath;
    const firstModel = JSON.parse(
      await readFile(resolve(directory, 'models', firstModelPath ?? ''), 'utf8')
    ) as {
      readonly relationships: readonly {
        readonly id: string;
        readonly target: { readonly moduleId?: string; readonly elementId?: string };
      }[];
      readonly elements: readonly { readonly sourcePath?: string }[];
    };
    const resolvedWorkspace = await new NodeAtlasWorkspaceLoader().load(manifestPath);

    expect(firstModel.relationships.map((relationship) => relationship.target)).toEqual([
      {
        moduleId: 'second',
        elementId: 'element:second:src%2Fother.ts%3ASecondOther:interface',
        label: 'SecondOther'
      },
      {
        moduleId: 'second',
        elementId: 'element:second:src%2Fsecond.ts%3ASecond:class',
        label: 'Second'
      }
    ]);
    expect(new Set(firstModel.relationships.map((relationship) => relationship.id)).size).toBe(2);
    expect(firstModel.elements.map((element) => element.sourcePath).filter(Boolean)).toEqual([
      'src/first.ts',
      'src/first.ts'
    ]);
    expect(resolvedWorkspace.modules.size).toBe(2);
    expect(resolvedWorkspace.relationships).toHaveLength(2);
  });
});

/**
 * Supplies a fixed semantic graph to isolate model serialization behavior.
 */
class FixedGraphBuilder implements DeclarationGraphBuilder {
  /**
   * Creates a graph builder that always returns one deterministic graph.
   *
   * @param graph - Graph returned for every requested workspace.
   */
  public constructor(private readonly graph: DeclarationGraph) {}

  /**
   * Returns the configured graph without inspecting workspace files.
   *
   * @returns Deterministic test graph.
   */
  public build(): Promise<DeclarationGraph> {
    return Promise.resolve(this.graph);
  }
}
