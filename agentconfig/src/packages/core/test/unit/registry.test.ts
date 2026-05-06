import { describe, expect, it } from 'vitest';
import { PluginRegistry } from '../../src/registry';
import type { GeneratorPlugin, ImporterPlugin, InstructionType } from 'agentconfig-api';

describe('PluginRegistry', () => {
  it('should find generators by single agent string', () => {
    const registry = new PluginRegistry();
    const generator: GeneratorPlugin<InstructionType> = {
      agent: 'agent1',
      instructionType: 'instruction',
      validate: () => [],
      generate: () => {},
    };
    registry.registerGenerator(generator);

    expect(registry.getGenerators('agent1')).toContain(generator);
    expect(registry.getGenerators('agent2')).not.toContain(generator);
  });

  it('should find generators by agent string array', () => {
    const registry = new PluginRegistry();
    const generator: GeneratorPlugin<InstructionType> = {
      agent: ['agent1', 'agent2'],
      instructionType: 'instruction',
      validate: () => [],
      generate: () => {},
    };
    registry.registerGenerator(generator);

    expect(registry.getGenerators('agent1')).toContain(generator);
    expect(registry.getGenerators('agent2')).toContain(generator);
    expect(registry.getGenerators('agent3')).not.toContain(generator);
  });

  it('should find importers by single agent string', () => {
    const registry = new PluginRegistry();
    const importer: ImporterPlugin<InstructionType> = {
      agent: 'agent1',
      instructionType: 'instruction',
      validate: () => [],
      import: async () => [],
    };
    registry.registerImporter(importer);

    expect(registry.getImporters('agent1')).toContain(importer);
    expect(registry.getImporters('agent2')).not.toContain(importer);
  });

  it('should find importers by agent string array', () => {
    const registry = new PluginRegistry();
    const importer: ImporterPlugin<InstructionType> = {
      agent: ['agent1', 'agent2'],
      instructionType: 'instruction',
      validate: () => [],
      import: async () => [],
    };
    registry.registerImporter(importer);

    expect(registry.getImporters('agent1')).toContain(importer);
    expect(registry.getImporters('agent2')).toContain(importer);
    expect(registry.getImporters('agent3')).not.toContain(importer);
  });

  it('should correctly identify multi-agent plugins in _registerOne', () => {
    const registry = new PluginRegistry();
    
    const multiGenerator = {
      agent: ['a', 'b'],
      instructionType: 'inst',
      validate: () => [],
      generate: () => {},
    };

    const multiImporter = {
      agent: ['c', 'd'],
      instructionType: 'inst',
      validate: () => [],
      import: async () => [],
    };

    // @ts-ignore - testing private method/dynamic loading logic
    expect(registry._registerOne(multiGenerator, 'test-mod')).toBe(true);
    // @ts-ignore
    expect(registry._registerOne(multiImporter, 'test-mod')).toBe(true);

    expect(registry.getGenerators('a')).toHaveLength(1);
    expect(registry.getGenerators('b')).toHaveLength(1);
    expect(registry.getImporters('c')).toHaveLength(1);
    expect(registry.getImporters('d')).toHaveLength(1);
  });
});
