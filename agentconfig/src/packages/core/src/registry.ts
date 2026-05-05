import type {
  AgentGenerator,
  AgentTargetPlugin,
  DetectedAgent,
  DirectiveTypePlugin,
} from 'agentconfig-api';
import type { InstructionFile, AgentDefinition } from 'agentconfig-api';

type AgentImportFn = (sourceDir: string) => Promise<{
  instructions: InstructionFile[];
  agents?: AgentDefinition[];
}>;

type DetectFn = (dir: string) => DetectedAgent[];

/**
 * Central plugin registry — stores generators, importers, detectors, and
 * directive type plugins. All built-in agents register themselves here on
 * module load; third-party plugins register via `loadPlugin()`.
 */
export class PluginRegistry {
  private readonly generators = new Map<string, AgentGenerator>();
  private readonly importers = new Map<string, AgentImportFn>();
  private readonly detectors: DetectFn[] = [];
  private readonly directiveTypes = new Map<string, DirectiveTypePlugin>();

  // ── Generator methods (primary, unchanged interface) ─────────────────────

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

  // ── Importer methods ──────────────────────────────────────────────────────

  /** Register an importer function for a target. Overwrites existing entry. */
  registerImporter(target: string, fn: AgentImportFn): void {
    this.importers.set(target, fn);
  }

  /** Look up an importer by target ID. Returns `undefined` if not registered. */
  getImporter(target: string): AgentImportFn | undefined {
    return this.importers.get(target);
  }

  /** Return all registered importer entries as an array of `[target, fn]` pairs. */
  listImporters(): Array<[string, AgentImportFn]> {
    return Array.from(this.importers.entries());
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
   * - `AgentTargetPlugin` (`{ target, generate, importSource }`)
   * - `DirectiveTypePlugin` (`{ typeId, parse }`)
   * - Legacy `AgentGenerator` (`{ target, generate }`) — backward compatible
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

    // AgentTargetPlugin: has target (string) + generate (function) + importSource (function)
    if (
      typeof p['target'] === 'string' &&
      typeof p['generate'] === 'function' &&
      typeof p['importSource'] === 'function'
    ) {
      const agentPlugin = plugin as AgentTargetPlugin;
      this.register(agentPlugin);
      this.registerImporter(agentPlugin.target, (dir) => agentPlugin.importSource(dir));
      if (typeof agentPlugin.detect === 'function') {
        const detect = agentPlugin.detect.bind(agentPlugin);
        this.registerDetector((dir) => {
          const result = detect(dir);
          return result ? [{ name: agentPlugin.target, confidence: result.confidence }] : [];
        });
      }
      return;
    }

    // Legacy AgentGenerator: has target (string) + generate (function) — backward compat
    if (typeof p['target'] === 'string' && typeof p['generate'] === 'function') {
      this.register(plugin as AgentGenerator);
      return;
    }

    throw new Error(
      `Plugin "${moduleId}" does not export a valid plugin. ` +
        `Expected AgentTargetPlugin ({ target, generate, importSource }), ` +
        `DirectiveTypePlugin ({ typeId, parse }), or ` +
        `AgentGenerator ({ target, generate }).`,
    );
  }
}

/** Singleton registry — all built-in plugins self-register here on import */
export const registry = new PluginRegistry();

/** @deprecated Use `PluginRegistry` instead */
export { PluginRegistry as GeneratorRegistry };

