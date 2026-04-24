import type { AgentGenerator } from './types/generator';

/** Central plugin registry — maps target ID → generator */
export class GeneratorRegistry {
  private readonly generators = new Map<string, AgentGenerator>();

  /** Register a generator. Overwrites any existing entry for the same target. */
  register(generator: AgentGenerator): void {
    this.generators.set(generator.target, generator);
  }

  /** Look up a generator by target ID. Returns `undefined` if not registered. */
  get(target: string): AgentGenerator | undefined {
    return this.generators.get(target);
  }

  /** Return all registered generators in insertion order. */
  list(): AgentGenerator[] {
    return Array.from(this.generators.values());
  }

  /**
   * Dynamically load a plugin module by its Node module identifier and register
   * the exported generator.  The module must export an `AgentGenerator` as its
   * default export (or as the module itself for CommonJS modules).
   */
  async loadPlugin(moduleId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = (await import(moduleId)) as any;
    const generator: AgentGenerator = mod.default ?? mod;
    if (typeof generator?.target !== 'string') {
      throw new Error(
        `Plugin "${moduleId}" does not export a valid AgentGenerator (missing .target string).`,
      );
    }
    this.register(generator);
  }
}

/** Singleton registry — all built-in generators self-register here on import */
export const registry = new GeneratorRegistry();
