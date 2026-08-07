import { FederatedDeclarationGraphAdapter } from '#application/federation/FederatedDeclarationGraphAdapter.js';
import type { AtlasModuleModel } from '#application/federation/model/AtlasModuleModel.js';
import {
  ResolvedAtlasRelationship,
  ResolvedAtlasWorkspace
} from '#application/federation/model/ResolvedAtlasWorkspace.js';
import type { DeclarationNode } from '#application/graph/model/DeclarationGraph.js';
import { describe, expect, it } from 'vitest';

/**
 * Verifies federated graph semantics are independent of presentation-only source-language metadata.
 */
describe('FederatedDeclarationGraphAdapter', () => {
  /**
   * Produces identical graph nodes and edges when only source-language metadata changes.
   */
  it('does not interpret source language while projecting shared architectural concepts', () => {
    const adapter = new FederatedDeclarationGraphAdapter();
    const fixture = new FederatedWorkspaceFixture();
    const comparer = new FederatedGraphSemanticComparer();
    const typescriptWorkspace = fixture.create('typescript');
    const futureLanguageWorkspace = fixture.create('future-language');

    const futureGraph = adapter.toGraph(futureLanguageWorkspace);
    const typescriptGraph = adapter.toGraph(typescriptWorkspace);

    expect(futureGraph.relationships).toEqual(typescriptGraph.relationships);
    expect(futureGraph.nodes.map((node) => comparer.toSemanticNode(node))).toEqual(
      typescriptGraph.nodes.map((node) => comparer.toSemanticNode(node))
    );
    expect(futureGraph.nodes.find((node) => node.id === 'demo-service')?.sourceLanguage).toBe(
      'future-language'
    );
  });
});

/**
 * Creates resolved workspaces that differ only by presentation metadata.
 */
class FederatedWorkspaceFixture {
  /**
   * Creates one resolved workspace with arbitrary presentation-only source-language metadata.
   *
   * @param sourceLanguage - Generator presentation metadata to preserve without interpretation.
   * @returns Resolved workspace with stable shared architectural semantics.
   */
  public create(sourceLanguage: string): ResolvedAtlasWorkspace {
    const model: AtlasModuleModel = {
      schemaVersion: 1,
      generatorVersion: 'test-1',
      module: { id: 'demo', displayName: 'Demo', version: '1.0.0', category: 'test' },
      sourceLanguage,
      elements: [
        {
          id: 'demo-service',
          name: 'Service',
          kind: 'class',
          qualifiedName: 'demo.Service',
          sourcePath: 'src/service.ts'
        }
      ],
      relationships: [
        {
          id: 'demo-external',
          sourceElementId: 'demo-service',
          kind: 'references',
          target: { moduleId: 'missing', label: 'Missing' }
        }
      ]
    };
    return new ResolvedAtlasWorkspace(new Map([[model.module.id, model]]), [
      new ResolvedAtlasRelationship(model.module.id, model.relationships[0]!, undefined, undefined)
    ]);
  }
}

/**
 * Removes presentation-only metadata before comparing shared graph semantics.
 */
class FederatedGraphSemanticComparer {
  /**
   * Returns the shared semantic fields of one declaration node.
   *
   * @param node - Projected declaration node carrying optional presentation metadata.
   * @returns Node value without source-language presentation metadata.
   */
  public toSemanticNode(node: DeclarationNode): Omit<DeclarationNode, 'sourceLanguage'> {
    return {
      id: node.id,
      label: node.label,
      kind: node.kind,
      packageName: node.packageName,
      sourcePath: node.sourcePath,
      moduleNode: node.moduleNode
    };
  }
}
