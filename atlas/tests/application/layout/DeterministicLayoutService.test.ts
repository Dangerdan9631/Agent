import { DiagramGraph } from '#application/diagram/model/DiagramGraph.js';
import {
  DeclarationNode,
  DeclarationRelationship
} from '#application/graph/model/DeclarationGraph.js';
import { DeterministicLayoutService } from '#application/layout/DeterministicLayoutService.js';
import {
  LayoutDocument,
  LayoutPosition,
  LayoutSettings
} from '#application/layout/model/LayoutDocument.js';
import { describe, expect, it } from 'vitest';

/**
 * Verifies deterministic layout behavior and manual-position retention.
 */
describe('DeterministicLayoutService', () => {
  /**
   * Verifies equivalent graph inputs result in byte-stable layout state and preserve live manual positions.
   */
  it('retains valid saved positions and deterministically places remaining nodes', () => {
    const service = new DeterministicLayoutService();
    const diagram = new DiagramGraph(
      'package:@atlas/example',
      'Example',
      [
        new DeclarationNode('a', 'Alpha', 'class', '@atlas/example', 'src/a.ts', false),
        new DeclarationNode('b', 'Beta', 'interface', '@atlas/example', 'src/b.ts', false)
      ],
      [new DeclarationRelationship('a->b:reference', 'a', 'b', 'reference')]
    );
    const savedLayout = new LayoutDocument(
      1,
      [
        new LayoutPosition('a', 'directory:%40atlas%2Fexample:src', 777.125, 333.5),
        new LayoutPosition('removed', undefined, 5, 5)
      ],
      ['a->b:reference', 'removed-relationship']
    );
    const settings = new LayoutSettings('horizontal', 2, 80, 60, false);

    const firstLayout = service.layout(diagram, savedLayout, settings);
    const secondLayout = service.layout(diagram, savedLayout, settings);

    expect(firstLayout).toEqual(secondLayout);
    expect(firstLayout.positions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nodeId: 'a', x: 777.125, y: 333.5 }),
        expect.objectContaining({ nodeId: 'b' })
      ])
    );
    expect(firstLayout.hiddenRelationshipIds).toEqual(['a->b:reference']);
  });

  /**
   * Verifies force layout replaces otherwise valid retained coordinates.
   */
  it('replaces saved positions when force is requested', () => {
    const diagram = new DiagramGraph(
      'landscape',
      'Landscape',
      [new DeclarationNode('a', 'Alpha', 'class', '@atlas/example', 'src/a.ts', false)],
      []
    );
    const layout = new DeterministicLayoutService().layout(
      diagram,
      new LayoutDocument(
        1,
        [new LayoutPosition('a', 'directory:%40atlas%2Fexample:src', 1000, 1000)],
        []
      ),
      new LayoutSettings('horizontal', 1, 80, 60, true)
    );

    expect(layout.positions).toHaveLength(1);
    expect(layout.positions[0]?.nodeId).toBe('a');
    expect(layout.positions[0]?.x).not.toBe(1000);
    expect(layout.positions[0]?.y).not.toBe(1000);
  });

  /**
   * Verifies that a downstream declaration follows the complete condensed cyclic component.
   */
  it('orders cyclic components before their downstream dependencies', () => {
    const diagram = new DiagramGraph(
      'landscape',
      'Landscape',
      [
        new DeclarationNode('a', 'Alpha', 'class', '@atlas/example', 'src/a.ts', false),
        new DeclarationNode('b', 'Beta', 'class', '@atlas/example', 'src/b.ts', false),
        new DeclarationNode('c', 'Gamma', 'class', '@atlas/example', 'src/c.ts', false)
      ],
      [
        new DeclarationRelationship('a-b', 'a', 'b', 'reference'),
        new DeclarationRelationship('b-a', 'b', 'a', 'reference'),
        new DeclarationRelationship('b-c', 'b', 'c', 'reference')
      ]
    );
    const layout = new DeterministicLayoutService().layout(
      diagram,
      undefined,
      new LayoutSettings('horizontal', 6, 80, 60, false)
    );
    const positions = new Map(layout.positions.map((position) => [position.nodeId, position]));

    expect(positions.get('c')?.x).toBeGreaterThan(
      positions.get('b')?.x ?? Number.POSITIVE_INFINITY
    );
  });

  /**
   * Verifies row limits and vertical orientation transpose deterministic generated flow coordinates.
   */
  it('honors row limits and vertical orientation', () => {
    const diagram = new DiagramGraph(
      'landscape',
      'Landscape',
      [
        new DeclarationNode('a', 'Alpha', 'class', '@atlas/example', 'src/a.ts', false),
        new DeclarationNode('b', 'Beta', 'class', '@atlas/example', 'src/b.ts', false),
        new DeclarationNode('c', 'Gamma', 'class', '@atlas/example', 'src/c.ts', false)
      ],
      []
    );
    const layout = new DeterministicLayoutService().layout(
      diagram,
      undefined,
      new LayoutSettings('vertical', 2, 40, 20, false)
    );
    const positions = new Map(layout.positions.map((position) => [position.nodeId, position]));

    expect(positions.get('b')?.y).toBeGreaterThan(
      positions.get('a')?.y ?? Number.POSITIVE_INFINITY
    );
    expect(positions.get('c')?.x).toBeGreaterThan(
      positions.get('a')?.x ?? Number.POSITIVE_INFINITY
    );
  });

  /**
   * Verifies fresh layouts recursively separate package and nested directory compounds.
   */
  it('places nested compound descendants in separate deterministic bounds', () => {
    const diagram = new DiagramGraph(
      'landscape',
      'Landscape',
      [
        new DeclarationNode('root', 'Root', 'class', '@demo/one', 'src/root.ts', false),
        new DeclarationNode('deep', 'Deep', 'class', '@demo/one', 'src/feature/deep.ts', false),
        new DeclarationNode('other', 'Other', 'class', '@demo/two', 'src/other.ts', false)
      ],
      []
    );
    const layout = new DeterministicLayoutService().layout(
      diagram,
      undefined,
      new LayoutSettings('horizontal', 2, 80, 60, false)
    );
    const positions = new Map(layout.positions.map((position) => [position.nodeId, position]));

    expect(positions.get('root')).toMatchObject({ parentId: 'directory:%40demo%2Fone:src' });
    expect(positions.get('deep')).toMatchObject({
      parentId: 'directory:%40demo%2Fone:src%2Ffeature'
    });
    expect(positions.get('other')?.x).not.toBe(positions.get('root')?.x);
    expect(positions.get('deep')?.x).not.toBe(positions.get('root')?.x);
  });
});
