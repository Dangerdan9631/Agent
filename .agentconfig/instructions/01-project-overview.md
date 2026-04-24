---
activation: always
---

## Project: agentconfig

`agentconfig` is a TypeScript/Node.js CLI and programmatic library. It reads a `.agentconfig/` folder — the single source of truth — and emits agent-native directive files for each configured AI coding agent.

### Repository Layout

```
agentconfig/               ← npm workspaces root
  package.json             ← workspaces: ["packages/*"]
  tsconfig.base.json       ← shared TS config (module: ESNext, moduleResolution: bundler)
  packages/
    core/                  ← library: types, parsers, generators, registry, writer, validator
      src/
        types/             ← ir.ts, generator.ts, config.ts
        parsers/           ← instruction.ts, agent.ts, skill.ts, command.ts, hook.ts, index.ts
        generators/        ← base.ts + one file per agent family + index.ts (auto-registers)
        importers/         ← one file per agent + index.ts (detectAgents, importArtifacts)
        config.ts          ← findConfigDir(), loadConfig()
        registry.ts        ← GeneratorRegistry singleton
        validator.ts       ← validate(ir, config): ValidationResult[]
        writer.ts          ← write(), computeDiff(), deduplicateOutputs()
        index.ts           ← public API surface
    cli/                   ← agentconfig-cli package (CJS only, bin: agentconfig)
      src/index.ts         ← Commander v11 entry point
```

### Key Design Principles

- **Pipeline**: `.agentconfig/` → parsers → IR → generators → FileOutput[] → writer → disk
- **IR is agent-agnostic**: no agent knowledge in `types/ir.ts`
- **Generators are plugins**: `AgentGenerator` interface; built-in generators self-register on import via `generators/index.ts`
- **CLI has no business logic**: all logic lives in `packages/core`
- **Reverse pipeline**: agent-native files → importers → IR → `writeAgentConfigDir()`
