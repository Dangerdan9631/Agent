import { NodeAtlasWorkspaceLoader } from '#infrastructure/federation/NodeAtlasWorkspaceLoader.js';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * Verifies manifest-selected module models are validated and linked only by stable artifact identities.
 */
describe('NodeAtlasWorkspaceLoader', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((directory) => rm(directory, { recursive: true, force: true }))
    );
  });

  /**
   * Resolves matching targets while retaining unavailable artifacts as ordinary external dependencies.
   */
  it('links selected models independently of source language and preserves missing dependencies', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'atlas-federation-'));
    temporaryDirectories.push(directory);
    const fixture = new FederationModelFixture();
    await writeFile(
      resolve(directory, 'one.json'),
      JSON.stringify(
        fixture.create('one', 'future-language', 'one-element', {
          moduleId: 'two',
          elementId: 'two-element'
        })
      ),
      'utf8'
    );
    await writeFile(
      resolve(directory, 'two.json'),
      JSON.stringify(
        fixture.create('two', 'kotlin', 'two-element', {
          moduleId: 'missing',
          label: 'Missing Artifact'
        })
      ),
      'utf8'
    );
    await writeFile(
      resolve(directory, 'workspace.json'),
      JSON.stringify({
        schemaVersion: 1,
        modules: [
          { moduleId: 'one', modelPath: 'one.json' },
          { moduleId: 'two', modelPath: 'two.json' }
        ]
      }),
      'utf8'
    );

    const workspace = await new NodeAtlasWorkspaceLoader().load(
      resolve(directory, 'workspace.json')
    );

    expect(workspace.modules.size).toBe(2);
    expect(workspace.relationships[0]?.targetModule?.module.id).toBe('two');
    expect(workspace.relationships[0]?.targetElementId).toBe('two-element');
    expect(workspace.relationships[1]?.targetModule).toBeUndefined();
    expect(workspace.relationships[1]?.targetElementId).toBeUndefined();
  });
});

/**
 * Creates minimal schema-valid model documents for federation loader tests.
 */
class FederationModelFixture {
  /**
   * Creates one minimal valid model with a single external or internal relationship.
   *
   * @param moduleId - Stable artifact module ID.
   * @param sourceLanguage - Arbitrary presentation-only language metadata.
   * @param elementId - Stable owned element ID.
   * @param target - Internal or external relationship target identity.
   * @returns JSON-compatible module model value.
   */
  public create(
    moduleId: string,
    sourceLanguage: string,
    elementId: string,
    target: { readonly moduleId?: string; readonly elementId?: string; readonly label?: string }
  ): object {
    return {
      schemaVersion: 1,
      generatorVersion: 'test-1',
      module: { id: moduleId, displayName: moduleId, version: '1.0.0', category: 'test' },
      sourceLanguage,
      elements: [{ id: elementId, name: elementId, kind: 'class', qualifiedName: elementId }],
      relationships: [
        {
          id: `${moduleId}-relationship`,
          sourceElementId: elementId,
          kind: 'references',
          target
        }
      ]
    };
  }
}
