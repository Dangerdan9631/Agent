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

## Architecture Rules

### Layer Boundaries (never cross these)

1. **CLI → Core only**: `packages/cli/src/index.ts` imports from `agentconfig` (the core package) only. It parses args and calls core API functions. No file I/O, no IR manipulation, no generator logic in CLI.

2. **IR has no agent knowledge**: `packages/core/src/types/ir.ts` contains only normalized, agent-agnostic types. Do not add agent-specific fields to IR types.

3. **Generators are stateless**: each `generate(input)` call must be a pure function — same IR + config → same FileOutput[]. No side effects, no disk reads inside generators.

4. **Parsers own `.agentconfig/`**: only parser files read from `.agentconfig/`. Generators never read files — they receive everything via the `GeneratorInput` argument.

5. **Importers own agent-native files**: only importer files read agent-native paths (`.cursor/`, `.claude/`, etc.). No other layer touches those paths for reading.

6. **Writer owns disk writes**: only `writer.ts` calls `fs.writeFileSync`. Generators return `FileOutput[]`; the writer flushes them.

### Module Resolution

- This project uses `moduleResolution: "bundler"` (tsup handles it).
- Import paths within a package have **no `.js` extension**: `import { IR } from '../types/ir'` ✓ not `'../types/ir.js'` ✗

### Build Targets

- `packages/core` builds to **CJS + ESM** (tsup dual output).
- `packages/cli` builds to **CJS only** (`format: ['cjs']`). The shebang is injected by tsup `banner.js` — do NOT put `#!/usr/bin/env node` in the TypeScript source.

### ESM-only npm Packages

The CLI outputs CJS. Any dependency used in the CLI must be CJS-compatible or bundled. Known ESM-only packages to avoid in CLI/core CJS output:
- `chalk` → use **v4** (`chalk@^4.x`) not v5
- `fast-glob`, `gray-matter`, `js-yaml`, `zod`, `diff` — all CJS-safe at current pinned versions

### Plugin Registration

Built-in generators register themselves. The pattern:
```ts
// generators/index.ts
import { registry } from '../registry';
import { CopilotGenerator } from './copilot';
registry.register(CopilotGenerator);
// ...
```

The public `index.ts` imports `'./generators/index'` at the top (side-effect import) to ensure registration before any call to `generate()`.

## TypeScript Conventions

- **TypeScript 5.3+**, `strict: true`. All new code must compile with zero type errors.
- Use `type` imports for type-only imports: `import type { IR } from '../types/ir'`.
- Prefer `interface` for object shapes that may be extended (e.g., `AgentGenerator`); `type` for unions and aliases.
- No `any`. Use `unknown` at boundaries and narrow with type guards.

## Code Style

- **No `.js` extensions** in relative imports (bundler resolution handles it).
- `async`/`await` over raw Promises.
- Named exports only — no default exports except in `tsup.config.ts` and Commander program.
- Keep functions small and single-purpose. Extract helpers to `utils.ts` or `generators/base.ts` rather than inlining.

## Error Handling

- CLI: write to `stderr` + `process.exit(1)` via the `die()` helper for all fatal errors.
- Core library: throw typed `Error` instances with descriptive messages. Do not `process.exit` inside core.
- Validate at system boundaries (CLI args, `config.yaml` parse, `.agentconfig/` parse) — not throughout the pipeline.

## Naming

- Generator classes/objects: `PascalCase` + `Generator` suffix (e.g., `CursorGenerator`).
- Importer functions: `import<AgentName>` (e.g., `importClaudeCode`).
- Parser functions: `parse<Type>` (e.g., `parseInstructions`).
- File-level constants and utility functions: `camelCase`.
- Normalized event names (IR): `PascalCase` (`PreToolUse`, `SessionStart`).

## Dependencies

- Keep the dependency footprint small. Before adding a new dependency, check if the functionality can be achieved with existing deps or Node built-ins.
- Only add to `packages/core/package.json` if the functionality is used in the core library. CLI-only deps go only in `packages/cli/package.json`.

## agentconfig CLI Usage

```
agentconfig generate [--target <name>]... [--dry-run] [--no-overwrite] [--watch]
agentconfig validate [--strict] [--format text|json]
agentconfig diff     [--target <name>]...
agentconfig import   [source-dir] [--from <agent>]... [--overwrite] [--dry-run]
agentconfig list-targets [--format text|json]
```

### Global flags (all commands)

| Flag | Description |
|---|---|
| `--config <path>` | Path to `.agentconfig/` (default: auto-discovered upward from CWD) |
| `--out <path>` | Output root directory override |
| `--target <name>` | Restrict to one target (repeatable) |
| `-v, --verbose` | Verbose logging |
| `--format text\|json` | Output format (default: text) |

### Development workflow

```bash
# Build everything
cd agentconfig && npm run build

# Rebuild only core (faster during generator development)
npm run build -w packages/core

# Rebuild only CLI
npm run build -w packages/cli

# Reinstall global CLI after a code change
npm install -g ./packages/cli

# Watch + regenerate this project's directives
agentconfig generate --watch
```

### Programmatic API

```ts
import { loadConfig, parseArtifacts, generate, write, validate } from 'agentconfig';

const configDir = '.agentconfig';
const config = await loadConfig(configDir);
const ir = await parseArtifacts(configDir, config);
const errors = validate(ir, config);
const files = generate(ir, config);
await write(files, { outputDir: '.', overwrite: true });
```

> **Apply only when:** Apply when adding a new supported agent target to agentconfig

## Adding a New Agent Target

Follow this checklist when adding support for a new agent (e.g., `my-agent`):

### 1. Generator (`packages/core/src/generators/my-agent.ts`)

- Implement `AgentGenerator` with `target: 'my-agent'` and `displayName`.
- Handle all 4 activation types for instructions.
- Use `filterForTarget(ir.instructions, 'my-agent')` to respect `targets`/`excludedTargets`.
- Use `buildInTextCondition` for any activation type without native support.
- Handle agents, skills, commands, and hooks (or explicitly skip unsupported features).
- Export a named `MyAgentGenerator` constant.

### 2. Register (`packages/core/src/generators/index.ts`)

```ts
import { MyAgentGenerator } from './my-agent';
registry.register(MyAgentGenerator);
```

### 3. Importer (`packages/core/src/importers/my-agent.ts`)

- Export `importMyAgent(sourceDir): Promise<{ instructions: InstructionFile[], agents?: AgentDefinition[] }>`.
- Check for the agent's sentinel directory/file with `fs.existsSync` before reading.
- Map agent-native frontmatter/format to normalized IR activation types.
- Set `importNote` wherever activation is ambiguous.

### 4. Register importer (`packages/core/src/importers/index.ts`)

- Add to `IMPORTERS` map: `'my-agent': importMyAgent`.
- Add detection logic to `detectAgents()` with appropriate confidence level (`'high'` for dedicated directory, `'low'` for a shared root file).

### 5. Update docs

- Add a row to the Supported Agents table in `README.md`.
- Add the target to `config.yaml` examples.
- Update `HOOK_EVENT_MAPS` in `generators/base.ts` if the agent supports hooks.