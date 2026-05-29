# Plan: agentconfig Complete Architectural Overhaul

**TL;DR**: The application core knows nothing about agents or instruction types — all of that lives in plugins. Introduce a new `plugins` package that contains every built-in directive type (instruction, agent, skill, command, hook) and every built-in agent plugin (copilot, cursor, etc.). The `core` package becomes pure generic machinery: plugin registry, plugin loader, use cases, config I/O, and file writing utilities — with no imports of any agent-specific types. Restructure `core` into Clean Architecture layers (application → infrastructure → adapter), replacing the procedural `operations.ts` god-file with 7 injectable use case classes. Remove the legacy `IR` struct entirely. Eliminate module-level mutable state. The CLI bootstraps the registry with built-in plugins before the API is used. The 4-package structure (api / core / plugins / cli) replaces the old 3-package structure.

---

## Decisions

- **Registry**: Keep module-level singleton for bootstrap only; use cases receive `IPluginRegistry` via constructor DI
- **IR**: Fully remove `IR` struct and `buildLegacyIR()` — everything uses `InstructionType[]`
- **Packages**: 4 packages — api / core / plugins (new) / cli
- **Agent-agnostic core**: `core` contains zero knowledge of agents or instruction types; all entities, parsers, validators, and generators live in `plugins`
- **Hook event maps**: Move to plugin system — each plugin registers its own map
- **Built-in plugin bootstrap**: CLI is responsible for registering built-in plugins; `createAgentConfigApi()` accepts a `setupRegistry` callback

---

## Target Directory Structure

### core/src — generic machinery only, zero agent knowledge

```
core/src/
  application/
    ports/
      plugin-registry.port.ts  (IPluginRegistry interface)
      config-repository.port.ts (IConfigRepository interface)
      artifact-parser.port.ts  (IArtifactParser interface)
      artifact-writer.port.ts  (IArtifactWriter + IAgentConfigDirWriter)
      index.ts
    use-cases/
      generate.use-case.ts
      validate.use-case.ts
      diff.use-case.ts
      initialize.use-case.ts
      import.use-case.ts
      translate.use-case.ts
      list-targets.use-case.ts
      index.ts
  infrastructure/
    plugin-registry.ts     (PluginRegistry implements IPluginRegistry; bootstrap singleton)
    plugin-loader.ts       (PluginLoader class: owns pluginsLoaded flag, scans dirs)
    global-config.ts       (GlobalConfigRepository: ~/.agentconfig/config.yaml)
    config-repository.ts   (ConfigRepository implements IConfigRepository)
    artifact-parser.ts     (ArtifactParser: purely delegates to DirectiveTypePlugin.parse())
    artifact-writer.ts     (ArtifactWriter implements IArtifactWriter)
    agentconfig-dir-writer.ts (AgentConfigDirWriter: delegates to DirectiveTypePlugin.write() + writes config.yaml)
    index.ts
  agent-config-api.ts      (adapter: implements IAgentConfigApi using use cases)
  index.ts                 (createAgentConfigApi(setupRegistry?) factory)
  config-schema.ts         (unchanged)
  utils.ts                 (safeMatter, slugify — unchanged)
  validator.ts             (pure orchestrator: delegates entirely to plugin.validate())
```

### plugins/src — all built-in directive types and agent plugins

