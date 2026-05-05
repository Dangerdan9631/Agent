import type {
  GeneratorPlugin,
  ImporterPlugin,
  DetectedAgent,
  DirectiveTypePlugin,
  InstructionType,
} from 'agentconfig-api';

type DetectFn = (dir: string) => DetectedAgent[];

/**
 * Central plugin registry — stores generators, importers, detectors, and
 * directive type plugins.
 */
export class PluginRegistry {
  private readonly generators: GeneratorPlugin<InstructionType>[] = [];
  private readonly importers: ImporterPlugin<InstructionType>[] = [];
  private readonly detectors: DetectFn[] = [];
  private readonly directiveTypes = new Map<string, DirectiveTypePlugin>();

  // ── Generator methods ──────────────────────────────────────────────────────

  /** Register a generator. */
  registerGenerator(generator: GeneratorPlugin<InstructionType>): void {
    this.generators.push(generator);
  }

  /** Look up all generators for a specific target ID. */
  getGenerators(target: string): GeneratorPlugin<InstructionType>[] {
    return this.generators.filter((g) => g.agent === target);
  }

  /** Return all registered generators. */
  listGenerators(): GeneratorPlugin<InstructionType>[] {
    return [...this.generators];
  }

  // ── Importer methods ──────────────────────────────────────────────────────

  /** Register an importer plugin. */
  registerImporter(importer: ImporterPlugin<InstructionType>): void {
    this.importers.push(importer);
  }

  /** Look up all importers for a specific target ID. */
  getImporters(target: string): ImporterPlugin<InstructionType>[] {
    return this.importers.filter((i) => i.agent === target);
  }

  /** Return all registered importers. */
  listImporters(): ImporterPlugin<InstructionType>[] {
    return [...this.importers];
  }

  // ── Detector methods ──────────────────────────────────────────────────────

  /** Register a detector function that probes a directory for an agent's presence. */
  registerDetector(fn: DetectFn): void {
    this.detectors.push(fn);
  }

  /** Return all registered detector functions. */
  listDetectors(): DetectFn[] {
    return [...this.detectors];
  }

  // ── Directive type methods ────────────────────────────────────────────────

  /** Register a directive type plugin. Overwrites existing entry for the same typeId. */
  registerDirectiveType(plugin: DirectiveTypePlugin): void {
    this.directiveTypes.set(plugin.typeId, plugin);
  }

  /** Look up a directive type plugin by typeId. */
  getDirectiveType(typeId: string): DirectiveTypePlugin | undefined {
    return this.directiveTypes.get(typeId);
  }

  /** Return all registered directive type plugins in insertion order. */
  listDirectiveTypes(): DirectiveTypePlugin[] {
    return Array.from(this.directiveTypes.values());
  }

  // ── Dynamic plugin loading ────────────────────────────────────────────────

  /**
   * Dynamically load a plugin module by its Node module identifier and
   * register whatever it exports. Supports:
   * - `GeneratorPlugin`
   * - `ImporterPlugin`
   * - `DirectiveTypePlugin`
   * - `detect` function export
   * - An array of any of the above
   */
  async loadPlugin(moduleId: string): Promise<void> {
    const mod = (await import(moduleId)) as Record<string, unknown>;
    const exported = mod.default ?? mod;

    if (Array.isArray(exported)) {
      for (const item of exported) {
        this._registerOne(item, moduleId);
      }
    } else {
      this._registerOne(exported, moduleId);
    }
    
    // Also check for named detect function
    if (typeof mod['detect'] === 'function') {
      this.registerDetector(mod['detect'] as DetectFn);
    }
  }

  private _registerOne(plugin: unknown, moduleId: string): void {
    if (typeof plugin !== 'object' || plugin === null) {
      throw new Error(`Plugin "${moduleId}" does not export a valid plugin object.`);
    }

    const p = plugin as Record<string, unknown>;

    // DirectiveTypePlugin: has typeId (string) + parse (function)
    if (typeof p['typeId'] === 'string' && typeof p['parse'] === 'function') {
      this.registerDirectiveType(plugin as DirectiveTypePlugin);
      return;
    }

    let registered = false;

    // GeneratorPlugin: has agent, instructionType, validate, generate
    if (
      typeof p['agent'] === 'string' &&
      typeof p['instructionType'] === 'string' &&
      typeof p['validate'] === 'function' &&
      typeof p['generate'] === 'function'
    ) {
      this.registerGenerator(plugin as GeneratorPlugin<InstructionType>);
      registered = true;
    }

    // ImporterPlugin: has agent, instructionType, validate, import
    if (
      typeof p['agent'] === 'string' &&
      typeof p['instructionType'] === 'string' &&
      typeof p['validate'] === 'function' &&
      typeof p['import'] === 'function'
    ) {
      this.registerImporter(plugin as ImporterPlugin<InstructionType>);
      registered = true;
    }

    if (!registered) {
      throw new Error(
        `Plugin "${moduleId}" does not export a valid plugin. ` +
          `Expected GeneratorPlugin, ImporterPlugin, or DirectiveTypePlugin.`
      );
    }
  }
}

/** Singleton registry — all built-in plugins self-register here on import */
export const registry = new PluginRegistry();