```
plugins/src/
  targets.ts               (BUILT_IN_TARGETS constants object)
  directive-types/
    instruction/
      index.ts             (DirectiveTypePlugin impl: InstructionFile entity + parse + write + validate)
    agent/
      index.ts             (DirectiveTypePlugin impl: AgentDefinition entity + parse + write + validate)
    skill/
      index.ts             (DirectiveTypePlugin impl: SkillDefinition entity + parse + write + validate)
    command/
      index.ts             (DirectiveTypePlugin impl: CommandDefinition entity + parse + write + validate)
    hook/
      index.ts             (DirectiveTypePlugin impl: HookDefinition entity + parse + write + validate)
  generators/
    base.ts                (filterForTarget, buildFrontmatter, buildInTextCondition — shared utilities)
    antigravity.plugin.ts
    claude-code.plugin.ts
    cline.plugin.ts
    codex.plugin.ts
    copilot.plugin.ts
    cursor.plugin.ts        (registers hook event map for cursor)
    gemini-cli.plugin.ts
    shared-skill.plugin.ts
    windsurf.plugin.ts
  importers/
    antigravity.plugin.ts
    claude-code.plugin.ts   (registers hook event map for claude-code)
    cline.plugin.ts
    codex.plugin.ts         (registers hook event map for codex)
    copilot.plugin.ts
    cursor.plugin.ts
    gemini-cli.plugin.ts
    windsurf.plugin.ts
  index.ts                 (registerAll(registry): registers all directive types + agent plugins)
```

## Files to Delete

- `core/src/operations.ts` → split into 7 use case files
- `core/src/import-utils.ts` → split to `infrastructure/agentconfig-dir-writer.ts`
- `core/src/global-config.ts` → split to `infrastructure/plugin-loader.ts` + `infrastructure/global-config.ts`
- `core/src/registry.ts` → moves to `infrastructure/plugin-registry.ts`
- `core/src/types/` → entire directory deleted; entities move to `plugins/src/directive-types/`; IR interface removed entirely
- `core/src/parsers/` → entire directory deleted; parsing moves to `plugins/src/directive-types/*/index.ts`
- `core/src/built-in-plugins/` → entire directory deleted; moves to `plugins/src/generators/` and `plugins/src/importers/`
- `core/src/validator.ts` → replaced by a pure orchestrator (no type-specific rules)
- `core/src/api.ts` → redundant re-export; inline into `index.ts`

---

## Phase 1: API Package — Extend plugin interfaces

1. Add `getHookEventMap(target: string): AgentHookEventMap | undefined` to `ReadonlyRegistry` in `api/src/plugins/context.ts`
2. Ensure `AgentHookEventMap` type is publicly exported from the api package types
3. Add optional `write(items: T[], configDir: string, opts?: WriteOptions): Promise<void>` method to `DirectiveTypePlugin` in `api/src/plugins/` — enables directive types to write their own section of `.agentconfig/` back to disk

**Files**: `api/src/plugins/context.ts`, `api/src/plugins/directive-type.ts` (or wherever `DirectiveTypePlugin` is defined), `api/src/types/generator.ts`

---

## Phase 2: New Plugins Package

Create `packages/plugins/` as a new npm workspace package (`agentconfig-plugins`). Depends on `agentconfig-api` only.

4. Create `plugins/package.json` — `name: agentconfig-plugins`, depends on `agentconfig-api`; devDepends on `agentconfig` (core) for type checking only
5. Create `plugins/src/targets.ts` — `BUILT_IN_TARGETS` const object with all 9 target name strings
6. Create `plugins/src/directive-types/instruction/index.ts` — `InstructionFile` entity + `DirectiveTypePlugin` impl with `parse()`, `write()`, `validate()`; migrated from `core/src/types/instruction.ts` + `core/src/parsers/instruction.ts` + relevant validation rules from `core/src/validator.ts`
7. Create `plugins/src/directive-types/agent/index.ts` — `AgentDefinition` entity + plugin; migrated from `core/src/types/agent.ts` + `core/src/parsers/agent.ts`
8. Create `plugins/src/directive-types/skill/index.ts` — `SkillDefinition` entity + plugin; migrated from `core/src/types/skill.ts` + `core/src/parsers/skill.ts`
9. Create `plugins/src/directive-types/command/index.ts` — `CommandDefinition` entity + plugin; migrated from `core/src/types/command.ts` + `core/src/parsers/command.ts`
10. Create `plugins/src/directive-types/hook/index.ts` — `HookDefinition` entity + plugin; migrated from `core/src/types/hook.ts` + `core/src/parsers/hook.ts`
11. Create `plugins/src/generators/base.ts` — `filterForTarget`, `buildFrontmatter`, `buildInTextCondition`; migrated from `core/src/built-in-plugins/base.ts` minus `HOOK_EVENT_MAPS`
12. Create `plugins/src/generators/*.plugin.ts` — one file per agent; migrated from `core/src/built-in-plugins/*-generator.plugin.ts`; cursor, claude-code, codex also export + register `hookEventMap`
13. Create `plugins/src/importers/*.plugin.ts` — one file per agent; migrated from `core/src/built-in-plugins/*-importer.plugin.ts`
14. Create `plugins/src/index.ts` — `registerAll(registry: IPluginRegistry): void` that registers all directive types and all agent plugins into the passed registry

---

## Phase 3: Port Interfaces *(steps parallel, no dependencies)*

15. `application/ports/plugin-registry.port.ts` — `IPluginRegistry` (extends `ReadonlyRegistry`, adds write + hook map methods: `registerGenerator`, `registerImporter`, `registerDetector`, `registerDirectiveType`, `registerHookEventMap`, `loadPlugin`)
16. `application/ports/config-repository.port.ts` — `IConfigRepository`: `findConfigDir(startDir)`, `resolveConfigDir(startDir?)`, `loadConfig(configDir, overrides?)`, `saveConfig(configDir, config)`
17. `application/ports/artifact-parser.port.ts` — `IArtifactParser`: `parse(configDir: string, config: AgentConfig): Promise<InstructionType[]>`
18. `application/ports/artifact-writer.port.ts` — `IArtifactWriter`: `write(tempDir, outputDir, opts): Promise<number>`, `computeDiff(tempDir, outputDir): Promise<DiffEntry[]>`; `IAgentConfigDirWriter`: `write(items: InstructionType[], config, configDir, opts?): Promise<void>`
19. `application/ports/index.ts` barrel

---

## Phase 4: Infrastructure Layer — Implement ports *(depends on Phase 3)*

20. `infrastructure/plugin-registry.ts` — `PluginRegistry` implementing `IPluginRegistry`; add `hookEventMaps: Map<string, AgentHookEventMap>`, `registerHookEventMap(target: string | string[], map)`, `getHookEventMap(target)`; export `registry` module-level singleton for bootstrap only
21. `infrastructure/global-config.ts` — `GlobalConfigRepository` class: `load()`, `ensureExists()`, `getConfigDir()`, `getConfigPath()`, `buildDefaultContent()` — extracted from old `global-config.ts`
22. `infrastructure/plugin-loader.ts` — `PluginLoader` class; constructor `(registry: IPluginRegistry, globalConfig: GlobalConfigRepository)`; owns `private loaded = false` flag (removes module-level mutable state); `ensureLoaded(): Promise<void>` is idempotent; loads only user-defined plugins from `pluginDirs` (built-ins are registered separately via `createAgentConfigApi(setupRegistry)`)
23. `infrastructure/config-repository.ts` — `ConfigRepository` implementing `IConfigRepository` — from `config.ts`
24. `infrastructure/artifact-parser.ts` — `ArtifactParser` class implementing `IArtifactParser`; constructor `(registry: IPluginRegistry)`; iterates `registry.listDirectiveTypes()` and calls `plugin.parse(configDir)` for each — **no type-specific parsing logic**
25. `infrastructure/artifact-writer.ts` — `ArtifactWriter` class implementing `IArtifactWriter` — from `writer.ts`
26. `infrastructure/agentconfig-dir-writer.ts` — `AgentConfigDirWriter` class implementing `IAgentConfigDirWriter`; constructor `(registry: IPluginRegistry)`; writes `config.yaml` then calls `plugin.write(items, configDir, opts)` for each registered directive type — **no type-specific write logic**; absorbs `detectAgents` + `importArtifacts` from `import-utils.ts`

---

## Phase 5: Replace Validator with Pure Orchestrator *(depends on Phase 3–4)*

27. Rewrite `core/src/validator.ts` as a pure orchestrator:
    - New signature: `validate(items: InstructionType[], config: AgentConfig, registry: IPluginRegistry): ValidationResult[]`
    - For each registered `DirectiveTypePlugin`: filter `items` by `plugin.typeId`, call `plugin.validate?.(typedItems, config)`
    - For each registered `GeneratorPlugin`: call `plugin.validate(filteredItems, context)`
    - **Zero type-specific rules** remain in core — all validation knowledge lives in plugins

---

## Phase 6: Application Layer — Use Cases *(depends on Phase 3–5; steps parallel)*

Each use case is a class with constructor DI and one `execute(options)` method. All call `this.pluginLoader.ensureLoaded()` before any registry access. No `buildLegacyIR()`, no agent-specific imports.

28. `application/use-cases/generate.use-case.ts` — from `generateOnce` + `runGenerate` in `operations.ts`; `generateToTempDir` becomes a private method that iterates `registry.getGenerators(target)`; receives `IPluginRegistry`, `IConfigRepository`, `PluginLoader`, `IArtifactParser`, `IArtifactWriter`
29. `application/use-cases/validate.use-case.ts` — from `runValidate`
30. `application/use-cases/diff.use-case.ts` — from `runDiff`
31. `application/use-cases/initialize.use-case.ts` — from `runInitialize`; receives `IPluginRegistry`, `IConfigRepository`, `PluginLoader`, `IArtifactParser`, `IAgentConfigDirWriter`
32. `application/use-cases/import.use-case.ts` — from `runImport`
33. `application/use-cases/translate.use-case.ts` — from `runTranslate`
34. `application/use-cases/list-targets.use-case.ts` — from `listTargets`
35. `application/use-cases/index.ts` barrel

---

## Phase 7: Adapter + Factory *(depends on Phase 6)*

36. Rewrite `core/src/agent-config-api.ts`:
    - `AgentConfigApiAdapter` class implementing `IAgentConfigApi`
    - Constructor receives 7 use case instances
    - Each method delegates to `useCase.execute(options)`
37. Rewrite `core/src/index.ts` — `createAgentConfigApi(setupRegistry?)` factory:
    - Accepts optional `setupRegistry?: (registry: IPluginRegistry) => void` callback
    - Caller (CLI) uses this to register built-in plugins before any use case runs
    - `PluginLoader.ensureLoaded()` loads only user-defined plugins from `pluginDirs` thereafter
    ```
    registry         = new PluginRegistry()
    setupRegistry?.(registry)            // caller registers built-in plugins here
    globalConfigRepo = new GlobalConfigRepository()
    pluginLoader     = new PluginLoader(registry, globalConfigRepo)
    configRepo       = new ConfigRepository()
    artifactParser   = new ArtifactParser(registry)
    artifactWriter   = new ArtifactWriter()
    dirWriter        = new AgentConfigDirWriter(registry)
    [7 use cases]    = new XxxUseCase(...deps)
    return           new AgentConfigApiAdapter(...useCases)
    ```

38. Update `cli/src/index.ts` — import `registerAll` from `agentconfig-plugins`; pass it as the `setupRegistry` callback:
    ```typescript
    import { createAgentConfigApi } from 'agentconfig';
    import { registerAll } from 'agentconfig-plugins';
    const api = createAgentConfigApi(registerAll);
    ```

---

## Phase 8: Delete Legacy Files *(depends on Phase 7)*

39. Delete `core/src/operations.ts`
40. Delete `core/src/import-utils.ts`
41. Delete `core/src/global-config.ts` (old)
42. Delete `core/src/registry.ts` (old)
43. Delete `core/src/types/` directory (all entities moved to `plugins/`; IR removed)
44. Delete `core/src/parsers/` directory (all parsing moved to `plugins/`)
45. Delete `core/src/built-in-plugins/` directory (all plugins moved to `plugins/`)
46. Delete `core/src/validator.ts` (old, replaced by new pure orchestrator)
47. Delete `core/src/api.ts`

---

## Phase 9: Test Updates *(depends on Phase 8)*

48. Update all `core/test/unit/` imports to new file locations
49. Ensure unit tests pass `IPluginRegistry` via DI (no global registry import)
50. Update/split `operations.test.ts` across individual use-case tests
51. Add unit tests for each `DirectiveTypePlugin` impl in `plugins/src/directive-types/`
52. CLI functional tests in `cli/test/functional/` — no changes needed (stable `IAgentConfigApi`)
53. Add root workspace script: `npm run build -w packages/plugins` in correct order after api, before core and cli
54. Run `npm run test:unit && npm run test:functional`

---

## Relevant Files

| File | Change |
|---|---|
| `core/src/operations.ts` | DELETE — split into 7 use cases |
| `core/src/registry.ts` | DELETE → `infrastructure/plugin-registry.ts` |
| `core/src/global-config.ts` | DELETE → `infrastructure/plugin-loader.ts` + `infrastructure/global-config.ts` |
| `core/src/config.ts` | DELETE → `infrastructure/config-repository.ts` |
| `core/src/import-utils.ts` | DELETE → `infrastructure/agentconfig-dir-writer.ts` |
| `core/src/validator.ts` | REWRITE — pure orchestrator, zero type-specific rules |
| `core/src/types/` | DELETE — entities move to `plugins/src/directive-types/` |
| `core/src/parsers/` | DELETE — parsing moves to `plugins/src/directive-types/` |
| `core/src/built-in-plugins/` | DELETE — moves to `plugins/src/generators/` + `plugins/src/importers/` |
| `core/src/agent-config-api.ts` | REWRITE — adapter pattern with constructor DI |
| `core/src/index.ts` | REWRITE — DI factory accepting `setupRegistry` callback |
| `cli/src/index.ts` | UPDATE — pass `registerAll` from `agentconfig-plugins` to factory |
| `api/src/plugins/context.ts` | UPDATE — add `getHookEventMap()` to `ReadonlyRegistry` |
| `api/src/plugins/directive-type.ts` | UPDATE — add optional `write()` method to `DirectiveTypePlugin` |
| `plugins/` | CREATE — new package `agentconfig-plugins` with all directive types and agent plugins |

---

## Verification Checklist

1. `npm run build` from `agentconfig/src/` — all 4 packages build clean (api → plugins → core → cli order)
2. Confirm `core` package has zero imports from agent-specific modules (grep for 'InstructionFile', 'AgentDefinition', etc. — must all be absent)
3. `npm run test:unit` — all unit tests pass with injected registry (no global state)
4. `npm run test:functional` — all CLI functional tests pass across all 9 agent targets
5. Manual: `agentconfig generate` in a project with `.agentconfig/` → generates files correctly
6. Manual: `agentconfig list-targets` → shows all 9 built-in targets
7. Verify hook generation for cursor, claude-code, codex after hook event map migration
8. `npm run lint` — no ESLint errors

---

## Scope Boundaries

- **Included**: Full structural refactoring of `core`; new `plugins` package; minor api package additions; CLI bootstrap change
- **Excluded**: No new features, no config.yaml format changes, no new agent targets, no new CLI commands
- **External plugins**: Fully compatible — `registry.loadPlugin()` logic preserved in `PluginRegistry`; external plugins continue to export arrays/objects
- **Public API**: `IAgentConfigApi` interface in api package unchanged; `DirectiveTypePlugin` gains an additive optional `write()` method (backward compatible)
- **Invariant**: After this refactor, adding a new agent or instruction type requires zero changes to `core` — only a new file in `plugins`
- **Invariant**: After this refactor, adding a new agent or instruction type requires zero changes to `core` — only a new file in `plugins`
